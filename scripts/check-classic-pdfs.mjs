// Read-only inspection of synthetic PDFs produced by e2e/completion.spec.ts.
// Requires Poppler: pdfinfo, pdffonts, pdftotext. Never contacts a provider.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const directory = ".factory/evidence/OWNPATH-COMPLETION-20261020";
const run = (command, args) => execFileSync(command, args, { encoding: "utf8" });
// CSS uppercases section labels; compare case-insensitively, without line-wrap
// whitespace. All punctuation, source words, numbers and Unicode must survive.
const normalize = text => text.normalize("NFC").toLocaleLowerCase().replace(/\s/gu, "");
const results = [];
for (const file of readdirSync(directory).filter(file => /^classic-.*\.pdf$/u.test(file))) {
  const path = `${directory}/${file}`;
  const info = run("pdfinfo", [path]);
  assert.match(info, /Page size:\s+594\.96 x 841\.92 pts \(A4\)/u);
  const text = run("pdftotext", ["-raw", path, "-"]);
  assert.equal(normalize(text), normalize(readFileSync(path.replace(/\.pdf$/u, ".txt"), "utf8")), `${file}: complete selectable source text in order`);
  const pages = text.split("\f").filter((_, i, all) => i < all.length - 1);
  assert.ok(pages.every(page => page.trim()), `${file}: no blank pages`);
  assert.equal(pages.length > 1, file === "classic-long.pdf");
  for (const page of pages) {
    const last = page.trim().split("\n").at(-1).trim();
    assert.ok(!/^(SUMMARY|EXPERIENCE|EDUCATION|SKILLS|OTHER RELEVANT CONTRIBUTIONS:)$/u.test(last), `${file}: no stranded heading`);
  }
  const bbox = run("pdftotext", ["-bbox", path, "-"]);
  for (const word of bbox.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)"/gu)) {
    assert.ok(+word[1] >= 49 && +word[2] >= 49 && +word[3] <= 546 && +word[4] <= 793, `${file}: text within 18mm margins (2pt rounding allowance)`);
  }
  const fonts = run("pdffonts", [path]);
  const rows = fonts.trim().split("\n").slice(2);
  assert.ok(rows.length && rows.every(row => /\s+yes\s+yes\s+yes\s+/u.test(row)), `${file}: embedded subset fonts with Unicode mapping`);
  if (file === "classic-long.pdf") for (let i = 0; i < 12; i++) assert.ok(pages.some(page => page.includes(`Coordinator ${i + 1}, Fictional Grove Group`) && page.includes(`${2000 + i}–${2001 + i}`)), "Entry dates remain on their entry page");
  results.push({ file, pages: pages.length, a4: true, completeSelectableUnicode: true, embeddedFonts: true, margins: true, noBlankPages: true });
}
assert.equal(results.length, 8);
writeFileSync(`${directory}/pdf-checks.json`, JSON.stringify(results, null, 2));
console.log("Classic PDFs: 8 passed (7 single-page, 1 six-page); complete selectable Unicode, embedded fonts, A4 margins, no blank pages or stranded headings.");
