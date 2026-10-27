import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, stat, rm, chmod } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
vi.mock('server-only', () => ({}));
import { runOwnerRewriteDiagnostic, syntheticRewritePayload } from './diagnose-claude-rewrite-runner.ts';
import {completeRewriteFixture} from '../src/lib/scan-rewrite/structured-rewrite.fixture';
const temporary = [];
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(temporary.splice(0).map(dir => rm(dir, { recursive: true, force: true }))); });
const directory = async () => { const dir = await mkdtemp('/tmp/opencode/diagnostic-test-'); temporary.push(dir); return dir; };
const output = { replacements: [{ lineId: 'b4', original: 'Helped customers choose products and kept the stock list up to date.', text: 'Assisted customers with product selection and kept the stock list up to date.' }], changes: ['Clearer wording.'], notes: ['The manager’s supplier negotiation remains attributed to the manager.'] };
const envelope = (value = completeRewriteFixture(syntheticRewritePayload().base), stop_reason = 'end_turn') => ({ type: 'message', role: 'assistant', stop_reason, content: [{ type: 'text', text: JSON.stringify(value) }], usage: { input_tokens: 1234, output_tokens: 234, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, PRIVATE: 'DO_NOT_LOG' } });
const run = (request, outputDirectory, args = ['--execute-paid-once']) => runOwnerRewriteDiagnostic({ args, getKey: () => 'SYNTHETIC_API_KEY_NEVER_LOG', request, outputDirectory });

it('requires the exact explicit flag before reading a key, creating files or calling fetch', async () => {
  const request = vi.fn(); const getKey = vi.fn();
  for (const args of [[], ['--help'], ['--execute-paid-once', '--execute-paid-once'], ['--model', 'other']]) {
    expect((await runOwnerRewriteDiagnostic({ args, getKey, request })).outcome).toBe('not_executed');
  }
  expect(request).not.toHaveBeenCalled(); expect(getKey).not.toHaveBeenCalled();
  expect((await runOwnerRewriteDiagnostic({ args: ['--execute-paid-once'], getKey: () => undefined, request })).code).toBe('key_unavailable'); expect(request).not.toHaveBeenCalled();
});
it('makes exactly one pinned request and writes only the validated synthetic result into a private file', async () => {
  const dir = await directory(); const request = vi.fn().mockResolvedValue(Response.json(envelope(), { headers: { 'request-id': 'req_synthetic_diagnostic' } }));
  const report = await run(request, dir); expect(request).toHaveBeenCalledOnce(); expect(report).toMatchObject({ outcome: 'accepted', stage: 'application_response', inferenceRequests: 1, providerRequestId: 'req_synthetic_diagnostic', usage: { input_tokens: 1234, output_tokens: 234 } });
  const [url, options] = request.mock.calls[0]; const body = JSON.parse(options.body);
  expect(url).toBe('https://api.anthropic.com/v1/messages'); expect(body).toMatchObject({ model: 'claude-haiku-4-5-20251001', max_tokens: 8000, thinking: { type: 'disabled' }, stream: false }); expect(options.redirect).toBe('error'); expect(options.signal).toBeInstanceOf(AbortSignal);
  expect(body).not.toHaveProperty('tools'); expect(body).not.toHaveProperty('cache_control'); expect(body.system).toContain('COMPLETE CV'); expect(body.output_config.format.schema.properties.sections.type).toBe('array');
  expect(Buffer.byteLength(options.body)).toBeLessThanOrEqual(32000); expect(options.body).not.toContain('SYNTHETIC_API_KEY');
  const record = JSON.parse(await readFile(report.resultFile, 'utf8')); expect(record.result.document).toContain('My manager negotiated supplier contracts, not me.'); expect(record.result.format).toBe('structured-cv-v1'); expect(record.source.cv).toBe(syntheticRewritePayload().cv);
  expect((await stat(report.resultFile)).mode & 0o777).toBe(0o600); expect((await stat(dir)).mode & 0o777).toBe(0o700);
  expect(JSON.stringify(report)).not.toContain(output.notes[0]); expect(JSON.stringify(record)).not.toContain('SYNTHETIC_API_KEY'); expect(JSON.stringify(report)).not.toContain('DO_NOT_LOG');
});
it.each([
  [null, 'end_turn', 'output_schema'],
  [{ ...output, notes: [{ text: 'PRIVATE' }] }, 'end_turn', 'output_schema'],
  [{ ...output, notes: ['x'.repeat(701)] }, 'end_turn', 'output_schema'],
  [{ ...completeRewriteFixture(syntheticRewritePayload().base), header: {nameSourceId:'b999',titleSourceId:'',contactSourceIds:[]} }, 'end_turn', 'grounding'],
  [output, 'max_tokens', 'provider_envelope'],
  [output, 'refusal', 'provider_envelope'],
])('rejects invalid/ungrounded/refused/truncated synthetic response %# without retry or partial success', async (value, stop, stage) => {
  const request = vi.fn().mockResolvedValue(Response.json(envelope(value, stop))); const report = await run(request, await directory());
  expect(report).toMatchObject({ outcome: 'rejected', stage, inferenceRequests: 1, usage: { input_tokens: 1234 } }); expect(request).toHaveBeenCalledOnce();
  const record = JSON.parse(await readFile(report.resultFile, 'utf8')); expect(record).not.toHaveProperty('result'); expect(record).not.toHaveProperty('source'); expect(JSON.stringify(record)).not.toContain('PRIVATE');
});
it.each([401, 429, 529])('rejects HTTP %s without printing raw provider errors or retrying', async status => {
  const request = vi.fn().mockResolvedValue(new Response('PRIVATE_PROVIDER_ERROR', { status })); const report = await run(request, await directory()); expect(report).toMatchObject({ outcome: 'rejected', httpStatus: status, inferenceRequests: 1 }); expect(request).toHaveBeenCalledOnce(); expect(JSON.stringify(report)).not.toContain('PRIVATE');
});
it('persists only a bounded redacted HTTP 400 error summary in future diagnostic artifacts', async () => {
  const request = vi.fn().mockResolvedValue(Response.json({ type: 'error', error: { type: 'invalid_request_error', message: 'output_config.format.schema.properties.sections.items.properties.heading.type: PRIVATE_SOURCE_AND_KEY' } }, { status: 400, headers: { 'request-id': 'req_synthetic_400' } }));
  const report = await run(request, await directory()); const saved = JSON.parse(await readFile(report.resultFile, 'utf8'));
  expect(report).toMatchObject({ outcome: 'rejected', httpStatus: 400, providerErrorType: 'invalid_request_error', providerSchemaPath: 'output_config.format.schema.properties.sections.items.properties.heading.type', inferenceRequests: 1 });
  expect(JSON.stringify(saved)).not.toContain('PRIVATE'); expect(saved).not.toHaveProperty('result'); expect(request).toHaveBeenCalledOnce();
});
it('keeps the adapter timeout and body-size boundary, with one request only', async () => {
  const timeout = vi.spyOn(AbortSignal, 'timeout'); const request = vi.fn().mockResolvedValue(new Response('x'.repeat(160001)));
  const report = await run(request, await directory()); expect(report.outcome).toBe('rejected'); expect(timeout).toHaveBeenCalledWith(45000); expect(request).toHaveBeenCalledOnce();
});
it('fails before dispatch if the local output directory is not private', async () => {
  const dir = await directory(); await chmod(dir, 0o755); const request = vi.fn();
  expect(await run(request, dir)).toMatchObject({ outcome: 'not_executed', code: 'unsafe_output_directory' }); expect(request).not.toHaveBeenCalled();
});
it('aborts an in-flight mock on the adapter deadline without a retry or raw error disclosure', async () => {
  const controller = new AbortController(); vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
  const request = vi.fn((_url, options) => new Promise((_resolve, reject) => { options.signal.addEventListener('abort', () => reject(new Error('PRIVATE_TIMEOUT'))); queueMicrotask(() => controller.abort()); }));
  const report = await run(request, await directory()); expect(report.outcome).toBe('rejected'); expect(request).toHaveBeenCalledOnce(); expect(JSON.stringify(report)).not.toContain('PRIVATE');
});
it('omits malformed usage values rather than copying provider fields or strings', async () => {
  const value = envelope(); value.usage = { input_tokens: 'PRIVATE', output_tokens: -1, cache_read_input_tokens: 0, cache_creation_input_tokens: null };
  const report = await run(vi.fn().mockResolvedValue(Response.json(value)), await directory()); expect(report.usage).toEqual({ cache_read_input_tokens: 0 }); expect(JSON.stringify(report)).not.toContain('PRIVATE');
});
it('prints safe help without a flag, and loads the same TypeScript pipeline in a mocked-only subprocess', async () => {
  const env = { PATH: process.env.PATH, HOME: process.env.HOME, ANTHROPIC_API_KEY: '' };
  const help = execFileSync(process.execPath, ['scripts/diagnose-claude-rewrite.mjs', '--help'], { encoding: 'utf8', env }); expect(JSON.parse(help).outcome).toBe('not_executed');
  const dir = await directory();
  // This is NOT the owner paid command: the key is an injected sentinel and ALL
  // network is a local in-memory mock. It exercises the real process-only loader.
  const code = `import {installDiagnosticLoader} from './scripts/claude-diagnostic-loader.mjs'; installDiagnosticLoader(); globalThis.fetch=async()=>{throw new Error('NETWORK_DISABLED')}; const {runOwnerRewriteDiagnostic}=await import('./scripts/diagnose-claude-rewrite-runner.ts'); const report=await runOwnerRewriteDiagnostic({args:['--execute-paid-once'],getKey:()=> 'synthetic',outputDirectory:${JSON.stringify(dir)},request:async()=>Response.json(${JSON.stringify(envelope())})}); console.log(JSON.stringify(report));`;
  const text = execFileSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', env }); expect(JSON.parse(text).outcome).toBe('accepted');
  execFileSync('git', ['check-ignore', '--quiet', '--no-index', '.local-diagnostics/example.json']);
});
