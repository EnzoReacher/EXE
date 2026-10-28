// Fresh isolated browser + fictional Auth/REST. NEVER creates a hosted account.
import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const meta=JSON.parse(await readFile(path.join(process.env.OWNPATH_DEMO_BUILD_DIR!,'release.json'),'utf8'));
const pair=JSON.parse(await readFile(path.join(root,'.local-diagnostics/scan-rewrite-acceptance-20261025.json'),'utf8'));
const accepted=JSON.parse(await readFile(path.join(root,'.local-diagnostics/rewrite-compatibility-20261025.json'),'utf8'));
if(!pair.syntheticOnly||!accepted.syntheticOnly)throw new Error('Fictional artifacts required');
for(const confirmationRequired of [false,true])test(`first user: ${confirmationRequired?'email confirmation':'immediate signup'}, Free allowances, saved content and logout/login persistence`,async({page,context,request,baseURL})=>{
 expect(await context.cookies()).toHaveLength(0);
 await request.post('http://127.0.0.1:4399/__fixture/reset');
 await request.post('http://127.0.0.1:4399/__fixture/signup-session',{data:{enabled:!confirmationRequired}});
 await page.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin===meta.authOrigin){const response=await request.fetch('http://127.0.0.1:4399'+url.pathname+url.search,{method:route.request().method(),headers:route.request().headers(),data:route.request().postDataBuffer()||undefined});return route.fulfill({response});}return [baseURL,'http://127.0.0.1:4399'].includes(url.origin)?route.continue():route.abort();});
 await page.route('**/api/cv-review/disclosure',route=>route.fulfill({json:{provider:'Anthropic (Claude)',external:true,purpose:'controlled-first-user'}}));
 await page.route('**/api/cv-review/extract?*',route=>route.fulfill({json:{text:pair.source.cv}}));
 let operations=0;await page.route('**/api/cv-review/scan',route=>{operations++;return route.fulfill({json:pair.acceptedScan});});await page.route('**/api/cv-review/rewrite',route=>{operations++;return route.fulfill({json:accepted.result});});
 const email='first-user@example.test',password='Synthetic passphrase 2026!';
 await page.goto('/sign-up');await page.getByLabel('Email address',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByLabel('Confirm password',{exact:true}).fill(password);
 const signup=page.waitForRequest(r=>new URL(r.url()).pathname==='/auth/v1/signup');await page.getByRole('button',{name:'Create your account',exact:true}).click();
 const redirect=new URL((await signup).url()).searchParams.get('redirect_to');expect(new URL(redirect!).origin).toBe('http://127.0.0.1:4318');expect(new URL(redirect!).pathname).toBe('/auth/callback');
 if(confirmationRequired){await expect(page.getByRole('heading',{name:'Check your email',exact:true})).toBeVisible();expect(page.url()).toContain('/sign-up');expect(operations).toBe(0);
   // Exercise the real callback/code exchange without visiting the live 4318 app
   // with a fictional session. Assert its production destination, then use test origin.
   const callback=await context.request.get(baseURL+'/auth/callback?code=fictional-first-user-code&next=/app',{maxRedirects:0});expect(callback.status()).toBe(307);expect(callback.headers().location).toBe('http://127.0.0.1:4318/app');await page.goto('/app');
 }
 await expect(page).toHaveURL(/\/app$/);await expect(page.getByRole('heading',{name:'Scan your CV',exact:true})).toBeVisible();
 const initial=await page.evaluate(async()=>{const r=await fetch('/api/billing/summary');return {status:r.status,data:await r.json()};});
 expect(initial.status).toBe(200);expect(initial.data.plan).toMatchObject({plan:'Free',scans:3,rewrites:1,scan_used:0,rewrite_used:0,saved_count:0});expect(operations).toBe(0);
 // These two responses are intercepted; no new account AI allowance is consumed.
 await page.locator('input[type=file]').setInputFiles({name:'fictional.pdf',mimeType:'application/pdf',buffer:Buffer.from('Controlled extraction')});await page.getByLabel('Target job').fill(pair.source.jd);await page.getByRole('button',{name:'Scan CV',exact:true}).click();await page.getByRole('link',{name:'Rewrite this CV',exact:true}).first().click();await page.getByLabel('How should we improve it?').fill('Concise wording; preserve facts.');await page.getByRole('button',{name:'Rewrite CV',exact:true}).click();await expect(page.getByRole('heading',{name:'Your rewritten CV is ready',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Edit complete CV',exact:true}).click();const edited=accepted.result.document+'\nFresh account manual edit.';await page.getByLabel('Complete CV text').fill(edited);await page.getByRole('button',{name:'Save this CV (optional)',exact:true}).click();const title='First-time fictional saved CV';await page.getByLabel('Title',{exact:true}).fill(title);await page.getByRole('button',{name:'Save CV',exact:true}).click();await expect(page.getByText('CV saved.',{exact:true})).toBeVisible();expect(operations).toBe(2);
 await page.getByRole('button',{name:/Account menu for/}).click();page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL(baseURL+'/');
 await page.goto('/app');await expect(page).toHaveURL(/\/sign-in/);expect(operations).toBe(2);
 await page.getByLabel('Email address',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/\/app$/);
 await page.reload();await expect(page.getByRole('heading',{name:'Scan your CV',exact:true})).toBeVisible();
 await page.locator('.op-sidebar nav').getByRole('link',{name:'Saved CVs',exact:true}).click();await page.getByRole('link',{name:`${title} →`,exact:true}).click();const detail=page.locator('.op-content > section');await expect(detail.getByRole('article',{name:'Formatted CV'})).toContainText('Fresh account manual edit.');
 const download=page.waitForEvent('download');await detail.getByRole('button',{name:'Download TXT',exact:true}).click();expect(await readFile((await (await download).path())!,'utf8')).toBe(edited);expect(operations).toBe(2);
});
