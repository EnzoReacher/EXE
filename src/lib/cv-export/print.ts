import "server-only";
import { createHash } from "node:crypto";

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
const printScript = 'document.getElementById("print-cv").addEventListener("click",function(){window.print();});';
export const PRINT_CSP = `default-src 'none'; style-src 'unsafe-inline'; script-src 'sha256-${createHash("sha256").update(printScript).digest("base64")}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;
export function printHtml(content: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Accepted CV — Print / Save as PDF</title><style>
    *{box-sizing:border-box}body{margin:0;color:#111;background:#f5f5f5;font:11pt/1.5 Arial,sans-serif}
    header,main{max-width:52rem;margin:1.5rem auto;padding:1.5rem;background:white}header h1{font-size:1.3rem}
    button,a{font:inherit}button{padding:.6rem 1rem;cursor:pointer}a{display:inline-block;margin:.75rem}button:focus-visible,a:focus-visible{outline:3px solid #164bb8;outline-offset:3px}
    pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere;tab-size:4;margin:0}p{overflow-wrap:anywhere}
    @media(max-width:40rem){header,main{margin:.5rem;padding:1rem}}
    @page{margin:20mm}@media print{body{background:white}header{display:none}main{margin:0;padding:0;max-width:none}pre{white-space:pre-wrap}}
    </style></head><body><header><h1>Print your accepted CV</h1><p>This is your accepted CV version, using its saved text. Use your browser’s Print / Save as PDF function. EXE does not generate a PDF download.</p><button id="print-cv" type="button">Print / Save as PDF</button><a href="/credential-versions">Return to private version history</a><p role="note">The printout contains only CV text. Browser print settings may add page headers or footers; turn those off if desired.</p></header><main aria-label="Accepted CV document"><pre>${escapeHtml(content)}</pre></main><script>${printScript}</script></body></html>`;
}
