-- General fresh-database schema only. NO owner acknowledgement or usage changes.
-- Prerequisite: 20261022_ownpath_billing.sql. Already-installed hosted schema must
-- be inventoried, not blindly replayed. Owner-specific operations live in diagnostics/.
begin;
create table public.ownpath_ai_unknown_acknowledgements (
  owner_id uuid not null, request_id text not null, action text not null check(action in('scan','rewrite')),
  original_started_at timestamptz not null,
  actual_outcome text not null default 'unknown' check(actual_outcome='unknown'),
  usage_policy text not null default 'retain' check(usage_policy='retain'),
  reason text not null check(reason='owner_acknowledged_historical_risk_20261026'),
  acknowledged_at timestamptz not null default clock_timestamp(),
  acknowledged_by text not null default current_user,
  primary key(owner_id,request_id),
  foreign key(owner_id,request_id) references public.ownpath_ai_requests(owner_id,request_id)
);
alter table public.ownpath_ai_unknown_acknowledgements enable row level security;
revoke all on public.ownpath_ai_unknown_acknowledgements from public,anon,authenticated,service_role;
create function public.ownpath_ai_acknowledgement_immutable() returns trigger language plpgsql set search_path=''
as $$begin raise exception 'AI unknown acknowledgements are append-only'; end$$;
revoke all on function public.ownpath_ai_acknowledgement_immutable() from public,anon,authenticated,service_role;
create trigger ownpath_ai_acknowledgement_immutable before update or delete on public.ownpath_ai_unknown_acknowledgements
  for each row execute function public.ownpath_ai_acknowledgement_immutable();
create trigger ownpath_ai_acknowledgement_no_truncate before truncate on public.ownpath_ai_unknown_acknowledgements
  for each statement execute function public.ownpath_ai_acknowledgement_immutable();
do $upgrade$
declare body text;
begin
  select prosrc into strict body from pg_proc where oid='public.ownpath_reserve_ai(text,text,text,text)'::regprocedure;
  if md5(btrim(body,E' \t\r\n'))<>'39b383bf491cc25b4a76499b02d84713' then raise exception 'Unexpected base reservation implementation'; end if;
  body:=replace(body,'select count(*) from public.ownpath_ai_requests where owner_id=u and state=''unknown''',
    'select count(*) from public.ownpath_ai_requests r where r.owner_id=u and r.state=''unknown'' and not exists(select 1 from public.ownpath_ai_unknown_acknowledgements a where a.owner_id=r.owner_id and a.request_id=r.request_id)');
  if md5(btrim(body,E' \t\r\n'))<>'dd72eeeb5125a6c0f1004869e00106bf' then raise exception 'Unexpected reservation transformation'; end if;
  execute 'create or replace function public.ownpath_reserve_ai(p_id text,p_action text,p_ticket_hash text,p_digest text) returns text language plpgsql security definer set search_path='''' as '||quote_literal(body);
end
$upgrade$;
commit;
