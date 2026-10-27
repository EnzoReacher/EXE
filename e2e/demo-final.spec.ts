// Controlled coverage of the REAL production bundle. No live inference or owner data.
import {test,expect,type Page} from '@playwright/test';
import {createServerClient} from '@supabase/ssr';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const meta=JSON.parse(await readFile(path.join(process.env.OWNPATH_DEMO_BUILD_DIR!,'release.json'),'utf8'));
const pair=JSON.parse(await readFile(path.join(root,'.local-diagnostics/scan-rewrite-acceptance-20261025.json'),'utf8'));
const accepted=JSON.parse(await readFile(path.join(root,'.local-diagnostics/rewrite-compatibility-20261025.json'),'utf8'));
if(!pair.syntheticOnly||!accepted.syntheticOnly||accepted.outcome!=='accepted')throw new Error('Verified fictional artifacts required');
const normalize=(text:string)=>text.normalize('NFC').toLowerCase().replace(/\s/gu,'');
async function pdf(page:Page,expected:string,file:string,multi:boolean){
 const html=await page.locator('.op-scan-tool:not([hidden]) iframe[title="CV print document"], .op-content > section iframe[title="CV print document"]').last().getAttribute('srcdoc');
 expect(html).toBeTruthy();
 const print=await page.context().newPage();await print.setContent(html!);await print.emulateMedia({media:'print'});
 await expect(print.locator('button,nav,textarea,input')).toHaveCount(0);
 await print.pdf({path:file,preferCSSPageSize:true,printBackground:true});await print.close();
 const info=execFileSync('pdfinfo',[file],{encoding:'utf8'});const pages=Number(info.match(/Pages:\s+(\d+)/)?.[1]);expect(pages).toBeGreaterThan(0);if(multi)expect(pages).toBeGreaterThan(1);
 const text=execFileSync('pdftotext',['-raw',file,'-'],{encoding:'utf8'});expect(normalize(text)).toBe(normalize(expected));
 expect(text).not.toContain('Save CV');expect(text).not.toContain('Open saved CV editor');
 const bbox=execFileSync('pdftotext',['-bbox',file,'-'],{encoding:'utf8'});
 for(const word of bbox.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)"/g)){
   expect(+word[1]).toBeGreaterThanOrEqual(49);expect(+word[2]).toBeGreaterThanOrEqual(49);expect(+word[3]).toBeLessThanOrEqual(546);expect(+word[4]).toBeLessThanOrEqual(793);
 }
}
for(const width of [1440,390,320])test(`${width}px final complete CV journey, ownership, recovery and multi-page export`,async({page,context,baseURL,request},info)=>{
 await request.post('http://127.0.0.1:4399/__fixture/reset');
 await page.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin===meta.authOrigin){const response=await request.fetch('http://127.0.0.1:4399'+url.pathname+url.search,{method:route.request().method(),headers:route.request().headers(),data:route.request().postDataBuffer()||undefined});return route.fulfill({response});}return [baseURL,'http://127.0.0.1:4399'].includes(url.origin)?route.continue():route.abort();});
 async function signIn(){const auth=createServerClient(meta.authOrigin,'fictional-visual-key',{global:{fetch:(input,init)=>{const url=new URL(String(input));return fetch('http://127.0.0.1:4399'+url.pathname+url.search,init);}},cookies:{getAll:()=>[],setAll:async cookies=>context.addCookies(cookies.map(({name,value})=>({name,value,url:baseURL!})))}});expect((await auth.auth.signInWithPassword({email:'fictional@example.test',password:'Synthetic only'})).error).toBeNull();}
 await signIn();await page.setViewportSize({width,height:900});
 async function navigate(name:string){if(width<760)await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.locator('.op-sidebar nav').getByRole('link',{name,exact:true}).click();}
 await page.route('**/api/cv-review/disclosure',route=>route.fulfill({json:{provider:'Anthropic (Claude)',purpose:'controlled-final-build',external:true}}));
 await page.route('**/api/cv-review/extract?*',route=>route.fulfill({json:{text:pair.source.cv}}));
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async(text:string)=>{(window as unknown as {copied:string}).copied=text;}}}));
 let scans=0,rewrites=0;
 await page.route('**/api/cv-review/scan',async route=>{scans++;const body=route.request().postDataJSON();expect(body.cv).toBe(pair.source.cv);expect(body.jd).toBe(pair.source.jd);await new Promise(resolve=>setTimeout(resolve,400));await route.fulfill({json:pair.acceptedScan});});
 await page.route('**/api/cv-review/rewrite',async route=>{rewrites++;const body=route.request().postDataJSON();expect(body.base).toBe(pair.source.cv);expect(body.scan).toEqual(pair.acceptedScan);expect(body.instructions).toContain('concise');await new Promise(resolve=>setTimeout(resolve,400));await route.fulfill({json:accepted.result});});
 await page.goto('/app');await expect(page.locator('.op-sidebar nav a')).toHaveCount(3);expect([scans,rewrites]).toEqual([0,0]);
 await page.locator('input[type=file]').setInputFiles({name:'fictional.pdf',mimeType:'application/pdf',buffer:Buffer.from('Synthetic fixture extraction')});await page.getByLabel('Target job').fill(pair.source.jd);
 await page.getByRole('button',{name:'Scan CV',exact:true}).click();await expect(page.getByText('Scan in progress. No changes are applied until a valid response arrives.')).toBeVisible();await page.getByRole('button',{name:'Scanning…',exact:true}).dispatchEvent('click');
 await expect(page.getByRole('heading',{name:'Your scan',exact:true})).toBeVisible();expect(scans).toBe(1);await expect(page.getByRole('dialog')).toHaveCount(0);
 // The fallback help action is not an uncertainty flag or a server query.
 await expect(page.getByRole('button',{name:'Review an unresolved request',exact:true})).toBeVisible();expect(await page.evaluate(()=>sessionStorage.getItem('ownpath-ai-uncertainty'))).toBeNull();
 await page.getByRole('link',{name:'Rewrite this CV',exact:true}).first().click();await page.getByLabel('How should we improve it?').fill('Use concise, direct wording. Preserve every fact, date, number and manager attribution.');
 await page.getByRole('button',{name:'Rewrite CV',exact:true}).click();await expect(page.getByRole('heading',{name:'Rewriting your CV…',exact:true})).toBeVisible();await page.getByRole('button',{name:'Rewriting…',exact:true}).dispatchEvent('click');
 await expect(page.getByRole('heading',{name:'Your rewritten CV is ready',exact:true})).toBeVisible();expect([scans,rewrites]).toEqual([1,1]);
 const paper=page.getByRole('article',{name:'Formatted CV'});for(const fact of ['2023–2025','Business diploma, 2023','My manager negotiated supplier contracts, not me.'])await expect(paper).toContainText(fact);
 await page.getByRole('button',{name:'Edit complete CV',exact:true}).click();const edited=accepted.result.document+'\nManual edit retained — 17 fictional records.';await page.getByLabel('Complete CV text').fill(edited);
 await navigate('Scan CV');await navigate('Rewrite CV');await expect(page.getByLabel('Complete CV text')).toHaveValue(edited);
 await page.getByRole('button',{name:'Save this CV (optional)',exact:true}).click();const title=`Clearly labeled fictional demo ${width}`;await page.getByLabel('Title',{exact:true}).fill(title);
 const inserted=page.waitForResponse(r=>r.url().endsWith('/api/cv-review/saved')&&r.request().method()==='POST');await page.getByRole('button',{name:'Save CV',exact:true}).click();expect((await inserted).status()).toBe(200);await expect(page.getByText('CV saved.',{exact:true})).toBeVisible();
 await navigate('Saved CVs');await page.getByRole('link',{name:`${title} →`,exact:true}).click();await expect(page).toHaveURL(/\/app\/cvs\/[a-f0-9-]{36}$/);const savedId=new URL(page.url()).pathname.split('/').at(-1)!;
 await expect(page.locator('.op-content > section').getByRole('article',{name:'Formatted CV'})).toContainText('Manual edit retained');
 await page.getByRole('button',{name:'Open saved CV editor',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Open saved CV',exact:true}).click();await expect(page).toHaveURL(/\/app\/rewrite$/);
 await page.getByRole('button',{name:'Edit complete CV',exact:true}).click();await expect(page.getByLabel('Complete CV text')).toHaveValue(edited);const updated=edited+'\nUpdated saved version — no inference.';await page.getByLabel('Complete CV text').fill(updated);
 await page.getByRole('button',{name:'Save this CV (optional)',exact:true}).click();const patched=page.waitForResponse(r=>r.request().method()==='PATCH'&&r.url().endsWith('/api/cv-review/saved'));await page.getByRole('button',{name:'Save CV',exact:true}).click();const patchResponse=await patched;expect(patchResponse.status()).toBe(200);expect(patchResponse.request().postDataJSON().revision).toBe(1);expect((await patchResponse.json()).revision).toBe(2);
 await navigate('Saved CVs');await page.getByRole('link',{name:`${title} →`,exact:true}).click();const detail=page.locator('.op-content > section');await expect(detail.getByRole('article',{name:'Formatted CV'})).toContainText('Updated saved version');
 await detail.getByRole('button',{name:'Copy text',exact:true}).click();expect(await page.evaluate(()=>(window as unknown as {copied:string}).copied)).toBe(updated);
 const download=page.waitForEvent('download');await detail.getByRole('button',{name:'Download TXT',exact:true}).click();expect(await readFile((await (await download).path())!,'utf8')).toBe(updated);
 await pdf(page,updated,info.outputPath('edited-complete.pdf'),false);await detail.getByRole('button',{name:'Print / Save as PDF',exact:true}).click();await expect(detail.getByText(/Print requested/)).toBeVisible();expect([scans,rewrites]).toEqual([1,1]);
 await page.getByRole('button',{name:'Open saved CV editor',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Open saved CV',exact:true}).click();await page.getByRole('button',{name:'Edit complete CV',exact:true}).click();
 const long=updated+'\nExperience\n'+Array.from({length:80},(_,i)=>`Coordinator ${i+1}, Fictional Grove Group | ${2000+i}–${2001+i}\n- Maintained ${i+10} fictional records. Clear communication, careful follow-up and accurate documentation; this is a synthetic multi-page export check.`).join('\n');expect(long.length).toBeLessThan(24000);await page.getByLabel('Complete CV text').fill(long);await pdf(page,long,info.outputPath('long-complete.pdf'),true);
 if(width<760)await page.getByRole('button',{name:'Open navigation',exact:true}).click();await expect(page.getByRole('button',{name:/Account menu for/})).toBeVisible();if(width<760)await page.getByRole('button',{name:'Close navigation',exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('final-layout.png'),fullPage:true});
 // Controlled failed regeneration must retain the long manually edited document.
 await page.unroute('**/api/cv-review/rewrite');await page.route('**/api/cv-review/rewrite',route=>{rewrites++;return route.fulfill({status:502,json:{error:{code:'result_rejected',message:'PRIVATE OUTPUT'}}});});
 await page.getByRole('button',{name:'Rewrite again',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Rewrite edited CV',exact:true}).click();await expect(page.locator('#scan-error')).toContainText('No new CV result was applied');await expect(page.getByLabel('Complete CV text')).toHaveValue(long);expect([scans,rewrites]).toEqual([1,2]);
 // Expiry hides private content; only verified same-account resume restores it.
 await request.post('http://127.0.0.1:4399/__fixture/account',{data:{expired:true}});await page.evaluate(()=>window.dispatchEvent(new Event('ownpath:account-unavailable')));await expect(page.locator('.op-scan-tool')).toBeHidden();await page.getByRole('button',{name:'Verify account and resume'}).click();await expect(page.getByText(/Could not verify this account/)).toBeVisible();
 await request.post('http://127.0.0.1:4399/__fixture/account',{data:{expired:false}});await page.getByRole('button',{name:'Verify account and resume'}).click();await expect(page.locator('.op-scan-tool')).toBeVisible();await expect(page.getByLabel('Complete CV text')).toHaveValue(long);expect([scans,rewrites]).toEqual([1,2]);
 // A different synthetic owner cannot read the saved version and sees no old draft.
 await request.post('http://127.0.0.1:4399/__fixture/account',{data:{id:'00000000-0000-4000-8000-000000000002'}});await signIn();page.once('dialog',dialog=>dialog.accept());await page.goto('/app');await expect(page.getByRole('article',{name:'Formatted CV'})).toHaveCount(0);const denied=await page.evaluate(async id=>(await fetch('/api/cv-review/saved?id='+id)).status,savedId);expect(denied).toBe(404);expect([scans,rewrites]).toEqual([1,2]);
});
