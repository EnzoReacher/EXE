-- Owner-scoped, retry-safe creation. SECURITY INVOKER preserves existing RLS.
create or replace function public.m15_create_next_steps(
  p_analysis uuid, p_roadmap jsonb, p_content text, p_claims jsonb
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_run public.analysis_runs%rowtype;
  v_draft uuid;
  v_item jsonb;
begin
  if auth.uid() is null then raise exception 'unavailable'; end if;
  select * into v_run from public.analysis_runs
    where id = p_analysis and owner_id = auth.uid() and status = 'completed'
    for update;
  if not found then raise exception 'unavailable'; end if;

  select id into v_draft from public.cv_drafts
    where analysis_run_id = p_analysis and owner_id = auth.uid();
  if found then return v_draft; end if;

  if jsonb_typeof(p_roadmap) is distinct from 'array'
    or jsonb_typeof(p_claims) is distinct from 'array'
    or p_content is null or char_length(trim(p_content)) not between 20 and 12000
  then raise exception 'invalid input'; end if;
  if jsonb_array_length(p_roadmap) > 5 or jsonb_array_length(p_claims) > 6
  then raise exception 'invalid input'; end if;

  -- Recover an orphan roadmap left by the old multi-write implementation.
  -- This deletion rolls back together with every insert if any check fails.
  delete from public.roadmap_items where analysis_run_id = p_analysis and owner_id = auth.uid();
  insert into public.cv_drafts(owner_id,analysis_run_id,cv_document_id,target_job_id,content)
    values(auth.uid(),p_analysis,v_run.cv_document_id,v_run.target_job_id,p_content)
    returning id into v_draft;

  for v_item in select value from jsonb_array_elements(p_roadmap) loop
    if not exists (select 1 from public.requirement_findings f
      where f.analysis_run_id = p_analysis and f.owner_id = auth.uid()
      and f.requirement_text = v_item->>'requirement'
      and f.status = v_item->>'findingStatus' and f.status <> 'supported')
    then raise exception 'invalid finding'; end if;
    insert into public.roadmap_items(owner_id,analysis_run_id,ordinal,requirement_text,finding_status,priority,action_text,rationale)
      values(auth.uid(),p_analysis,(v_item->>'ordinal')::integer,v_item->>'requirement',
        v_item->>'findingStatus',v_item->>'priority',v_item->>'action',v_item->>'rationale');
  end loop;
  for v_item in select value from jsonb_array_elements(p_claims) loop
    if not exists (select 1 from public.requirement_findings f
      where f.analysis_run_id = p_analysis and f.owner_id = auth.uid()
      and f.status in ('supported','partly_supported')
      and f.requirement_text = v_item->>'requirement'
      and f.evidence_excerpt = v_item->>'sourceExcerpt'
      and f.evidence_excerpt = v_item->>'claimText'
      and f.source_start = (v_item->>'sourceStart')::integer
      and f.source_end = (v_item->>'sourceEnd')::integer)
    then raise exception 'invalid provenance'; end if;
    insert into public.cv_draft_claims(owner_id,cv_draft_id,ordinal,requirement_text,claim_text,source_excerpt,source_start,source_end)
      values(auth.uid(),v_draft,(v_item->>'ordinal')::integer,v_item->>'requirement',
        v_item->>'claimText',v_item->>'sourceExcerpt',(v_item->>'sourceStart')::integer,(v_item->>'sourceEnd')::integer);
  end loop;
  return v_draft;
end;
$$;
revoke all on function public.m15_create_next_steps(uuid,jsonb,text,jsonb) from public, anon;
grant execute on function public.m15_create_next_steps(uuid,jsonb,text,jsonb) to authenticated;
