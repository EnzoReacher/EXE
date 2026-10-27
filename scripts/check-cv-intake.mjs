// Synthetic fixtures only. Executes the real isolated parsers, never AI.
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';
const load = createRequire(import.meta.url);
const JSZip = createRequire(load.resolve('mammoth'))('jszip');
const dir = '.factory/evidence/OWNPATH-INTAKE-20261021/fixtures'; mkdirSync(dir, { recursive: true });
function parse(bytes, kind) {
  const result = spawnSync(process.execPath, ['--max-old-space-size=128', 'scripts/cv-extract.mjs', kind], { input: bytes, timeout: 15000, maxBuffer: 160000, env: { PATH: process.env.PATH, NODE_ENV: 'test' } });
  assert.equal(result.status, 0, 'parser process exits normally'); return JSON.parse(result.stdout.toString());
}
let passed = 0;
function check(name, fn) { fn(); passed++; console.log('PASS', name); }
const docx = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph({ text: 'Fictional Nguyễn An', heading: HeadingLevel.TITLE }), new Paragraph({ text: 'Education', heading: HeadingLevel.HEADING_1 }), new Paragraph({ text: 'Hỗ trợ học sinh — synthetic teaching experience', bullet: { level: 0 } })] }] }));
writeFileSync(`${dir}/unicode.docx`, docx);
check('DOCX headings, bullets and Vietnamese', () => { const result = parse(docx, 'docx'); assert.match(result.text, /Nguyễn An/); assert.match(result.text, /Hỗ trợ học sinh/); });
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const [name, html] of Object.entries({
    english: '<h1>Fictional Alex Example</h1><h2>Sales</h2><p>Maintained customer records.</p>',
    vietnamese: '<h1>Fictional Nguyễn An</h1><p>Giáo dục — hỗ trợ học sinh.</p>',
    columns: '<div style="display:grid;grid-template-columns:1fr 1fr"><section>LEFT Experience<p>Sales support</p></section><section>RIGHT Education<p>Fictional College</p></section></div>',
    multipage: '<h1>Fictional Operations CV</h1><p>FIRST PAGE</p><p style="break-before:page">SECOND PAGE</p>',
    empty: '<div></div>',
    image: '<svg width="200" height="200"><rect width="200" height="200" fill="black"/></svg>',
    pages: Array.from({ length: 21 }, (_, i) => `<p style="break-before:page">Synthetic page ${i + 1}</p>`).join(''),
    textlimit: `<p>${'Synthetic '.repeat(2500)}</p>`,
  })) {
    await page.setContent(`<meta charset="utf-8">${html}`); await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({ path: `${dir}/${name}.pdf`, format: 'A4' });
    const result = parse(pdf, 'pdf');
    if (['empty', 'image'].includes(name)) check(`${name} PDF rejected`, () => assert.match(result.error, /No usable text/));
    else if (name === 'pages') check('21-page PDF rejected', () => assert.match(result.error, /20 pages/));
    else if (name === 'textlimit') check('text over limit rejected, not truncated', () => assert.match(result.error, /24,000/));
    else check(`${name} actual PDF extraction`, () => { assert.equal(result.error, undefined); assert.ok(result.text.length); if (name === 'vietnamese') assert.match(result.text, /Nguyễn An/); if (name === 'multipage') assert.match(result.text, /FIRST PAGE[\s\S]*SECOND PAGE/); if (name === 'columns') { assert.match(result.text, /LEFT/); assert.match(result.text, /RIGHT/); writeFileSync(`${dir}/columns-extraction.txt`, result.text); } });
  }
} finally { await browser.close(); }
execFileSync('python3', ['-c', `import fitz; d=fitz.open('${dir}/english.pdf'); d.save('${dir}/encrypted.pdf', encryption=fitz.PDF_ENCRYPT_AES_256, owner_pw='synthetic-owner', user_pw='synthetic-reader')`]);
const { readFileSync } = await import('node:fs');
check('encrypted PDF rejected', () => assert.match(parse(readFileSync(`${dir}/encrypted.pdf`), 'pdf').error, /Encrypted/));
for (const [label, bytes, kind] of [['fake PK', Buffer.from('PK\x03\x04fake'), 'docx'], ['corrupt PDF', Buffer.from('%PDF-1.7\ninvalid'), 'pdf'], ['empty file', Buffer.alloc(0), 'pdf'], ['DOCX disguised PDF', docx, 'pdf']]) check(label, () => assert.ok(parse(bytes, kind).error));
const zip = new JSZip(); zip.file('[Content_Types].xml', '<Types/>'); zip.file('_rels/.rels', '<Relationships/>'); zip.file('word/document.xml', '<document/>');
const fake = await zip.generateAsync({ type: 'nodebuffer' });
check('ZIP is not automatically DOCX', () => assert.match(parse(fake, 'docx').error, /not a DOCX/));
zip.file('oversize.xml', Buffer.alloc(4 * 1024 * 1024 + 1, 65));
const oversized = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
check('bounded compressed expansion guard', () => assert.match(parse(oversized, 'docx').error, /oversized/));
const entries = new JSZip(); for (let i = 0; i < 257; i++) entries.file(`synthetic-${i}`, 'a');
assert.match(parse(await entries.generateAsync({ type: 'nodebuffer' }), 'docx').error, /limits/); passed++;
const aggregate = new JSZip(); for (let i = 0; i < 6; i++) aggregate.file(`bounded-${i}`, Buffer.alloc(3 * 1024 * 1024, 65));
const aggregateBytes = await aggregate.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
check('16 MiB aggregate expanded package bound', () => assert.match(parse(aggregateBytes, 'docx').error, /oversized/));
for (const [name, paragraphs] of [['text', [new Paragraph('Synthetic '.repeat(2500))]], ['lines', Array.from({ length: 501 }, () => new Paragraph('Synthetic line'))]]) {
  const bytes = await Packer.toBuffer(new Document({ sections: [{ children: paragraphs }] }));
  check(`DOCX ${name} output limit`, () => assert.match(parse(bytes, 'docx').error, /24,000 characters or 500 lines/));
}
console.log(`${passed} actual parser checks passed. Fixtures: ${dir}`);
