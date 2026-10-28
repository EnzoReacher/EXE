import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { parseScan, scanSources } from "./domain";
import { performScan } from "./scan-workflow";
import { parseSelection, scanCatalog, selectionSchema } from "./scan-selection";
import { checkedPayload } from "./server";

const source = { cv: "Fictional Applicant\nExperience\nAssisted customers.\nMy manager negotiated contracts, not me.\nI did not approve payments.\nEducation\nDiploma 2023", jd: "Customer service required.\nExcel required.\nMarket research preferred.\nImport/export preferred." };
const catalog = scanCatalog(source);
const finding = { title: "Customer service", requirementSourceId: "jd:r2", excerptSourceId: "cv:b3", explanation: "Customer assistance is demonstrated.", nextStep: "Keep this truthful example.", priority: "important", expectation: "required", group: "supported" };
const response = { coverage: "Only selectable source units were reviewed.", findings: [finding] };
const parse = (value: unknown) => parseSelection(value, source, catalog);

// Independent interpreter for the schema subset sent to the provider. Bounds
// unsupported by the provider are separately checked by the runtime below.
function accepts(schema: unknown, value: unknown): boolean {
  const s = schema as { type?: string; enum?: unknown[]; anyOf?: unknown[]; properties?: Record<string, unknown>; required?: string[]; additionalProperties?: boolean; items?: unknown };
  if (s.enum && !s.enum.some(item => JSON.stringify(item) === JSON.stringify(value))) return false;
  if (s.anyOf) return s.anyOf.some(branch => accepts(branch, value));
  if (s.type === "string") return typeof value === "string";
  if (s.type === "array") return Array.isArray(value) && value.every(item => accepts(s.items, item));
  if (s.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const obj = value as Record<string, unknown>;
    return (s.required ?? []).every(key => key in obj) && Object.keys(obj).every(key => key in (s.properties ?? {}) ? accepts(s.properties![key], obj[key]) : s.additionalProperties !== false);
  }
  return true;
}

it("reproduces the observed second-finding string/cv_quote boundary without claiming to recover the discarded text", () => {
  const good = { ...finding, requirementSourceId: "jd", requirement: "Customer service required.", excerpt: "Assisted customers." };
  expect(() => parseScan({ coverage: "Selected requirements only.", findings: [good, { ...good, excerpt: "Managed Excel reports and import/export research." }] }, source, scanSources(source))).toThrow(expect.objectContaining({ stage: "grounding", fieldPath: "findings[1].excerpt", rule: "cv_quote", actualType: "string", constraint: "exact_source_match" }));
});
it("uses bounded ID enums on the actual wire and resolves original quotes before all existing grounding checks", async () => {
  const provider = vi.fn().mockResolvedValue(response);
  const result = await performScan({ ...source, consent: true }, provider, new AbortController().signal);
  expect(provider).toHaveBeenCalledOnce();
  const [, prompt, payload, schema] = provider.mock.calls[0];
  expect(payload).toEqual(catalog); expect(schema).toEqual(selectionSchema(catalog));
  expect(accepts(schema, response)).toBe(true);
  expect(prompt).toContain("NEVER return requirement or excerpt text fields");
  expect(result.findings[0]).toMatchObject({ requirement: "Customer service required.", requirementSourceId: "jd", excerpt: "Assisted customers.", excerptSourceId: "cv:b3" });
  expect(parseScan(result, source, scanSources(source))).toEqual(result);
});
it.each([
  { change: { excerpt: "Invented Excel skill." } },
  { change: { requirement: "Invented JD quote." } },
  { change: { excerptSourceId: "cv:b999" } },
  { change: { excerptSourceId: "jd:r2" } },
  { change: { requirementSourceId: "cv:b3" } },
  { change: { requirementSourceId: "jd:r999" } },
  { change: { excerptSourceId: "cv:b1" } },
  { change: { group: "supported", excerptSourceId: "" } },
  { change: { group: "supported", excerptSourceId: "cv:b4" } },
  { change: { group: "supported", excerptSourceId: "cv:b5" } },
  { change: { group: "not_found", excerptSourceId: "cv:b3" } },
  { change: { group: "bogus" } },
  { change: { priority: "bogus" } },
  { change: { expectation: "bogus" } },
  { change: { requirementSourceId: 1 } },
  { change: { excerptSourceId: null } },
])("schema AND runtime reject invalid source/category/enum selection %#", ({ change }) => {
  const value = { ...response, findings: [{ ...finding, ...change }] };
  expect(accepts(selectionSchema(catalog), value)).toBe(false);
  expect(() => parse(value)).toThrow();
});
it.each(["Excel required.", "Market research preferred.", "Import/export preferred."])("resolves missing evidence as not_found, never manufactures %s", requirement => {
  const id = catalog.requirements.find(item => item.text === requirement)!.id;
  const value = { ...response, findings: [{ ...finding, group: "not_found", requirementSourceId: id, excerptSourceId: "" }] };
  expect(accepts(selectionSchema(catalog), value)).toBe(true);
  expect(parse(value).findings[0]).toMatchObject({ group: "not_found", requirement, excerpt: "", excerptSourceId: "" });
});
it.each(["coverage", "title", "explanation", "nextStep"])("enforces every generated text field's type, presence, blank and exact UTF-16 bounds: %s", field => {
  const max = { coverage: 700, title: 160, explanation: 900, nextStep: 700 }[field]!;
  for (const [value, constraint] of [[undefined, "required"], [null, "type"], [[], "type"], [{}, "type"], [1, "type"], [true, "type"], [" \t", "non_blank"], ["x".repeat(max + 1), "max_length"]] as const) {
    const item = field === "coverage" ? { ...response, coverage: value } : { ...response, findings: [{ ...finding, [field]: value }] };
    expect(() => parse(item)).toThrow(expect.objectContaining({ stage: "output_schema", fieldPath: field === "coverage" ? field : `findings[0].${field}`, constraint }));
  }
  expect(() => parse(field === "coverage" ? { ...response, coverage: "x".repeat(max) } : { ...response, findings: [{ ...finding, [field]: "x".repeat(max) }] })).not.toThrow();
});
it("rejects malformed containers, missing fields, unknown fields and array overflow without partial results", () => {
  for (const value of [null, [], {}, { ...response, extra: "PRIVATE" }, { ...response, findings: null }, { ...response, findings: {} }, { ...response, findings: Array(31).fill(finding) }, { ...response, findings: [null] }, { ...response, findings: [{ ...finding, extra: "PRIVATE" }] }]) expect(() => parse(value)).toThrow();
  for (const key of Object.keys(finding)) {
    const item: Record<string, unknown> = { ...finding }; delete item[key];
    const value = { ...response, findings: [item] };
    expect(accepts(selectionSchema(catalog), value)).toBe(false); expect(() => parse(value)).toThrow();
  }
});
it("preserves full CRLF/tab/Unicode/attribution context with no normalization or substring guessing", () => {
  const text = "  Cafe\u0301\t sales  support.\r";
  const s = { cv: `Applicant\nExperience\n${text}`, jd: "Sales\r\nSupport\tpreferred." };
  const c = scanCatalog(s), value = { ...response, findings: [{ ...finding, requirementSourceId: "jd:r1" }] };
  expect(parseSelection(value, s, c).findings[0]).toMatchObject({ excerpt: text, requirement: s.jd });
  const context = { ...response, findings: [{ ...finding, group: "unclear", excerptSourceId: "cv:b4" }] };
  expect(accepts(selectionSchema(catalog), context)).toBe(true);
  expect(parse(context).findings[0].excerpt).toBe("My manager negotiated contracts, not me.");
});
it("omits whole oversized source units explicitly, never truncates them, and fails empty requirement catalogs before reservation", () => {
  const s = { cv: `Applicant\n${"x".repeat(2001)}\n${"y".repeat(2000)}`, jd: `${"a".repeat(1201)}\n${"b".repeat(1200)}` }, c = scanCatalog(s);
  expect(c.cv.map(item => item.text)).toEqual(["Applicant", "y".repeat(2000)]);
  expect(c.requirements.map(item => item.text)).toEqual(["b".repeat(1200)]);
  expect(c).toMatchObject({ omittedCvBlocks: 1, omittedJdLines: 1 });
  expect(() => checkedPayload("scan", { cv: source.cv, jd: "x".repeat(1201), consent: true })).toThrow(/line breaks/);
});
