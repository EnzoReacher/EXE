-- Credit mechanism extension ONLY: inserts ZERO grants and changes no allowances.
-- Retains the exact historical 3+3 policy and permits only the one explicitly
-- authorized replacement reference. Client privileges/helper/admission unchanged.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
do $policy$
declare
  q text; g text; r text;
  expected constant text := $check$CHECK ((((quantity = 3) AND (grant_reference = 'ownpath-owner-demo-20261029-3x3-v1'::text) AND (reason = 'Owner-authorized October 29 demo; historical usage retained'::text)) OR ((quantity = 1) AND (action = 'rewrite'::text) AND (grant_reference = 'ownpath-rewrite-replacement-71f84880-13ef-4890-8334-8b1850c2915b-v1'::text) AND (reason = 'Owner-authorized one replacement Rewrite; notes length rejection; historical usage retained'::text))))$check$;
begin
  if current_user <> pg_get_userbyid((select relowner from pg_class where oid='public.ownpath_demo_credits'::regclass)) then
    raise exception 'Trusted credit ledger owner required';
  end if;
  lock table public.ownpath_demo_credits in access exclusive mode;
  if exists(select 1 from pg_constraint where conrelid='public.ownpath_demo_credits'::regclass and conname='ownpath_demo_credits_grant_policy_check') then
    if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.ownpath_demo_credits'::regclass and conname='ownpath_demo_credits_grant_policy_check' and convalidated) is distinct from expected
      or exists(select 1 from pg_constraint where conrelid='public.ownpath_demo_credits'::regclass and conname in ('ownpath_demo_credits_quantity_check','ownpath_demo_credits_grant_reference_check','ownpath_demo_credits_reason_check')) then
      raise exception 'Replacement credit policy drift';
    end if;
    return;
  end if;
  select pg_get_constraintdef(oid) into q from pg_constraint where conrelid='public.ownpath_demo_credits'::regclass and conname='ownpath_demo_credits_quantity_check' and convalidated;
  select pg_get_constraintdef(oid) into g from pg_constraint where conrelid='public.ownpath_demo_credits'::regclass and conname='ownpath_demo_credits_grant_reference_check' and convalidated;
  select pg_get_constraintdef(oid) into r from pg_constraint where conrelid='public.ownpath_demo_credits'::regclass and conname='ownpath_demo_credits_reason_check' and convalidated;
  if q is distinct from 'CHECK ((quantity = 3))'
    or g is distinct from 'CHECK ((grant_reference = ''ownpath-owner-demo-20261029-3x3-v1''::text))'
    or r is distinct from 'CHECK ((reason = ''Owner-authorized October 29 demo; historical usage retained''::text))' then
    raise exception 'Unreviewed credit constraints; no changes made';
  end if;
  alter table public.ownpath_demo_credits
    add constraint ownpath_demo_credits_grant_policy_check check (
      (quantity=3 and grant_reference='ownpath-owner-demo-20261029-3x3-v1'
        and reason='Owner-authorized October 29 demo; historical usage retained')
      or
      (quantity=1 and action='rewrite'
        and grant_reference='ownpath-rewrite-replacement-71f84880-13ef-4890-8334-8b1850c2915b-v1'
        and reason='Owner-authorized one replacement Rewrite; notes length rejection; historical usage retained')
    );
  alter table public.ownpath_demo_credits
    drop constraint ownpath_demo_credits_quantity_check,
    drop constraint ownpath_demo_credits_grant_reference_check,
    drop constraint ownpath_demo_credits_reason_check;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.ownpath_demo_credits'::regclass and conname='ownpath_demo_credits_grant_policy_check') is distinct from expected then
    raise exception 'Unexpected replacement constraint transformation';
  end if;
end
$policy$;
commit;
