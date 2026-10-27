// Focused compiled Edit/Save interaction check, using only the existing isolated fixture.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { jd, instruction } from '../owner-preview/scenario.mjs';
const origin='http://127.0.0.3:4347',out='.factory/evidence/OWNPATH-RESULT-PANELS-20261022';
await mkdir(out+'/screenshots',{recursive:true});const browser=await chromium.launch(),external=[],requests=[];
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
await context.route('**/*',r=>{if([origin,'http://127.0.0.3:4348','http://127.0.0.3:4350'].includes(new URL(r.request().url()).origin))return r.continue();external.push(r.request().url());return r.abort();});
const page=await context.newPage();page.on('request',r=>{if(r.method()!=='GET'&&/\/api\/cv-review\/(scan|rewrite|saved)$/.test(r.url()))requests.push(new URL(r.url()).pathname);});
try{
 await page.goto(origin+'/sign-in');await page.getByLabel('Email address').fill('fictional@example.test');await page.getByLabel('Password',{exact:true}).fill('fictional-preview-only');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/app');
 const pdf=await context.request.get(origin+'/__preview/samples/sales-cv.pdf');await writeFile('/tmp/opencode/result-panels-sales.pdf',await pdf.body());await page.locator('input[type=file]').setInputFiles('/tmp/opencode/result-panels-sales.pdf');await page.getByText('Extraction complete.').waitFor();await page.getByLabel('Target job',{exact:true}).fill(jd);await page.getByRole('button',{name:'Scan CV',exact:true}).click();await page.getByRole('heading',{name:'Your scan',exact:true}).waitFor();await page.getByRole('link',{name:'Rewrite this CV',exact:true}).first().click();await page.getByLabel('How should we improve it?').fill(instruction);await page.getByRole('button',{name:'Rewrite CV',exact:true}).click();await page.getByRole('heading',{name:'Your rewritten CV is ready',exact:true}).waitFor();
 const edit=page.getByRole('button',{name:'Edit complete CV',exact:true}),save=page.getByRole('button',{name:'Save this CV (optional)',exact:true}),row=page.locator('.op-result-action-row'),editor=page.getByLabel('Complete CV text',{exact:true}),title=page.getByLabel('Title',{exact:true});
 const original=await editor.inputValue(),manual=original+'\nOwner manual edit — preserve this exact wording.',name='Owner manual save title';const editorHandle=await editor.elementHandle(),titleHandle=await title.elementHandle();
 await edit.click();await editor.fill(manual);await save.click();await title.fill(name);await save.click();
 const geometry=[];
 for(const width of[1440,390,320]){
  await page.setViewportSize({width,height:1000});await row.scrollIntoViewIfNeeded();await row.evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-80));
  const baseline={edit:await edit.boundingBox(),save:await save.boundingBox()},scroll=await page.evaluate(()=>scrollY);
  for(const state of['closed','edit','save','edit','save','closed']){
   if(state==='edit')await edit.click();else if(state==='save')await save.click();else if(await edit.getAttribute('aria-expanded')==='true')await edit.click();else if(await save.getAttribute('aria-expanded')==='true')await save.click();
   await expect(edit).toHaveAttribute('aria-expanded',String(state==='edit'));await expect(save).toHaveAttribute('aria-expanded',String(state==='save'));
   await expect(page.locator('#cv-edit-panel')).toBeVisible({visible:state==='edit'});await expect(page.locator('#cv-save-panel')).toBeVisible({visible:state==='save'});
   for(const [key,button] of [['edit',edit],['save',save]]){const actual=await button.boundingBox();for(const dim of['x','y','width','height'])assert.ok(Math.abs(actual[dim]-baseline[key][dim])<1,`${width} ${state} ${key} ${dim} moved`);}
   assert.equal(await page.evaluate(()=>scrollY),scroll,'panel switching must not scroll');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await expect(editor).toHaveValue(manual);await expect(title).toHaveValue(name);assert.equal(requests.length,2);geometry.push({width,state,edit:await edit.boundingBox(),save:await save.boundingBox()});
   await page.screenshot({path:`${out}/screenshots/${width}-${state}.png`,fullPage:true,animations:'disabled'});
  }
 }
 await edit.focus();await page.keyboard.press('Enter');await expect(edit).toBeFocused();await expect(editor).toBeVisible();await page.keyboard.press('Tab');await expect(save).toBeFocused();await page.keyboard.press('Space');await expect(save).toBeFocused();await expect(title).toBeVisible();await page.keyboard.press('Tab');await expect(title).toBeFocused();
 assert.ok(await editorHandle.evaluate(el=>el===document.getElementById('complete-cv')));assert.ok(await titleHandle.evaluate(el=>el===document.getElementById('cv-title')));assert.equal(requests.length,2);
 await page.getByRole('button',{name:'Save CV',exact:true}).click();await page.getByText('CV saved.',{exact:true}).waitFor();for(let i=0;i<3;i++){await edit.click();await expect(editor).toHaveValue(manual);await save.click();await expect(title).toHaveValue(name);await expect(page.getByText('CV saved.',{exact:true})).toBeVisible();}assert.equal(requests.length,3);await expect(page.locator('.op-draft-state')).toContainText('Saved draft');await expect(page.getByLabel('Formatted CV')).toContainText('Owner manual edit — preserve this exact wording.');assert.deepEqual(external,[]);
 await writeFile(out+'/browser-results.json',JSON.stringify({geometry,requests,manualEditsPreserved:true,titlePreserved:true,saveAcknowledgementPreserved:true,keyboard:true,external,finished:new Date().toISOString()},null,2));console.log('PASS stable closed/Edit/Save rows at 1440/390/320, repeated switching, no scrolling or requests, keyboard, mounted edits/title and acknowledged save preservation');
}finally{await context.close();await browser.close();}
