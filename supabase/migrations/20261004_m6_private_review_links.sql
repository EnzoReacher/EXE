-- M6a: tightly scoped, revocable review links. Raw tokens never enter this schema.
create table public.review_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  analysis_run_id uuid not null,
  cv_draft_id uuid,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expiry_hours integer not null check (expiry_hours in (24, 168, 720)),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_shares_analysis_owner_fk foreign key (analysis_run_id, owner_id)
    references public.analysis_runs (id, owner_id) on delete cascade,
  constraint review_shares_draft_owner_fk foreign key (cv_draft_id, owner_id)
    references public.cv_drafts (id, owner_id) on delete cascade,
  constraint review_shares_expiry_after_creation check (expires_at > created_at)
);

create index review_shares_owner_created_idx on public.review_shares (owner_id, created_at desc);
create index review_shares_token_hash_idx on public.review_shares (token_hash);

create table public.expert_reviews (
  id uuid primary key default gen_random_uuid(),
  review_share_id uuid not null references public.review_shares(id) on delete cascade,
  reviewer_name text check (reviewer_name is null or char_length(trim(reviewer_name)) between 1 and 120),
  reviewer_role text check (reviewer_role is null or char_length(trim(reviewer_role)) between 1 and 120),
  feedback text not null check (char_length(trim(feedback)) between 20 and 4000),
  submission_id uuid not null,
  created_at timestamptz not null default now(),
  constraint expert_reviews_share_submission_unique unique (review_share_id, submission_id)
);

create index expert_reviews_share_created_idx on public.expert_reviews (review_share_id, created_at asc);

create or replace function public.validate_review_share()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' and (
    new.owner_id is distinct from old.owner_id or new.analysis_run_id is distinct from old.analysis_run_id
    or new.cv_draft_id is distinct from old.cv_draft_id or new.token_hash is distinct from old.token_hash
    or new.expiry_hours is distinct from old.expiry_hours or new.expires_at is distinct from old.expires_at or new.created_at is distinct from old.created_at
  ) then raise exception 'review share scope is immutable'; end if;
  if tg_op = 'UPDATE' and old.revoked_at is not null and new.revoked_at is null then
    raise exception 'a revoked review share cannot be reactivated';
  end if;
  if tg_op = 'INSERT' then new.expires_at = new.created_at + make_interval(hours => new.expiry_hours); end if;
  if new.expires_at <= new.created_at then raise exception 'review share expiry is invalid'; end if;
  if not exists (select 1 from public.analysis_runs run where run.id = new.analysis_run_id and run.owner_id = new.owner_id and run.status = 'completed') then
    raise exception 'review share requires an owned completed report';
  end if;
  if new.cv_draft_id is not null and new.revoked_at is null and not exists (
    select 1 from public.cv_drafts draft where draft.id = new.cv_draft_id and draft.owner_id = new.owner_id
      and draft.analysis_run_id = new.analysis_run_id and draft.accepted_at is not null
  ) then raise exception 'review share requires an accepted matching draft'; end if;
  return new;
end;
$$;

create trigger validate_review_share_before_write before insert or update on public.review_shares
for each row execute function public.validate_review_share();

-- Editing an accepted draft clears its acceptance in M3. Revoke any link that
-- selected it so an edited or unaccepted draft can never remain shareable.
create or replace function public.revoke_shares_for_unaccepted_draft()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.accepted_at is not null and new.accepted_at is null then
    update public.review_shares set revoked_at = now(), updated_at = now()
    where cv_draft_id = new.id and revoked_at is null;
  end if;
  return new;
end;
$$;

create trigger revoke_review_shares_when_draft_unaccepted
after update of accepted_at on public.cv_drafts
for each row execute function public.revoke_shares_for_unaccepted_draft();

alter table public.review_shares enable row level security;
alter table public.expert_reviews enable row level security;

create policy "owners create valid review shares" on public.review_shares for insert
  with check (
    owner_id = auth.uid()
    and revoked_at is null
    and exists (
      select 1 from public.analysis_runs run
      where run.id = analysis_run_id and run.owner_id = auth.uid() and run.status = 'completed'
    )
    and (
      cv_draft_id is null or exists (
        select 1 from public.cv_drafts draft
        where draft.id = cv_draft_id and draft.owner_id = auth.uid()
          and draft.analysis_run_id = review_shares.analysis_run_id and draft.accepted_at is not null
      )
    )
  );

create policy "owners read own review shares" on public.review_shares for select using (owner_id = auth.uid());
create policy "owners revoke own review shares" on public.review_shares for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owners read feedback on own shares" on public.expert_reviews for select using (
  exists (select 1 from public.review_shares share where share.id = review_share_id and share.owner_id = auth.uid())
);

-- Explicitly block anonymous table access. The two functions below are the only
-- public reviewer boundary; authenticated owners retain narrowly scoped RLS access.
revoke all on table public.review_shares, public.expert_reviews from anon;
grant select, insert, update on table public.review_shares to authenticated;
grant select on table public.expert_reviews to authenticated;

create or replace function public.get_private_review(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  selected_share public.review_shares%rowtype;
  payload jsonb;
begin
  select share.* into selected_share
  from public.review_shares share
  where share.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and share.revoked_at is null and share.expires_at > now();

  if not found then return null; end if;

  select jsonb_build_object(
    'roleTitle', job.role_title,
    'companyName', job.company_name,
    'findings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'requirement', finding.requirement_text, 'status', finding.status,
        'rationale', finding.rationale, 'caveat', finding.caveat,
        'evidenceExcerpt', finding.evidence_excerpt, 'evidenceKind', finding.evidence_kind
      ) order by finding.ordinal)
      from public.requirement_findings finding where finding.analysis_run_id = selected_share.analysis_run_id
    ), '[]'::jsonb),
    'draftContent', case when selected_share.cv_draft_id is null then null else (
      select draft.content from public.cv_drafts draft
      where draft.id = selected_share.cv_draft_id and draft.analysis_run_id = selected_share.analysis_run_id and draft.accepted_at is not null
    ) end
  ) into payload
  from public.analysis_runs run
  join public.target_jobs job on job.id = run.target_job_id
  where run.id = selected_share.analysis_run_id and run.status = 'completed';

  return payload;
end;
$$;

create or replace function public.submit_private_review(
  p_token text, p_reviewer_name text, p_reviewer_role text, p_feedback text, p_submission_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare selected_share_id uuid;
begin
  if p_token is null or length(p_token) < 20 or char_length(trim(coalesce(p_feedback, ''))) not between 20 and 4000
    or (p_reviewer_name is not null and char_length(trim(p_reviewer_name)) > 120)
    or (p_reviewer_role is not null and char_length(trim(p_reviewer_role)) > 120) then
    return false;
  end if;
  select share.id into selected_share_id from public.review_shares share
  where share.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and share.revoked_at is null and share.expires_at > now();
  if not found then return false; end if;
  insert into public.expert_reviews (review_share_id, reviewer_name, reviewer_role, feedback, submission_id)
  values (selected_share_id, nullif(trim(p_reviewer_name), ''), nullif(trim(p_reviewer_role), ''), trim(p_feedback), p_submission_id)
  on conflict (review_share_id, submission_id) do nothing;
  return true;
end;
$$;

revoke all on function public.get_private_review(text) from public;
revoke all on function public.submit_private_review(text, text, text, text, uuid) from public;
grant execute on function public.get_private_review(text) to anon, authenticated;
grant execute on function public.submit_private_review(text, text, text, text, uuid) to anon, authenticated;
