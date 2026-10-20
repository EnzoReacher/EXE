import "server-only";
import { randomBytes } from "node:crypto";
import type { LiveSession } from "../live-types";
import { boundedText, type Configuration } from "./openai";
import { LiveError, fail } from "./validation";

export type Stored = { view: LiveSession; jd: string; expires: number; answered: boolean; calls: number; requests: Map<string, { payload: string; result: Promise<unknown> }> };
export const capability = () => randomBytes(32).toString("base64url");
export class Controls {
  readonly sessions = new Map<string, Stored>();
  private starts = new Map<string, { payload: string; result: Promise<unknown>; token?: string }>();
  private window = 0; private requests = 0; private active = 0;
  constructor(private now = Date.now) {}
  sweep() { for (const [token, s] of this.sessions) if (s.expires <= this.now()) this.sessions.delete(token); if (this.now() - this.window >= 60000) { this.window = this.now(); this.requests = 0; this.starts.clear(); } }
  get(token: string, revision: number) { this.sweep(); const s = this.sessions.get(token); if (!s || s.view.revision !== revision) throw new LiveError("expired", "This source revision expired or changed. Prepare your kept inputs again.", 409); return s; }
  add(view: LiveSession, jd: string) { this.sweep(); if (this.sessions.size >= 64) throw new LiveError("capacity", "The local session store is full. Try later; your inputs are kept.", 429); this.sessions.set(view.token, { view, jd, expires: this.now() + 15 * 60000, answered: false, calls: 0, requests: new Map() }); }
  forget(token: string) { this.sessions.delete(token); for (const [id, entry] of this.starts) if (entry.token === token) this.starts.delete(id); }
  async run<T>(store: Stored | undefined, requestId: string, payload: unknown, task: () => Promise<T>): Promise<T> {
    this.sweep(); const map = store?.requests ?? this.starts; const serialized = JSON.stringify(payload); const prior = map.get(requestId);
    if (prior) { if (prior.payload !== serialized) throw new LiveError("conflict", "This request ID was already used with different input.", 409); return prior.result as Promise<T>; }
    if (this.requests >= 12 || this.active >= 2 || (store && store.calls >= 6) || map.size >= 24) throw new LiveError("rate", "Too many requests. Wait before trying again; your inputs are kept.", 429);
    this.requests++; this.active++; if (store) store.calls++;
    const entry: { payload: string; result: Promise<unknown>; token?: string } = { payload: serialized, result: Promise.resolve() };
    const result = Promise.resolve().then(task).then((value) => { if (!store && value && typeof value === "object" && "token" in value && typeof value.token === "string") entry.token = value.token; return value; }).finally(() => { this.active--; }); entry.result = result; map.set(requestId, entry); return result;
  }
}
export async function requestBody(request: Request, config: Configuration, signal = request.signal, max = 100000): Promise<unknown> {
  const url = new URL(request.url); const expected = new URL(config.origin);
  // These prevent browser cross-origin use, not remote access or authentication.
  // Binding the process to numeric loopback is a separate mandatory operator gate.
  if (url.origin !== config.origin || request.headers.get("host") !== expected.host || request.headers.get("origin") !== config.origin || (request.headers.get("sec-fetch-site") && request.headers.get("sec-fetch-site") !== "same-origin")) throw new LiveError("origin", "Only the configured local origin is permitted.", 403);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new LiveError("content_type", "Send a JSON request.", 415);
  const length = request.headers.get("content-length"); if (length && (!/^\d+$/u.test(length) || Number(length) > max)) throw new LiveError("body", "The request is too large.", 413);
  try { return JSON.parse(await boundedText(new Response(request.body), max, AbortSignal.any([signal, AbortSignal.timeout(5000)]))); } catch { fail("Invalid or oversized JSON request. Your inputs are kept."); }
}
export function responseError(error: unknown) { const e = error instanceof LiveError ? error : new LiveError("unavailable", "The request could not complete. Your inputs are kept.", 502); return Response.json({ error: { code: e.code, message: e.message } }, { status: e.status, headers: { "Cache-Control": "no-store" } }); }
