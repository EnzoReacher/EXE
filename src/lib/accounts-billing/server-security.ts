import "server-only";
import { randomBytes, timingSafeEqual, createHash } from "node:crypto";
import type { AccountsConfig } from "./server-config";
import { failure } from "./server-errors";

export const SESSION_COOKIE = "ownpath_session";
export const CSRF_COOKIE = "ownpath_csrf";
export function cookieValue(request: Request, name: string): string | null {
  const values = (request.headers.get("cookie") ?? "").split(";").map(part => part.trim()).filter(part => part.startsWith(`${name}=`));
  if (values.length !== 1) return null;
  const value = values[0].slice(name.length + 1);
  return value.length <= 16000 && /^[A-Za-z0-9._~-]+$/.test(value) ? value : null;
}
export function serializeCookie(name: string, value: string, seconds: number, config: AccountsConfig): string {
  // Insecure cookies exist only on explicitly guarded loopback emulator mode.
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${config.origin.startsWith("https:") ? "; Secure" : ""}`;
}
export function issueCsrf(): string { return randomBytes(32).toString("hex"); }
export function validateOrigin(request: Request, config: AccountsConfig): void {
  if (request.headers.get("origin") !== config.origin) failure("CSRF_INVALID");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") failure("CSRF_INVALID");
}
export function validateCsrf(request: Request, config: AccountsConfig): void {
  validateOrigin(request, config);
  const cookie = cookieValue(request, CSRF_COOKIE);
  const header = request.headers.get("x-csrf-token");
  if (!cookie || !header || !/^[a-f0-9]{64}$/.test(cookie) || !/^[a-f0-9]{64}$/.test(header) || !timingSafeEqual(Buffer.from(cookie), Buffer.from(header))) failure("CSRF_INVALID");
}
export async function readBoundedBody(request: Request, maxBytes: number): Promise<Uint8Array> {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes)) failure("PAYLOAD_TOO_LARGE");
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      bytes += result.value.byteLength;
      if (bytes > maxBytes) { await reader.cancel(); failure("PAYLOAD_TOO_LARGE"); }
      chunks.push(result.value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
  return body;
}
export async function readJson(request: Request, maxBytes: number): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json" || request.headers.has("content-encoding")) failure("INVALID_REQUEST");
  const body = await readBoundedBody(request, maxBytes);
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)); } catch { return failure("INVALID_REQUEST"); }
}
export function hash(value: string): string { return createHash("sha256").update(value).digest("hex"); }
export function safeNext(value: unknown, origin: string): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\%\x00-\x20]/.test(value)) return "/account";
  try {
    const url = new URL(value, origin);
    const allowed = ["/account", "/account/billing", "/experience-translator", "/pricing", "/checkout"];
    if (url.origin !== origin || !allowed.some(path => url.pathname === path || url.pathname.startsWith(`${path}/`))) return "/account";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return "/account"; }
}
