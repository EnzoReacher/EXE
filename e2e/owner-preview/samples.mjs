import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { Document, Packer, Paragraph } from 'docx';
import { cvLines, jd, instruction } from './scenario.mjs';
export async function createSamples(directory, root, onBrowser = () => {}) {
  await mkdir(directory, { recursive: true });
  const docx = await Packer.toBuffer(new Document({ sections: [{ children: cvLines.map(line => new Paragraph(line)) }] }));
  await writeFile(`${directory}/sales-cv.docx`, docx);
  const browser = await chromium.launch();
  onBrowser(browser);
  try {
    const page = await browser.newPage();
    // Only fixed synthetic text, never document/model/user HTML.
    await page.setContent(`<meta charset="utf-8"><style>body{font:12pt Arial;line-height:1.5}p{margin:6px 0}</style>${cvLines.map(line => `<p>${line}</p>`).join('')}`);
    await page.pdf({ path: `${directory}/sales-cv.pdf`, format: 'A4', margin: { top: '18mm', bottom: '18mm', left: '18mm', right: '18mm' } });
  } finally { await browser.close(); }
  await writeFile(`${directory}/target-job.txt`, jd); await writeFile(`${directory}/rewrite-instruction.txt`, instruction);
  const { readFile } = await import('node:fs/promises');
  const sources = [];
  for (const type of ['pdf', 'docx']) {
    const result = spawnSync(process.execPath, ['--max-old-space-size=128', `${root}/scripts/cv-extract.mjs`, type], { cwd: root, input: await readFile(`${directory}/sales-cv.${type}`), timeout: 15000, maxBuffer: 160000, env: { PATH: process.env.PATH, NODE_ENV: 'test' } });
    if (result.status !== 0) throw new Error('Synthetic sample extraction failed.');
    const parsed = JSON.parse(result.stdout.toString()); if (typeof parsed.text !== 'string' || parsed.error) throw new Error('Synthetic sample extraction failed.');
    if (!cvLines.every(line => parsed.text.split('\n').includes(line))) throw new Error('Synthetic sample extraction changed its source lines.');
    sources.push(parsed.text);
  }
  return sources;
}
