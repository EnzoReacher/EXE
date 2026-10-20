import type { LiveFact, LiveRequirement, LiveSource } from "../live-types";

export class LiveError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}
export function fail(message = "The response could not be grounded. Your inputs are kept."): never { throw new LiveError("invalid", message); }
export function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail();
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== keys.length || keys.some((key) => !(key in record))) fail();
  return record;
}
export function text(value: unknown, max: number, min = 1): string {
  if (typeof value !== "string" || value.length < min || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) fail("Check input lengths and remove control characters. Your inputs are kept.");
  return value;
}
export function list(value: unknown, max: number): unknown[] { if (!Array.isArray(value) || value.length > max) fail(); return value; }
export function ids(value: unknown, allowed: string[], max = 24): string[] {
  const result = list(value, max).map((id) => text(id, 100));
  if (new Set(result).size !== result.length || result.some((id) => !allowed.includes(id))) fail("Source selection is no longer valid. Review the facts again.");
  return result;
}
export function revision(value: unknown): number { if (!Number.isSafeInteger(value) || Number(value) < 1) fail(); return Number(value); }
export function quote(source: string, excerpt: string): { start: number; end: number } {
  const start = source.indexOf(excerpt);
  if (start < 0 || source.indexOf(excerpt, start + 1) !== -1) fail();
  // JS string indices are UTF-16 offsets. No normalization of immutable sources.
  return { start, end: start + excerpt.length };
}
/** Conservative vetoes supplement, rather than replace, independent semantic review.
 * Whole clauses/context matter: a quoted positive fragment is not evidence when
 * the surrounding statement assigns it to someone else or excludes it. */
export function safeContext(source: string, excerpt: string): void {
  const { start, end } = quote(source, excerpt);
  const before = source.slice(0, start); const after = source.slice(end);
  const clause = before.slice(Math.max(before.lastIndexOf("\n"), before.lastIndexOf(".")) + 1) + excerpt + after.split(/[.\n]/u)[0];
  if (/\b(not|never|didn't|did not|without|except|excluding|excluded|planned|planning|intend|would|might|maybe|uncertain|instead|correction|ignore|instructions?|system|developer|prompt)\b|\b(he|she|they|teammate|team)\s+(built|implemented|completed|created|edited|deleted|designed)|(?:chưa|không|dự định)/iu.test(clause) || /\b[A-Z][a-z]+\s+(built|implemented|completed|created|edited|deleted|designed)/u.test(clause)) fail();
}
export function extracted(value: unknown, sources: LiveSource[], jd: string, prefix: string) {
  const data = object(value, ["facts", "requirements", "questions"]);
  const facts: LiveFact[] = list(data.facts, 24).map((item, index) => {
    const fact = object(item, ["label", "sourceId", "excerpt", "actor", "polarity", "context"]);
    const source = sources.find((s) => s.id === text(fact.sourceId, 100)); if (!source) fail();
    const excerpt = text(fact.excerpt, 1500); const label = text(fact.label, 250);
    if (fact.actor !== "self" || fact.polarity !== "completed") fail();
    text(fact.context, 1000); safeContext(source.text, excerpt);
    // Numbers must be literal source evidence, never supplied by the JD.
    if ((label.match(/\d+(?:[.,]\d+)?%?/gu) ?? []).some((n) => !excerpt.includes(n))) fail();
    return { id: `${prefix}-f${index}`, label, sourceId: source.id, excerpt, ...quote(source.text, excerpt) };
  });
  if (new Set(facts.map((f) => f.sourceId + f.excerpt + f.label)).size !== facts.length) fail();
  const requirements: LiveRequirement[] = list(data.requirements, 12).map((item, index) => {
    const r = object(item, ["label", "excerpt"]); const excerpt = text(r.excerpt, 1000); quote(jd, excerpt);
    return { id: `${prefix}-r${index}`, label: text(r.label, 250), excerpt };
  });
  const questions = list(data.questions, 4).map((item, index) => { const q = object(item, ["text", "hint"]); return { id: `${prefix}-q${index}`, text: text(q.text, 250), hint: text(q.hint, 400) }; });
  return { facts, requirements, questions };
}
export function verification(value: unknown, expected: string[]) {
  const data = object(value, ["checks"]);
  const checks = list(data.checks, 30).map((item) => {
    const c = object(item, ["id", "entailed", "selfAttribution", "completedPositive", "noInventedDetails", "relationshipsExplicit", "noInstructionFollowing", "selectedOnly"]);
    const id = text(c.id, 100);
    if (Object.entries(c).some(([key, v]) => key !== "id" && v !== true)) fail();
    return id;
  });
  if (checks.length !== expected.length || new Set(checks).size !== checks.length || expected.some((id) => !checks.includes(id))) fail();
}
