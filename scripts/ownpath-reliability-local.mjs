// Isolated scratch database only. No URLs, Auth credentials or hosted fallback.
import assert from 'node:assert/strict';
import { execFileSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, readdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
const exec = promisify(execFile), container = 'supabase_db_EXE';
const db = `ownpath_reliability_${process.pid}`;
const rest = `${db}_rest`, role = `${db}_login`;
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function sql(input) { return execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-XAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'],{input,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim(); }
function asOwner(input, owner=1) { return `set role authenticated; set request.jwt.claim.sub='${id(owner)}'; ${input}`; }
async function parallel(input) { try { const {stdout}=await exec('docker',['exec',container,'psql','-U','postgres','-d',db,'-XAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',input]); return {ok:true,stdout}; } catch(e) { return {ok:false,error:e.stderr}; } }
let created = false, roleCreated = false, restCreated = false;
try {
  execFileSync('docker',['exec',container,'createdb','-U','postgres',db]); created=true;
  sql(`create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create schema extensions; create extension pgcrypto with schema extensions;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
    grant usage on schema public,auth,extensions to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
    alter default privileges in schema public grant all on tables to anon,authenticated;`);
  for(const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')&&!f.startsWith('20261020')).sort()) sql(readFileSync(`supabase/migrations/${file}`,'utf8'));
  sql(`insert into auth.users values('${id(1)}'),('${id(2)}');
    insert into public.cv_documents(id,owner_id,storage_path,original_filename,content_type,byte_size,processing_status,extracted_text) values
      ('${id(10)}','${id(1)}','synthetic/old.pdf','old.pdf','application/pdf',42,'ready','Synthetic source text with SQL coursework.'),
      ('${id(11)}','${id(1)}','synthetic/new.pdf','new.pdf','application/pdf',42,'ready','Synthetic new source text with SQL coursework.');
    insert into public.target_jobs(id,owner_id,role_title,job_description) values('${id(20)}','${id(1)}','Synthetic role','Synthetic requirement for SQL coursework and record keeping.');
    insert into public.analysis_runs(id,owner_id,cv_document_id,target_job_id,client_request_id,status,provider_name,provider_version,schema_version,engine_version)
      values('${id(30)}','${id(1)}','${id(10)}','${id(20)}','${id(31)}','completed','local','1','1','1');
    insert into public.requirement_findings(analysis_run_id,owner_id,ordinal,requirement_text,status,rationale,caveat) values('${id(30)}','${id(1)}',0,'SQL coursework','missing','Synthetic rationale','Synthetic caveat');
    insert into public.roadmap_items(analysis_run_id,owner_id,ordinal,requirement_text,finding_status,priority,action_text,rationale) values('${id(30)}','${id(1)}',0,'SQL coursework','missing','high','Synthetic practice','Synthetic rationale');
    insert into public.cv_drafts(id,owner_id,analysis_run_id,cv_document_id,target_job_id,content,accepted_at) values('${id(40)}','${id(1)}','${id(30)}','${id(10)}','${id(20)}','Synthetic draft content for concurrency tests.',now());
    insert into public.cv_draft_claims(cv_draft_id,owner_id,ordinal,requirement_text,claim_text,source_excerpt,source_start,source_end) values('${id(40)}','${id(1)}',0,'SQL coursework','SQL coursework','SQL coursework',0,14);
    insert into public.review_shares(id,owner_id,analysis_run_id,cv_draft_id,token_hash,expiry_hours,expires_at) values('${id(50)}','${id(1)}','${id(30)}','${id(40)}',repeat('a',64),24,now()+interval '24 hours');
    insert into public.expert_reviews(review_share_id,feedback,submission_id) values('${id(50)}','Synthetic feedback for cascade verification.','${id(51)}');
    insert into public.opportunity_links(owner_id,target_job_id,source_url) values('${id(1)}','${id(20)}','https://example.test/synthetic-role');
    insert into public.team_expert_profiles(id,reviewer_id,display_name,active,approval_status,approved_at) values('${id(60)}','${id(2)}','Synthetic reviewer',true,'approved',now());
    insert into public.credential_documents(id,owner_id,storage_path,filename,content_type,document_type,byte_size) values('${id(61)}','${id(1)}','${id(1)}/${id(61)}.pdf','proof.pdf','application/pdf','certificate',42);
    insert into public.portfolio_documents(id,owner_id,storage_path,filename,content_type,byte_size) values('${id(62)}','${id(1)}','${id(1)}/${id(62)}.pdf','portfolio.pdf','application/pdf',42);
    insert into public.credential_skill_claims(id,owner_id,source_cv_id,credential_id,portfolio_id,expert_id,skill_label,proposed_wording,source_snapshot,state) values('${id(63)}','${id(1)}','${id(10)}','${id(61)}','${id(62)}','${id(60)}','SQL','Synthetic SQL coursework','Synthetic source','approved');
    insert into public.credential_expert_decisions(id,claim_id,reviewer_id,decision,explanation,approved_wording) values('${id(64)}','${id(63)}','${id(2)}','approved','Synthetic explanation','Synthetic SQL coursework');
    insert into public.cv_versions(id,owner_id,source_cv_id,version_number,content_snapshot) values('${id(65)}','${id(1)}','${id(10)}',1,'Synthetic immutable snapshot');
    insert into public.cv_version_skill_claims values('${id(65)}','${id(63)}','${id(64)}');`);
  const tables=['cv_documents','target_jobs','analysis_runs','requirement_findings','roadmap_items','cv_drafts','cv_draft_claims','review_shares','expert_reviews','opportunity_links','credential_skill_claims','credential_expert_decisions','cv_versions','cv_version_skill_claims','credential_documents','portfolio_documents'];
  const counts=()=>`select jsonb_build_object(${tables.map(t=>`'${t}',(select count(*) from public.${t})`).join(',')});`;
  for(const [table,record] of [['cv_documents',10],['target_jobs',20]]){
    const output=sql(`begin; delete from public.${table} where id='${id(record)}'; ${counts()} rollback;`);
    const result=JSON.parse(output.split('\n').find(l=>l.startsWith('{')));
    for(const t of ['analysis_runs','requirement_findings','roadmap_items','cv_drafts','cv_draft_claims','review_shares','expert_reviews'])assert.equal(result[t],0,t);
    assert.equal(result.credential_documents,1);assert.equal(result.portfolio_documents,1);
    assert.equal(result.cv_versions,table==='cv_documents'?0:1);assert.equal(result.opportunity_links,table==='target_jobs'?0:1);
    console.log('Verified cascade',table,JSON.stringify(result));
  }
  // Current pre-fix schema: two same-revision writes both succeed without increment.
  const before=await Promise.all(['A','B'].map(label=>parallel(asOwner(`update public.cv_drafts set content='Synthetic pre-fix concurrent writer ${label}.' where id='${id(40)}' and version=1 returning version;`))));
  assert.equal(before.filter(r=>r.ok).length,2);assert.equal(sql(`select version from public.cv_drafts where id='${id(40)}'`),'1');console.log('PRE-FIX reproduced: both same-revision writers succeeded; stored revision stayed 1.');
  sql(readFileSync('supabase/migrations/20261020_legacy_draft_revision.sql','utf8'));
  const call=(revision,content,accept=false)=>`select public.ownpath_update_legacy_draft('${id(30)}','${id(40)}',${revision},'${content}',${accept});`;
  const concurrent=await Promise.all(['A','B'].map(label=>parallel(asOwner(call(1,`Synthetic atomic concurrent writer ${label}.`)))));
  assert.equal(concurrent.filter(r=>r.ok).length,1);assert.match(concurrent.find(r=>!r.ok).error,/PT409/);
  assert.equal(sql(`select version from public.cv_drafts where id='${id(40)}'`),'2');
  assert.equal(sql(`select count(*) from public.review_shares where revoked_at is not null`),'1');
  console.log('POST-FIX: one writer acknowledged revision 2; one conflict PT409; accepted-draft share revoked.');
  for(const [label,input] of [
    ['cross-owner',asOwner(call(2,'Synthetic foreign-owner overwrite denied.'),2)],
    ['anonymous',`set role anon; ${call(2,'Synthetic anonymous overwrite denied.')}`],
    ['direct table update',asOwner(`update public.cv_drafts set content='Synthetic direct bypass must fail.' where id='${id(40)}';`)],
    ...['0','-1','2147483647','null'].map(v=>[`invalid revision ${v}`,asOwner(call(v,'Synthetic invalid revision must fail.'))])
  ]){const result=await parallel(input);assert.equal(result.ok,false,label);console.log('Denied:',label);}
  const content=sql(`select content from public.cv_drafts where id='${id(40)}'`);
  const acceptance=await Promise.all([parallel(asOwner(call(2,content,true))),parallel(asOwner(call(2,'Synthetic concurrent post-review edit.')))]);
  assert.equal(acceptance.filter(r=>r.ok).length,1);assert.equal(sql(`select version from public.cv_drafts where id='${id(40)}'`),'3');console.log('Concurrent accept/edit: exactly one acknowledged revision 3.');
  const queue=sql(asOwner('select public.m11a_expert_queue();',2));assert.ok(queue);console.log('Retained expert queue RPC exercised with synthetic authorized reviewer.');
  assert.equal((await parallel(asOwner('select public.m11a_expert_queue();',1))).ok,false);
  sql(`update public.credential_skill_claims set state='submitted',submitted_at=now() where id='${id(63)}';`);
  assert.equal(JSON.parse(sql(asOwner('select public.m11a_expert_queue();',2)).split('\n').at(-1))[0].id,id(63));
  assert.equal((await parallel(asOwner(`select public.m11a_expert_detail('${id(63)}');`,1))).ok,false);
  assert.equal(JSON.parse(sql(asOwner(`select public.m11a_expert_detail('${id(63)}');`,2)).split('\n').at(-1)).id,id(63));
  console.log('Expert queue/detail: only active assigned non-owner reviewer sees submitted claim; owner denied.');
  const token=randomBytes(32).toString('base64url');
  sql(`insert into public.review_shares(id,owner_id,analysis_run_id,token_hash,expiry_hours,expires_at) values('${id(70)}','${id(1)}','${id(30)}',encode(extensions.digest('${token}','sha256'),'hex'),24,now()+interval '1 day');
    insert into public.expert_reviews(review_share_id,feedback,submission_id) select '${id(70)}','Synthetic quota fixture feedback only.',gen_random_uuid() from generate_series(1,59);`);
  const reviewCall=submission=>`set role anon; select public.submit_private_review('${token}',null,null,'Synthetic concurrent reviewer feedback only.','${submission}');`;
  const submissions=[id(71),id(72)];
  const oldQuota=await Promise.all(submissions.map(s=>parallel(reviewCall(s))));assert.equal(oldQuota.filter(r=>r.ok).length,2);assert.equal(sql(`select count(*) from public.expert_reviews where review_share_id='${id(70)}'`),'61');
  console.log('PRE-FIX direct public RPC: concurrent 60th/61st feedback both inserted; submission IDs do not limit distinct submissions.');
  sql(`delete from public.expert_reviews where review_share_id='${id(70)}' and submission_id in ('${id(71)}','${id(72)}');`);
  sql(readFileSync('supabase/migrations/20261020_review_rpc_submission_limit.sql','utf8'));
  const quota=await Promise.all(submissions.map(s=>parallel(reviewCall(s))));
  assert.equal(quota.filter(r=>r.ok).length,1);const limited=quota.find(r=>!r.ok);assert.match(limited.error,/429/);assert.match(limited.error,/Retry-After/);assert.equal(limited.error.includes(token),false);
  assert.equal(sql(`select count(*) from public.expert_reviews where review_share_id='${id(70)}'`),'60');
  const winner=submissions[quota.findIndex(r=>r.ok)];assert.equal((await parallel(reviewCall(winner))).ok,true);assert.equal(sql(`select count(*) from public.expert_reviews where review_share_id='${id(70)}'`),'60');
  console.log('Direct review RPC: concurrent 60th/61st submissions -> one success, one HTTP-429 descriptor with Retry-After; replay deduplicated without extra row.');
  sql(`update public.expert_reviews set created_at=now()-interval '2 hours' where review_share_id='${id(70)}'; insert into public.expert_reviews(review_share_id,feedback,submission_id,created_at) select '${id(70)}','Synthetic daily quota fixture feedback only.',gen_random_uuid(),now()-interval '2 hours' from generate_series(1,240);`);
  assert.match((await parallel(reviewCall(id(73)))).error,/429/);console.log('Daily per-link quota rejects before insertion. No network-source/IP quota claimed.');
  // Real PostgREST against the scratch database, reusing only the installed image.
  // A temporary login and container are owned by this invocation and always removed.
  const password=randomBytes(24).toString('hex');sql(`create role ${role} login password '${password}'; grant anon,authenticated to ${role};`);roleCreated=true;
  execFileSync('docker',['run','--detach','--pull','never','--name',rest,'--network',`container:${container}`,
    '-e',`PGRST_DB_URI=postgres://${role}:${password}@127.0.0.1:5432/${db}`,'-e','PGRST_DB_ANON_ROLE=anon','-e','PGRST_DB_SCHEMAS=public','-e','PGRST_SERVER_PORT=4388',
    'public.ecr.aws/supabase/postgrest:v16.4'],{stdio:['ignore','pipe','pipe']});restCreated=true;
  const ip=execFileSync('docker',['inspect','--format','{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}',container],{encoding:'utf8'}).trim();
  const endpoint=`http://${ip}:4388/rpc/submit_private_review`;
  let ready=false;for(let n=0;n<40;n++){try{const r=await fetch(`http://${ip}:4388/`);if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.equal(ready,true,'disposable PostgREST startup');
  const limitedResponse=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_token:token,p_reviewer_name:null,p_reviewer_role:null,p_feedback:'Synthetic HTTP feedback quota verification.',p_submission_id:id(74)})});
  assert.equal(limitedResponse.status,429);assert.ok(Number(limitedResponse.headers.get('retry-after'))>0);const publicError=await limitedResponse.text();assert.equal(publicError.includes(token),false);assert.equal(publicError.includes(id(70)),false);
  console.log('Actual disposable PostgREST HTTP: 429 with positive Retry-After; error exposes no token or private record ID.');
  sql(`update public.review_shares set revoked_at=now() where id='${id(70)}';`);
  assert.match((await parallel(reviewCall(winner))).stdout,/f/);console.log('Revoked link rejects even an acknowledged replay.');
  console.log('PASS: scratch PostgreSQL FK, privilege, RLS and concurrency checks. No existing database rows mutated.');
} finally {
  if(restCreated)execFileSync('docker',['rm','--force',rest],{stdio:'ignore'});
  if(created)execFileSync('docker',['exec',container,'dropdb','-U','postgres','--force',db]);
  if(roleCreated)execFileSync('docker',['exec',container,'psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c',`drop role ${role};`],{stdio:'ignore'});
}
