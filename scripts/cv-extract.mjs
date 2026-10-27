// Private, short-lived parser process. stdin is bounded by the authenticated parent.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { layoutPage } from './cv-layout.mjs';
import mammoth from 'mammoth';
const load = createRequire(import.meta.url);
const JSZip = createRequire(load.resolve('mammoth'))('jszip');
const LIMIT = 16 * 1024 * 1024;
function reject(message) { throw new Error(message); }
function validateZip(buffer) {
  if (buffer.length < 22 || buffer.readUInt32LE(0) !== 0x04034b50) reject('Invalid DOCX package.');
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50 && i + 22 + buffer.readUInt16LE(i + 20) === buffer.length) { end = i; break; }
  }
  if (end < 0) reject('Invalid DOCX package.');
  const count = buffer.readUInt16LE(end + 10), size = buffer.readUInt32LE(end + 12), start = buffer.readUInt32LE(end + 16);
  if (buffer.readUInt32LE(end + 4) !== 0 || buffer.readUInt16LE(end + 8) !== count || count > 256 || start + size !== end) reject('DOCX package exceeds supported limits.');
  let offset = start, total = 0; const names = new Set();
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || buffer.readUInt32LE(offset) !== 0x02014b50) reject('Invalid DOCX package.');
    const flags = buffer.readUInt16LE(offset + 8), method = buffer.readUInt16LE(offset + 10);
    const compressed = buffer.readUInt32LE(offset + 20), plain = buffer.readUInt32LE(offset + 24);
    const n = buffer.readUInt16LE(offset + 28), extra = buffer.readUInt16LE(offset + 30), comment = buffer.readUInt16LE(offset + 32);
    const name = buffer.subarray(offset + 46, offset + 46 + n).toString('utf8');
    const local = buffer.readUInt32LE(offset + 42);
    total += plain;
    if ((flags & 1) || ![0, 8].includes(method) || total > LIMIT || plain > 4 * 1024 * 1024 || names.has(name) || /(^\/|\\|(^|\/)\.\.($|\/)|vbaProject|\.bin$)/i.test(name)) reject('Unsupported or oversized DOCX package.');
    names.add(name);
    if (local + 30 > start || buffer.readUInt32LE(local) !== 0x04034b50) reject('Invalid DOCX package.');
    const data = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    if (data + compressed > start) reject('Invalid DOCX package.');
    const input = buffer.subarray(data, data + compressed);
    const output = method === 8 ? inflateRawSync(input, { maxOutputLength: Math.max(1, plain) }) : input;
    if (output.length !== plain) reject('Invalid DOCX package.');
    if (/\.(xml|rels)$/i.test(name) && /<!DOCTYPE|<!ENTITY/i.test(output.toString('utf8').replace(/\0/g, ''))) reject('Unsupported DOCX XML.');
    offset += 46 + n + extra + comment;
  }
  if (offset !== end || !['[Content_Types].xml', '_rels/.rels', 'word/document.xml'].every(n => names.has(n))) reject('This is not a DOCX document.');
}
async function extract(buffer, kind) {
  let text;
  if (kind === 'pdf') {
    if (!buffer.subarray(0, 8).toString('ascii').match(/^%PDF-1\.[0-9]|^%PDF-2\.0/)) reject('This is not a PDF document.');
    if (/\/Encrypt\b/.test(buffer.toString('latin1'))) reject('Encrypted PDFs are not supported. Paste text or use an unencrypted text-based PDF.');
    // Resolve the pinned parser's PDF.js engine; use text coordinates rather than
    // flattening interleaved left/right cells into unrelated source lines.
    const engine = createRequire(load.resolve('pdf-parse')).resolve('pdfjs-dist/legacy/build/pdf.mjs');
    const { getDocument } = await import(pathToFileURL(engine).href);
    const task = getDocument({ data: new Uint8Array(buffer), verbosity: 0, isEvalSupported: false, enableXfa: false, useWorkerFetch: false, useWasm: false, stopAtErrors: true, maxImageSize: 0 });
    try {
      const doc = await task.promise;
      if (doc.numPages > 20) reject('PDF exceeds 20 pages. Use a shorter document or paste text.');
      const pages = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        pages.push(layoutPage(content.items.filter(item => 'str' in item), page.getViewport({ scale: 1 }).width).text);
        page.cleanup();
      }
      text = pages.join('\n\n');
    } finally { await task.destroy(); }
  } else if (kind === 'docx') {
    validateZip(buffer);
    const zip = await JSZip.loadAsync(buffer, { checkCRC32: true });
    const types = await zip.file('[Content_Types].xml').async('string');
    if (!types.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml')) reject('This is not a DOCX document.');
    text = (await mammoth.extractRawText({ buffer })).value;
  } else reject('Use PDF or DOCX.');
  text = text.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length > 24000 || text.split('\n').length > 500) reject('Extracted CV exceeds 24,000 characters or 500 lines. Use a shorter document or paste text.');
  if (!/[\p{L}\p{N}]{2}/u.test(text)) reject('No usable text found. Image-only PDFs and OCR are not supported. Paste text or upload a text-based PDF.');
  return { text };
}
export { extract, validateZip };
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const chunks = []; let size = 0;
  process.stdin.on('data', chunk => { size += chunk.length; if (size > 5 * 1024 * 1024) process.exit(1); chunks.push(chunk); });
  process.stdin.on('end', async () => {
    try { process.stdout.write(JSON.stringify(await extract(Buffer.concat(chunks), process.argv[2]))); }
    catch (error) { const safe = error instanceof Error && /^(Invalid DOCX|DOCX package|Unsupported|This is not|Encrypted PDFs|PDF exceeds|Extracted CV|No usable text|Use PDF)/.test(error.message); process.stdout.write(JSON.stringify({ error: safe ? error.message : 'Could not extract this document. It may be corrupt, encrypted or unsupported. Paste text or try another PDF/DOCX.' })); }
  });
}
