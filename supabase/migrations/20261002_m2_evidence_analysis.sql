-- M2 stores owner-scoped, evidence-first analysis runs. No external AI provider is called.
create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  cv_document_id uuid not null references public.cv_documents(id) on delete cascade,
  target_job_id uuid not null references public.target_jobs(id) on delete cascade,
  client_request_id uuid not null,
  status text not null check (status in ('processing', 'completed', 'failed')),
  provider_name text not null,
  provider_version text not null,
  schema_version text not null,
  engine_version text not null,
  prompt_version text,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint analysis_runs_owner_request_unique unique (owner_id, client_request_id),
  constraint analysis_runs_id_owner_unique unique (id, owner_id)
);

create index if not exists analysis_runs_owner_created_idx
  on public.analysis_runs (owner_id, created_at desc);

create table if not exists public.requirement_findings (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  ordinal integer not null check (ordinal >= 0),
  requirement_text text not null check (char_length(trim(requirement_text)) between 2 and 220),
  status text not null check (status in ('supported', 'partly_supported', 'unclear', 'missing')),
  evidence_kind text check (evidence_kind is null or evidence_kind in ('cv_claim', 'cv_example')),
  evidence_excerpt text,
  source_start integer,
  source_end integer,
  rationale text not null check (char_length(rationale) between 1 and 500),
  caveat text not null check (char_length(caveat) between 1 and 500),
  created_at timestamptz not null default now(),
  constraint requirement_findings_run_owner_fk
    foreign key (analysis_run_id, owner_id)
    references public.analysis_runs (id, owner_id) on delete cascade,
  constraint requirement_findings_source_range_check check (
    (evidence_kind is null and evidence_excerpt is null and source_start is null and source_end is null)
    or (
      evidence_kind is not null
      and evidence_kind in ('cv_claim', 'cv_example')
      and evidence_excerpt is not null
      and char_length(evidence_excerpt) between 1 and 220
      and source_start is not null
      and source_end is not null
      and source_start >= 0
      and source_end > source_start
    )
  ),
  constraint requirement_findings_missing_has_no_excerpt check (
    status <> 'missing' or evidence_excerpt is null
  ),
  constraint requirement_findings_run_ordinal_unique unique (analysis_run_id, ordinal)
);

create index if not exists requirement_findings_owner_run_idx
  on public.requirement_findings (owner_id, analysis_run_id, ordinal);

alter table public.analysis_runs enable row level security;
alter table public.requirement_findings enable row level security;

create policy "owners manage their analysis runs" on public.analysis_runs
  for all
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.cv_documents cv
      where cv.id = cv_document_id and cv.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.target_jobs job
      where job.id = target_job_id and job.owner_id = auth.uid()
    )
  );

create policy "owners manage findings for their analysis runs" on public.requirement_findings
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
