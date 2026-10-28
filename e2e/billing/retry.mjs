import{chromium}from'@playwright/test';
import{sql}from'./database.mjs';
import{randomUUID}from'node:crypto';
import assert from'node:assert/strict';
import{jd}from'../owner-preview/scenario.mjs';
const db=process.argv[2];if(!/^ownpath_billing_demo_[0-9]+$/.test(db||''))throw new Error('Disposable demo database required.');
const origin='http://127.0.0.3:4347',browser=await chromium.launch();try{
 const context=await browser.newContext(),page=await context.newPage();await page.goto(origin+'/sign-in');await page.getByLabel('Email address').fill('fictional@example.test');await page.getByLabel('Password',{exact:true}).fill('Synthetic billing only');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/app');
 const sample=await context.request.get(origin+'/__preview/samples/sales-cv.pdf');const extracted=await context.request.post(origin+'/api/cv-review/extract?type=pdf',{headers:{origin,'Content-Type':'application/pdf'},data:await sample.body()});assert.equal(extracted.status(),200);
 const id=randomUUID(),payload={cv:(await extracted.json()).text,jd,consent:true,requestId:id};
 const run=data=>context.request.post(origin+'/api/cv-review/scan',{headers:{origin},data});
 assert.equal((await run(payload)).status(),200); // Deliberately discard the first result.
 assert.equal((await run(payload)).status(),200);assert.equal(sql(db,`select count(*) from ownpath_ai_requests where request_id='${id}'`),'1');
 process.kill(Number(db.split('_').at(-1)),'SIGUSR1');await new Promise(resolve=>setTimeout(resolve,500));
 let response;const until=Date.now()+15000;while(Date.now()<until){try{response=await run(payload);if(response.status()!==503)break;}catch{}await new Promise(resolve=>setTimeout(resolve,250));}
 assert.equal(response.status(),409);assert.equal((await response.json()).error.code,'completed_unavailable');
 const conflict=await run({...payload,jd:'Changed requirement.'});assert.equal(conflict.status(),422);assert.equal((await conflict.json()).error.code,'preview_scenario');
 assert.equal(sql(db,`select count(*) from ownpath_ai_requests where request_id='${id}'`),'1');
 console.log('PASS compiled AI retry: lost-result retry shares operation; actual app restart returns completed_unavailable; unsupported changed input rejected before another reservation. Real digest conflicts remain covered by database/server tests.');await context.close();
}finally{await browser.close();}
