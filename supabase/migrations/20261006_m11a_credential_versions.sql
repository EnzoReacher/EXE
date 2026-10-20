-- Owner-directed technical prototype. No issuer authentication or public proof URLs.
create table public.team_expert_profiles (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 2 and 80),
  specialty text check (length(specialty) <= 120),
  active boolean not null default false
);
create table public.portfolio_documents (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique, filename text not null check (length(filename) between 1 and 120),
  content_type text not null check (content_type in ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  byte_size integer not null check (byte_size between 1 and 5242880), withdrawn_at timestamptz,
  created_at timestamptz not null default now(), unique(id,owner_id),
  check (storage_path ~ ('^' || owner_id::text || '/[a-f0-9-]+\.(pdf|docx)$'))
);
create table public.credential_documents (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique, filename text not null check (length(filename) between 1 and 120),
  content_type text not null check (content_type in ('application/pdf','image/jpeg','image/png')),
  document_type text not null check (document_type in ('certificate','degree')),
  byte_size integer not null check (byte_size between 1 and 5242880), withdrawn_at timestamptz,
  created_at timestamptz not null default now(), unique(id,owner_id),
  check (storage_path ~ ('^' || owner_id::text || '/[a-f0-9-]+\.(pdf|jpg|png)$'))
);
create table public.credential_skill_claims (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  source_cv_id uuid not null, portfolio_id uuid, credential_id uuid not null,
  expert_id uuid not null references public.team_expert_profiles(id),
  skill_label text not null check (length(trim(skill_label)) between 2 and 80),
  proposed_wording text not null check (length(trim(proposed_wording)) between 2 and 300),
  state text not null default 'draft' check (state in ('draft','submitted','needs_information','rejected','approved','version_created','withdrawn')),
  source_snapshot text not null check (length(source_snapshot) between 1 and 60000),
  parent_version_id uuid, submitted_at timestamptz, created_at timestamptz not null default now(),
  unique(id,owner_id),
  foreign key(source_cv_id,owner_id) references public.cv_documents(id,owner_id) on delete cascade,
  foreign key(portfolio_id,owner_id) references public.portfolio_documents(id,owner_id),
  foreign key(credential_id,owner_id) references public.credential_documents(id,owner_id)
);
create table public.credential_expert_decisions (
  id uuid primary key default gen_random_uuid(), claim_id uuid not null unique references public.credential_skill_claims(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  decision text not null check (decision in ('approved','needs_information','rejected')),
  explanation text not null check (length(trim(explanation)) between 2 and 1000),
  approved_wording text, created_at timestamptz not null default now(),
  check ((decision = 'approved' and approved_wording is not null) or (decision <> 'approved' and approved_wording is null))
);
create table public.cv_versions (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  source_cv_id uuid not null, parent_version_id uuid references public.cv_versions(id) on delete cascade,
  version_number integer not null check(version_number > 0), content_snapshot text not null check(length(content_snapshot) between 1 and 64000),
  state text not null default 'candidate' check (state in ('candidate','accepted','superseded','evidence_withdrawn','rejected')),
  created_at timestamptz not null default now(), accepted_at timestamptz,
  unique(id,owner_id), unique(source_cv_id,version_number),
  foreign key(source_cv_id,owner_id) references public.cv_documents(id,owner_id) on delete cascade
);
alter table public.credential_skill_claims add foreign key(parent_version_id) references public.cv_versions(id) on delete cascade;
create unique index m11a_one_active on public.cv_versions(source_cv_id) where state='accepted';
create table public.cv_version_skill_claims (
  version_id uuid not null references public.cv_versions(id) on delete cascade,
  claim_id uuid not null references public.credential_skill_claims(id) on delete cascade,
  decision_id uuid not null references public.credential_expert_decisions(id) on delete cascade,
  primary key(version_id,claim_id)
);

create function public.m11a_immutable_version() returns trigger language plpgsql set search_path='' as $$
begin
 if new.content_snapshot<>old.content_snapshot or new.owner_id<>old.owner_id or new.source_cv_id<>old.source_cv_id
 or new.parent_version_id is distinct from old.parent_version_id or new.version_number<>old.version_number or new.created_at<>old.created_at
 or (old.accepted_at is not null and new.accepted_at is distinct from old.accepted_at) then raise exception 'Immutable snapshot'; end if;
 return new;
end $$;
create trigger m11a_immutable_version before update on public.cv_versions for each row execute function public.m11a_immutable_version();
revoke all on function public.m11a_immutable_version() from public,anon,authenticated;

-- All lifecycle writes are through checked functions. No browser can write approval,
-- expert roles, snapshot contents, provenance, or active status directly.
alter table public.team_expert_profiles enable row level security;
alter table public.portfolio_documents enable row level security;
alter table public.credential_documents enable row level security;
alter table public.credential_skill_claims enable row level security;
alter table public.credential_expert_decisions enable row level security;
alter table public.cv_versions enable row level security;
alter table public.cv_version_skill_claims enable row level security;
revoke all on public.team_expert_profiles, public.portfolio_documents, public.credential_documents,
  public.credential_skill_claims, public.credential_expert_decisions, public.cv_versions, public.cv_version_skill_claims from anon, authenticated;
grant select on public.portfolio_documents, public.credential_documents, public.credential_skill_claims,
  public.credential_expert_decisions, public.cv_versions, public.cv_version_skill_claims to authenticated;
create policy m11a_portfolio_owner on public.portfolio_documents for select to authenticated using(owner_id=auth.uid());
create policy m11a_credential_owner on public.credential_documents for select to authenticated using(owner_id=auth.uid());
create policy m11a_claim_owner on public.credential_skill_claims for select to authenticated using(owner_id=auth.uid());
create policy m11a_version_owner on public.cv_versions for select to authenticated using(owner_id=auth.uid());
create policy m11a_decision_owner on public.credential_expert_decisions for select to authenticated using(exists(select 1 from public.credential_skill_claims c where c.id=claim_id and c.owner_id=auth.uid()));
create policy m11a_provenance_owner on public.cv_version_skill_claims for select to authenticated using(exists(select 1 from public.cv_versions v where v.id=version_id and v.owner_id=auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('portfolio-private','portfolio-private',false,5242880,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
 ('credential-private','credential-private',false,5242880,array['application/pdf','image/jpeg','image/png']);
create policy m11a_upload on storage.objects for insert to authenticated with check (
 bucket_id in ('portfolio-private','credential-private') and name ~ ('^' || auth.uid()::text || '/[a-f0-9-]+\.(pdf|docx|jpg|png)$'));
create policy m11a_owner_read on storage.objects for select to authenticated using(bucket_id in ('portfolio-private','credential-private') and (storage.foldername(name))[1]=auth.uid()::text);
create policy m11a_owner_delete on storage.objects for delete to authenticated using(
 bucket_id in ('portfolio-private','credential-private') and (storage.foldername(name))[1]=auth.uid()::text
 and not exists(select 1 from public.credential_documents d where d.storage_path=name and d.withdrawn_at is null)
 and not exists(select 1 from public.portfolio_documents d where d.storage_path=name and d.withdrawn_at is null));

create function public.m11a_register_document(p_kind text,p_path text,p_filename text,p_mime text,p_size integer,p_type text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if auth.uid() is null or p_path !~ ('^' || auth.uid()::text || '/[a-f0-9-]+\.(pdf|docx|jpg|png)$') then raise exception 'Unavailable'; end if;
 if not exists(select 1 from storage.objects where name=p_path and bucket_id=case when p_kind='portfolio' then 'portfolio-private' else 'credential-private' end) then raise exception 'Unavailable'; end if;
 if p_kind='portfolio' then
  insert into public.portfolio_documents(owner_id,storage_path,filename,content_type,byte_size) values(auth.uid(),p_path,p_filename,p_mime,p_size) returning id into result;
 elsif p_kind='credential' then
  insert into public.credential_documents(owner_id,storage_path,filename,content_type,byte_size,document_type) values(auth.uid(),p_path,p_filename,p_mime,p_size,p_type) returning id into result;
 else raise exception 'Unavailable'; end if;
 return result;
end $$;

-- Claim wording/source/evidence are frozen from creation. Requests for information
-- require a new submission, never an edit of previously reviewed proof or wording.
create function public.m11a_create_claim(p_cv uuid,p_credential uuid,p_portfolio uuid,p_expert uuid,p_skill text,p_wording text)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; base text; parent uuid;
begin
 if auth.uid() is null then raise exception 'Unavailable'; end if;
 perform 1 from public.cv_documents where id=p_cv and owner_id=auth.uid() and processing_status='ready' for update;
 if not found then raise exception 'Unavailable'; end if;
 if not exists(select 1 from public.credential_documents where id=p_credential and owner_id=auth.uid() and withdrawn_at is null)
 or (p_portfolio is not null and not exists(select 1 from public.portfolio_documents where id=p_portfolio and owner_id=auth.uid() and withdrawn_at is null))
 or not exists(select 1 from public.team_expert_profiles where id=p_expert and active and reviewer_id<>auth.uid()) then raise exception 'Unavailable'; end if;
 select id,content_snapshot into parent,base from public.cv_versions where source_cv_id=p_cv and owner_id=auth.uid() and state='accepted';
 if parent is null then select extracted_text into base from public.cv_documents where id=p_cv and owner_id=auth.uid(); end if;
 if base is null or length(base) not between 1 and 60000 then raise exception 'Unavailable'; end if;
 insert into public.credential_skill_claims(owner_id,source_cv_id,credential_id,portfolio_id,expert_id,skill_label,proposed_wording,source_snapshot,parent_version_id)
 values(auth.uid(),p_cv,p_credential,p_portfolio,p_expert,trim(p_skill),trim(p_wording),base,parent) returning id into result;
 return result;
end $$;

create function public.m11a_submit_claim(p_claim uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.credential_skill_claims c set state='submitted',submitted_at=now()
 where c.id=p_claim and c.owner_id=auth.uid() and c.state='draft'
 and exists(select 1 from public.team_expert_profiles e where e.id=c.expert_id and e.active and e.reviewer_id<>auth.uid())
 and exists(select 1 from public.credential_documents d where d.id=c.credential_id and d.withdrawn_at is null)
 and (c.portfolio_id is null or exists(select 1 from public.portfolio_documents d where d.id=c.portfolio_id and d.withdrawn_at is null));
 if not found then raise exception 'Unavailable'; end if;
 return true;
end $$;

create function public.m11a_decide(p_claim uuid,p_decision text,p_note text) returns boolean language plpgsql security definer set search_path='' as $$
declare c public.credential_skill_claims;
begin
 select * into c from public.credential_skill_claims where id=p_claim for update;
 if c.id is null or c.state<>'submitted' or c.owner_id=auth.uid()
 or not exists(select 1 from public.team_expert_profiles where id=c.expert_id and reviewer_id=auth.uid() and active)
 or not exists(select 1 from public.credential_documents where id=c.credential_id and withdrawn_at is null)
 then raise exception 'Unavailable'; end if;
 insert into public.credential_expert_decisions(claim_id,reviewer_id,decision,explanation,approved_wording)
 values(c.id,auth.uid(),p_decision,trim(p_note),case when p_decision='approved' then c.proposed_wording end);
 update public.credential_skill_claims set state=p_decision where id=c.id;
 return true;
end $$;

create function public.m11a_create_version(p_claim uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare c public.credential_skill_claims; d public.credential_expert_decisions; result uuid; current_parent uuid;
begin
 select * into c from public.credential_skill_claims where id=p_claim and owner_id=auth.uid() for update;
 if c.id is null then raise exception 'Unavailable'; end if;
 perform 1 from public.cv_documents where id=c.source_cv_id and owner_id=auth.uid() and processing_status='ready' for update;
 if not found then raise exception 'Unavailable'; end if;
 if c.state='version_created' then
  select v.id into result from public.cv_versions v join public.cv_version_skill_claims x on x.version_id=v.id where x.claim_id=c.id and v.parent_version_id is not distinct from c.parent_version_id;
  return result;
 end if;
 select * into d from public.credential_expert_decisions where claim_id=c.id and decision='approved';
 if c.state<>'approved' or d.id is null or d.approved_wording<>c.proposed_wording
 or not exists(select 1 from public.credential_documents where id=c.credential_id and withdrawn_at is null) then raise exception 'Unavailable'; end if;
 select id into current_parent from public.cv_versions where source_cv_id=c.source_cv_id and state='accepted';
 if current_parent is distinct from c.parent_version_id then raise exception 'Unavailable'; end if;
 insert into public.cv_versions(owner_id,source_cv_id,parent_version_id,version_number,content_snapshot)
 select c.owner_id,c.source_cv_id,c.parent_version_id,coalesce(max(version_number),0)+1,c.source_snapshot || E'\n\n' || d.approved_wording
 from public.cv_versions where source_cv_id=c.source_cv_id returning id into result;
 if c.parent_version_id is not null then
  insert into public.cv_version_skill_claims select result,claim_id,decision_id from public.cv_version_skill_claims where version_id=c.parent_version_id;
 end if;
 insert into public.cv_version_skill_claims values(result,c.id,d.id);
 update public.credential_skill_claims set state='version_created' where id=c.id;
 return result;
end $$;

create function public.m11a_review_version(p_version uuid,p_accept boolean) returns boolean language plpgsql security definer set search_path='' as $$
declare v public.cv_versions; current_parent uuid;
begin
 -- Lock source before version, same ordering as candidate creation.
 select * into v from public.cv_versions where id=p_version and owner_id=auth.uid();
 if v.id is null then raise exception 'Unavailable'; end if;
 perform 1 from public.cv_documents where id=v.source_cv_id and owner_id=auth.uid() for update;
 select * into v from public.cv_versions where id=p_version and owner_id=auth.uid() for update;
 if v.state<>'candidate' then raise exception 'Unavailable'; end if;
 if not p_accept then update public.cv_versions set state='rejected' where id=v.id; return true; end if;
 if exists(select 1 from public.cv_version_skill_claims x join public.credential_skill_claims c on c.id=x.claim_id join public.credential_documents d on d.id=c.credential_id where x.version_id=v.id and (c.state='withdrawn' or d.withdrawn_at is not null)) then raise exception 'Unavailable'; end if;
 select id into current_parent from public.cv_versions where source_cv_id=v.source_cv_id and state='accepted';
 if current_parent is distinct from v.parent_version_id then raise exception 'Unavailable'; end if;
 update public.cv_versions set state='superseded' where source_cv_id=v.source_cv_id and state='accepted';
 update public.cv_versions set state='accepted',accepted_at=now() where id=v.id;
 return true;
end $$;

create function public.m11a_withdraw_document(p_kind text,p_document uuid) returns text language plpgsql security definer set search_path='' as $$
declare result text;
begin
 if p_kind='credential' then
  -- Lock affected claims first to serialize against expert decisions.
  perform 1 from public.credential_skill_claims where credential_id=p_document and owner_id=auth.uid() for update;
  update public.credential_documents set withdrawn_at=coalesce(withdrawn_at,now()) where id=p_document and owner_id=auth.uid() returning storage_path into result;
  if result is null then raise exception 'Unavailable'; end if;
  update public.credential_skill_claims set state='withdrawn' where credential_id=p_document and owner_id=auth.uid();
  update public.cv_versions v set state='evidence_withdrawn' where exists(select 1 from public.cv_version_skill_claims x join public.credential_skill_claims c on c.id=x.claim_id where x.version_id=v.id and c.credential_id=p_document and c.owner_id=auth.uid());
 elsif p_kind='portfolio' then
  perform 1 from public.credential_skill_claims where portfolio_id=p_document and owner_id=auth.uid() for update;
  update public.portfolio_documents set withdrawn_at=coalesce(withdrawn_at,now()) where id=p_document and owner_id=auth.uid() returning storage_path into result;
  if result is null then raise exception 'Unavailable'; end if;
  update public.credential_skill_claims set state='withdrawn' where portfolio_id=p_document and owner_id=auth.uid();
  update public.cv_versions v set state='evidence_withdrawn' where exists(select 1 from public.cv_version_skill_claims x join public.credential_skill_claims c on c.id=x.claim_id where x.version_id=v.id and c.portfolio_id=p_document and c.owner_id=auth.uid());
 else raise exception 'Unavailable'; end if;
 return result;
end $$;

-- Experts have no table grants for other owners. Narrow RPCs omit identity/path,
-- filenames and unrelated workspace content. Detail is only for one assignment.
create function public.m11a_experts() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',display_name,'specialty',specialty)),'[]'::jsonb)
 from public.team_expert_profiles where active and auth.uid() is not null and reviewer_id<>auth.uid()
$$;
create function public.m11a_expert_queue() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.team_expert_profiles where reviewer_id=auth.uid() and active) then raise exception 'Unavailable'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'skill',c.skill_label,'wording',c.proposed_wording,'state',c.state,'createdAt',c.submitted_at)),'[]'::jsonb)
 from public.credential_skill_claims c join public.team_expert_profiles e on e.id=c.expert_id where e.reviewer_id=auth.uid() and e.active and c.state='submitted' and c.owner_id<>auth.uid());
end $$;
create function public.m11a_expert_detail(p_claim uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare c public.credential_skill_claims;
begin
 select c1.* into c from public.credential_skill_claims c1 join public.team_expert_profiles e on e.id=c1.expert_id where c1.id=p_claim and c1.state='submitted' and e.reviewer_id=auth.uid() and e.active and c1.owner_id<>auth.uid();
 if c.id is null then raise exception 'Unavailable'; end if;
 return jsonb_build_object('id',c.id,'skill',c.skill_label,'wording',c.proposed_wording,'context',left(c.source_snapshot,2000),'hasPortfolio',c.portfolio_id is not null);
end $$;
create function public.m11a_evidence_path(p_claim uuid,p_kind text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare c public.credential_skill_claims; result jsonb;
begin
 select c1.* into c from public.credential_skill_claims c1 where c1.id=p_claim and (c1.owner_id=auth.uid() or (c1.state='submitted' and c1.owner_id<>auth.uid() and exists(select 1 from public.team_expert_profiles e where e.id=c1.expert_id and e.reviewer_id=auth.uid() and e.active)));
 if c.id is null then raise exception 'Unavailable'; end if;
 if p_kind='credential' then select jsonb_build_object('path',storage_path,'mime',content_type,'bucket','credential-private') into result from public.credential_documents where id=c.credential_id and withdrawn_at is null;
 elsif p_kind='portfolio' then select jsonb_build_object('path',storage_path,'mime',content_type,'bucket','portfolio-private') into result from public.portfolio_documents where id=c.portfolio_id and withdrawn_at is null;
 end if;
 if result is null then raise exception 'Unavailable'; end if;
 return result;
end $$;
create function public.m11a_can_read_evidence(p_bucket text,p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.credential_skill_claims c join public.team_expert_profiles e on e.id=c.expert_id
 where c.state='submitted' and c.owner_id<>auth.uid() and e.reviewer_id=auth.uid() and e.active and (
 (p_bucket='credential-private' and exists(select 1 from public.credential_documents d where d.id=c.credential_id and d.storage_path=p_path and d.withdrawn_at is null)) or
 (p_bucket='portfolio-private' and exists(select 1 from public.portfolio_documents d where d.id=c.portfolio_id and d.storage_path=p_path and d.withdrawn_at is null))))
$$;
create policy m11a_assigned_read on storage.objects for select to authenticated using(public.m11a_can_read_evidence(bucket_id,name));

revoke all on function public.m11a_register_document(text,text,text,text,integer,text), public.m11a_create_claim(uuid,uuid,uuid,uuid,text,text),
 public.m11a_submit_claim(uuid), public.m11a_decide(uuid,text,text), public.m11a_create_version(uuid), public.m11a_review_version(uuid,boolean),
 public.m11a_withdraw_document(text,uuid), public.m11a_experts(), public.m11a_expert_queue(), public.m11a_expert_detail(uuid),
 public.m11a_evidence_path(uuid,text), public.m11a_can_read_evidence(text,text) from public,anon;
grant execute on function public.m11a_register_document(text,text,text,text,integer,text), public.m11a_create_claim(uuid,uuid,uuid,uuid,text,text),
 public.m11a_submit_claim(uuid), public.m11a_decide(uuid,text,text), public.m11a_create_version(uuid), public.m11a_review_version(uuid,boolean),
 public.m11a_withdraw_document(text,uuid), public.m11a_experts(), public.m11a_expert_queue(), public.m11a_expert_detail(uuid),
 public.m11a_evidence_path(uuid,text), public.m11a_can_read_evidence(text,text) to authenticated;
