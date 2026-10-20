import type { GenerateRequest, LiveBullet, LiveSession, PrepareRequest } from "./live-types";

export class LiveClientError extends Error {}
export const requestId = () => crypto.randomUUID();
const unchecked = (): never => { throw new LiveClientError("The server returned an unchecked response. Your inputs are kept."); };
function record(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return unchecked();
  const data = value as Record<string, unknown>;
  if (Object.keys(data).length !== keys.length || keys.some((key) => !Object.hasOwn(data, key))) return unchecked();
  return data;
}
function string(value: unknown, max: number, min = 1): string {
  if (typeof value !== "string" || value.length < min || value.length > max || !value.trim() || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) return unchecked();
  return value;
}
function array(value: unknown, max: number, min = 0): unknown[] { if (!Array.isArray(value) || value.length < min || value.length > max) return unchecked(); return value; }
function integer(value: unknown, min: number): number { if (!Number.isSafeInteger(value) || Number(value) < min) return unchecked(); return Number(value); }
function id(value: unknown): string { const result = string(value, 100); if (!/^[A-Za-z0-9_-]+$/u.test(result)) return unchecked(); return result; }
function unique(values: string[]) { if (new Set(values).size !== values.length) unchecked(); }
function references(value: unknown, allowed: string[], max: number): string[] {
  const result = array(value, max, 1).map(id); unique(result); if (result.some((v) => !allowed.includes(v))) return unchecked(); return result;
}
function exactQuote(source: string, excerpt: string, start?: number, end?: number) {
  const index = source.indexOf(excerpt);
  if (index < 0 || source.indexOf(excerpt, index + 1) !== -1 || (start !== undefined && (index !== start || end !== start + excerpt.length || source.slice(start, end) !== excerpt))) unchecked();
}
/** JSON.parse discards duplicate object keys. Check them before parsing so a
 * repeated/escaped-equivalent field cannot silently replace a required value.
 * This is a bounded iterative key scan, not a second JSON grammar/parser. */
function parse(raw: string): unknown {
  const stack: { keys?: Set<string>; key: boolean }[] = [];
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i]; const top = stack.at(-1);
    if (char === '"') {
      const begin = i++;
      for (; i < raw.length && raw[i] !== '"'; i++) if (raw[i] === "\\") i++;
      if (top?.keys && top.key) { const key = JSON.parse(raw.slice(begin, i + 1)) as string; if (top.keys.has(key)) unchecked(); top.keys.add(key); top.key = false; }
    } else if (char === "{" || char === "[") { stack.push(char === "{" ? { keys: new Set(), key: true } : { key: false }); if (stack.length > 12) unchecked(); }
    else if (char === "}" || char === "]") stack.pop();
    else if (char === "," && top?.keys) top.key = true;
  }
  return JSON.parse(raw);
}
async function post(path: "prepare" | "generate", body: unknown, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try { response = await fetch(`/api/experience-translator/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", cache: "no-store", body: JSON.stringify(body), signal }); }
  catch { throw new LiveClientError("The request could not complete. Your inputs and edits are kept."); }
  let raw: string;
  try { raw = await response.text(); } catch { return unchecked(); }
  if (raw.length > 150000) return unchecked();
  let data;
  try { data = parse(raw); } catch { return unchecked(); }
  if (!response.ok) {
    // Never render arbitrary server/provider response text.
    const messages: Record<string, string> = { not_configured: "OpenAI is not configured.", rate: "Too many requests. Wait before trying again; your inputs are kept.", expired: "This source revision expired or changed. Prepare your kept inputs again.", origin: "Only the configured local origin is permitted.", capacity: "The local session store is full. Try later; your inputs are kept." };
    const error = data && typeof data === "object" && "error" in data ? data.error : undefined;
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    throw new LiveClientError(typeof code === "string" && Object.hasOwn(messages, code) ? messages[code] : "The request could not be checked. Your inputs and edits are kept. Try again or clarify the sources.");
  }
  return data;
}
export async function prepareLive(body: Exclude<PrepareRequest, { operation: "forget" }>, signal?: AbortSignal, previous?: { session: LiveSession; jd: string }): Promise<LiveSession> {
  const data = record(await post("prepare", body, signal), ["token", "revision", "sources", "facts", "requirements", "questions"]);
  const token = string(data.token, 43, 43); if (!/^[A-Za-z0-9_-]{43}$/u.test(token)) return unchecked();
  const revision = integer(data.revision, 1);
  const sources = array(data.sources, 5, 1).map((value, index) => { const s = record(value, ["id", "text", "label"]); return { id: id(s.id), text: string(s.text, index === 0 ? 6000 : 1000), label: string(s.label, 250) }; });
  let jd: string;
  if (body.operation === "start") {
    if (revision !== 1 || sources.length !== 1 || sources[0].text !== body.project) return unchecked(); jd = body.jd;
  } else {
    if (!previous || token !== previous.session.token || revision !== previous.session.revision + 1) return unchecked();
    const expected = [...previous.session.sources]; const questions = previous.session.questions;
    const entries = Object.entries(body.answers); if (entries.length > 4) return unchecked();
    for (const [questionId, answer] of entries) {
      const q = questions.find((q) => q.id === questionId); if (!q || typeof answer !== "string" || answer.length > 1000) return unchecked();
      if (answer.trim()) expected.push({ id: `${q.id}-answer`, text: answer, label: q.text });
    }
    if (expected.length !== sources.length || expected.some((s, i) => s.id !== sources[i].id || s.text !== sources[i].text || s.label !== sources[i].label)) return unchecked();
    jd = previous.jd;
  }
  const facts = array(data.facts, 24).map((value) => {
    const f = record(value, ["id", "label", "sourceId", "excerpt", "start", "end"]);
    const result = { id: id(f.id), label: string(f.label, 250), sourceId: id(f.sourceId), excerpt: string(f.excerpt, 1500), start: integer(f.start, 0), end: integer(f.end, 1) };
    const source = sources.find((s) => s.id === result.sourceId); if (!source) return unchecked();
    exactQuote(source.text, result.excerpt, result.start, result.end); return result;
  });
  const requirements = array(data.requirements, 12).map((value) => { const r = record(value, ["id", "label", "excerpt"]); const result = { id: id(r.id), label: string(r.label, 250), excerpt: string(r.excerpt, 1000) }; exactQuote(jd, result.excerpt); return result; });
  const questions = array(data.questions, 4).map((value) => { const q = record(value, ["id", "text", "hint"]); return { id: id(q.id), text: string(q.text, 250), hint: string(q.hint, 400) }; });
  if (body.operation === "answer" && questions.length) return unchecked();
  unique([...sources, ...facts, ...requirements, ...questions].map((v) => v.id)); unique(questions.map((q) => q.text));
  unique(facts.map((f) => JSON.stringify([f.sourceId, f.excerpt, f.label])));
  return { token, revision, sources, facts, requirements, questions };
}
export async function generateLive(body: GenerateRequest, signal: AbortSignal | undefined, session: LiveSession): Promise<LiveBullet[]> {
  if (!session || body.token !== session.token || body.revision !== session.revision) return unchecked();
  const selected = references(body.selectedFactIds, session.facts.map((f) => f.id), 24);
  const data = record(await post("generate", body, signal), ["bullets"]);
  const bullets = array(data.bullets, 3).map((value) => {
    const b = record(value, ["id", "text", "factIds", "requirementIds"]);
    return { id: id(b.id), text: string(b.text, 500, 5), factIds: references(b.factIds, selected, 24), requirementIds: references(b.requirementIds, session.requirements.map((r) => r.id), 12) };
  });
  unique(bullets.map((b) => b.id)); unique(bullets.map((b) => b.text.trim().toLowerCase()));
  return bullets;
}
export async function forgetLive(token: string): Promise<void> { const result = record(await post("prepare", { operation: "forget", token }), ["forgotten"]); if (result.forgotten !== true) unchecked(); }
