// Compiled application + actual local PostgreSQL reservations; fictional services.
import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { jd, instruction } from '../owner-preview/scenario.mjs';
const origin='http://127.0.0.3:4347', output='/tmp/opencode/ownpath-browser-acceptance';
await mkdir(output,{recursive:true});
const browser=await chromium.launch();
try{
 const context=await browser.newContext({permissions:['clipboard-read','clipboard-write'],reducedMotion:'reduce'});
 await context.route('**/*',route=>[origin,'http://127.0.0.3:4348'].includes(new URL(route.request().url()).origin)?route.continue():route.abort());
 const page=await context.newPage();
 await expect.poll(async()=>{try{return (await context.request.get(origin+'/sign-in')).status();}catch{return 0;}},{timeout:90000}).toBe(200);
 await page.goto(origin+'/sign-in');await page.getByLabel('Email address').fill('fictional@example.test');await page.getByLabel('Password',{exact:true}).fill('fictional-preview-only');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/\/app$/);
 await page.goto(origin+'/app/scan');
 let scans=0,rewrites=0;
 page.on('request',r=>{if(r.url().endsWith('/api/cv-review/scan'))scans++;if(r.url().endsWith('/api/cv-review/rewrite'))rewrites++;});
 const summary=async()=>{const r=await context.request.get(origin+'/api/billing/summary');expect(r.status()).toBe(200);return (await r.json()).plan;};
 const before=await summary();
 for(const format of ['pdf','docx']){
  const sample=await context.request.get(origin+'/__preview/samples/sales-cv.'+format);expect(sample.status()).toBe(200);
  await page.locator('input[type=file]').setInputFiles({name:'synthetic.'+format,mimeType:format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:await sample.body()});
  if(format==='docx')await page.getByRole('dialog').getByRole('button',{name:'Replace CV text',exact:true}).click();
  await expect(page.getByText('Extraction complete.',{exact:true})).toBeVisible();
  expect(await page.locator('#scan-cv').inputValue()).toContain('My manager negotiated supplier contracts, not me.');
 }
 expect([scans,rewrites]).toEqual([0,0]);
 await page.getByLabel('Target job',{exact:true}).fill(jd);await page.getByRole('button',{name:'Scan CV',exact:true}).click();await expect(page.getByRole('heading',{name:'Your scan',exact:true})).toBeVisible();
 expect([scans,rewrites]).toEqual([1,0]);expect((await summary()).scan_used).toBe(before.scan_used+1);
 await page.getByRole('link',{name:'Rewrite this CV',exact:true}).first().click();await expect(page).toHaveURL(/\/app\/rewrite$/);
 await page.getByLabel('How should we improve it?').fill(instruction);await page.getByRole('button',{name:'Rewrite CV',exact:true}).click();await expect(page.getByRole('heading',{name:'Your rewritten CV is ready',exact:true})).toBeVisible();
 expect([scans,rewrites]).toEqual([1,1]);expect((await summary()).rewrite_used).toBe(before.rewrite_used+1);
 await expect(page.getByLabel('Formatted CV')).toContainText('Assisted customers with product selection.');await expect(page.getByLabel('Formatted CV')).toContainText('My manager negotiated supplier contracts, not me.');await expect(page.getByLabel('Formatted CV')).toContainText('2023–2025');
 await page.getByRole('button',{name:'Edit complete CV',exact:true}).click();const editor=page.getByLabel('Complete CV text',{exact:true});const edited=(await editor.inputValue())+'\nLanguages\nVietnamese — fictional manual edit';await editor.fill(edited);
 await page.getByRole('button',{name:'Copy text',exact:true}).click();await expect(page.getByRole('button',{name:'Copied',exact:true})).toBeVisible();expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(edited);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download TXT',exact:true}).click();expect(await readFile(await(await download).path(),'utf8')).toBe(edited);
 const print=page.frameLocator('iframe[title="CV print document"]');await print.locator('body').evaluate(()=>{window.print=()=>{document.body.dataset.printed='true';};});await page.getByRole('button',{name:'Print / Save as PDF',exact:true}).click();await expect(print.locator('body')).toHaveAttribute('data-printed','true');
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:950});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`${output}/rewrite-${width}.png`,fullPage:true});}
 // A malformed successful HTTP reply must not replace a valid edited draft.
 let sentBase;await page.route('**/api/cv-review/rewrite',route=>{sentBase=route.request().postDataJSON();return route.fulfill({json:{replacements:[],changes:[],notes:[null]}});});
 await page.getByRole('button',{name:'Rewrite again',exact:true}).click();await page.getByRole('dialog',{name:'Replace your edited CV?'}).getByRole('button',{name:'Rewrite edited CV',exact:true}).click();await expect(page.locator('#scan-error')).toContainText('result could not be verified');
 expect(sentBase.base).toBe(edited);expect(sentBase.scan.findings.every(f=>f.requirementSourceId==='jd'&&typeof f.excerptSourceId==='string')).toBe(true);
 await expect(editor).toHaveValue(edited);await expect(page.getByLabel('Formatted CV')).toContainText('Vietnamese — fictional manual edit');await expect(page.getByRole('button',{name:'Rewrite again',exact:true})).toBeDisabled();
 expect([scans,rewrites]).toEqual([1,2]);expect((await summary()).rewrite_used).toBe(before.rewrite_used+1);
 await writeFile(output+'/result.json',JSON.stringify({coverage:'compiled_fictional_auth_provider_real_local_sql_and_extraction',actualProviderDispatches:0,scanWebRequests:scans,rewriteWebRequests:rewrites,passed:['PDF and DOCX extraction','Scan independent of Rewrite','accepted identified Scan used for Rewrite','durable local usage acknowledgement','complete document and attribution/date retention','manual edit copy/TXT/print without AI','1440/390/320 no horizontal overflow','current edited base sent on regeneration','malformed response preserves manual edits and pauses sending']},null,2));
 console.log('PASS compiled Scan/Rewrite with real local SQL, extraction and preserved manual edits.');
}finally{await browser.close();}
