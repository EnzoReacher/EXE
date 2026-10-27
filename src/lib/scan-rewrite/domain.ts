import { record, str } from "@/lib/cv-review/domain";
import { shareableBlocks } from "@/lib/cv-review/privacy";
import { draftProfile } from "@/lib/cv-review/domain";
import { rewriteLimits } from "./rewrite-contract";
import { scanLimits } from "./scan-contract";

export type Input = { cv: string; jd: string };
export type Finding = { title: string; requirement: string; excerpt: string; explanation: string; nextStep: string; priority: "important" | "secondary"; group: "supported" | "unclear" | "not_found"; expectation: "required" | "preferred" | "unspecified"; requirementSourceId?: string; excerptSourceId?: string };
export type Scan = { findings: Finding[]; coverage: string };
export type Rewrite = { replacements: { lineId: string; original: string; text: string }[]; changes: string[]; notes: string[] };
export function input(value: unknown): Input { const b = record(value); return { cv: str(b.cv, 24000), jd: str(b.jd, 18000) }; }
export function lines(cv: string) { return draftProfile(cv).blocks; }
export function sharedLines(cv: string) { return shareableBlocks(lines(cv)); }
/** No trimming, Unicode normalization or reindexing after whole-block filtering.
 * IDs point back to original CV blocks; the JD is one verbatim source document. */
export function scanSources(source: Input) {
  return { cv: sharedLines(source.cv).map(line => ({ id: `cv:${line.id}`, text: line.text })), jd: { id: "jd", text: source.jd } };
}
// Ambiguous attribution/negation is retained verbatim in this bounded first slice.
// These guards catch explicit hazards; source quotes alone cannot prove meaning.
export function protectedMeaning(text: string) { return /\b(?:not|never|no|unsure|uncertain|didn['’]t|haven['’]t|wasn['’]t|my (?:manager|colleague|supervisor)|the (?:lead|manager|team))\b|(?:không|chưa|quản lý của tôi|đồng nghiệp của tôi)/iu.test(text) || /\b[A-Z][a-z]+ (?:built|designed|negotiated)\b/u.test(text); }
/** Fixed field paths only; never attach the rejected value or source text. */
export type OutputRule = "field_shape" | "enum" | "jd_quote" | "cv_quote" | "supported_context" | "not_found_excerpt" | "line_reference" | "line_original" | "rewrite_guard";
export const jsonTypes = ["missing", "null", "array", "object", "string", "number", "boolean"] as const;
export type JsonType = typeof jsonTypes[number];
export const outputConstraints = ["required", "type", "non_blank", "max_length", "max_items", "exact_source_match", "source_reference", "category_evidence", "allowed_fields", "enum", "concise_shape"] as const;
export type OutputConstraint = typeof outputConstraints[number];
export class OutputValidationError extends Error {
  constructor(public stage: "output_schema" | "grounding", public fieldPath: string, public rule: OutputRule = "field_shape", public actualType?: JsonType, public constraint?: OutputConstraint) { super("The response could not be checked. Your work is kept."); }
}
export function jsonType(value: unknown): JsonType { return value === undefined ? "missing" : value === null ? "null" : Array.isArray(value) ? "array" : typeof value as JsonType; }
function invalidField(path: string, value: unknown, constraint: OutputConstraint): never { throw new OutputValidationError("output_schema", path, "field_shape", jsonType(value), constraint); }
export function responseText(path: string, value: unknown, max: number, allowEmpty = false) {
  if (value === undefined) invalidField(path, value, "required");
  if (typeof value !== "string") invalidField(path, value, "type");
  if (value.length > max) invalidField(path, value, "max_length");
  if (!allowEmpty && !value.trim()) invalidField(path, value, "non_blank");
  return value;
}
export function responseList(path: string, value: unknown, max: number): unknown[] {
  if (value === undefined) invalidField(path, value, "required");
  if (!Array.isArray(value)) invalidField(path, value, "type");
  if (value.length > max) invalidField(path, value, "max_items");
  return value;
}
function outputField<T>(path: string, check: () => T): T { try { return check(); } catch { throw new OutputValidationError("output_schema", path); } }
function grounded(condition: boolean, path: string, rule: OutputRule, value?: unknown) { if (!condition) throw new OutputValidationError("grounding", path, rule, value === undefined ? undefined : jsonType(value), rule === "cv_quote" || rule === "jd_quote" || rule === "line_original" ? "exact_source_match" : rule === "line_reference" ? "source_reference" : "category_evidence"); }
export function parseScan(value: unknown, source: Input, providerSources?: ReturnType<typeof scanSources>): Scan {
  const b = outputField("$", () => record(value)); const allowed = sharedLines(source.cv); const mapped = providerSources ?? scanSources(source);
  return { coverage: responseText("coverage", b.coverage, scanLimits.coverage), findings: responseList("findings", b.findings, scanLimits.findings).map((item, index) => {
    const path = `findings[${index}]`; const f = outputField(path, () => record(item)); const group = f.group; const priority = f.priority; const expectation = f.expectation;
    for (const [field, choices, value] of [["group", ["supported", "unclear", "not_found"], group], ["priority", ["important", "secondary"], priority], ["expectation", ["required", "preferred", "unspecified"], expectation]] as const) {
      if (!(choices as readonly string[]).includes(String(value))) throw new OutputValidationError("output_schema", `${path}.${field}`, "enum");
    }
    const requirement = responseText(`${path}.requirement`, f.requirement, scanLimits.requirement); const excerpt = responseText(`${path}.excerpt`, f.excerpt, scanLimits.excerpt, true);
    // Provider output always requires references. Older saved/client Scans without
    // references retain their exact grounding contract; supplied references are
    // never silently ignored, including on saved-document and Rewrite reads.
    const referenced = !!providerSources || f.requirementSourceId !== undefined || f.excerptSourceId !== undefined;
    const evidence = referenced ? mapped.cv.filter(line => line.id === f.excerptSourceId) : allowed;
    if (referenced) {
      grounded(f.requirementSourceId === mapped.jd.id, `${path}.requirementSourceId`, "line_reference", f.requirementSourceId);
      grounded(excerpt ? evidence.length === 1 : f.excerptSourceId === "", `${path}.excerptSourceId`, "line_reference", f.excerptSourceId);
    }
    grounded(source.jd.includes(requirement), `${path}.requirement`, "jd_quote", requirement);
    grounded(!excerpt || evidence.some(line => line.text.includes(excerpt)), `${path}.excerpt`, "cv_quote", excerpt);
    grounded(group !== "supported" || !!excerpt && evidence.some(line => line.text.includes(excerpt) && !protectedMeaning(line.text)), `${path}.excerpt`, "supported_context", excerpt);
    grounded(group !== "not_found" || !excerpt, `${path}.excerpt`, "not_found_excerpt", excerpt);
    return { title: responseText(`${path}.title`, f.title, scanLimits.title), requirement, excerpt, explanation: responseText(`${path}.explanation`, f.explanation, scanLimits.explanation), nextStep: responseText(`${path}.nextStep`, f.nextStep, scanLimits.nextStep), group: group as Finding["group"], priority: priority as Finding["priority"], expectation: expectation as Finding["expectation"], ...(referenced ? { requirementSourceId: mapped.jd.id, excerptSourceId: excerpt ? evidence[0].id : "" } : {}) };
  }) };
}
const numbers = (s: string) => s.match(/\d+(?:[.,/%–-]\d+)*/gu)?.sort().join("|") || "";
// Conservative checks for explicit JD-only named claims; this is not a proof of
// all semantic entailment. Do not move a named qualification into an unrelated line.
const namedRequirements = [/\bExcel\b/iu, /\bmarket[\s-]+research\b/iu, /\bimport(?:[\s/&-]+(?:and[\s-]+)?)export\b/iu];
export function responseObject(path: string, value: unknown, keys: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidField(path, value, value === undefined ? "required" : "type");
  const b = record(value);
  if (Object.keys(b).some(key => !keys.includes(key))) invalidField(path, value, "allowed_fields");
  return b;
}
export function parseRewrite(value: unknown, base: string, strictEnvelope = false): Rewrite {
  const b = responseObject("$", value, strictEnvelope ? ["replacements", "changes", "notes"] : ["replacements", "changes", "notes", "document"]); const allowed = sharedLines(base); const seen = new Set<string>();
  return { replacements: responseList("replacements", b.replacements, rewriteLimits.replacements).map((item, index) => {
    const path = `replacements[${index}]`; const r = responseObject(path, item, ["lineId", "original", "text"]); const lineId = responseText(`${path}.lineId`, r.lineId, rewriteLimits.lineId); const original = responseText(`${path}.original`, r.original, rewriteLimits.original); const text = responseText(`${path}.text`, r.text, rewriteLimits.text);
    const line = allowed.find(line => line.id === lineId);
    grounded(!!line && !seen.has(lineId), `${path}.lineId`, "line_reference", lineId);
    grounded(line?.text === original, `${path}.original`, "line_original", original);
    grounded(numbers(original) === numbers(text) && (!protectedMeaning(original) || text === original) && !/\[(?:insert|add|your|tbd)|<[^>]+>/iu.test(text)
      && namedRequirements.every(term => !term.test(text) || term.test(original)), `${path}.text`, "rewrite_guard", text);
    seen.add(lineId); return { lineId, original, text };
  }), changes: responseList("changes", b.changes, rewriteLimits.changes).map((s, index) => responseText(`changes[${index}]`, s, rewriteLimits.change)), notes: responseList("notes", b.notes, rewriteLimits.notes).map((s, index) => responseText(`notes[${index}]`, s, rewriteLimits.note)) };
}
export function completeCV(base: string, rewrite: Rewrite) { return lines(base).map(line => rewrite.replacements.find(r => r.lineId === line.id)?.text ?? line.text).join("\n"); }
