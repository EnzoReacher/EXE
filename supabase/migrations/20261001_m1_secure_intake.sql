-- M1 only: private CV intake and target jobs. Run in a reviewed Supabase project.
create table if not exists public.cv_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null,
  content_type text not null,
  byte_size integer not null check (byte_size > 0 and byte_size <= 5242880),
  processing_status text not null check (processing_status in ('processing', 'ready', 'failed', 'deleting', 'delete_failed')),
  extracted_text text,
  parse_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.target_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  role_title text not null check (char_length(trim(role_title)) between 2 and 120),
  company_name text check (company_name is null or char_length(company_name) <= 120),
  job_description text not null check (char_length(trim(job_description)) between 30 and 15000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cv_documents enable row level security;
alter table public.target_jobs enable row level security;
create policy "owners manage their CV records" on public.cv_documents for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners manage their target jobs" on public.target_jobs for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

insert into storage.buckets (id, name, public) values ('cv-private', 'cv-private', false) on conflict (id) do update set public = false;
create policy "owners upload private CVs" on storage.objects for insert with check (bucket_id = 'cv-private' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners read private CVs" on storage.objects for select using (bucket_id = 'cv-private' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners replace private CVs" on storage.objects for update using (bucket_id = 'cv-private' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'cv-private' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners delete private CVs" on storage.objects for delete using (bucket_id = 'cv-private' and (storage.foldername(name))[1] = auth.uid()::text);

-- Supabase Storage object deletion removes the live object. Provider backups and
-- retention settings are project-level controls and must be reviewed before real CVs are accepted.
