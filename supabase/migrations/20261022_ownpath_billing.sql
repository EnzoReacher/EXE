-- Current product; prerequisite: 20261019 profiles/versions + 20261021 reservations.
-- No hosted execution authorized. Catalog deployment snapshot: catalog.ts.
begin;
alter table public.ownpath_ai_policy add column billing_catalog_version text not null default '2026-10-draft-1',
 add column billing_free jsonb not null default '{"scans":3,"rewrites":1,"saves":3}',
 add column billing_allow_fake boolean not null default false,
 add column billing_live_accepted boolean not null default false;
create table public.ownpath_orders (
 id uuid primary key default gen_random_uuid(), owner_id uuid references auth.users(id) on delete set null,
 operation text not null default 'pro_purchase' check(operation='pro_purchase'),
 idempotency_key text not null check(length(idempotency_key) between 16 and 80), input_digest text not null check(input_digest ~ '^[a-f0-9]{64}$'),
 order_code bigint not null unique default (('x'||substr(replace(gen_random_uuid()::text,'-',''),1,13))::bit(52)::bigint) check(order_code>0 and order_code<=9007199254740991),
 amount integer not null check(amount>0), currency text not null check(currency='VND'), catalog_version text not null,
 duration_seconds integer not null check(duration_seconds=2592000), benefits jsonb not null,
 provider text not null check(provider='payos'), channel text not null, environment text not null check(environment in ('LOCAL_FAKE','LIVE')),
 state text not null default 'pending' check(state in ('pending','confirmed','activating','active','expired','needs_review')),
 provider_link text, checkout_url text, creation_attempted boolean not null default false,
 accepted_reference text, created_at timestamptz not null default clock_timestamp(), checkout_expires_at timestamptz not null default clock_timestamp()+interval '30 minutes',
 next_attempt_at timestamptz not null default clock_timestamp(), attempts integer not null default 0,
 lease_token uuid, lease_until timestamptz, last_code text, adjustment jsonb,
 unique(owner_id,operation,idempotency_key), unique(provider,channel,environment,provider_link), unique(provider,channel,environment,accepted_reference)
);
create table public.ownpath_payment_receipts (
 id uuid primary key default gen_random_uuid(), order_id uuid references public.ownpath_orders(id),
 provider text not null default 'payos', channel text not null, environment text not null,
 reference text not null, digest text not null check(digest ~ '^[a-f0-9]{64}$'),
 order_code bigint not null, amount integer not null, currency text not null, provider_link text not null,
 validation text not null check(validation in ('verified','unknown_order','needs_review','processed')),
 created_at timestamptz not null default clock_timestamp(), unique(provider,channel,environment,reference)
);
create table public.ownpath_purchased_periods (
 id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.ownpath_orders(id),
 owner_id uuid references auth.users(id) on delete set null,
 starts_at timestamptz not null, ends_at timestamptz not null check(ends_at>starts_at), benefits jsonb not null,
 catalog_version text not null, environment text not null, revoked_at timestamptz, adjustment jsonb
);
create index ownpath_period_owner on public.ownpath_purchased_periods(owner_id,starts_at,ends_at);
create index ownpath_orders_recovery on public.ownpath_orders(next_attempt_at) where state not in ('active');
create table public.ownpath_billing_support (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.ownpath_orders(id),
 owner_id uuid references auth.users(id) on delete set null, idempotency_key uuid not null,
 kind text not null check(kind in ('help','refund')), note text not null check(length(note)<=1000),
 state text not null default 'requested' check(state in ('requested','needs_review','transfer_confirmed')),
 created_at timestamptz not null default clock_timestamp(), confirmation jsonb,
 unique(owner_id,idempotency_key)
);
alter table public.ownpath_orders enable row level security;
alter table public.ownpath_payment_receipts enable row level security;
alter table public.ownpath_purchased_periods enable row level security;
alter table public.ownpath_billing_support enable row level security;
revoke all on public.ownpath_orders,public.ownpath_payment_receipts,public.ownpath_purchased_periods,public.ownpath_billing_support from public,anon,authenticated;
-- No direct browser table access: safe own projection below excludes provider/lease data.
grant all on public.ownpath_orders,public.ownpath_payment_receipts,public.ownpath_purchased_periods,public.ownpath_billing_support to service_role;

create function public.ownpath_plan(p_owner uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare n timestamptz:=clock_timestamp(); p public.ownpath_purchased_periods; f jsonb; v text; s timestamptz; e timestamptz;
begin
 select billing_free,billing_catalog_version into f,v from public.ownpath_ai_policy where singleton;
 select q.* into p from public.ownpath_purchased_periods q where q.owner_id=p_owner and q.revoked_at is null and q.starts_at<=n and n<q.ends_at
 and (q.environment='LIVE' or (select billing_allow_fake from public.ownpath_ai_policy where singleton)) order by q.starts_at desc limit 1;
 if found then return p.benefits||jsonb_build_object('plan','Pro','period_key',p.id::text,'starts_at',p.starts_at,'ends_at',p.ends_at,'catalog_version',p.catalog_version); end if;
 s:=date_trunc('month',n at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh';
 e:=(date_trunc('month',n at time zone 'Asia/Ho_Chi_Minh')+interval '1 month') at time zone 'Asia/Ho_Chi_Minh';
 return f||jsonb_build_object('plan','Free','period_key','free:'||to_char(s at time zone 'UTC','YYYY-MM-DD HH24:MI:SS'),'starts_at',s,'ends_at',e,'catalog_version',v);
end $$;
revoke all on function public.ownpath_plan(uuid) from public,anon,authenticated;

-- One trusted transactional command boundary. No provider HTTP inside any lock.
create function public.ownpath_billing_command(p_op text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.ownpath_orders; r public.ownpath_payment_receipts; u uuid; n timestamptz:=clock_timestamp(); t uuid; s timestamptz; e timestamptz; result jsonb;
begin
 if p_op='create' then
  u:=(p->>'owner')::uuid; if not exists(select 1 from auth.users where id=u) then raise exception 'owner missing'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text,621));
  select * into o from public.ownpath_orders where owner_id=u and idempotency_key=p->>'key';
  if found then if o.input_digest<>p->>'digest' then raise exception 'idempotency conflict'; end if; return to_jsonb(o); end if;
  if (select count(*) from public.ownpath_orders where owner_id=u and created_at>n-interval '1 hour')>=6 then raise exception 'checkout rate limit'; end if;
  if p->>'version'<>(select billing_catalog_version from public.ownpath_ai_policy where singleton) then raise exception 'quote changed'; end if;
  if (p->>'environment'='LOCAL_FAKE' and not (select billing_allow_fake from public.ownpath_ai_policy where singleton)) or
     (p->>'environment'='LIVE' and not (select billing_live_accepted from public.ownpath_ai_policy where singleton)) then raise exception 'billing disabled'; end if;
  if p->'benefits'<>'{"scans":30,"rewrites":15,"saves":30}'::jsonb or (p->>'duration')::int<>2592000 then raise exception 'catalog benefits mismatch'; end if;
  if p->>'environment'='LOCAL_FAKE' and (p->>'amount')::int<>79000 then raise exception 'fixture price mismatch'; end if;
  insert into public.ownpath_orders(owner_id,idempotency_key,input_digest,amount,currency,catalog_version,duration_seconds,benefits,provider,channel,environment)
  values(u,p->>'key',p->>'digest',(p->>'amount')::int,'VND',p->>'version',2592000,p->'benefits','payos',p->>'channel',p->>'environment') returning * into o;
  return to_jsonb(o);
 elsif p_op='get' then
  select * into o from public.ownpath_orders where id=(p->>'id')::uuid and (not(p?'owner') or owner_id=(p->>'owner')::uuid);
  if o.id is null then return null; end if;
  return to_jsonb(o)||jsonb_build_object('state',case when o.state='pending' and o.checkout_expires_at<=n then 'expired' else o.state end,'period',(select jsonb_build_object('starts_at',starts_at,'ends_at',ends_at,'revoked_at',revoked_at,'state',case when revoked_at is not null then 'needs_review' when ends_at<=n then 'expired' when starts_at>n then 'activating' else 'active' end) from public.ownpath_purchased_periods where order_id=o.id));
 elsif p_op='claim' then
  select * into o from public.ownpath_orders where (not(p?'id') or id=(p->>'id')::uuid) and state<>'active' and coalesce(last_code,'') not in ('creation_rejected','financial_mismatch') and next_attempt_at<=n and (lease_until is null or lease_until<n) order by next_attempt_at for update skip locked limit 1;
  if not found then return null; end if;
  t:=gen_random_uuid(); update public.ownpath_orders set lease_token=t,lease_until=n+interval '60 seconds',attempts=attempts+1 where id=o.id returning * into o;return to_jsonb(o);
 elsif p_op='attempt_create' then
  update public.ownpath_orders set creation_attempted=true where id=(p->>'id')::uuid and lease_token=(p->>'lease')::uuid and lease_until>n returning * into o;return to_jsonb(o);
 elsif p_op='link' then
  update public.ownpath_orders set provider_link=p->>'link',checkout_url=p->>'url' where id=(p->>'id')::uuid and lease_token=(p->>'lease')::uuid and lease_until>n and (provider_link is null or provider_link=p->>'link') returning * into o;return to_jsonb(o);
 elsif p_op='receipt' then
  select * into o from public.ownpath_orders where order_code=(p->>'code')::bigint and channel=p->>'channel' and environment=p->>'environment' for update;
  select * into r from public.ownpath_payment_receipts where provider='payos' and channel=p->>'channel' and environment=p->>'environment' and reference=p->>'reference' for update;
  if found then if r.digest<>p->>'digest' then raise exception 'receipt financial conflict'; end if; return to_jsonb(r); end if;
  insert into public.ownpath_payment_receipts(order_id,channel,environment,reference,digest,order_code,amount,currency,provider_link,validation)
  values(o.id,p->>'channel',p->>'environment',p->>'reference',p->>'digest',(p->>'code')::bigint,(p->>'amount')::int,p->>'currency',p->>'link',case when o.id is null then 'unknown_order' when o.amount<>(p->>'amount')::int or p->>'currency'<>'VND' or (o.provider_link is not null and o.provider_link<>p->>'link') then 'needs_review' else 'verified' end)
  on conflict (provider,channel,environment,reference) do nothing returning * into r;
  if r.id is null then select * into r from public.ownpath_payment_receipts where channel=p->>'channel' and environment=p->>'environment' and reference=p->>'reference'; if r.digest<>p->>'digest' then raise exception 'receipt financial conflict'; end if; end if;
  if r.validation='verified' then update public.ownpath_orders set next_attempt_at=least(next_attempt_at,n) where id=o.id and state<>'active';
  elsif r.validation='needs_review' then update public.ownpath_orders set state='needs_review',last_code='financial_mismatch' where id=o.id and state<>'active'; end if;
  return to_jsonb(r);
 elsif p_op='paid' then
  -- Financial locking order: owner lock, then order row. Unique receipt funding.
  select owner_id into u from public.ownpath_orders where id=(p->>'id')::uuid;
  if u is null then raise exception 'owner unavailable; manual review'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text,621));
  n:=clock_timestamp();
  select * into o from public.ownpath_orders where id=(p->>'id')::uuid for update;
  if exists(select 1 from public.ownpath_purchased_periods where order_id=o.id) then return to_jsonb(o); end if;
  if o.lease_token is distinct from (p->>'lease')::uuid or o.lease_until<=n then raise exception 'lease lost'; end if;
  select * into r from public.ownpath_payment_receipts where id=(p->>'receipt')::uuid for update;
  if r.order_id is distinct from o.id or r.order_code<>o.order_code or r.amount<>o.amount or r.currency<>'VND' or r.provider_link<>o.provider_link or r.channel<>o.channel or r.environment<>o.environment or r.validation not in ('verified','processed') then raise exception 'receipt mismatch'; end if;
  update public.ownpath_orders set state='confirmed',accepted_reference=r.reference where id=o.id;
  if o.environment='LIVE' and not (select billing_live_accepted from public.ownpath_ai_policy where singleton) then return to_jsonb(o); end if;
  if o.environment='LOCAL_FAKE' and not (select billing_allow_fake from public.ownpath_ai_policy where singleton) then raise exception 'fake entitlement disabled'; end if;
  select greatest(n,coalesce(max(ends_at),n)) into s from public.ownpath_purchased_periods where owner_id=u and revoked_at is null;
  e:=s+make_interval(secs=>o.duration_seconds);
  insert into public.ownpath_purchased_periods(order_id,owner_id,starts_at,ends_at,benefits,catalog_version,environment) values(o.id,u,s,e,o.benefits,o.catalog_version,o.environment);
  update public.ownpath_payment_receipts set validation='processed' where id=r.id;
  update public.ownpath_orders set state='active',lease_token=null,lease_until=null,last_code='fulfilled' where id=o.id returning * into o;return to_jsonb(o);
 elsif p_op='defer' then
  update public.ownpath_orders set state=case when state='active' then state when p->>'code' in ('review','creation_rejected') then 'needs_review' when state='pending' and checkout_expires_at<n then 'expired' else state end,
  last_code=p->>'code',next_attempt_at=n+make_interval(secs=>least(21600,30*power(2,least(attempts,10))::int)),lease_token=null,lease_until=null
  where id=(p->>'id')::uuid and lease_token=(p->>'lease')::uuid returning * into o;return to_jsonb(o);
 elsif p_op='refund_confirm' then
  select owner_id into u from public.ownpath_orders where id=(p->>'id')::uuid;
  if u is not null then perform pg_advisory_xact_lock(hashtextextended(u::text,621)); end if;
  select * into o from public.ownpath_orders where id=(p->>'id')::uuid for update;
  if o.id is null or o.accepted_reference is null or length(coalesce(p->>'reference',''))<3 or length(coalesce(p->>'reason',''))<3 then raise exception 'verified payment and confirmation required'; end if;
  if o.adjustment is not null then if o.adjustment->>'reference'<>p->>'reference' then raise exception 'previous transfer must be reconciled'; end if; return o.adjustment; end if;
  result:=jsonb_build_object('reference',p->>'reference','reason',p->>'reason','recorded_at',n,'actor',session_user,'application',current_setting('application_name'),'revoked',coalesce((p->>'revoke')::boolean,false));
  update public.ownpath_orders set adjustment=result where id=o.id;
  if (p->>'revoke')::boolean then update public.ownpath_purchased_periods set revoked_at=n,adjustment=result where order_id=o.id; end if;
  update public.ownpath_billing_support set state='transfer_confirmed',confirmation=result where order_id=o.id and kind='refund';return result;
 end if;
 raise exception 'unsupported billing operation';
end $$;
revoke all on function public.ownpath_billing_command(text,jsonb) from public,anon,authenticated;
grant execute on function public.ownpath_billing_command(text,jsonb) to service_role;

alter table public.ownpath_ai_requests add column input_digest text,add column period_key text,add column period_ends_at timestamptz;
update public.ownpath_ai_requests set period_key='free:'||to_char((date_trunc('month',started_at at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh') at time zone 'UTC','YYYY-MM-DD HH24:MI:SS'),
 period_ends_at=(date_trunc('month',started_at at time zone 'Asia/Ho_Chi_Minh')+interval '1 month') at time zone 'Asia/Ho_Chi_Minh';
create function public.ownpath_reserve_ai(p_id text,p_action text,p_ticket_hash text,p_digest text) returns text language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); n timestamptz:=clock_timestamp(); policy public.ownpath_ai_policy; plan jsonb; previous public.ownpath_ai_requests; used integer; allowance integer;
begin
 if u is null or p_id is null or p_action is null or p_ticket_hash is null or p_digest is null or p_id !~ '^[a-zA-Z0-9-]{16,80}$' or p_action not in ('scan','rewrite') or p_ticket_hash !~ '^[a-f0-9]{64}$' or p_digest !~ '^[a-f0-9]{64}$' then raise exception 'invalid authenticated reservation'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,621));
 select * into previous from public.ownpath_ai_requests where owner_id=u and request_id=p_id;
 if found then
  if previous.action<>p_action or previous.input_digest is distinct from p_digest then return 'conflict'; end if;
  return case when previous.state='completed' then 'completed_unavailable' when previous.state='failed' then 'failed_unavailable' else 'duplicate' end;
 end if;
 select * into strict policy from public.ownpath_ai_policy where singleton;
 update public.ownpath_ai_requests set state='unknown' where owner_id=u and state='pending' and hold_until<=n;
 if (select count(*) from public.ownpath_ai_requests where owner_id=u and state='unknown')>=policy.unresolved_limit then return 'reconcile'; end if;
 if (select count(*) from public.ownpath_ai_requests where owner_id=u and started_at>n-make_interval(secs=>policy.window_seconds))>=policy.request_limit then return 'quota'; end if;
 if (select count(*) from public.ownpath_ai_requests where owner_id=u and state in ('pending','unknown') and hold_until>n)>=policy.concurrency_limit then return 'busy'; end if;
 plan:=public.ownpath_plan(u); allowance:=(plan->>case when p_action='scan' then 'scans' else 'rewrites' end)::int;
 select count(*) into used from public.ownpath_ai_requests where owner_id=u and action=p_action and period_key=plan->>'period_key' and state in ('completed','pending','unknown');
 if used>=allowance then return 'plan_limit'; end if;
 insert into public.ownpath_ai_requests(owner_id,request_id,action,ticket_hash,input_digest,period_key,period_ends_at) values(u,p_id,p_action,p_ticket_hash,p_digest,plan->>'period_key',(plan->>'ends_at')::timestamptz);
 return 'reserved';
end $$;
revoke all on function public.ownpath_reserve_ai(text,text,text,text) from public,anon;
grant execute on function public.ownpath_reserve_ai(text,text,text,text) to authenticated;
-- No bypass through the old overload. Existing IDs are retained, never rerun.
create or replace function public.ownpath_reserve_ai(p_id text,p_action text,p_ticket_hash text) returns text language plpgsql as $$ begin raise exception 'updated reservation contract required'; end $$;

create function public.ownpath_saved_slot() returns trigger language plpgsql security definer set search_path='' as $$
declare plan jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text,621));
 if exists(select 1 from public.ownpath_cv_versions where id=new.id) then return new; end if;
 plan:=public.ownpath_plan(new.owner_id);
 if (select count(*) from public.ownpath_cv_versions where owner_id=new.owner_id)>=(plan->>'saves')::int then raise exception 'saved_cv_limit' using errcode='P0001'; end if;
 return new;
end $$;
revoke all on function public.ownpath_saved_slot() from public,anon,authenticated;
create trigger ownpath_saved_slot before insert on public.ownpath_cv_versions for each row execute function public.ownpath_saved_slot();

create function public.ownpath_billing_summary() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); plan jsonb; future public.ownpath_purchased_periods; history jsonb;
begin
 if u is null then raise exception 'authentication required'; end if;
 plan:=public.ownpath_plan(u);
 select * into future from public.ownpath_purchased_periods where owner_id=u and revoked_at is null and starts_at>clock_timestamp() order by starts_at limit 1;
 select coalesce(jsonb_agg(row_to_json(q)),'[]') into history from (select o.id,o.order_code,o.amount,o.currency,o.catalog_version,o.benefits,
 case when p.revoked_at is not null then 'needs_review' when p.ends_at<=clock_timestamp() then 'expired' when p.starts_at>clock_timestamp() then 'activating' when p.id is not null then 'active' when o.state='pending' and o.checkout_expires_at<=clock_timestamp() then 'expired' else o.state end as state,
 o.created_at,o.checkout_expires_at,(o.adjustment is not null) as refund_confirmed
 from public.ownpath_orders o left join public.ownpath_purchased_periods p on p.order_id=o.id where o.owner_id=u order by o.created_at desc limit 30) q;
 return jsonb_build_object('plan',plan||jsonb_build_object('scan_used',(select count(*) from public.ownpath_ai_requests where owner_id=u and period_key=plan->>'period_key' and action='scan' and state in ('completed','pending','unknown')),'rewrite_used',(select count(*) from public.ownpath_ai_requests where owner_id=u and period_key=plan->>'period_key' and action='rewrite' and state in ('completed','pending','unknown')),'saved_count',(select count(*) from public.ownpath_cv_versions where owner_id=u),'next_start',future.starts_at,'next_end',future.ends_at),'orders',history);
end $$;
revoke all on function public.ownpath_billing_summary() from public,anon;
grant execute on function public.ownpath_billing_summary() to authenticated;
create function public.ownpath_billing_support_request(p_order uuid,p_key uuid,p_kind text,p_note text) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); r public.ownpath_billing_support;
begin
 if u is null or p_kind not in ('help','refund') or length(p_note)>1000 or not exists(select 1 from public.ownpath_orders where id=p_order and owner_id=u) then raise exception 'invalid owned support request'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,621));
 select * into r from public.ownpath_billing_support where owner_id=u and idempotency_key=p_key;
 if found then if r.order_id<>p_order or r.kind<>p_kind or r.note<>p_note then raise exception 'support idempotency conflict'; end if; return r.id; end if;
 if (select count(*) from public.ownpath_billing_support where owner_id=u and created_at>clock_timestamp()-interval '1 day')>=3 then raise exception 'support request limit'; end if;
 insert into public.ownpath_billing_support(order_id,owner_id,idempotency_key,kind,note) values(p_order,u,p_key,p_kind,p_note) returning id into r.id;return r.id;
end $$;
revoke all on function public.ownpath_billing_support_request(uuid,uuid,text,text) from public,anon;
grant execute on function public.ownpath_billing_support_request(uuid,uuid,text,text) to authenticated;

create function public.ownpath_financial_immutable() returns trigger language plpgsql set search_path='' as $$
declare allowed text[];
begin
 if tg_table_name='ownpath_orders' then
  allowed:=array['owner_id','state','provider_link','checkout_url','creation_attempted','accepted_reference','next_attempt_at','attempts','lease_token','lease_until','last_code','adjustment'];
 elsif tg_table_name='ownpath_payment_receipts' then allowed:=array['validation'];
 elsif tg_table_name='ownpath_purchased_periods' then allowed:=array['owner_id','revoked_at','adjustment'];
 else allowed:=array['owner_id','state','confirmation']; end if;
 if to_jsonb(new)-allowed is distinct from to_jsonb(old)-allowed then raise exception 'immutable financial snapshot'; end if;
 if tg_table_name<>'ownpath_payment_receipts' then
  if new.owner_id is not null and new.owner_id is distinct from old.owner_id then raise exception 'financial owner cannot change'; end if;
 end if;
 return new;
end $$;
revoke all on function public.ownpath_financial_immutable() from public,anon,authenticated;
create trigger ownpath_order_immutable before update on public.ownpath_orders for each row execute function public.ownpath_financial_immutable();
create trigger ownpath_receipt_immutable before update on public.ownpath_payment_receipts for each row execute function public.ownpath_financial_immutable();
create trigger ownpath_period_immutable before update on public.ownpath_purchased_periods for each row execute function public.ownpath_financial_immutable();
create trigger ownpath_support_immutable before update on public.ownpath_billing_support for each row execute function public.ownpath_financial_immutable();
commit;
