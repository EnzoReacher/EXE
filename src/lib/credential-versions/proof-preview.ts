import { createHash } from "node:crypto";
import { IntakeError } from "../intake/types";

const style = `:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;padding:24px;background:#f5f7fa;color:#172c3c;font:16px/1.6 system-ui,sans-serif}main{max-width:1100px;margin:auto;overflow-wrap:anywhere}h1{font-size:24px}figure{margin:24px 0;padding:16px;background:white;border:1px solid #ccd6df;border-radius:12px}img{display:block;max-width:100%;height:auto;margin:auto}figcaption{margin-top:16px}p{max-width:75ch}@media(max-width:400px){body{padding:16px}figure{padding:8px}}`;
const styleHash = createHash("sha256").update(style).digest("base64");
export const PROOF_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": `sandbox; default-src 'none'; img-src data:; style-src 'sha256-${styleHash}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
};

// This controlled, script-free document avoids the native image viewer's
// sandbox/localStorage failure. Only raster bytes enter a data URL; neither
// uploaded markup nor private filenames/paths are interpolated into HTML.
export function proofPreviewResponse(bytes: ArrayBuffer, mime: string): Response {
  const file = new Uint8Array(bytes);
  const signatures: Record<string, number[]> = {
    "image/png": [137, 80, 78, 71, 13, 10, 26, 10],
    "image/jpeg": [255, 216, 255],
    "application/pdf": [37, 80, 68, 70, 45],
  };
  const signature = signatures[mime];
  if (!file.length || file.length > 5 * 1024 * 1024 || !signature || !signature.every((value, i) => file[i] === value)) {
    throw new IntakeError("unavailable", "This private proof view is unavailable. Return to the review workspace.", 403);
  }
  const body = mime === "application/pdf"
    ? `<h2>Review this PDF using the private download</h2><p>Close this tab and use Download assigned private proof in the review workspace (or Download private proof in your owner workspace). Open the downloaded PDF in a document viewer. Embedded PDF viewers are not enabled in this protected page.</p>`
    : `<figure><img src="data:${mime};base64,${Buffer.from(file).toString("base64")}" alt="Submitted certificate or degree image. Read the visible document before reviewing the proposed skill."><figcaption>Use your browser's zoom controls to inspect the image. If it is unreadable or cannot be displayed, close this tab and use the private download in the review workspace.</figcaption></figure>`;
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Private proof view | EXE</title><style>${style}</style></head><body><main><h1>Private proof view</h1><p>Viewing this document does not authenticate its issuer or approve a skill. Return to the assigned review to record your decision.</p>${body}<p>This tab contains a private copy loaded when you opened it. Close it after review. Evidence withdrawal blocks future requests; it cannot recall a copy already displayed or downloaded.</p></main></body></html>`, {
    headers: { ...PROOF_HEADERS, "Content-Type": "text/html; charset=utf-8" },
  });
}
