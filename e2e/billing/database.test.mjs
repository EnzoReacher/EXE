import{test,after}from'node:test';
import assert from'node:assert/strict';
import{execFile}from'node:child_process';
import{promisify}from'node:util';
import{randomUUID}from'node:crypto';
import{createDatabase,dropDatabase,sql,call,literal,ownerA,ownerB}from'./database.mjs';
const db='ownpath_billing_tests_'+process.pid;createDatabase(db);after(()=>dropDatabase(db));
const command=(op,p)=>call(db,'ownpath_billing_command',{p_op:op,p});
const quote=(overrides={})=>({owner:ownerA,key:randomUUID(),digest:'a'.repeat(64),amount:79000,version:'2026-10-draft-1',duration:2592000,benefits:{scans:30,rewrites:15,saves:30},channel:'test',environment:'LOCAL_FAKE',...overrides});
const create=p=>command('create',quote(p));
function prepare(o,reference=randomUUID()){
 const job=command('claim',{id:o.id});assert.ok(job);command('link',{id:o.id,lease:job.lease_token,link:o.id,url:'http://127.0.0.3:4350/pay/'+o.id});
 const receipt=command('receipt',{code:o.order_code,amount:o.amount,currency:'VND',link:o.id,reference,channel:'test',environment:'LOCAL_FAKE',digest:o.id.replaceAll('-','').repeat(2)});
 return{id:o.id,lease:job.lease_token,receipt:receipt.id};
}
async function parallelSQL(query){const result=await promisify(execFile)('docker',['exec','supabase_db_EXE','psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',query]);return result.stdout.trim();}
const rpcSQL=(op,p)=>`select public.ownpath_billing_command(${literal(op)},${literal(JSON.stringify(p))}::jsonb)`;
const asOwner=(q,owner=ownerA)=>`set role authenticated;set request.jwt.claims=${literal(JSON.stringify({sub:owner,role:'authenticated'}))};${q}`;
test('catalog, Vietnamese month boundaries, trusted quotes and idempotency',()=>{
 const summary=call(db,'ownpath_billing_summary',{},'authenticated');assert.equal(summary.plan.plan,'Free');assert.equal(summary.plan.scans,3);assert.equal(summary.plan.rewrites,1);assert.equal(summary.plan.saves,3);
 assert.equal(sql(db,`select ((public.ownpath_plan('${ownerA}')->>'starts_at')::timestamptz at time zone 'Asia/Ho_Chi_Minh')::time`),'00:00:00');
 const p=quote(),o=command('create',p);assert.equal(command('create',p).id,o.id);assert.throws(()=>command('create',{...p,digest:'b'.repeat(64)}));
 assert.throws(()=>create({amount:1}));assert.throws(()=>create({benefits:{scans:999,rewrites:99,saves:99}}));assert.throws(()=>create({version:'stale'}));
 assert.throws(()=>sql(db,`update ownpath_orders set amount=1 where id='${o.id}'`));
});
test('direct grants/RLS and owner-scoped RPCs, including guessed ticket',()=>{
 for(const role of['anon','authenticated'])for(const table of['ownpath_orders','ownpath_payment_receipts','ownpath_purchased_periods','ownpath_billing_support','ownpath_ai_requests'])assert.throws(()=>sql(db,`set role ${role};select * from ${table}`));
 assert.throws(()=>call(db,'ownpath_billing_command',{p_op:'create',p:quote()},'authenticated'));
 assert.throws(()=>call(db,'ownpath_plan',{p_owner:ownerB},'authenticated'));
 assert.throws(()=>call(db,'ownpath_billing_summary',{},'anon'));
 const o=create({owner:ownerB});assert.throws(()=>call(db,'ownpath_billing_support_request',{p_order:o.id,p_key:randomUUID(),p_kind:'refund',p_note:''},'authenticated',ownerA));
 assert.equal(call(db,'ownpath_finish_ai',{p_id:'not-a-real-request',p_ticket_hash:'0'.repeat(64),p_state:'completed'},'authenticated'),false);
});
test('receipt replay, conflicting evidence and unknown sample never grant',()=>{
 const evidence={code:123,amount:79000,currency:'VND',link:'unknown',reference:'sample',channel:'test',environment:'LOCAL_FAKE',digest:'c'.repeat(64)};
 const receipt=command('receipt',evidence);assert.equal(receipt.validation,'unknown_order');assert.equal(command('receipt',evidence).id,receipt.id);assert.throws(()=>command('receipt',{...evidence,digest:'d'.repeat(64)}));
 const o=create(),job=command('claim',{id:o.id});command('link',{id:o.id,lease:job.lease_token,link:o.id,url:null});
 const bad=command('receipt',{...evidence,code:o.order_code,amount:1,link:o.id,reference:'wrong-amount'});assert.equal(bad.validation,'needs_review');assert.throws(()=>command('paid',{id:o.id,lease:job.lease_token,receipt:bad.id}));
 assert.equal(sql(db,`select count(*) from ownpath_purchased_periods`),'0');
});
test('separate-connection concurrent fulfillment and distinct renewals serialize',async()=>{
 const a=create(),b=create(),pa=prepare(a),pb=prepare(b);
 await Promise.all([parallelSQL(rpcSQL('paid',pa)),parallelSQL(rpcSQL('paid',pa)),parallelSQL(rpcSQL('paid',pb))]);
 const plan=call(db,'ownpath_billing_summary',{},'authenticated').plan;assert.equal(plan.plan,'Pro');assert.ok(plan.next_start);assert.equal(sql(db,`select count(*) from ownpath_purchased_periods where owner_id='${ownerA}'`),'2');
 assert.equal(sql(db,`select bool_and(extract(epoch from ends_at-starts_at)=2592000) from ownpath_purchased_periods`),'t');
 assert.equal(sql(db,`select count(*) from ownpath_purchased_periods a join ownpath_purchased_periods b on a.id<b.id and a.owner_id=b.owner_id and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(b.starts_at,b.ends_at,'[)')`),'0');
 assert.equal(sql(db,`select count(*) from ownpath_payment_receipts where validation='processed'`),'2');
});
test('durable AI identity, atomic last slot, bound original period, uncertainty',async()=>{
 const reserve=id=>({p_id:id,p_action:'scan',p_ticket_hash:'e'.repeat(64),p_digest:'f'.repeat(64)});
 const id=randomUUID();assert.equal(call(db,'ownpath_reserve_ai',reserve(id),'authenticated',ownerB),'reserved');
 assert.equal(call(db,'ownpath_reserve_ai',reserve(id),'authenticated',ownerB),'duplicate');assert.equal(call(db,'ownpath_reserve_ai',{...reserve(id),p_digest:'1'.repeat(64)},'authenticated',ownerB),'conflict');
 call(db,'ownpath_finish_ai',{p_id:id,p_ticket_hash:'e'.repeat(64),p_state:'completed'},'authenticated',ownerB);assert.equal(call(db,'ownpath_reserve_ai',reserve(id),'authenticated',ownerB),'completed_unavailable');
 sql(db,`update ownpath_ai_policy set concurrency_limit=2,request_limit=100`);
 const q=()=>asOwner(`select public.ownpath_reserve_ai('${randomUUID()}','scan','${'e'.repeat(64)}','${'f'.repeat(64)}')`,ownerB);
 const results=await Promise.all([parallelSQL(q()),parallelSQL(q()),parallelSQL(q())]);assert.equal(results.filter(x=>x==='reserved').length,2);assert.equal(results.filter(x=>x==='busy'||x==='plan_limit').length,1);
 sql(db,`update ownpath_ai_requests set state='completed' where owner_id='${ownerB}'`);assert.equal(call(db,'ownpath_reserve_ai',reserve(randomUUID()),'authenticated',ownerB),'plan_limit');
 const pro=call(db,'ownpath_billing_summary',{},'authenticated').plan;assert.equal(pro.scan_used,0);assert.equal(pro.scans,30);
 assert.equal(sql(db,`select count(*) from ownpath_ai_requests where owner_id='${ownerB}' and period_key like 'free:%'`),'3');
});
test('atomic saved limit, duplicate retry, edits/deletes and over-limit preservation',async()=>{
 const save=(id,owner=ownerB)=>asOwner(`insert into ownpath_cv_versions(id,owner_id,name,payload) values('${id}','${owner}','Synthetic','{}')`,owner);
 const ids=Array.from({length:4},()=>randomUUID());const outcomes=await Promise.allSettled(ids.map(id=>parallelSQL(save(id))));assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,3);
 const existing=sql(db,`select id from ownpath_cv_versions where owner_id='${ownerB}' limit 1`);assert.throws(()=>sql(db,save(existing)));
 sql(db,asOwner(`update ownpath_cv_versions set name='Renamed' where id='${existing}'`,ownerB));assert.equal(sql(db,asOwner(`select count(*) from ownpath_cv_versions`,ownerB)),'3');
 assert.throws(()=>sql(db,asOwner(`insert into ownpath_cv_versions(id,owner_id,name,payload) values('${randomUUID()}','${ownerA}','wrong owner','{}')`,ownerB)));
});
test('expiry uses DB clock, future quota unavailable; refund adjustment is explicit and idempotent',()=>{
 const order=sql(db,`select order_id from ownpath_purchased_periods where owner_id='${ownerA}' order by starts_at limit 1`);
 const before=call(db,'ownpath_billing_summary',{},'authenticated').plan;
 const adjustment={id:order,reference:'confirmed-bank-transfer',reason:'Synthetic confirmed manual refund',revoke:true};command('refund_confirm',adjustment);command('refund_confirm',adjustment);assert.throws(()=>command('refund_confirm',{...adjustment,reference:'second-transfer'}));
 const after=call(db,'ownpath_billing_summary',{},'authenticated').plan;assert.equal(after.plan,'Free');assert.ok(after.next_start);assert.equal(after.scans,3);assert.equal(before.scans,30);
 assert.equal(sql(db,`select count(*) from ownpath_cv_versions where owner_id='${ownerB}'`),'3');
});
test('leases, uncertain creation and durable receipt survive another connection',()=>{
 const o=create({owner:ownerB}),job=command('claim',{id:o.id});assert.equal(command('claim',{id:o.id}),null);command('attempt_create',{id:o.id,lease:job.lease_token});command('defer',{id:o.id,lease:job.lease_token,code:'verification_retry'});
 assert.equal(command('get',{id:o.id}).creation_attempted,true);assert.equal(command('claim',{id:o.id}),null);
 assert.ok(Date.parse(command('get',{id:o.id}).next_attempt_at)>Date.now());
});
test('real expiry without scheduler preserves Free usage, old CV access and original reservation period',()=>{
 const o=create({owner:ownerB}),funding=prepare(o);command('paid',funding);
 const active=call(db,'ownpath_billing_summary',{},'authenticated',ownerB).plan;assert.equal(active.plan,'Pro');assert.equal(active.scan_used,0);
 const requestId=randomUUID();assert.equal(call(db,'ownpath_reserve_ai',{p_id:requestId,p_action:'rewrite',p_ticket_hash:'a'.repeat(64),p_digest:'b'.repeat(64)},'authenticated',ownerB),'reserved');
 sql(db,asOwner(`insert into ownpath_cv_versions(id,owner_id,name,payload) values('${randomUUID()}','${ownerB}','Fourth retained CV','{}')`,ownerB));
 // Test-data time travel only: no product endpoint can modify bought timestamps.
 sql(db,`alter table ownpath_purchased_periods disable trigger ownpath_period_immutable;update ownpath_purchased_periods set starts_at=clock_timestamp()-interval '31 days',ends_at=clock_timestamp()-interval '1 day' where order_id='${o.id}';alter table ownpath_purchased_periods enable trigger ownpath_period_immutable;`);
 const expired=call(db,'ownpath_billing_summary',{},'authenticated',ownerB).plan;assert.equal(expired.plan,'Free');assert.equal(expired.scan_used,3);assert.equal(expired.saved_count,4);assert.equal(expired.saves,3);
 assert.equal(call(db,'ownpath_finish_ai',{p_id:requestId,p_ticket_hash:'a'.repeat(64),p_state:'completed'},'authenticated',ownerB),true);
 assert.equal(sql(db,`select period_key from ownpath_ai_requests where request_id='${requestId}'`),active.period_key);
 assert.equal(sql(db,asOwner('select count(*) from ownpath_cv_versions',ownerB)),'4');assert.throws(()=>sql(db,asOwner(`insert into ownpath_cv_versions(id,owner_id,name,payload) values('${randomUUID()}','${ownerB}','Over limit','{}')`,ownerB)));
 assert.equal(sql(db,`select to_char(date_trunc('month','2026-10-31 17:00:00+00'::timestamptz at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh' at time zone 'UTC','YYYY-MM-DD HH24:MI:SS')`),'2026-10-31 17:00:00');
});
