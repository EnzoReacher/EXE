-- M6b stores only private, user-provided external job references. It does not
-- fetch, inspect, scrape, or verify the linked page.
create table public.opportunity_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  target_job_id uuid not null,
  source_url text not null check (char_length(source_url) between 12 and 2048),
  company_name text check (company_name is null or char_length(trim(company_name)) between 1 and 120),
  note text check (note is null or char_length(trim(note)) between 1 and 1000),
  status text not null default 'saved' check (status in ('saved', 'preparing', 'applied', 'closed', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunity_links_target_job_owner_fk
    foreign key (target_job_id, owner_id)
    references public.target_jobs (id, owner_id) on delete cascade
);

create index opportunity_links_owner_updated_idx on public.opportunity_links (owner_id, updated_at desc);
create index opportunity_links_owner_job_idx on public.opportunity_links (owner_id, target_job_id);

alter table public.opportunity_links enable row level security;

create policy "owners manage their private opportunity links" on public.opportunity_links
  for all
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.target_jobs job
      where job.id = target_job_id and job.owner_id = auth.uid()
    )
  );

revoke all on table public.opportunity_links from anon;
grant select, insert, update, delete on table public.opportunity_links to authenticated;
