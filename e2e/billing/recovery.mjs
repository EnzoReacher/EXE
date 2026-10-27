import{chromium}from'@playwright/test';
import assert from'node:assert/strict';
import{sql,ownerA,ownerB}from'./database.mjs';
import{sign}from'./provider.mjs';
import{randomUUID}from'node:crypto';
const db=process.argv[2];if(!/^ownpath_billing_demo_[0-9]+$/.test(db||''))throw new Error('Pass the disposable demo database printed by preview:billing.');
const origin='http://127.0.0.3:4347',provider='http://127.0.0.3:4350',auth='http://127.0.0.3:4348';
const browser=await chromium.launch();try{
 const context=await browser.newContext(),page=await context.newPage();await page.goto(origin+'/sign-in');await page.getByLabel('Email address').fill('fictional@example.test');await page.getByLabel('Password',{exact:true}).fill('Synthetic billing only');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/app');
 const create=async()=>{const r=await context.request.post(origin+'/api/billing/checkout',{headers:{origin},data:{version:'2026-10-draft-1',key:randomUUID()}});assert.equal(r.status(),200);return r.json();};
 assert.equal((await context.request.post(origin+'/api/billing/checkout',{headers:{origin},data:{version:'2026-10-draft-1',key:randomUUID(),owner:ownerB,amount:1}})).status(),409);
 assert.equal((await context.request.post(origin+'/api/billing/checkout',{headers:{origin:'http://evil.example'},data:{}})).status(),403);
 assert.equal((await context.request.get(origin+'/api/billing/reconcile')).status(),405);
 await context.request.post(provider+'/__fixture/fault',{data:{kind:'create_lost'}});const order=await create();assert.equal(order.checkoutUrl,null);
 const lookup=await context.request.get(provider+'/v2/payment-requests/'+order.reference,{headers:{'x-client-id':'fictional-client','x-api-key':'fictional-api-key'}});const data=(await lookup.json()).data;
 await context.request.post(provider+'/pay/'+data.id,{headers:{origin:provider},form:{missed:'1'}});
 const webhookData={orderCode:order.reference,amount:order.amount,currency:'VND',paymentLinkId:data.id,reference:'fictional-'+data.id,code:'00'};
 await context.request.post(provider+'/__fixture/fault',{data:{kind:'429'}});
 const delivered=await context.request.post(origin+'/api/billing/webhook',{data:{code:'00',success:true,data:webhookData,signature:sign(webhookData)}});assert.equal(delivered.status(),200);
 assert.equal(sql(db,`select count(*) from ownpath_purchased_periods where order_id='${order.id}'`),'0');assert.equal(sql(db,`select count(*) from ownpath_payment_receipts where order_id='${order.id}'`),'1');
 process.kill(Number(db.split('_').at(-1)),'SIGUSR1');await new Promise(resolve=>setTimeout(resolve,500));const readyUntil=Date.now()+15000;let ready=false;while(Date.now()<readyUntil){try{const response=await context.request.get(origin+'/pricing');if(response.status()===200){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,250));}assert.ok(ready,'demo app must return after restart');
 // Advance only recovery metadata in a disposable DB, not financial snapshots.
 sql(db,`update ownpath_orders set next_attempt_at=clock_timestamp() where id='${order.id}'`);
 const run=()=>context.request.post(origin+'/api/billing/reconcile',{headers:{Authorization:'Bearer fictional-runner-only'}});assert.equal((await run()).status(),200);
 assert.equal(sql(db,`select count(*) from ownpath_purchased_periods where order_id='${order.id}'`),'1');assert.equal(sql(db,`select creation_attempted from ownpath_orders where id='${order.id}'`),'t');
 assert.equal((await context.request.post(origin+'/api/billing/webhook',{data:{code:'00',success:true,data:webhookData,signature:sign(webhookData)}})).status(),200);assert.equal(sql(db,`select count(*) from ownpath_purchased_periods where order_id='${order.id}'`),'1');
 const token=owner=>'Bearer '+Buffer.from('{}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:owner})).toString('base64url')+'.fictional';
 for(const table of['ownpath_orders','ownpath_payment_receipts','ownpath_purchased_periods','ownpath_ai_requests'])for(const owner of[ownerA,ownerB])assert.equal((await context.request.get(auth+'/rest/v1/'+table,{headers:{Authorization:token(owner)}})).status(),403);
 const wrongOwner=await context.request.post(auth+'/rest/v1/rpc/ownpath_billing_support_request',{headers:{Authorization:token(ownerB)},data:{p_order:order.id,p_key:randomUUID(),p_kind:'refund',p_note:''}});assert.equal(wrongOwner.status(),403);
 const otherSummary=await context.request.post(auth+'/rest/v1/rpc/ownpath_billing_summary',{headers:{Authorization:token(ownerB)},data:{}});assert.equal(otherSummary.status(),200);assert.equal((await otherSummary.json()).orders.length,0);
 assert.equal((await context.request.post(auth+'/rest/v1/rpc/ownpath_billing_command',{headers:{Authorization:token(ownerA)},data:{p_op:'paid',p:{id:order.id}}})).status(),403);
 for(const kind of['help','refund']){const reply=await context.request.post(origin+'/api/billing/support',{headers:{origin},data:{id:order.id,key:randomUUID(),kind,note:'Synthetic order-linked test.'}});assert.equal(reply.status(),200);assert.equal((await reply.json()).recorded,true);}
 const changed={...webhookData,amount:1};assert.equal((await context.request.post(origin+'/api/billing/webhook',{data:{code:'00',success:true,data:changed,signature:'0'.repeat(64)}})).status(),400);
 await context.close();console.log('PASS compiled recovery: uncertain creation lookup, callback persisted before provider 429, real application restart, protected runner fulfillment, replay once, CSRF/quote/REST/RPC denials, separate support/refund requests.');
}finally{await browser.close();}
