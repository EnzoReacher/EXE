import{cp,mkdtemp,mkdir,symlink,readFile,writeFile,rm,readdir}from'node:fs/promises';
import{createHash}from'node:crypto';
import{existsSync}from'node:fs';
import{createServer as netServer}from'node:net';
import http from'node:http';
import{spawn}from'node:child_process';
import path from'node:path';
import{fileURLToPath}from'node:url';
import{startFixture}from'../e2e/ownpath-fixture.mjs';
import{createDatabase,dropDatabase,bridge,ownerA}from'../e2e/billing/database.mjs';
import{startProvider}from'../e2e/billing/provider.mjs';
import{billingPreviewAuthSource,previewLayoutSource}from'./ownpath-preview-auth.mjs';
import{createSamples}from'../e2e/owner-preview/samples.mjs';
import{jd,instruction}from'../e2e/owner-preview/scenario.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),origin='http://127.0.0.3:4347',appOrigin='http://127.0.0.1:4349';
const buildOnly=process.argv.includes('--build-only');
const servers=new Set(),children=new Set(),browsers=new Set();let temporary,database,stopping=false,runner;
async function cleanup(){if(stopping)return;stopping=true;clearInterval(runner);for(const b of browsers)await b.close().catch(()=>{});for(const child of children)if(child.exitCode===null)await new Promise(resolve=>{child.once('exit',resolve);child.kill('SIGTERM');});for(const s of servers)await new Promise(resolve=>{s.close(resolve);s.closeAllConnections?.();});if(database)dropDatabase(database);if(temporary)await rm(temporary,{recursive:true,force:true});}
for(const signal of['SIGINT','SIGTERM'])process.on(signal,()=>void cleanup().then(()=>process.exit(0)));
async function main(){
 const probes=[];for(const[port,host]of(buildOnly?[]:[[4347,'127.0.0.3'],[4348,'127.0.0.3'],[4349,'127.0.0.1'],[4350,'127.0.0.3']])){const s=netServer();servers.add(s);await new Promise((resolve,reject)=>{s.once('error',()=>reject(new Error(`Port ${port} occupied; no existing process stopped.`)));s.listen(port,host,resolve);});probes.push(s);}
 temporary=await mkdtemp('/tmp/opencode/ownpath-billing-demo-');if(!buildOnly){database='ownpath_billing_demo_'+process.pid;createDatabase(database);}
 const app=path.join(temporary,'app');await mkdir(app);for(const name of['src','public','next.config.ts','tsconfig.json','package.json','pnpm-lock.yaml'])if(existsSync(path.join(root,name)))await cp(path.join(root,name),path.join(app,name),{recursive:true});
 await mkdir(path.join(app,'scripts'));for(const name of ['cv-extract.mjs','cv-layout.mjs'])await cp(path.join(root,'scripts',name),path.join(app,'scripts',name));await symlink(path.join(root,'node_modules'),path.join(app,'node_modules'),'dir');
  if(!buildOnly){
  const samples=path.join(temporary,'samples'),sources=await createSamples(samples,root,b=>browsers.add(b));
  await cp(path.join(root,'e2e/owner-preview/notice.tsx'),path.join(app,'src/components/ownpath/preview-notice.tsx'));
  const layout=path.join(app,'src/app/layout.tsx');await writeFile(layout,previewLayoutSource(await readFile(layout,'utf8'),'Billing',jd,instruction));
  for(const name of['pricing','checkout','billing-panel']){const file=path.join(app,'src/components/ownpath',name+'.tsx');await writeFile(file,(await readFile(file,'utf8')).replace(/\{(?:mode==='LOCAL_FAKE'|data.mode==="LOCAL_FAKE")&&<p className=\{styles.badge\}>[^<]+<\/p>\}/g,''));}
  const redirects=path.join(app,'src/lib/supabase/auth-redirect.ts');await writeFile(redirects,billingPreviewAuthSource(await readFile(redirects,'utf8'),origin,'http://127.0.0.3:4348'));
 for(const[name,marker]of[['client.ts','createBrowserClient(url, key, {'],['server.ts','createServerClient(url, key, {'],['proxy.ts','createServerClient(url, key, {']]){const file=path.join(app,'src/lib/supabase',name),source=await readFile(file,'utf8');if(source.split(marker).length!==2)throw new Error('Cookie isolation contract changed.');await writeFile(file,source.replace(marker,`${marker} cookieOptions: { name: 'ownpath-billing-fictional-auth' },`));}
 const target=path.join(app,'src/lib/scan-rewrite/server.ts'),source=await readFile(target,'utf8');
 await cp(path.join(root,'e2e/owner-preview/scenario.mjs'),path.join(app,'src/lib/scan-rewrite/billing-scenario.mjs'));
 const fixture=(await readFile(path.join(root,'e2e/billing/ai-fixture.ts'),'utf8')).replace('../owner-preview/scenario.mjs','./billing-scenario.mjs').replace("const sources = [cvLines.join('\\n'),cvLines.join('\\n\\n')];",`const sources = ${JSON.stringify(sources)};`);await writeFile(path.join(app,'src/lib/scan-rewrite/billing-ai-fixture.ts'),fixture);
  const providerImport='import { configuration, createProvider, type Provider } from "./provider";';
  if(!source.includes(providerImport)||!source.includes('    const digest='))throw new Error('Billing provider isolation contract changed.');
  await writeFile(target,source.replace(providerImport,'import { type Provider } from "./provider";').replace("    const digest=", "    validateFixture(operation,body);\n    const digest=")+'\nimport {configuration,createProvider,validateFixture} from "./billing-ai-fixture";\n');
 const disclosure=path.join(app,'src/app/api/cv-review/disclosure/route.ts');await writeFile(disclosure,'export async function GET(){return Response.json({provider:"Local billing fixture",purpose:"scan-rewrite-v1",external:false},{headers:{"Cache-Control":"no-store"}});}\n');
 }
 const env={PATH:process.env.PATH,HOME:process.env.HOME,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.3:4348',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fictional-billing-public',NEXT_PUBLIC_SITE_URL:origin,SUPABASE_SERVICE_ROLE_KEY:'fictional-billing-admin',OWNPATH_BILLING_MODE:'LOCAL_FAKE',OWNPATH_BILLING_FAKE_ORIGIN:'http://127.0.0.3:4350',OWNPATH_BILLING_RUNNER_SECRET:'fictional-runner-only'};
 if(buildOnly){env.OWNPATH_BILLING_MODE='OFF';env.SUPABASE_SERVICE_ROLE_KEY='';}
 const next=path.join(root,'node_modules/next/dist/bin/next');console.log('Building isolated billing demo; no private env, hosted database or provider requests.');
 await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[next,'build','--webpack'],{cwd:app,env,stdio:'inherit'});children.add(child);child.once('error',reject);child.once('exit',code=>{children.delete(child);if(code===0)resolve();else reject(new Error('Billing demo build failed.'));});});
 const inventory=[];async function visit(base){if(!existsSync(path.join(app,base)))return;for(const entry of await readdir(path.join(app,base),{withFileTypes:true})){const p=path.join(base,entry.name);if(entry.isDirectory())await visit(p);else inventory.push({path:p,sha256:createHash('sha256').update(await readFile(path.join(app,p))).digest('hex')});}}await visit('src');await visit('public');for(const p of['package.json','next.config.ts','tsconfig.json','scripts/cv-extract.mjs','scripts/cv-layout.mjs'])inventory.push({path:p,sha256:createHash('sha256').update(await readFile(path.join(app,p))).digest('hex')});inventory.sort((a,b)=>a.path.localeCompare(b.path));const output=path.join(root,'.factory/evidence/OWNPATH-BILLING-20261021');await mkdir(output,{recursive:true});await writeFile(path.join(output,buildOnly?'production-build.json':'demo-build.json'),JSON.stringify({buildId:(await readFile(path.join(app,'.next/BUILD_ID'),'utf8')).trim(),sourceIdentity:createHash('sha256').update(JSON.stringify(inventory)).digest('hex'),builtAt:new Date().toISOString(),mode:buildOnly?'OFF':'LOCAL_FAKE',transformed:!buildOnly,files:inventory},null,2));
 if(buildOnly){await cleanup();return;}
 for(const s of probes){await new Promise(resolve=>s.close(resolve));servers.delete(s);}
 servers.add(startFixture({port:4348,host:'127.0.0.3',origin,owner:ownerA,sqlBridge:bridge(database)}));servers.add(startProvider({file:path.join(temporary,'provider.json')}));
 const gateway=http.createServer(async(req,res)=>{if(req.headers.host!==new URL(origin).host||(req.headers.origin&&req.headers.origin!==origin)||!req.url.startsWith('/')||req.url.startsWith('//')){res.writeHead(403);res.end();return;}const url=new URL(req.url,origin);if(url.pathname.startsWith('/__preview/samples/')){const name=url.pathname.split('/').at(-1),types={'sales-cv.pdf':'application/pdf','sales-cv.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','target-job.txt':'text/plain','rewrite-instruction.txt':'text/plain'};if(!Object.hasOwn(types,name)){res.writeHead(404);res.end();return;}try{res.writeHead(200,{'Content-Type':types[name],'Content-Disposition':`attachment; filename="${name}"`,'Cache-Control':'no-store'});res.end(await readFile(path.join(temporary,'samples',name)));}catch{res.end();}return;}const headers={...req.headers,host:new URL(appOrigin).host};for(const key of Object.keys(headers))if(key.startsWith('x-forwarded-'))delete headers[key];if(headers.origin)headers.origin=appOrigin;const upstream=http.request(appOrigin+req.url,{method:req.method,headers},reply=>{const output={...reply.headers};if(output.location){const location=new URL(output.location,appOrigin);if(['127.0.0.1','localhost'].includes(location.hostname)&&location.port==='4349')output.location=origin+location.pathname+location.search;}res.writeHead(reply.statusCode,output);reply.pipe(res);});upstream.on('error',()=>{res.writeHead(503);res.end('Billing demo starting.');});req.pipe(upstream);}).listen(4347,'127.0.0.3');servers.add(gateway);
 let restarting=false;const launch=()=>{const child=spawn(process.execPath,[next,'start','--hostname','127.0.0.1','--port','4349'],{cwd:app,env,stdio:'inherit'});children.add(child);child.once('exit',()=>{children.delete(child);if(!stopping&&!restarting)void cleanup();});return child;};let applicationChild=launch();
 // Local operator signal, not a web route: test a real app restart while SQL and
 // provider evidence survive. Never targets the owner's servers.
 process.on('SIGUSR1',()=>{if(stopping||restarting)return;restarting=true;const old=applicationChild;old.once('exit',()=>{if(!stopping)applicationChild=launch();restarting=false;});old.kill('SIGTERM');});
 runner=setInterval(()=>void fetch(origin+'/api/billing/reconcile',{method:'POST',headers:{Authorization:'Bearer fictional-runner-only'},signal:AbortSignal.timeout(30000)}).catch(()=>{}),10000);
 console.log(`Billing demo: ${origin}/sign-in\nFictional services; NO REAL PAYMENT. Sign in: fictional@example.test / fictional-preview-only\nSample PDF: ${origin}/__preview/samples/sales-cv.pdf (DOCX also available).\nUse the exact JD/instruction in the visible Sample account notice. Other scenarios are rejected.\nPricing: ${origin}/pricing\nDatabase ${database}; Ctrl+C removes only this disposable demo.\nBuild: ${app}/.next/BUILD_ID`);
}
try{await main();}catch(error){console.error(error.message);await cleanup();process.exitCode=1;}
