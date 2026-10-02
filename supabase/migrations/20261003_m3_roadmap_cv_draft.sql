-- M3 stores owner-scoped roadmap actions and a source-grounded editable CV draft.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cv_documents_id_owner_unique') then
    alter table public.cv_documents add constraint cv_documents_id_owner_unique unique (id, owner_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'target_jobs_id_owner_unique') then
    alter table public.target_jobs add constraint target_jobs_id_owner_unique unique (id, owner_id);
  end if;
end $$;

create table if not exists public.roadmap_items (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  ordinal integer not null check (ordinal >= 0),
  requirement_text text not null check (char_length(trim(requirement_text)) between 2 and 220),
  finding_status text not null check (finding_status in ('partly_supported', 'unclear', 'missing')),
  priority text not null check (priority in ('high', 'medium', 'low')),
  action_text text not null check (char_length(trim(action_text)) between 1 and 700),
  rationale text not null check (char_length(trim(rationale)) between 1 and 700),
  progress_status text not null default 'not_started' check (progress_status in ('not_started', 'in_progress', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roadmap_items_run_owner_fk
    foreign key (analysis_run_id, owner_id)
    references public.analysis_runs (id, owner_id) on delete cascade,
  constraint roadmap_items_run_ordinal_unique unique (analysis_run_id, ordinal)
);

create index if not exists roadmap_items_owner_run_idx
  on public.roadmap_items (owner_id, analysis_run_id, ordinal);

create table if not exists public.cv_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  analysis_run_id uuid not null,
  cv_document_id uuid not null,
  target_job_id uuid not null,
  version integer not null default 1 check (version >= 1),
  content text not null check (char_length(trim(content)) between 20 and 12000),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cv_drafts_run_owner_fk
    foreign key (analysis_run_id, owner_id)
    references public.analysis_runs (id, owner_id) on delete cascade,
  constraint cv_drafts_cv_owner_fk
    foreign key (cv_document_id, owner_id)
    references public.cv_documents (id, owner_id) on delete cascade,
  constraint cv_drafts_job_owner_fk
    foreign key (target_job_id, owner_id)
    references public.target_jobs (id, owner_id) on delete cascade,
  constraint cv_drafts_id_owner_unique unique (id, owner_id),
  constraint cv_drafts_one_per_run unique (analysis_run_id)
);

create index if not exists cv_drafts_owner_run_idx
  on public.cv_drafts (owner_id, analysis_run_id);

create table if not exists public.cv_draft_claims (
  id uuid primary key default gen_random_uuid(),
  cv_draft_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  ordinal integer not null check (ordinal >= 0),
  requirement_text text not null check (char_length(trim(requirement_text)) between 2 and 220),
  claim_text text not null check (char_length(trim(claim_text)) between 1 and 220),
  source_excerpt text not null check (char_length(source_excerpt) between 1 and 220),
  source_start integer not null check (source_start >= 0),
  source_end integer not null check (source_end > source_start),
  created_at timestamptz not null default now(),
  constraint cv_draft_claims_draft_owner_fk
    foreign key (cv_draft_id, owner_id)
    references public.cv_drafts (id, owner_id) on delete cascade,
  constraint cv_draft_claims_ordinal_unique unique (cv_draft_id, ordinal),
  constraint cv_draft_claims_matches_source_check check (claim_text = source_excerpt)
);

create index if not exists cv_draft_claims_owner_draft_idx
  on public.cv_draft_claims (owner_id, cv_draft_id, ordinal);

alter table public.roadmap_items enable row level security;
alter table public.cv_drafts enable row level security;
alter table public.cv_draft_claims enable row level security;

create policy "owners manage their roadmap items" on public.roadmap_items
  for all
  using (
    owner_id = auth.uid()
    and exists (
      select 1 from public.analysis_runs run
      where run.id = analysis_run_id and run.owner_id = auth.uid()
    )
  )
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.analysis_runs run
      where run.id = analysis_run_id and run.owner_id = auth.uid()
    )
  );

create policy "owners manage their CV drafts" on public.cv_drafts
  for all
  using (
    owner_id = auth.uid()
    and exists (
      select 1 from public.analysis_runs run
      where run.id = analysis_run_id and run.owner_id = auth.uid()
    )
  )
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.analysis_runs run
      where run.id = analysis_run_id and run.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.cv_documents cv
      where cv.id = cv_document_id and cv.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.target_jobs job
      where job.id = target_job_id and job.owner_id = auth.uid()
    )
  );

create policy "owners manage their draft claim provenance" on public.cv_draft_claims
  for all
  using (
    owner_id = auth.uid()
    and exists (
      select 1 from public.cv_drafts draft
      where draft.id = cv_draft_id and draft.owner_id = auth.uid()
    )
  )
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.cv_drafts draft
      where draft.id = cv_draft_id and draft.owner_id = auth.uid()
    )
  );
