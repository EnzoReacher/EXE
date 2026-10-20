import { record, str } from "@/lib/cv-review/domain";
import { shareableBlocks } from "@/lib/cv-review/privacy";
import { draftProfile } from "@/lib/cv-review/domain";

export type Input = { cv: string; jd: string };
export type Finding = { title: string; requirement: string; excerpt: string; explanation: string; nextStep: string; priority: "important" | "secondary"; group: "supported" | "unclear" | "not_found"; expectation: "required" | "preferred" | "unspecified" };
export type Scan = { findings: Finding[]; coverage: string };
export type Rewrite = { replacements: { lineId: string; original: string; text: string }[]; changes: string[]; notes: string[] };
export function input(value: unknown): Input { const b = record(value); return { cv: str(b.cv, 24000), jd: str(b.jd, 18000) }; }
function list(value: unknown, max: number): unknown[] { if (!Array.isArray(value) || value.length > max) throw new Error("Invalid response. Your work is kept."); return value; }
export function lines(cv: string) { return draftProfile(cv).blocks; }
export function sharedLines(cv: string) { return shareableBlocks(lines(cv)); }
// Ambiguous attribution/negation is retained verbatim in this bounded first slice.
// These guards catch explicit hazards; source quotes alone cannot prove meaning.
export function protectedMeaning(text: string) { return /\b(?:not|never|no|unsure|uncertain|didn['’]t|haven['’]t|wasn['’]t|my (?:manager|colleague|supervisor)|the (?:lead|manager|team))\b|(?:không|chưa|quản lý của tôi|đồng nghiệp của tôi)/iu.test(text) || /\b[A-Z][a-z]+ (?:built|designed|negotiated)\b/u.test(text); }
export function parseScan(value: unknown, source: Input): Scan {
  const b = record(value); const allowed = sharedLines(source.cv);
  return { coverage: str(b.coverage, 700), findings: list(b.findings, 30).map(item => {
    const f = record(item); const group = f.group; const priority = f.priority; const expectation = f.expectation;
    if (!["supported", "unclear", "not_found"].includes(String(group)) || !["important", "secondary"].includes(String(priority)) || !["required", "preferred", "unspecified"].includes(String(expectation))) throw new Error("Invalid finding.");
    const requirement = str(f.requirement, 1200); const excerpt = str(f.excerpt, 2000, true);
    if (!source.jd.includes(requirement) || (excerpt && !allowed.some(line => line.text.includes(excerpt))) || (group === "supported" && (!excerpt || !allowed.some(line => line.text.includes(excerpt) && !protectedMeaning(line.text)))) || (group === "not_found" && excerpt)) throw new Error("The response did not match your source. Your work is kept.");
    return { title: str(f.title, 160), requirement, excerpt, explanation: str(f.explanation, 900), nextStep: str(f.nextStep, 700), group: group as Finding["group"], priority: priority as Finding["priority"], expectation: expectation as Finding["expectation"] };
  }) };
}
const numbers = (s: string) => s.match(/\d+(?:[.,/%–-]\d+)*/gu)?.sort().join("|") || "";
export function parseRewrite(value: unknown, base: string): Rewrite {
  const b = record(value); const allowed = sharedLines(base); const seen = new Set<string>();
  return { replacements: list(b.replacements, 500).map(item => {
    const r = record(item); const lineId = str(r.lineId, 20); const original = str(r.original, 24000); const text = str(r.text, 6000);
    const line = allowed.find(line => line.id === lineId);
    if (!line || seen.has(lineId) || line.text !== original || numbers(original) !== numbers(text) || (protectedMeaning(original) && text !== original) || /\[(?:insert|add|your|tbd)|<[^>]+>/iu.test(text)) throw new Error("The rewrite could not be checked against your source. Your previous draft is kept.");
    seen.add(lineId); return { lineId, original, text };
  }), changes: list(b.changes, 8).map(s => str(s, 500)), notes: list(b.notes, 8).map(s => str(s, 700)) };
}
export function completeCV(base: string, rewrite: Rewrite) { return lines(base).map(line => rewrite.replacements.find(r => r.lineId === line.id)?.text ?? line.text).join("\n"); }
