import { it as test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { billingPreviewAuthSource } from './ownpath-preview-auth.mjs';
const source = readFileSync('src/lib/supabase/auth-redirect.ts', 'utf8');
const origin = 'http://127.0.0.3:4347', auth = 'http://127.0.0.3:4348';
function load(source) { const exports = {}; new Function('exports', ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exports); return exports; }
test('normal production policy still rejects the fictional origin, missing config and unsafe redirects', () => {
 const normal=load(source);assert.equal(normal.getAuthCallbackUrl(origin,{siteUrl:origin,nodeEnv:'production'}),null);
 assert.equal(normal.getAuthCallbackUrl(origin,{siteUrl:'',nodeEnv:'production'}),null);
 assert.equal(normal.accountCallbackUrl('https://unexpected.example','/reset-password',{siteUrl:'https://trusted.example',nodeEnv:'production'}),'https://trusted.example/auth/callback?next=%2Freset-password');
});
test('only the disposable build trusts the exact fixed preview origin, retaining path and protocol validation', () => {
 const copy=load(billingPreviewAuthSource(source,origin,auth));const options={siteUrl:origin,nodeEnv:'production'};
 assert.equal(copy.accountCallbackUrl(origin,'/app',options),origin+'/auth/callback?next=%2Fapp');
 assert.equal(copy.accountCallbackUrl(origin,'/reset-password',options),origin+'/auth/callback?next=%2Freset-password');
 for(const siteUrl of['http://127.0.0.3:9999','http://127.0.0.2:4347',origin+'/path',origin+'?next=x','http://user@127.0.0.3:4347','http://evil.example'])assert.equal(copy.getAuthCallbackUrl(origin,{siteUrl,nodeEnv:'production'}),null);
 for(const path of['//evil.example','/\\evil.example'])assert.equal(copy.getAuthRedirectUrl(origin,path,options),null);
});
test('transformation cannot be used with real Auth or silently follow a changed validator',()=>{
 assert.throws(()=>billingPreviewAuthSource(source,origin,'https://real-auth.example'));
 assert.throws(()=>billingPreviewAuthSource(source,'https://real-site.example',auth));
 assert.throws(()=>billingPreviewAuthSource('',origin,auth));
});
test('Scan preview uses only its existing exact origin and cannot cross-wire Billing Auth',()=>{
 const site='http://127.0.0.2:4327',auth='http://127.0.0.2:4328';const copy=load(billingPreviewAuthSource(source,site,auth));
 assert.equal(copy.accountCallbackUrl(site,'/reset-password',{siteUrl:site,nodeEnv:'production'}),site+'/auth/callback?next=%2Freset-password');
 assert.throws(()=>billingPreviewAuthSource(source,site,'http://127.0.0.3:4348'));
});
