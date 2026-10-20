-- Additive completion of the already-applied local M11A prototype migration.
alter table public.team_expert_profiles
  add column approval_status text not null default 'pending' check (approval_status in ('pending','approved','revoked')),
  add column approved_at timestamptz,
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now();
-- Existing active profiles were explicitly provisioned by trusted administration.
update public.team_expert_profiles set approval_status='approved', approved_at=now() where active;
alter table public.team_expert_profiles add constraint m11a_active_requires_approval
  check (not active or (approval_status='approved' and approved_at is not null));
alter table public.portfolio_documents
  add column processing_status text not null default 'ready' check (processing_status='ready'),
  add column updated_at timestamptz not null default now();
alter table public.credential_documents
  add column processing_status text not null default 'ready' check (processing_status='ready'),
  add column updated_at timestamptz not null default now();
alter table public.credential_skill_claims add column updated_at timestamptz not null default now();
alter table public.cv_versions add column superseded_at timestamptz, add column evidence_withdrawn_at timestamptz;

create function public.m11a_lifecycle_dates() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_table_name='cv_versions' then
  if new.state='superseded' and old.state<>new.state then new.superseded_at=coalesce(old.superseded_at,now()); end if;
  if new.state='evidence_withdrawn' and old.state<>new.state then new.evidence_withdrawn_at=coalesce(old.evidence_withdrawn_at,now()); end if;
 else new.updated_at=now(); end if;
 return new;
end $$;
create trigger m11a_profile_dates before update on public.team_expert_profiles for each row execute function public.m11a_lifecycle_dates();
create trigger m11a_portfolio_dates before update on public.portfolio_documents for each row execute function public.m11a_lifecycle_dates();
create trigger m11a_credential_dates before update on public.credential_documents for each row execute function public.m11a_lifecycle_dates();
create trigger m11a_claim_dates before update on public.credential_skill_claims for each row execute function public.m11a_lifecycle_dates();
create trigger m11a_version_dates before update on public.cv_versions for each row execute function public.m11a_lifecycle_dates();
revoke all on function public.m11a_lifecycle_dates() from public,anon,authenticated;

create or replace function public.m11a_create_version(p_claim uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare c public.credential_skill_claims; d public.credential_expert_decisions; result uuid; current_parent uuid;
begin
 select * into c from public.credential_skill_claims where id=p_claim and owner_id=auth.uid() for update;
 if c.id is null then raise exception 'Unavailable'; end if;
 perform 1 from public.cv_documents where id=c.source_cv_id and owner_id=auth.uid() and processing_status='ready' for update;
 if not found then raise exception 'Unavailable'; end if;
 if c.state='version_created' then
  select v.id into result from public.cv_versions v join public.cv_version_skill_claims x on x.version_id=v.id
   where x.claim_id=c.id and v.parent_version_id is not distinct from c.parent_version_id;
  return result;
 end if;
 select * into d from public.credential_expert_decisions where claim_id=c.id and decision='approved';
 if c.state<>'approved' or d.id is null or d.approved_wording<>c.proposed_wording
 or not exists(select 1 from public.credential_documents where id=c.credential_id and withdrawn_at is null)
 or (c.portfolio_id is not null and not exists(select 1 from public.portfolio_documents where id=c.portfolio_id and withdrawn_at is null))
 or not exists(select 1 from public.team_expert_profiles where id=c.expert_id and reviewer_id=d.reviewer_id and active and approval_status='approved')
 then raise exception 'Unavailable'; end if;
 select id into current_parent from public.cv_versions where source_cv_id=c.source_cv_id and state='accepted';
 if current_parent is distinct from c.parent_version_id then raise exception 'Unavailable'; end if;
 insert into public.cv_versions(owner_id,source_cv_id,parent_version_id,version_number,content_snapshot)
 select c.owner_id,c.source_cv_id,c.parent_version_id,coalesce(max(version_number),0)+1,
 c.source_snapshot || E'\n\nApproved additional skills\n' || d.approved_wording
 from public.cv_versions where source_cv_id=c.source_cv_id returning id into result;
 if c.parent_version_id is not null then
  insert into public.cv_version_skill_claims select result,claim_id,decision_id from public.cv_version_skill_claims where version_id=c.parent_version_id;
 end if;
 insert into public.cv_version_skill_claims values(result,c.id,d.id);
 update public.credential_skill_claims set state='version_created' where id=c.id;
 return result;
end $$;

create function public.m11a_withdraw_claim(p_claim uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare c public.credential_skill_claims;
begin
 select * into c from public.credential_skill_claims where id=p_claim and owner_id=auth.uid() for update;
 if c.id is null or c.state='withdrawn' or exists(
  select 1 from public.cv_version_skill_claims x join public.cv_versions v on v.id=x.version_id
  where x.claim_id=c.id and v.accepted_at is not null
 ) then raise exception 'Unavailable'; end if;
 update public.credential_skill_claims set state='withdrawn' where id=c.id;
 update public.cv_versions v set state='evidence_withdrawn' where exists(
  select 1 from public.cv_version_skill_claims x where x.version_id=v.id and x.claim_id=c.id
 );
 return true;
end $$;
revoke all on function public.m11a_withdraw_claim(uuid) from public,anon;
grant execute on function public.m11a_withdraw_claim(uuid) to authenticated;
