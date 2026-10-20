-- Apply using local Supabase first. Do not run against hosted instances without owner setup.
-- New immutable snapshots; legacy analysis/credential tables have different semantics.
create table public.ownpath_experience_profiles (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  revision integer not null default 1 check (revision > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 350000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.ownpath_cv_versions (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  revision integer not null default 1 check (revision > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 350000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ownpath_experience_profiles enable row level security;
alter table public.ownpath_cv_versions enable row level security;
create policy profiles_select_owned on public.ownpath_experience_profiles for select to authenticated using ((select auth.uid()) = owner_id);
create policy profiles_insert_owned on public.ownpath_experience_profiles for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy profiles_delete_owned on public.ownpath_experience_profiles for delete to authenticated using ((select auth.uid()) = owner_id);
create policy versions_select_owned on public.ownpath_cv_versions for select to authenticated using ((select auth.uid()) = owner_id);
create policy versions_insert_owned on public.ownpath_cv_versions for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy versions_delete_owned on public.ownpath_cv_versions for delete to authenticated using ((select auth.uid()) = owner_id);
create policy versions_update_owned on public.ownpath_cv_versions for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
-- Profile revisions are immutable. Version edits are explicit and revision-checked.
revoke all on public.ownpath_experience_profiles, public.ownpath_cv_versions from anon, authenticated;
grant select, insert, delete on public.ownpath_experience_profiles, public.ownpath_cv_versions to authenticated;
grant update (name, payload, revision, updated_at) on public.ownpath_cv_versions to authenticated;
create index ownpath_profiles_owner_created on public.ownpath_experience_profiles(owner_id, created_at desc);
create index ownpath_versions_owner_created on public.ownpath_cv_versions(owner_id, created_at desc);
