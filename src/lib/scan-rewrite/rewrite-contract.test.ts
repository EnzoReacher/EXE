import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { parseRewrite, completeCV } from "./domain";
import { perform, rewriteSchema } from "./server";
import { createClaudeProvider } from "./claude";
import { rewriteSchemaFor } from "./rewrite-workflow";
import { completeRewriteFixture } from "./structured-rewrite.fixture";

const cv = "Linh Nguyen\nExperience\nHelped customers.\nMy manager negotiated contracts, not me.";
const jd = "Customer service required.";
const output = { replacements: [{ lineId: "b3", original: "Helped customers.", text: "Assisted customers." }], changes: ["Clearer wording."], notes: [] as unknown[] };
const payload = { cv, jd, consent: true, scanCV: cv, scanJD: jd, scan: { coverage: "Selected requirements.", findings: [] }, base: cv, instructions: "Make it clearer without adding experience.", language: "English" };
const envelope = (value: unknown, stop_reason = "end_turn") => ({ type: "message", role: "assistant", stop_reason, content: [{ type: "text", text: JSON.stringify(value) }] });
const properties = (rewriteSchema as { properties: Record<string, { type: string; description?: string; items: { type: string; description?: string; enum?: readonly string[] } }> }).properties;

it("requests a complete header/sections CV, without original copies or line-edit plans", () => {
  expect(Object.keys(properties)).toEqual(["header", "sections"]);
  expect(properties.sections.type).toBe("array");
  expect(JSON.stringify(rewriteSchema)).not.toContain('"pattern"');
  // Native Claude rejects these unsupported keywords: bounds stay explicit in
  // descriptions/prompt and are hard-validated in the shared runtime parser.
  expect(JSON.stringify(rewriteSchema)).not.toMatch(/"(?:maxLength|minLength|maxItems)"/);
});

it.each([
  [null, "null", "type"], [{ text: "PRIVATE_NOTE" }, "object", "type"], [[], "array", "type"], [12, "number", "type"], [true, "boolean", "type"],
  ["", "string", "non_blank"], [" \n\t", "string", "non_blank"], ["x".repeat(701), "string", "max_length"],
])("rejects invalid note %# without coercion, with content-free constraint metadata", (note, actualType, constraint) => {
  expect(() => parseRewrite({ ...output, notes: [note] }, cv)).toThrow(expect.objectContaining({ stage: "output_schema", fieldPath: "notes[0]", rule: "field_shape", actualType, constraint }));
});

it.each([
  [{ ...output, notes: undefined }, "notes", "missing", "required"],
  [{ ...output, notes: {} }, "notes", "object", "type"],
  [{ ...output, notes: Array(9).fill("Valid note.") }, "notes", "array", "max_items"],
  [{ ...output, changes: ["x".repeat(501)] }, "changes[0]", "string", "max_length"],
])("distinguishes missing arrays, wrong containers and count/length constraints %#", (value, fieldPath, actualType, constraint) => {
  expect(() => parseRewrite(value, cv)).toThrow(expect.objectContaining({ fieldPath, actualType, constraint }));
});

it("preserves the exact accepted note string, boundary limits and complete source-supported document", () => {
  const value = { ...output, changes: Array(8).fill("x".repeat(500)), notes: Array(8).fill("x".repeat(700)) };
  const parsed = parseRewrite(value, cv); expect(parsed.notes).toEqual(value.notes); expect(completeCV(cv, parsed)).toBe(cv.replace("Helped", "Assisted"));
  expect(parseRewrite({ ...output, notes: ["  Keep ownership unchanged.  "] }, cv).notes).toEqual(["  Keep ownership unchanged.  "]);
  // The established runtime measure remains UTF-16 code units, not code points.
  expect(() => parseRewrite({ ...output, notes: ["😀".repeat(351)] }, cv)).toThrow();
  expect(parseRewrite({ ...output, notes: [] }, cv).notes).toEqual([]);
});

it("passes the complete-CV contract to controlled Claude and never repairs by retry", async () => {
  const request = vi.fn().mockResolvedValue(Response.json(envelope(completeRewriteFixture(cv, { b3: "Assisted customers." }))));
  const provider = createClaudeProvider({ key: "synthetic", origin: "http://127.0.0.1:4317", model: "claude-haiku-4-5-20251001" }, request);
  const result = await perform("rewrite", payload, provider, new AbortController().signal); expect(result.document).toContain("Assisted customers."); expect(result).toHaveProperty("format", "structured-cv-v1");
  const body = JSON.parse(request.mock.calls[0][1].body);
  expect(body.output_config.format.schema).toEqual(rewriteSchemaFor(cv));
  expect(Object.keys(body.output_config.format.schema.properties)).toEqual(["header", "sections"]);
  expect(body.system).toContain("COMPLETE CV"); expect(body.system).toContain("24,000");
  expect(body.system).toContain("Never return original copies, replacements"); expect(request).toHaveBeenCalledOnce();
});

it.each(["refusal", "max_tokens"])("rejects a %s envelope even when Rewrite JSON is syntactically complete", async stop => {
  const request = vi.fn().mockResolvedValue(Response.json(envelope(output, stop)));
  await expect(perform("rewrite", payload, createClaudeProvider({ key: "synthetic", origin: "http://127.0.0.1:4317", model: "claude-haiku-4-5-20251001" }, request), new AbortController().signal)).rejects.toThrow(); expect(request).toHaveBeenCalledOnce();
});

it("retains exact-original, protected-meaning, number and complete-document guards", async () => {
  for (const replacement of [
    { ...output.replacements[0], original: "Invented original." },
    { ...output.replacements[0], text: "Assisted 50 customers." },
    { lineId: "b4", original: "My manager negotiated contracts, not me.", text: "I negotiated contracts." },
  ]) expect(() => parseRewrite({ ...output, replacements: [replacement] }, cv)).toThrow();
  const longBase = "Experience\n" + ["a", "b", "c", "d"].map(letter => letter.repeat(5000)).join("\n");
  const provider = vi.fn().mockResolvedValue({ replacements: ["a", "b", "c", "d"].map((letter, i) => ({ lineId: `b${i + 2}`, text: letter.repeat(6000) })) });
  await expect(perform("rewrite", { ...payload, cv: longBase, scanCV: longBase, base: longBase }, provider, new AbortController().signal)).rejects.toThrow();
  expect(provider).toHaveBeenCalledOnce();
});

it("keeps every replacement string and array limit plus duplicate-ID guards after removing wire patterns", () => {
  for (const field of ["lineId", "original", "text"]) {
    for (const value of ["", " \n\t", null, {}]) {
      expect(() => parseRewrite({ ...output, replacements: [{ ...output.replacements[0], [field]: value }] }, cv)).toThrow();
    }
  }
  for (const [field, max] of [["lineId", 20], ["original", 24000], ["text", 6000]] as const) {
    expect(() => parseRewrite({ ...output, replacements: [{ ...output.replacements[0], [field]: "x".repeat(max + 1) }] }, cv)).toThrow(expect.objectContaining({ constraint: "max_length" }));
  }
  expect(() => parseRewrite({ ...output, replacements: Array(501).fill(output.replacements[0]) }, cv)).toThrow(expect.objectContaining({ constraint: "max_items" }));
  expect(() => parseRewrite({ ...output, replacements: [output.replacements[0], output.replacements[0]] }, cv)).toThrow(expect.objectContaining({ rule: "line_reference" }));
  expect(() => parseRewrite({ ...output, changes: [" \t"] }, cv)).toThrow(expect.objectContaining({ constraint: "non_blank" }));
});
