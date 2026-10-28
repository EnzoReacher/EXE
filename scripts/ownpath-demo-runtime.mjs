// Real, numeric-loopback production snapshot. Never uses a fixture or sends AI.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { openSync } from 'node:fs';
import { cp, mkdir, mkdtemp, symlink, readFile, writeFile, readdir, stat, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const origin='http://127.0.0.1:4318';
const releaseBase=path.join(root,'.local-demo/releases');
const require=createRequire(await realpath(path.join(root,'node_modules/next/package.json')));
require('@next/env').loadEnvConfig(root,false,{info(){},error(){}});
const env={...process.env,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SITE_URL:origin,OWNPATH_CLAUDE_LOCAL_ORIGIN:origin};
delete env.NODE_OPTIONS;
if(env.OWNPATH_SCAN_PROVIDER!=='anthropic'||env.OWNPATH_CLAUDE_LOCAL_ENABLED!=='true'||!env.ANTHROPIC_API_KEY?.trim()||env.ANTHROPIC_MODEL!=='claude-haiku-4-5-20251001'||!env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://')||!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||!['',undefined,'OFF'].includes(env.OWNPATH_BILLING_MODE))throw new Error('Real configured Anthropic/Auth and billing OFF are required; nothing started.');
const identity=createHash('sha256').update(JSON.stringify([env.OWNPATH_SCAN_PROVIDER,env.ANTHROPIC_MODEL,origin,env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY])).digest('hex');
const next=path.join(root,'node_modules/next/dist/bin/next');
const inputs=['src','public','next.config.ts','tsconfig.json','package.json','pnpm-lock.yaml','scripts/cv-extract.mjs','scripts/cv-layout.mjs'];
async function hashes(directory){const result={};async function visit(name){if((await stat(path.join(directory,name))).isDirectory()){for(const child of await readdir(path.join(directory,name)))await visit(path.join(name,child));}else result[name]=createHash('sha256').update(await readFile(path.join(directory,name))).digest('hex');}for(const name of inputs)await visit(name);return result;}
async function release(directory){const absolute=await realpath(path.resolve(directory||''));if(path.dirname(absolute)!==releaseBase||!path.basename(absolute).startsWith('ownpath-demo-production-'))throw new Error('Exact owned production snapshot required.');const meta=JSON.parse(await readFile(path.join(absolute,'release.json'),'utf8'));if(meta.configurationSha256!==identity)throw new Error('Configured Auth/model/origin changed; rebuild before starting.');for(const [name,hash]of Object.entries(meta.sources))if(createHash('sha256').update(await readFile(path.join(absolute,name))).digest('hex')!==hash)throw new Error('Release source identity mismatch: '+name);if((await readFile(path.join(absolute,'.next/BUILD_ID'),'utf8')).trim()!==meta.buildId)throw new Error('Build identity mismatch');return {absolute,meta};}
const [action,directory]=process.argv.slice(2);
if(action==='build'){
 await mkdir(releaseBase,{recursive:true,mode:0o700});const absolute=await mkdtemp(path.join(releaseBase,'ownpath-demo-production-'));
 await mkdir(path.join(absolute,'scripts'));for(const name of inputs)await cp(path.join(root,name),path.join(absolute,name),{recursive:true});await symlink(path.join(root,'node_modules'),path.join(absolute,'node_modules'),'dir');
 const sources=await hashes(absolute);const fd=openSync(path.join(absolute,'build.log'),'a',0o600);
 const built=spawnSync(process.execPath,[next,'build','--webpack'],{cwd:absolute,env,stdio:['ignore',fd,fd]});if(built.status!==0)throw new Error('Production build failed; inspect '+path.join(absolute,'build.log'));
 const current=await hashes(root);for(const [name,hash]of Object.entries(sources))if(current[name]!==hash)throw new Error('Source changed during build: '+name);
 const meta={origin,buildId:(await readFile(path.join(absolute,'.next/BUILD_ID'),'utf8')).trim(),authOrigin:new URL(env.NEXT_PUBLIC_SUPABASE_URL).origin,configurationSha256:identity,sources};await writeFile(path.join(absolute,'release.json'),JSON.stringify(meta,null,2),{mode:0o600});console.log(JSON.stringify({directory:absolute,url:origin,buildId:meta.buildId,sourceFiles:Object.keys(sources).length}));
}else if(action==='start'){
 const {absolute,meta}=await release(directory);
 await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',()=>reject(new Error('Port 4318 is occupied; no process stopped.')));probe.listen(4318,'127.0.0.1',()=>probe.close(resolve));});
 const fd=openSync(path.join(absolute,'runtime.log'),'a',0o600);const child=spawn(process.execPath,[next,'start','--hostname','127.0.0.1','--port','4318'],{cwd:absolute,env,detached:true,stdio:['ignore',fd,fd]});await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});child.unref();await writeFile(path.join(absolute,'runtime.json'),JSON.stringify({pid:child.pid,origin,buildId:meta.buildId}),{mode:0o600});
 let ready=false;for(let i=0;i<30;i++){try{const r=await fetch(origin+'/sign-in',{signal:AbortSignal.timeout(1000)});if(r.status===200){ready=true;break;}}catch{/* Readiness only, no API inference. */}await new Promise(resolve=>setTimeout(resolve,250));}if(!ready)throw new Error('Owned runtime did not become ready; inspect runtime.log and runtime.json.');console.log(JSON.stringify({pid:child.pid,url:origin,buildId:meta.buildId,mode:'real Anthropic; normal Supabase Auth; loopback only'}));
}else if(action==='stop'){
 const {absolute}=await release(directory);const {pid}=JSON.parse(await readFile(path.join(absolute,'runtime.json'),'utf8'));if(await realpath(`/proc/${pid}/cwd`)!==absolute)throw new Error('Process cwd differs; refusing to stop it.');const command=await readFile(`/proc/${pid}/cmdline`,'utf8');if(!(command.includes(next)&&command.includes('start'))&&!command.startsWith('next-server (v'))throw new Error('Process command differs; refusing to stop it.');process.kill(-pid,'SIGTERM');console.log('Stopped only the recorded production process group '+pid);
}else throw new Error('Usage: node scripts/ownpath-demo-runtime.mjs build | start <snapshot> | stop <snapshot>');
