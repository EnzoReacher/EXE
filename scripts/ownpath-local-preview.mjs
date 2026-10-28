// Opt-in LOCAL harness. No production route imports this file or its fixtures.
import { cp, mkdtemp, mkdir, symlink, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { startFixture } from '../e2e/ownpath-fixture.mjs';
import { createSamples } from '../e2e/owner-preview/samples.mjs';
import { createGateway, previewCookie } from '../e2e/owner-preview/gateway.mjs';
import { previewAuthSource, previewLayoutSource } from './ownpath-preview-auth.mjs';
import { jd, instruction } from '../e2e/owner-preview/scenario.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Separate loopback host prevents the browser sending 4317's 127.0.0.1 cookies.
const origin = 'http://127.0.0.2:4327', authOrigin = 'http://127.0.0.2:4328', appOrigin = 'http://127.0.0.1:4329';
const children = new Set(), servers = new Set(), browsers = new Set(); let temporary, stopping = false;
async function stopChild(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise(resolve => { child.once('exit', resolve); try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); } const timer = setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); } }, 5000); child.once('exit', () => clearTimeout(timer)); });
}
async function cleanup() {
  if (stopping) return; stopping = true;
  await Promise.all([...browsers].map(browser => browser.close().catch(() => {})));
  await Promise.all([...children].map(stopChild));
  await Promise.all([...servers].map(server => new Promise(resolve => { server.close(resolve); server.closeAllConnections?.(); })));
  if (temporary) await rm(temporary, { recursive: true, force: true });
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { void cleanup().then(() => process.exit(0)); });
function command(args, cwd, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd, env, detached: true, stdio: 'inherit' }); children.add(child);
    child.once('error', reject); child.once('exit', code => { children.delete(child); if (code === 0) resolve(); else reject(new Error('Isolated build failed.')); });
  });
}
async function main() {
  // Own all probe sockets before doing any build work; never kill another process.
  const probes = [];
  for (const [port, host] of [[4327, '127.0.0.2'], [4328, '127.0.0.2'], [4329, '127.0.0.1']]) {
    const probe = createServer(); servers.add(probe);
    await new Promise((resolve, reject) => { probe.once('error', () => reject(new Error(`Port ${port} is occupied. Nothing was stopped.`))); probe.listen(port, host, resolve); }); probes.push(probe);
  }
  temporary = await mkdtemp('/tmp/opencode/ownpath-local-preview-');
  const application = path.join(temporary, 'app'); await mkdir(application);
  for (const name of ['src', 'public', 'next.config.ts', 'tsconfig.json', 'package.json', 'pnpm-lock.yaml']) if (existsSync(path.join(root, name))) await cp(path.join(root, name), path.join(application, name), { recursive: true });
  await mkdir(path.join(application, 'scripts')); for (const name of ['cv-extract.mjs', 'cv-layout.mjs']) await cp(path.join(root, 'scripts', name), path.join(application, 'scripts', name));
  await symlink(path.join(root, 'node_modules'), path.join(application, 'node_modules'), 'dir');
  const redirects=path.join(application,'src/lib/supabase/auth-redirect.ts');await writeFile(redirects,previewAuthSource(await readFile(redirects,'utf8'),origin,authOrigin));
  await cp(path.join(root,'e2e/owner-preview/notice.tsx'),path.join(application,'src/components/ownpath/preview-notice.tsx'));
  const layout=path.join(application,'src/app/layout.tsx');await writeFile(layout,previewLayoutSource(await readFile(layout,'utf8'),'Scan',jd,instruction));
  // Cookie namespace isolation is applied ONLY to the disposable copy. It avoids
  // reading/overwriting the owner's loopback Auth cookies, even in the same browser.
  for (const [name, marker] of [['client.ts', 'createBrowserClient(url, key, {'], ['server.ts', 'createServerClient(url, key, {'], ['proxy.ts', 'createServerClient(url, key, {']]) {
    const file = path.join(application, 'src/lib/supabase', name), source = await readFile(file, 'utf8');
    if (source.split(marker).length !== 2) throw new Error('Cookie isolation source changed; preview refused.');
    await writeFile(file, source.replace(marker, `${marker} cookieOptions: { name: '${previewCookie}' },`));
  }
  const samples = path.join(root, '.factory/evidence/OWNPATH-PREVIEW-20261021/samples');
  console.log('Preparing fictional PDF/DOCX samples with actual extraction…'); const sources = await createSamples(samples, root, browser => browsers.add(browser));
  const env = { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: authOrigin, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fictional-local-preview-key', NEXT_PUBLIC_SITE_URL: origin, OWNPATH_OPENAI_LOCAL_ENABLED: 'false', OPENAI_API_KEY: '', OPENAI_MODEL: '' };
  console.log('Building a private source copy; normal .next and private env files are untouched…');
  const next = path.join(root, 'node_modules/next/dist/bin/next'); await command([next, 'build', '--webpack'], application, env);
  if (stopping) return;
  for (const probe of probes) { await new Promise(resolve => probe.close(resolve)); servers.delete(probe); }
  const auth = startFixture({ port: 4328, origin, host: '127.0.0.2', billingSummary: true }); servers.add(auth);
  await new Promise((resolve, reject) => { auth.once('listening', resolve); auth.once('error', reject); });
  const gateway = createGateway({ origin, appOrigin, authOrigin, samples, sources }); servers.add(gateway.server);
  await new Promise((resolve, reject) => { gateway.server.once('error', reject); gateway.server.listen(4327, '127.0.0.2', resolve); });
  const app = spawn(process.execPath, [next, 'start', '--hostname', '127.0.0.1', '--port', '4329'], { cwd: application, env, detached: true, stdio: 'inherit' }); children.add(app);
  app.once('error', () => { console.error('Isolated application could not start.'); void cleanup(); });
  app.once('exit', () => { children.delete(app); if (!stopping) { console.error('Isolated application stopped.'); void cleanup(); } });
  for (let tries = 0; tries < 60; tries++) {
    if (stopping) return;
    try { const response = await fetch(`${appOrigin}/sign-in`, { signal: AbortSignal.timeout(1000), redirect: 'manual' }); if (response.ok) { gateway.setReady(); console.log(`Local preview ready: ${origin}\nFictional services; NO REAL PAYMENT. Sample account opens automatically.\nManual sign-in: fictional@example.test / fictional-preview-only\nSample PDF: ${origin}/__preview/samples/sales-cv.pdf (DOCX also available).\nUse the exact JD/instruction under Samples & instructions; other scenarios are rejected.\nCtrl+C stops only these preview services and removes their private build.`); return; } } catch { /* Bounded readiness check; never fall back to hosted services. */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Isolated application readiness timed out.');
}
try { await main(); } catch (error) { console.error(error instanceof Error ? error.message : 'Local preview startup failed.'); await cleanup(); process.exitCode = 1; }
