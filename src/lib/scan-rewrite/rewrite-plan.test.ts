import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { completeCV, parseRewrite, sharedLines } from "./domain";
import { parseRewritePlan, rewriteSchemaFor } from "./rewrite-plan";
import { rewriteLimits, rewriteOutputInstructions } from "./rewrite-contract";
import { rewriteBaseLines } from "./rewrite-plan";
import { responseText } from "./domain";
import type { Provider } from "./provider";
// Historical ID-plan decoder coverage only. New production Rewrite tests live
// in structured-rewrite.test.ts; the production workflow no longer uses this.
async function performRewrite(payload: { base: string; [key: string]: unknown }, provider: Provider, signal: AbortSignal) {
  rewriteBaseLines(payload.base);
  const value = parseRewritePlan(await provider("legacy-plan-test", rewriteOutputInstructions, {}, rewriteSchemaFor(payload.base), signal), payload.base);
  return { ...value, document: responseText("document", completeCV(payload.base, value), rewriteLimits.document) };
}

const prefix = "Experience\n" + Array.from({ length: 9 }, () => "Handled customer enquiries and maintained paper records.").join("\n") + "\nAdditional context\n";
const base = prefix + "x".repeat(1859 - prefix.length);
const source = sharedLines(base);
const edits = source.slice(1, 10).map(line => ({ lineId: line.id, original: line.text, text: line.text.replace("Handled", "Assisted with") }));
const plan = { replacements: edits.map(({ lineId, text }) => ({ lineId, text })) };
const payload = { cv: base, jd: "Customer service required.", scanCV: base, scanJD: "Customer service required.", scan: { coverage: "Selected requirements.", findings: [] }, base, instructions: "Use clear wording and preserve every fact.", language: "English", consent: true };

it.each(["wrong line", "spacing", "paraphrase"])("reproduces ninth-original equality rejection on a short synthetic CV: %s", mismatch => {
  expect(base.length).toBe(1859); // Measured fixture, NOT the owner's discarded data.
  const bad = edits.map(item => ({ ...item }));
  bad[8].original = mismatch === "wrong line" ? "Additional context" : mismatch === "spacing" ? " " + bad[8].original : bad[8].original.replace("Handled", "Managed");
  expect(() => parseRewrite({ replacements: bad, changes: [], notes: [] }, base)).toThrow(expect.objectContaining({ stage: "grounding", fieldPath: "replacements[8].original", rule: "line_original", actualType: "string", constraint: "exact_source_match" }));
});
it("resolves every original by exact ID, applies all nine edits and derives metadata without a model echo or vocabulary choice", async () => {
  const provider = vi.fn().mockResolvedValue(plan);
  const before = JSON.stringify(payload);
  const result = await performRewrite(payload, provider, new AbortController().signal);
  expect(result.replacements).toEqual(edits); expect(result.document).toBe(completeCV(base, result));
  expect(result.changes).toEqual(["Updated 9 source lines; all other lines were retained."]);
  expect(result.notes.length).toBeGreaterThan(0); expect(JSON.stringify(payload)).toBe(before);
  expect(provider).toHaveBeenCalledOnce();
  const schema = provider.mock.calls[0][3] as { properties: Record<string, unknown> };
  expect(Object.keys(schema.properties)).toEqual(["replacements"]);
  expect(JSON.stringify(schema)).not.toMatch(/"(?:original|changes|notes|pattern|maxLength|minLength|maxItems)":/);
  expect(provider.mock.calls[0][1]).toContain("NEVER return original, changes, notes or document");
  expect(parseRewrite(JSON.parse(JSON.stringify(result)), base)).toMatchObject({ replacements: edits });
});
it("binds CURRENT edited-base originals, preserves CRLF/tabs/decomposed Unicode and never fuzzy-matches source text", () => {
  const original = "  Cafe\u0301\t assisted  customers.\r", current = "Experience\n" + original;
  const value = { replacements: [{ lineId: "b2", text: original.replace("assisted", "helped") }] };
  const result = parseRewritePlan(value, current);
  expect(result.replacements[0].original).toBe(original); expect(completeCV(current, result)).toBe("Experience\n" + value.replacements[0].text);
  const edited = current.replace("customers", "visitors");
  expect(parseRewritePlan({ replacements: [{ lineId: "b2", text: original.replace("customers", "visitors").replace("assisted", "helped") }] }, edited).replacements[0].original).toBe(original.replace("customers", "visitors"));
});
it.each([
  { replacements: [...plan.replacements.slice(0, 8), { lineId: "b999", text: "Invented source." }] },
  { replacements: [...plan.replacements.slice(0, 8), plan.replacements[0]] },
  { replacements: [{ ...plan.replacements[0], original: edits[0].original }] },
  { ...plan, changes: ["Arbitrary metadata"] },
  { ...plan, notes: ["x".repeat(701)] },
  { ...plan, document: "Invented document." },
])("rejects an invalid complete plan without repairing/dropping one bad edit or accepting model metadata %#", value => {
  expect(() => parseRewritePlan(value, base)).toThrow();
});
it.each([undefined, null, {}, [], true, "", " \t", "x".repeat(6001)])("retains text shape/nonblank/size checks %#", text => {
  expect(() => parseRewritePlan({ replacements: [{ lineId: "b2", text }] }, base)).toThrow(expect.objectContaining({ stage: "output_schema", fieldPath: "replacements[0].text" }));
});
it("retains counts, unknown/filtered IDs and whole-document overflow checks", async () => {
  expect(() => parseRewritePlan({ replacements: Array(501).fill(plan.replacements[0]) }, base)).toThrow(expect.objectContaining({ constraint: "max_items" }));
  const contact = "Fictional Applicant\nEmail: private@example.test\nAssisted customers.";
  expect(() => parseRewritePlan({ replacements: [{ lineId: "b2", text: "New contact text." }] }, contact)).toThrow(expect.objectContaining({ rule: "line_reference" }));
  const longBase = "Experience\n" + ["a", "b", "c", "d"].map(c => c.repeat(5000)).join("\n");
  const provider = vi.fn().mockResolvedValue({ replacements: ["a", "b", "c", "d"].map((c, i) => ({ lineId: `b${i + 2}`, text: c.repeat(6000) })) });
  await expect(performRewrite({ ...payload, cv: longBase, scanCV: longBase, base: longBase }, provider, new AbortController().signal)).rejects.toMatchObject({ fieldPath: "document", constraint: "max_length" });
  expect(provider).toHaveBeenCalledOnce();
});
it.each(["Used Excel for reports.", "Conducted market research.", "Managed import/export shipments.", "Assisted 50 customers."])("rejects explicit invented facts despite valid IDs and server originals: %s", text => {
  expect(() => parseRewritePlan({ replacements: [{ lineId: "b2", text }] }, base)).toThrow(expect.objectContaining({ stage: "grounding", rule: "rewrite_guard" }));
});
it("retains protected ownership/negation and emits bounded honest presentation notes, including no-op cases", () => {
  const current = "Experience\nMy manager negotiated contracts, not me.\nI did not approve payments.\nUsed Excel for source-backed reports.";
  for (const [lineId, text] of [["b2", "Negotiated contracts."], ["b3", "Approved payments."]]) expect(() => parseRewritePlan({ replacements: [{ lineId, text }] }, current)).toThrow(expect.objectContaining({ rule: "rewrite_guard" }));
  expect(() => parseRewritePlan({ replacements: [{ lineId: "b4", text: "Used Excel to prepare source-backed reports." }] }, current)).not.toThrow();
  for (const value of [{ replacements: [] }, { replacements: [{ lineId: "b2", text: "My manager negotiated contracts, not me." }] }]) {
    const result = parseRewritePlan(value, current);
    expect(completeCV(current, result)).toBe(current); expect(result.changes).toEqual([]); expect(result.notes).toContain("No source lines were changed.");
    expect(result.notes.length).toBeLessThanOrEqual(rewriteLimits.notes);
    for (const text of result.notes) expect(text.length).toBeLessThanOrEqual(rewriteLimits.note);
  }
  const schema = rewriteSchemaFor(current) as { properties: { replacements: { items: { properties: Record<string, unknown> } } } };
  expect(Object.keys(schema.properties.replacements.items.properties)).toEqual(["lineId", "text"]);
});
it("reconstructs unchanged blank lines/CRLF exactly and enforces the actual document boundary, not a small-input heuristic", async () => {
  const spaced = "\nExperience\r\n\n  Assisted\tcustomers.\r\n\n";
  expect(completeCV(spaced, parseRewritePlan({ replacements: [] }, spaced))).toBe(spaced);
  for (const [length, expected] of [[23999, 24000], [24000, 24001]]) {
    const current = "Experience\n" + "a".repeat(length - 11);
    const provider = vi.fn().mockResolvedValue({ replacements: [{ lineId: "b1", text: "Experiences" }] });
    const pending = performRewrite({ ...payload, cv: current, scanCV: current, base: current }, provider, new AbortController().signal);
    if (expected === 24000) expect((await pending).document.length).toBe(24000);
    else await expect(pending).rejects.toMatchObject({ stage: "output_schema", fieldPath: "document", constraint: "max_length" });
    expect(provider).toHaveBeenCalledOnce();
  }
});
it("never offers blank/private source IDs or an invalid empty enum, and rejects an empty private catalog before dispatch", async () => {
  const current = "Experience\n \t\nAssisted customers.\nEmail: private@example.test";
  const schema = rewriteSchemaFor(current) as { properties: { replacements: { items: { properties: { lineId: { enum: string[] } } } } } };
  expect(schema.properties.replacements.items.properties.lineId.enum).toEqual(["b1", "b3"]);
  expect(() => parseRewritePlan({ replacements: [{ lineId: "b2", text: "Invented duty." }] }, current)).toThrow(expect.objectContaining({ rule: "line_reference" }));
  const privateBase = "Contact\nEmail: private@example.test";
  const provider = vi.fn();
  await expect(performRewrite({ ...payload, base: privateBase }, provider, new AbortController().signal)).rejects.toMatchObject({ code: "invalid_input" });
  expect(provider).not.toHaveBeenCalled();
});
