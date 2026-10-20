-- Retained M3 drafts: content and acceptance share one atomic revision contract.
-- Do not apply hosted as part of local verification.
revoke update on public.cv_drafts from public, anon, authenticated;
revoke update (id,owner_id,analysis_run_id,cv_document_id,target_job_id,version,content,accepted_at,created_at,updated_at)
  on public.cv_drafts from public, anon, authenticated;

create function public.ownpath_update_legacy_draft(
  p_analysis uuid, p_draft uuid, p_expected_revision integer, p_content text, p_accept boolean default false
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare saved public.cv_drafts%rowtype;
begin
  if auth.uid() is null then raise exception 'unavailable' using errcode = '42501'; end if;
  if p_expected_revision is null or p_expected_revision < 1 or p_expected_revision >= 2147483647
    or p_accept is null or p_content is null or char_length(trim(p_content)) not between 20 and 12000
  then raise exception 'invalid draft input' using errcode = '22023'; end if;

  update public.cv_drafts d
    set content = case when p_accept then d.content else trim(p_content) end,
        accepted_at = case when p_accept then now() else null end,
        version = d.version + 1, updated_at = now()
    where d.id = p_draft and d.analysis_run_id = p_analysis and d.owner_id = auth.uid()
      and d.version = p_expected_revision
      and (not p_accept or d.content = p_content)
      and exists (select 1 from public.analysis_runs r where r.id = d.analysis_run_id
        and r.owner_id = auth.uid() and r.status = 'completed')
    returning d.* into saved;
  if not found then
    -- Do not reveal whether a foreign record exists. No automatic overwrite/retry.
    raise exception 'Draft changed or is unavailable. Reload explicitly before saving again.' using errcode = 'PT409';
  end if;
  return jsonb_build_object('id',saved.id,'version',saved.version,'content',saved.content,
    'accepted_at',saved.accepted_at,'created_at',saved.created_at,'updated_at',saved.updated_at);
end;
$$;
revoke all on function public.ownpath_update_legacy_draft(uuid,uuid,integer,text,boolean) from public,anon;
grant execute on function public.ownpath_update_legacy_draft(uuid,uuid,integer,text,boolean) to authenticated;
