-- The retired Next API is not restored. This bounds the independently callable
-- legacy Supabase RPC using shared durable rows, not per-process state or IPs.
create or replace function public.submit_private_review(
  p_token text, p_reviewer_name text, p_reviewer_role text, p_feedback text, p_submission_id uuid
) returns boolean language plpgsql security definer set search_path = ''
as $$
declare selected_share_id uuid; recent_hour integer; recent_day integer; retry_seconds integer;
begin
  if p_token is null or length(p_token) <> 43 or p_token !~ '^[A-Za-z0-9_-]{43}$'
    or p_submission_id is null or char_length(trim(coalesce(p_feedback,''))) not between 20 and 4000
    or (p_reviewer_name is not null and char_length(trim(p_reviewer_name)) > 120)
    or (p_reviewer_role is not null and char_length(trim(p_reviewer_role)) > 120)
  then return false; end if;
  -- The link row serializes quota checks and inserts across processes/requests.
  select s.id into selected_share_id from public.review_shares s
    where s.token_hash = encode(extensions.digest(p_token,'sha256'),'hex')
      and s.revoked_at is null and s.expires_at > clock_timestamp() for update;
  if not found then return false; end if;
  -- An acknowledged retry consumes no quota, but cannot reactivate an expired link.
  if exists(select 1 from public.expert_reviews where review_share_id=selected_share_id and submission_id=p_submission_id) then return true; end if;
  select count(*) filter(where created_at > clock_timestamp()-interval '1 hour'),count(*)
    into recent_hour,recent_day from public.expert_reviews
    where review_share_id=selected_share_id and created_at > clock_timestamp()-interval '1 day';
  if recent_hour >= 60 or recent_day >= 300 then
    select greatest(1,ceil(extract(epoch from min(created_at) +
      case when recent_hour >= 60 then interval '1 hour' else interval '1 day' end - clock_timestamp()))::integer)
      into retry_seconds from public.expert_reviews where review_share_id=selected_share_id
      and created_at > clock_timestamp()-case when recent_hour >= 60 then interval '1 hour' else interval '1 day' end;
    -- PostgREST's custom response exception emits HTTP 429 and Retry-After.
    raise sqlstate 'PGRST' using
      message = '{"code":"review_rate_limited","message":"Too many feedback entries for this link. Please try later."}',
      detail = jsonb_build_object('status',429,'headers',jsonb_build_object('Retry-After',retry_seconds::text))::text;
  end if;
  insert into public.expert_reviews(review_share_id,reviewer_name,reviewer_role,feedback,submission_id)
    values(selected_share_id,nullif(trim(p_reviewer_name),''),nullif(trim(p_reviewer_role),''),trim(p_feedback),p_submission_id);
  return true;
end;
$$;
revoke all on function public.submit_private_review(text,text,text,text,uuid) from public;
grant execute on function public.submit_private_review(text,text,text,text,uuid) to anon,authenticated;
