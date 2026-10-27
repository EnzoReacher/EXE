// Offline, sanitized visual/PDF evidence. No server, Auth, AI or hosted services.
import { installDiagnosticLoader } from './claude-diagnostic-loader.mjs';
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { extract } from './cv-extract.mjs';
installDiagnosticLoader();
const { classicCSS, templateHTML, documentText } = await import('../src/lib/cv-templates/index.ts');
const { referenceFixture, flattenedFixture } = await import('../src/lib/cv-templates/reference-fixtures.ts');
const { classicFixtures } = await import('../src/lib/cv-templates/fixtures.ts');
const dir = '.local-demo/evidence/reference-template'; mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();
const results = [];
const normalize = text => text.normalize('NFC').toLowerCase().replace(/\s/gu, '');
try {
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  await page.route('**/*', route => route.abort());
  for (const [name, text] of Object.entries({ reference: referenceFixture, flattened: flattenedFixture, vietnamese: classicFixtures.vietnamese, minimal: classicFixtures.minimal, long: classicFixtures.long, 'long-entry': `Fictional Applicant With A Very Long Supported Name Nguyễn Thị Minh Anh Hoàng\nExperience\n${'Fictional institution with a long supported label '.repeat(6)} | 2020–2025\n• ${'Maintained community records. '.repeat(160)}\nOther meaningful source section:\nPreserved content.` })) {
    const markup = templateHTML(text);
    const html = `<meta charset="utf-8"><style>@page{size:A4;margin:12mm 14mm}*{box-sizing:border-box}body{margin:0}${classicCSS}</style><main class="op-classic">${markup}</main>`;
    await page.setContent(html); await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: 'print' });
    await page.pdf({ path: `${dir}/${name}.pdf`, preferCSSPageSize: true, printBackground: true });
    const pdfText = execFileSync('pdftotext', ['-raw', `${dir}/${name}.pdf`, '-'], { encoding: 'utf8' });
    assert.equal(normalize(pdfText), normalize(documentText(text)), `${name}: PDF content/reading order`);
    const info = execFileSync('pdfinfo', [`${dir}/${name}.pdf`], { encoding: 'utf8' });
    assert.match(info, /A4/);
    const pages = +info.match(/Pages:\s+(\d+)/)[1];
    if (name === 'long' || name === 'long-entry') assert.ok(pages > 1);
    assert.ok(pdfText.split('\f').slice(0, -1).every(p => p.trim()));
    const bbox = execFileSync('pdftotext', ['-bbox', `${dir}/${name}.pdf`, '-'], { encoding: 'utf8' });
    for (const word of bbox.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)"/gu)) {
      assert.ok(+word[1] >= 38 && +word[2] >= 32 && +word[3] <= 557 && +word[4] <= 810, `${name}: text inside page margins`);
    }
    for (const printedPage of pdfText.split('\f').slice(0, -1)) assert.ok(!/^(?:SUMMARY|EDUCATION|EXPERIENCE|SKILLS|PROJECTS|LANGUAGES)$/u.test(printedPage.trim().split('\n').at(-1).trim()), `${name}: no stranded section heading`);
    const fonts = execFileSync('pdffonts', [`${dir}/${name}.pdf`], { encoding: 'utf8' }).trim().split('\n').slice(2);
    assert.ok(fonts.length && fonts.every(row => /\s+yes\s+yes\s+yes\s+/u.test(row)), `${name}: embedded Unicode fonts`);
    await page.emulateMedia({ media: 'screen' });
    await page.setContent(html.replace('<main class="op-classic">', '<main class="op-cv-paper op-classic">'));
    await page.screenshot({ path: `${dir}/${name}-preview.png`, fullPage: true });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} ${width}: no horizontal overflow`);
      if (width === 320) await page.screenshot({ path: `${dir}/${name}-mobile.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 794, height: 1123 });
    writeFileSync(`${dir}/${name}.txt`, documentText(text));
    execFileSync('pdftoppm', ['-f', '1', '-singlefile', '-scale-to', '1200', '-png', `${dir}/${name}.pdf`, `${dir}/${name}-pdf-page1`]);
    results.push({ name, pages, unicodeReadingOrder: true, mobileWidths: [390, 320] });
  }
  // Actual two-column PDF: source geometry, not a hand-flattened text substitute.
  await page.setContent(`<meta charset="utf-8"><style>@page{size:A4;margin:14mm}body{font:10pt Arial}.columns{display:grid;grid-template-columns:170px 1fr;gap:44px}h2{font-size:12px}p{margin:12px 0}</style><div class="columns"><aside><h2>C O N T A C T</h2><p>person@example.test</p><h2>S K I L L S</h2><p>Customer support</p><p>Record keeping</p><h2>L A N G U A G E S</h2><p>Vietnamese</p></aside><main><h1>NGUYỄN AN</h1><p>Community assistant</p><h2>E D U C A T I O N</h2><p>Fictional River College</p><p>2020 – 2024</p><h2>E X P E R I E N C E</h2><p>Volunteer, Fictional Grove</p><p>• Maintained visitor records.</p></main></div>`);
  const source = await page.pdf({ path: `${dir}/two-column-source.pdf`, preferCSSPageSize: true });
  await page.screenshot({ path: `${dir}/two-column-source.png`, fullPage: true });
  const parsed = await extract(source, 'pdf');
  writeFileSync(`${dir}/two-column-extracted.txt`, parsed.text);
  assert.match(parsed.text, /C O N T A C T[\s\S]*L A N G U A G E S[\s\S]*NGUYỄN AN[\s\S]*Fictional River College\n2020 – 2024/);
  results.push({ name: 'actual-two-column-extraction', associationsKept: true });
  writeFileSync(`${dir}/checks.json`, JSON.stringify(results, null, 2));
  console.log('PASS offline visual/PDF checks:', JSON.stringify(results));
} finally { await browser.close(); }
