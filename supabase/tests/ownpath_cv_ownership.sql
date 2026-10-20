-- Run after the CV migration inside a transaction, then ROLLBACK.
insert into auth.users (id) values ('11111111-aaaa-4111-8111-111111111111'), ('22222222-bbbb-4222-8222-222222222222');
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-aaaa-4111-8111-111111111111","role":"authenticated"}';
insert into public.ownpath_experience_profiles(id,name,payload) values ('33333333-cccc-4333-8333-333333333333','Synthetic profile','{}');
insert into public.ownpath_cv_versions(id,name,payload) values ('44444444-dddd-4444-8444-444444444444','Synthetic sales CV','{}');
do $$ begin
  if (select count(*) from public.ownpath_cv_versions) <> 1 then raise exception 'Owner cannot read own version'; end if;
end $$;
set local request.jwt.claims = '{"sub":"22222222-bbbb-4222-8222-222222222222","role":"authenticated"}';
do $$ begin
  if exists(select 1 from public.ownpath_cv_versions) or exists(select 1 from public.ownpath_experience_profiles) then raise exception 'Cross-user read'; end if;
  update public.ownpath_cv_versions set name='Intruder' where id='44444444-dddd-4444-8444-444444444444';
  if found then raise exception 'Cross-user update'; end if;
  delete from public.ownpath_cv_versions where id='44444444-dddd-4444-8444-444444444444';
  if found then raise exception 'Cross-user delete'; end if;
  delete from public.ownpath_experience_profiles where id='33333333-cccc-4333-8333-333333333333';
  if found then raise exception 'Cross-user profile delete'; end if;
  begin
    update public.ownpath_experience_profiles set name='Intruder';
    raise exception 'Profile update privilege permitted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.ownpath_experience_profiles(id,owner_id,name,payload) values ('66666666-ffff-4666-8666-666666666666','11111111-aaaa-4111-8111-111111111111','Forged profile','{}');
    raise exception 'Forged profile ownership permitted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.ownpath_cv_versions(id,owner_id,name,payload) values ('55555555-eeee-4555-8555-555555555555','11111111-aaaa-4111-8111-111111111111','Forged','{}');
    raise exception 'Forged ownership permitted';
  exception when insufficient_privilege then null; end;
end $$;
set local request.jwt.claims = '{"sub":"11111111-aaaa-4111-8111-111111111111","role":"authenticated"}';
do $$ begin
  begin
    update public.ownpath_experience_profiles set payload='{"changed":true}';
    raise exception 'Owned profile was mutable';
  exception when insufficient_privilege then null; end;
  update public.ownpath_cv_versions set name='Renamed',revision=2 where id='44444444-dddd-4444-8444-444444444444' and revision=1;
  if not found then raise exception 'Owned revision update failed'; end if;
  update public.ownpath_cv_versions set name='Stale' where id='44444444-dddd-4444-8444-444444444444' and revision=1;
  if found then raise exception 'Stale update permitted'; end if;
  begin
    update public.ownpath_cv_versions set owner_id='22222222-bbbb-4222-8222-222222222222';
    raise exception 'Owner transfer permitted';
  exception when insufficient_privilege then null; end;
  delete from public.ownpath_cv_versions where id='44444444-dddd-4444-8444-444444444444';
  if not found then raise exception 'Owned delete failed'; end if;
  if (select count(*) from public.ownpath_experience_profiles) <> 1 then raise exception 'Version delete affected profile'; end if;
end $$;
set local role anon;
do $$ begin
  begin perform * from public.ownpath_experience_profiles; raise exception 'Anonymous read permitted'; exception when insufficient_privilege then null; end;
  begin perform * from public.ownpath_cv_versions; raise exception 'Anonymous version read permitted'; exception when insufficient_privilege then null; end;
  begin insert into public.ownpath_cv_versions(id,name,payload) values ('77777777-aaaa-4777-8777-777777777777','Anonymous','{}'); raise exception 'Anonymous write permitted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'OwnPath local RLS assertions passed; transaction will be rolled back.';
