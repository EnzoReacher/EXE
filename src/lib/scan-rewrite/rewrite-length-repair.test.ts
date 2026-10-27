import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { parseRewrite } from "./domain";
import { performRewrite, rewriteSchema } from "./rewrite-workflow";
import { createClaudeProvider } from "./claude";
import { rewriteReviewNotes } from "./rewrite-contract";
import { parseRewritePlan } from "./rewrite-plan";
import { selectedRewrite } from "./rewrite-plan.fixture";
import { completeRewriteFixture } from "./structured-rewrite.fixture";

const cv = "Fictional Applicant\nExperience\nAssisted customers.\nMy manager negotiated contracts, not me.\nI did not approve payments.\nEducation\nDiploma 2023";
const jd = "Customer service and accurate records required.";
const payload = { cv, jd, scanCV: cv, scanJD: jd, scan: { coverage: "Selected requirements only.", findings: [] }, base: cv, instructions: "Use clear wording without adding experience.", language: "English", consent: true };
const good = { replacements: [{ lineId: "b3", original: "Assisted customers.", text: "Helped customers." }], changes: ["Clearer wording."], notes: [rewriteReviewNotes.general] };
const envelope = (value: unknown) => ({ type: "message", role: "assistant", stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(value) }] });
const config = { key: "OFFLINE_PRIVATE_KEY", model: "claude-haiku-4-5-20251001", origin: "http://127.0.0.1:4317" };

it("retains the historical public notes[0] max_length boundary without recovering discarded text", () => {
  const note = "Fictional caveat. ".repeat(44);
  expect(note.length).toBeGreaterThan(700);
  expect(() => parseRewrite({ ...good, notes: [note] }, cv)).toThrow(expect.objectContaining({ stage: "output_schema", fieldPath: "notes[0]", rule: "field_shape", actualType: "string", constraint: "max_length" }));
});
it("derives bounded metadata on the server without a provider vocabulary gate, preserving historical limits", () => {
  const schema = rewriteSchema as { properties: Record<string, unknown> };
  expect(Object.keys(schema.properties)).toEqual(["header", "sections"]);
  const result = parseRewritePlan(selectedRewrite(good), cv);
  for (const text of result.notes) expect(text.length).toBeLessThanOrEqual(700);
  for (const text of result.changes) expect(text.length).toBeLessThanOrEqual(500);
  expect(parseRewrite({ ...good, notes: ["x".repeat(700)], changes: ["x".repeat(500)] }, cv).notes[0]).toHaveLength(700);
  expect(() => parseRewrite({ ...good, notes: ["🙂".repeat(351)] }, cv)).toThrow(expect.objectContaining({ constraint: "max_length" }));
});
it("sends the concise complete-CV contract through Claude once, without source text in schema", async () => {
  const request = vi.fn().mockResolvedValue(Response.json(envelope(completeRewriteFixture(cv, { b3: "Helped customers." }))));
  const result = await performRewrite(payload, createClaudeProvider(config, request), new AbortController().signal); expect(result.document).toContain("Helped customers."); expect(result.format).toBe("structured-cv-v1");
  const body = JSON.parse(request.mock.calls[0][1].body);
  expect(body.system).toContain("Never return original copies, replacements");
  expect(Object.keys(body.output_config.format.schema.properties)).toEqual(["header", "sections"]);
  expect(JSON.stringify(body.output_config.format.schema)).not.toContain("Assisted customers.");
  expect(JSON.stringify(body.output_config.format.schema)).not.toMatch(/"(?:maxLength|minLength|maxItems|uniqueItems)":/);
  expect(request).toHaveBeenCalledOnce();
});
it.each([
  { ...good, unexpected: "PRIVATE" },
  { ...good, replacements: [{ ...good.replacements[0], unexpected: "PRIVATE" }] },
  { ...good, replacements: [{ ...good.replacements[0], text: "Invented Excel skills.", lineId: null }] },
])("rejects schema-forbidden fields/type mismatches in runtime as well %#", value => {
  expect(() => parseRewrite(value, cv)).toThrow(expect.objectContaining({ stage: "output_schema" }));
});
it("labels oversized reconstructed documents as bounded result rejection, not transport failure", async () => {
  const base = "Experience\n" + ["a", "b", "c", "d"].map(c => c.repeat(5000)).join("\n");
  const provider = vi.fn().mockResolvedValue(completeRewriteFixture(base, Object.fromEntries(["a", "b", "c", "d"].map((c, i) => [`b${i + 2}`, c.repeat(6000)]))));
  await expect(performRewrite({ ...payload, cv: base, scanCV: base, base }, provider, new AbortController().signal)).rejects.toMatchObject({ stage: "output_schema", fieldPath: "document", actualType: "string", constraint: "max_length" });
  expect(provider).toHaveBeenCalledOnce();
});
it("keeps exact originals, protected attribution/negation, numbers, filtered/duplicate IDs and placeholder guards", () => {
  for (const replacement of [
    { lineId: "b3", original: "Wrong original.", text: "Helped customers." },
    { lineId: "b3", original: "Assisted customers.", text: "Assisted 50 customers." },
    { lineId: "b4", original: "My manager negotiated contracts, not me.", text: "Negotiated contracts." },
    { lineId: "b5", original: "I did not approve payments.", text: "Approved payments." },
    { lineId: "b3", original: "Assisted customers.", text: "[Insert Excel skill]" },
    { lineId: "b999", original: "Assisted customers.", text: "Helped customers." },
  ]) expect(() => parseRewrite({ ...good, replacements: [replacement] }, cv)).toThrow();
  expect(() => parseRewrite({ ...good, replacements: [good.replacements[0], good.replacements[0]] }, cv)).toThrow();
});
it("keeps all three array types/counts and replacement string presence/type/bounds explicit", () => {
  for (const [field, max] of [["replacements", 500], ["changes", 8], ["notes", 8]] as const) {
    for (const [value, constraint] of [[undefined, "required"], [null, "type"], [{}, "type"], [Array(max + 1).fill(field === "replacements" ? good.replacements[0] : "Short."), "max_items"]] as const) {
      expect(() => parseRewrite({ ...good, [field]: value }, cv, true)).toThrow(expect.objectContaining({ fieldPath: field, constraint }));
    }
  }
  for (const [field, max] of [["lineId", 20], ["original", 24000], ["text", 6000]] as const) {
    for (const [value, constraint] of [[undefined, "required"], [null, "type"], [[], "type"], [{}, "type"], [1, "type"], [true, "type"], [" \t", "non_blank"], ["x".repeat(max + 1), "max_length"]] as const) {
      expect(() => parseRewrite({ ...good, replacements: [{ ...good.replacements[0], [field]: value }] }, cv, true)).toThrow(expect.objectContaining({ fieldPath: `replacements[0].${field}`, constraint }));
    }
  }
  expect(() => parseRewrite({ ...good, document: "Model-authored document is forbidden." }, cv, true)).toThrow(expect.objectContaining({ constraint: "allowed_fields" }));
  // Historical client decoder remains available for earlier integrations. New
  // production requests use structured-cv-v1 and never generate replacements.
  expect(() => parseRewrite({ ...good, document: cv }, cv)).not.toThrow();
});
