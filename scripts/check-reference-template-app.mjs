// One isolated production build, fictional loopback services and fresh browser
// contexts. Never loads .env files or touches the owner's active build/tab.
import { cp, mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { startFixture } from '../e2e/ownpath-fixture.mjs';
const structureCheck = process.argv.includes('--structure');
const structuredCVCheck = process.argv.includes('--structured-cv');
const root = process.cwd(), dir = path.join(root, structuredCVCheck ? '.local-demo/evidence/structured-cv' : structureCheck ? '.local-demo/evidence/structure-correction' : '.local-demo/evidence/reference-template');
await mkdir(dir, { recursive: true });
const app = await mkdtemp('/tmp/opencode/ownpath-reference-template-');
for (const name of ['src', 'public', 'next.config.ts', 'tsconfig.json', 'package.json', 'pnpm-lock.yaml']) await cp(path.join(root, name), path.join(app, name), { recursive: true });
await mkdir(path.join(app, 'scripts'));
for (const name of ['cv-extract.mjs', 'cv-layout.mjs']) await cp(path.join(root, 'scripts', name), path.join(app, 'scripts', name));
await symlink(path.join(root, 'node_modules'), path.join(app, 'node_modules'), 'dir');
const env = { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:4397', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fictional-template-test-key', NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:4396', OWNPATH_OPENAI_LOCAL_ENABLED: 'false', OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '' };
const next = path.join(root, 'node_modules/next/dist/bin/next');
const run = (args, cwd, environment = env) => new Promise((resolve, reject) => { const child = spawn(process.execPath, args, { cwd, env: environment, stdio: 'inherit' }); child.once('error', reject); child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Check failed: ${code}`))); });
let fixture, server;
try {
  // Bind Auth fixture first: occupied port aborts without killing other services.
  fixture = startFixture({ port: 4397, origin: 'http://127.0.0.1:4396', billingSummary: true });
  await new Promise((resolve, reject) => { fixture.once('listening', resolve); fixture.once('error', reject); });
  await run([next, 'build', '--webpack'], app);
  await writeFile(path.join(dir, 'isolated-build.json'), JSON.stringify({ app, mode: 'fictional-loopback-only', builtAt: new Date().toISOString() }, null, 2));
  server = spawn(process.execPath, [next, 'start', '--hostname', '127.0.0.1', '--port', '4396'], { cwd: app, env, stdio: 'inherit' });
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) throw new Error('Isolated server exited.');
    try { if ((await fetch('http://127.0.0.1:4396/sign-in')).ok) { ready = true; break; } } catch { /* bounded readiness */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error('Isolated server readiness failed.');
  await run([path.join(root, 'node_modules/@playwright/test/cli.js'), 'test', structuredCVCheck ? '--config=e2e/structured-cv.config.mts' : structureCheck ? '--config=e2e/structure-correction.config.mts' : '--config=e2e/reference-template.config.mts'], root, { PATH: process.env.PATH, HOME: process.env.HOME, ...(structureCheck ? { OWNPATH_STRUCTURE_OWNER_EXPORT: process.env.OWNPATH_STRUCTURE_OWNER_EXPORT, OWNPATH_STRUCTURE_OWNER_ASSIGNMENTS: process.env.OWNPATH_STRUCTURE_OWNER_ASSIGNMENTS } : {}) });
} finally {
  if (server && server.exitCode === null) { server.kill('SIGTERM'); await new Promise(resolve => server.once('exit', resolve)); }
  if (fixture) await new Promise(resolve => { fixture.close(resolve); fixture.closeAllConnections(); });
  // Retain only this task's isolated build for inspection, not activation.
}
