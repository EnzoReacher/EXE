-- Current product. Explicit owner application required; no historical subsystem.
begin;
create table public.ownpath_ai_requests (
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null check (length(request_id) between 16 and 80),
  action text not null check (action in ('scan','rewrite')),
  ticket_hash text not null,
  state text not null default 'pending' check (state in ('pending','completed','failed','unknown')),
  started_at timestamptz not null default clock_timestamp(),
  hold_until timestamptz not null default clock_timestamp() + interval '5 minutes',
  primary key (owner_id, request_id)
);
alter table public.ownpath_ai_requests enable row level security;
create index ownpath_ai_requests_window on public.ownpath_ai_requests(owner_id, started_at desc);
create index ownpath_ai_requests_holds on public.ownpath_ai_requests(owner_id, hold_until) where state in ('pending','unknown');
revoke all on public.ownpath_ai_requests from public, anon, authenticated;
-- Server-only settings: not writable by authenticated clients.
create table public.ownpath_ai_policy (
  singleton boolean primary key default true check (singleton),
  window_seconds integer not null check (window_seconds between 60 and 86400),
  request_limit integer not null check (request_limit between 1 and 100),
  concurrency_limit integer not null check (concurrency_limit between 1 and 2),
  unresolved_limit integer not null check (unresolved_limit between 1 and 5)
);
insert into public.ownpath_ai_policy values (true, 3600, 12, 1, 2);
alter table public.ownpath_ai_policy enable row level security;
revoke all on public.ownpath_ai_policy from public, anon, authenticated;
create function public.ownpath_reserve_ai(p_id text, p_action text, p_ticket_hash text)
returns text language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); n timestamptz := clock_timestamp(); policy public.ownpath_ai_policy;
begin
  if u is null then raise exception 'authentication required'; end if;
  if p_id !~ '^[a-zA-Z0-9-]{16,80}$' or p_action not in ('scan','rewrite') or p_ticket_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid request'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text, 621));
  select * into strict policy from public.ownpath_ai_policy where singleton;
  if exists(select 1 from public.ownpath_ai_requests where owner_id = u and request_id = p_id) then return 'duplicate'; end if;
  update public.ownpath_ai_requests set state = 'unknown' where owner_id = u and state = 'pending' and hold_until <= n;
  -- Expiry is not proof of remote termination. Bound cumulative uncertainty,
  -- even across quota windows; only a trusted operator can reconcile old unknowns.
  if (select count(*) from public.ownpath_ai_requests where owner_id = u and state = 'unknown') >= policy.unresolved_limit then return 'reconcile'; end if;
  if (select count(*) from public.ownpath_ai_requests where owner_id = u and started_at > n - make_interval(secs => policy.window_seconds)) >= policy.request_limit then return 'quota'; end if;
  if (select count(*) from public.ownpath_ai_requests where owner_id = u and state in ('pending','unknown') and hold_until > n) >= policy.concurrency_limit then return 'busy'; end if;
  insert into public.ownpath_ai_requests(owner_id,request_id,action,ticket_hash) values(u,p_id,p_action,p_ticket_hash);
  return 'reserved';
end $$;
create function public.ownpath_finish_ai(p_id text, p_ticket_hash text, p_state text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_state not in ('completed','failed','unknown') then raise exception 'invalid request'; end if;
  update public.ownpath_ai_requests set state = p_state
  where owner_id = auth.uid() and request_id = p_id and ticket_hash = p_ticket_hash and state = 'pending';
  return found;
end $$;
revoke all on function public.ownpath_reserve_ai(text,text,text), public.ownpath_finish_ai(text,text,text) from public, anon;
grant execute on function public.ownpath_reserve_ai(text,text,text), public.ownpath_finish_ai(text,text,text) to authenticated;
commit;
