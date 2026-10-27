import "server-only";
import { spawn } from "node:child_process";
import { join } from "node:path";
export const FILE_LIMIT = 5 * 1024 * 1024;
export class IntakeError extends Error {}
let active = 0;
export async function readUpload(request: Request) {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > FILE_LIMIT)) throw new IntakeError("File exceeds 5 MiB.");
  const reader = request.body?.getReader(); if (!reader) throw new IntakeError("Select a nonempty PDF or DOCX.");
  const chunks: Uint8Array[] = []; let size = 0;
  let timedOut = false;
  const abort = () => { void reader.cancel().catch(() => {}); };
  request.signal.addEventListener("abort", abort, { once: true }); if (request.signal.aborted) abort();
  const timer = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => {}); }, 10000);
  try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > FILE_LIMIT) { await reader.cancel(); throw new IntakeError("File exceeds 5 MiB."); } chunks.push(value); }
    if (timedOut) throw new IntakeError("Upload timed out. Try again or paste text.");
    if (!size) throw new IntakeError("Select a nonempty PDF or DOCX.");
    if (request.signal.aborted) throw new IntakeError("Upload cancelled.");
    return Buffer.concat(chunks);
  } finally { clearTimeout(timer); request.signal.removeEventListener("abort", abort); reader.releaseLock(); }
}
export function extractUpload(bytes: Buffer, kind: "pdf" | "docx", signal: AbortSignal): Promise<{ text: string }> {
  if (active >= 2) return Promise.reject(new IntakeError("Document processing is busy. Try again shortly; your text is kept."));
  active++;
  return new Promise((resolve, reject) => {
    let child;
    try { child = spawn(process.execPath, ["--max-old-space-size=128", join(process.cwd(), "scripts/cv-extract.mjs"), kind], { stdio: ["pipe", "pipe", "ignore"], env: { PATH: process.env.PATH, NODE_ENV: "production" } }); }
    catch { active--; reject(new IntakeError("Document processing is unavailable. Paste text instead.")); return; }
    let output = "", failure = "";
    const stop = () => { failure = "Extraction cancelled. Your text is kept."; child.kill("SIGKILL"); };
    const timer = setTimeout(() => { failure = "Extraction took too long. Paste text or try a simpler document."; child.kill("SIGKILL"); }, 12000);
    signal.addEventListener("abort", stop, { once: true }); if (signal.aborted) stop();
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", chunk => { output += chunk.toString(); if (output.length > 160000) { failure = "Extracted text exceeds supported limits."; child.kill("SIGKILL"); } });
    child.stdin.on("error", () => {}); child.on("error", () => { failure = "Document processing is unavailable. Paste text instead."; });
    child.on("close", () => {
      clearTimeout(timer); signal.removeEventListener("abort", stop); active--;
      try { if (failure) throw new IntakeError(failure); const result = JSON.parse(output); if (typeof result.error === "string") throw new IntakeError(result.error); if (typeof result.text !== "string" || !result.text.trim() || result.text.length > 24000 || result.text.split("\n").length > 500) throw new IntakeError("Could not extract this document. Paste text or try another file."); resolve({ text: result.text }); }
      catch (error) { reject(error instanceof IntakeError ? error : new IntakeError("Could not extract this document. Paste text or try another file.")); }
    });
    child.stdin.end(bytes);
  });
}
