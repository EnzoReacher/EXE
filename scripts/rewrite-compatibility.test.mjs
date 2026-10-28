import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it, expect, vi } from 'vitest';
import { mkdtemp, readFile, rm, stat, chmod } from 'node:fs/promises';
vi.mock('server-only', () => ({}));
import { runRewriteCompatibility, redactDiagnosticMessage } from './rewrite-compatibility-runner';
import {completeRewriteFixture} from '../src/lib/scan-rewrite/structured-rewrite.fixture';
import {syntheticRewritePayload} from './diagnose-claude-rewrite-runner';
const config = { provider: 'anthropic', key: 'PRIVATE_CONFIGURED_KEY', model: 'claude-haiku-4-5-20251001', origin: 'http://127.0.0.1:4317' };
const args = ['--execute-compatibility-rewrite-once'];
it('requires explicit authorization before loading configuration', async () => {
  const getConfig = vi.fn(); const request = vi.fn();
  expect(await runRewriteCompatibility({ args: [], getConfig, request })).toMatchObject({ outcome: 'not_executed' });
  expect(getConfig).not.toHaveBeenCalled(); expect(request).not.toHaveBeenCalled();
});
it('redacts configured, encoded and recognizable credentials without discarding technical wording', () => {
  const message = redactDiagnosticMessage('Schema engine detail zeta. PRIVATE_CONFIGURED_KEY sk-ant-api03-EXAMPLESECRET Bearer abc123 token=example eyJabc.def.ghi https://example.test/?key=x person@example.test', config.key);
  expect(message).toContain('Schema engine detail zeta.');
  for (const secret of [config.key, 'sk-ant-', 'abc123', 'token=example', 'eyJabc', 'example.test']) expect(message).not.toContain(secret);
  expect(redactDiagnosticMessage('a'.repeat(9000), config.key).length).toBeLessThanOrEqual(4096);
});
it.each(['accepted', 'rejected', 'uncertain'])('persists a durable single dispatch and refuses repetition after %s', async outcome => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'rewrite-compat-test-'));
  try {
    const request = vi.fn(async (_url, options) => {
      const marker = JSON.parse(await readFile(outputDirectory + '/rewrite-compatibility-20261025.json', 'utf8'));
      expect(marker).toMatchObject({ outcome: 'dispatching_unconfirmed', inferenceRequests: 1 });
      expect(JSON.stringify(JSON.parse(options.body).output_config.format.schema)).not.toContain('"pattern"');
      if (outcome === 'uncertain') throw new Error('PRIVATE_CONNECTION_ERROR');
      if (outcome === 'rejected') return Response.json({ error: { type: 'invalid_request_error', message: 'Schema engine detail zeta. ' + config.key + ' sk-ant-api03-EXAMPLESECRET', extra: 'RAW_BODY_PRIVATE' } }, { status: 400, headers: { 'request-id': 'req_synthetic_compat' } });
      return Response.json({ type: 'message', role: 'assistant', stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(completeRewriteFixture(syntheticRewritePayload().base)) }], usage: { input_tokens: 20, output_tokens: 10 } });
    });
    const options = { args, getConfig: () => config, request, outputDirectory };
    const report = await runRewriteCompatibility(options);
    expect(report).toMatchObject({ outcome: outcome === 'accepted' ? 'accepted' : 'rejected', inferenceRequests: 1 });
    const disk = JSON.parse(await readFile(report.resultFile, 'utf8'));
    if (outcome === 'rejected') expect(disk.providerErrorMessage).toContain('Schema engine detail zeta.');
    if (outcome !== 'accepted') expect(disk).not.toHaveProperty('result');
    for (const secret of [config.key, 'sk-ant-', 'RAW_BODY_PRIVATE', 'PRIVATE_CONNECTION_ERROR']) expect(JSON.stringify(disk)).not.toContain(secret);
    expect(report).not.toHaveProperty('providerErrorMessage');
    expect((await stat(report.resultFile)).mode & 0o777).toBe(0o600);
    expect((await stat(outputDirectory)).mode & 0o777).toBe(0o700);
    await expect(runRewriteCompatibility(options)).rejects.toMatchObject({ code: 'EEXIST' });
    expect(request).toHaveBeenCalledOnce();
  } finally { await rm(outputDirectory, { recursive: true }); }
});
it('refuses an unsafe output directory before dispatch', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'rewrite-compat-unsafe-'));
  try {
    await chmod(outputDirectory, 0o755); const request = vi.fn();
    await expect(runRewriteCompatibility({ args, getConfig: () => config, request, outputDirectory })).rejects.toThrow('Unsafe');
    expect(request).not.toHaveBeenCalled();
  } finally { await rm(outputDirectory, { recursive: true }); }
});
it.each(['oversized', 'malformed', 'stalled'])('bounds %s rejection capture without retries', async kind => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'rewrite-compat-bound-'));
  try {
    const cancel = vi.fn();
    const response = kind === 'oversized' ? new Response('x'.repeat(8193), { status: 400 }) : kind === 'malformed' ? new Response('PRIVATE_NON_JSON', { status: 400 }) : new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{"error":')); }, cancel }), { status: 400 });
    const request = vi.fn().mockResolvedValue(response);
    const report = await runRewriteCompatibility({ args, getConfig: () => config, request, outputDirectory });
    expect(report).toMatchObject({ outcome: 'rejected', inferenceRequests: 1, httpStatus: 400, privateErrorCapture: 'unavailable_bounded_body' });
    const disk = await readFile(report.resultFile, 'utf8'); expect(disk).not.toContain('PRIVATE_NON_JSON'); expect(JSON.parse(disk)).not.toHaveProperty('providerErrorMessage');
    expect(request).toHaveBeenCalledOnce(); if (kind === 'stalled') expect(cancel).toHaveBeenCalled();
  } finally { await rm(outputDirectory, { recursive: true }); }
});
