-- General schema/calculation for the capped October demo; creates ZERO grants.
-- Prerequisite: 20261026_ownpath_unknown_acknowledgements.sql.
-- The separately reviewed diagnostics/ownpath_demo_credits_20261026.sql is an
-- operator grant, never an automatic deployment action. Do not replay it hosted.
begin;
create table public.ownpath_demo_credits (
  owner_id uuid not null references auth.users(id), period_key text not null check(period_key like 'free:%'),
  action text not null check(action in('scan','rewrite')), quantity integer not null check(quantity=3),
  grant_reference text not null check(grant_reference='ownpath-owner-demo-20261029-3x3-v1'),
  reason text not null check(reason='Owner-authorized October 29 demo; historical usage retained'),
  expires_at timestamptz not null check(expires_at='2026-10-30 00:00:00 Asia/Ho_Chi_Minh'::timestamptz),
  granted_at timestamptz not null default clock_timestamp(), granted_by text not null default current_user,
  primary key(owner_id,period_key,action,grant_reference), unique(grant_reference,action),
  check(granted_at<expires_at)
);
alter table public.ownpath_demo_credits enable row level security;
revoke all on public.ownpath_demo_credits from public,anon,authenticated,service_role;
create trigger ownpath_demo_credit_immutable before update or delete on public.ownpath_demo_credits
  for each row execute function public.ownpath_ai_acknowledgement_immutable();
create trigger ownpath_demo_credit_no_truncate before truncate on public.ownpath_demo_credits
  for each statement execute function public.ownpath_ai_acknowledgement_immutable();
create function public.ownpath_apply_demo_credits(p_owner uuid,p_plan jsonb,p_at timestamptz) returns jsonb language plpgsql stable set search_path='' as $helper$
declare s integer; r integer;
begin
  select coalesce(sum(quantity) filter(where action='scan'),0),coalesce(sum(quantity) filter(where action='rewrite'),0)
    into s,r from public.ownpath_demo_credits
    where owner_id=p_owner and period_key=p_plan->>'period_key'
      and granted_at<=p_at and p_at<expires_at
      and (p_plan->>'starts_at')::timestamptz<=p_at and p_at<(p_plan->>'ends_at')::timestamptz;
  return p_plan||jsonb_build_object('scans',(p_plan->>'scans')::integer+s,'rewrites',(p_plan->>'rewrites')::integer+r);
end
$helper$;
revoke all on function public.ownpath_apply_demo_credits(uuid,jsonb,timestamptz) from public,anon,authenticated,service_role;
do $upgrade$
declare body text;
begin
  select prosrc into strict body from pg_proc where oid='public.ownpath_plan(uuid)'::regprocedure;
  if md5(btrim(body,E' \t\r\n'))<>'b6246f0132c4b06a16ffa5f1ede27e0c' then raise exception 'Unexpected base plan implementation'; end if;
  body:=replace(body,
    'return p.benefits||jsonb_build_object(''plan'',''Pro'',''period_key'',p.id::text,''starts_at'',p.starts_at,''ends_at'',p.ends_at,''catalog_version'',p.catalog_version);',
    'return public.ownpath_apply_demo_credits(p_owner,p.benefits||jsonb_build_object(''plan'',''Pro'',''period_key'',p.id::text,''starts_at'',p.starts_at,''ends_at'',p.ends_at,''catalog_version'',p.catalog_version),n);');
  body:=replace(body,
    'return f||jsonb_build_object(''plan'',''Free'',''period_key'',''free:''||to_char(s at time zone ''UTC'',''YYYY-MM-DD HH24:MI:SS''),''starts_at'',s,''ends_at'',e,''catalog_version'',v);',
    'return public.ownpath_apply_demo_credits(p_owner,f||jsonb_build_object(''plan'',''Free'',''period_key'',''free:''||to_char(s at time zone ''UTC'',''YYYY-MM-DD HH24:MI:SS''),''starts_at'',s,''ends_at'',e,''catalog_version'',v),n);');
  if md5(btrim(body,E' \t\r\n'))<>'25a7e6d4f9e4b3c5e916a8b8af5518d4' then raise exception 'Unexpected plan transformation'; end if;
  execute 'create or replace function public.ownpath_plan(p_owner uuid) returns jsonb language plpgsql security definer set search_path='''' as '||quote_literal(body);
end
$upgrade$;
commit;
