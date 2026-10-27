// Private offline preparation: actual parsers/native Claude envelope/application
// checks, with a supplied transport stub. Never loads .env or calls a provider.
import { installDiagnosticLoader } from './claude-diagnostic-loader.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
import { extract } from './cv-extract.mjs';
import assert from 'node:assert/strict';
installDiagnosticLoader();
const { performRewrite, rewriteSchema } = await import('../src/lib/scan-rewrite/rewrite-workflow.ts');
const { performScan } = await import('../src/lib/scan-rewrite/scan-workflow.ts');
const { createClaudeProvider } = await import('../src/lib/scan-rewrite/claude.ts');
const { scanCatalog } = await import('../src/lib/scan-rewrite/scan-selection.ts');
const { parseSnapshot } = await import('../src/lib/scan-rewrite/saved.ts');
const dir = '.local-demo/evidence/structured-cv'; mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage(); await page.route('**/*', r => r.abort());
  await page.setContent('<meta charset="utf-8"><style>@page{size:A4;margin:14mm}body{font:10pt Arial}header{text-align:center}.entry{display:flex;justify-content:space-between}</style><header><h1>NGUYỄN AN</h1><p>Community assistant</p><p>person@example.test</p></header><h2>Summary</h2><p>Supported community activities.</p><h2>Skills</h2><p>Record keeping</p><h2>Experience</h2><div class="entry"><span>Visitor support</span><span>March 16, 2025</span></div><p>Maintained 20 records.</p><h2>Languages</h2><p>Vietnamese</p>');
  const pdf = await page.pdf({ path: `${dir}/sanitized-source.pdf`, preferCSSPageSize: true });
  const { text } = await extract(pdf, 'pdf'), lines = text.split('\n');
  const id = value => { const i = lines.findIndex(line => line.includes(value)); assert.ok(i >= 0); return `b${i + 1}`; };
  const entry = (sourceIds, paragraphs = [], extras = {}) => ({ title: '', context: '', date: '', paragraphs, bullets: [], sourceIds, ...extras });
  const wire = { header: { nameSourceId: id('NGUYỄN AN'), titleSourceId: id('Community assistant'), contactSourceIds: [id('person@example.test')] }, sections: [
    { heading: 'Summary', entries: [entry([id('Supported community')], ['Supported community activities.'])] },
    { heading: 'Skills', entries: [entry([id('Record keeping')], ['Record keeping'])] },
    { heading: 'Experience / Activities', entries: [entry([id('Visitor support'), id('Maintained 20')], [], { title: 'Visitor support', date: 'March 16, 2025', bullets: ['Maintained 20 records.'] })] },
    { heading: 'Languages', entries: [entry([id('Vietnamese')], ['Vietnamese'])] },
  ] };
  const cases = [{ name: 'sanitized', pdfPath: `${dir}/sanitized-source.pdf`, text, wire }];
  if (process.env.OWNPATH_STRUCTURED_OWNER_PDF && process.env.OWNPATH_STRUCTURED_OWNER_WIRE) {
    const pdfPath = process.env.OWNPATH_STRUCTURED_OWNER_PDF;
    cases.push({ name: 'owner-local-pdf', pdfPath, text: (await extract(readFileSync(pdfPath), 'pdf')).text, wire: JSON.parse(readFileSync(process.env.OWNPATH_STRUCTURED_OWNER_WIRE, 'utf8')) });
  }
  const results = [];
  for (const item of cases) {
    const jd = 'Communication and record keeping required.', catalog = scanCatalog({ cv: item.text, jd });
    const scanWire = { coverage: 'Controlled offline source-selection result; not live Claude acceptance.', findings: [{ title: 'Review the supplied source', requirementSourceId: catalog.requirements[0].id, excerptSourceId: '', explanation: 'Controlled scenario: review the source evidence directly.', nextStep: 'Keep source-supported facts only.', group: 'unclear', priority: 'important', expectation: 'required' }] };
    let calls = 0;
    const provider = createClaudeProvider({ key: 'offline-controlled-key', model: 'claude-haiku-4-5-20251001', origin: 'http://127.0.0.1:4396' }, async (url, options) => {
      assert.equal(url, 'https://api.anthropic.com/v1/messages'); const body = JSON.parse(options.body); calls++;
      assert.equal(body.model, 'claude-haiku-4-5-20251001'); assert.equal(body.thinking.type, 'disabled');
      if (calls === 2) assert.deepEqual(body.output_config.format.schema, rewriteSchema);
      return Response.json({ type: 'message', role: 'assistant', stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(calls === 1 ? scanWire : item.wire) }] });
    });
    const scan = await performScan({ cv: item.text, jd, consent: true }, provider, new AbortController().signal);
    const rewrite = await performRewrite({ cv: item.text, jd, scan, scanCV: item.text, scanJD: jd, base: item.text, instructions: 'Preserve all facts and organize the complete CV.', language: 'English', consent: true }, provider, new AbortController().signal);
    assert.equal(calls, 2); assert.equal(rewrite.format, 'structured-cv-v1');
    writeFileSync(`${dir}/${item.name}-scenario.json`, JSON.stringify({ pdfPath: item.pdfPath, text: item.text, jd, scan, rewrite }, null, 2));
    results.push({ name: item.name, sourceSha256: createHash('sha256').update(item.text).digest('hex'), controlledTransportCalls: calls, actualNetworkRequests: 0, completeStructuredResultValidated: true });
  }
  if (process.env.OWNPATH_STRUCTURED_OWNER_TXT) {
    const text = readFileSync(process.env.OWNPATH_STRUCTURED_OWNER_TXT, 'utf8');
    const old = parseSnapshot({ schemaVersion: 2, cv: text, jd: 'Records.', scan: { coverage: 'Local legacy export check.', findings: [] }, document: text, instructions: 'Retain edits.', language: 'English', changes: [], notes: [], title: 'Local legacy export' });
    assert.equal(old.document, text); results.push({ name: 'owner-local-txt', unchangedLegacyRead: true, characters: text.length });
    writeFileSync(`${dir}/legacy-txt-scenario.json`, JSON.stringify(old));
  }
  writeFileSync(`${dir}/preparation-checks.json`, JSON.stringify(results, null, 2)); console.log(JSON.stringify(results));
} finally { await browser.close(); }
