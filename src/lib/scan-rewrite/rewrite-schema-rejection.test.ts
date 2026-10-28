import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createClaudeProvider } from "./claude";
import { operationDiagnostics, diagnosticSnapshot } from "./diagnostics";
import { rewriteSchemaFor, performRewrite } from "./rewrite-workflow";
import { parseRewrite } from "./domain";
import { rewriteReviewNotes, rewriteLimits } from "./rewrite-contract";
import { selectedRewrite } from "./rewrite-plan.fixture";
import { parseRewritePlan } from "./rewrite-plan";
import { completeRewriteFixture } from "./structured-rewrite.fixture";

const cv = "Fictional Applicant\nExperience\nAssisted customers.\nMy manager negotiated contracts, not me.\nEducation\nDiploma 2023";
const jd = "Customer service required. Excel preferred.";
const payload = { cv, jd, scanCV: cv, scanJD: jd, scan: { coverage: "Selected requirements only.", findings: [] }, base: cv, instructions: "Use concise source-faithful wording.", language: "English", consent: true };
const good = { replacements: [{ lineId: "b3", original: "Assisted customers.", text: "Helped customers." }], changes: [], notes: [rewriteReviewNotes.general] };
const config = { key: "OFFLINE_KEY", model: "claude-haiku-4-5-20251001", origin: "http://127.0.0.1:4317" };
const envelope = (value: unknown) => ({ type: "message", role: "assistant", stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(value) }] });
function inspect(schema: unknown, visit: (node: Record<string, unknown>) => void) {
  if (!schema || typeof schema !== "object") return;
  if (Array.isArray(schema)) { schema.forEach(s => inspect(s, visit)); return; }
  visit(schema as Record<string, unknown>); Object.values(schema).forEach(s => inspect(s, visit));
}
function hasPattern(schema: unknown) { let found = false; inspect(schema, node => { if ("pattern" in node) found = true; }); return found; }

it("reproduces the observed schema-regex HTTP400 category offline, without claiming the discarded provider wording or individual field", async () => {
  // The original schema contained both kinds. The real diagnostic identifies
  // only the root, so this fixture intentionally does NOT choose a culprit.
  const oldSchema = { type: "object", properties: { text: { type: "string", pattern: "\\S" }, notes: { type: "array", items: { type: "string", pattern: "^[^\\r\\n]{0,79}\\S$" } } }, required: ["text", "notes"], additionalProperties: false };
  const request = vi.fn(async (_url, options) => {
    expect(hasPattern(JSON.parse(options!.body as string).output_config.format.schema)).toBe(true);
    return Response.json({ type: "error", error: { type: "invalid_request_error", param: "output_config.format.schema", message: "JSON schema regex pattern unsupported. OFFLINE_PRIVATE" } }, { status: 400, headers: { "request-id": "req_offline_schema_regex" } });
  });
  await operationDiagnostics("rewrite", async () => {
    await expect(createClaudeProvider(config, request)("ownpath_rewrite", "", {}, oldSchema, new AbortController().signal)).rejects.toMatchObject({ code: "provider_request" });
    expect(diagnosticSnapshot()).toMatchObject({ stage: "provider_http", httpStatus: 400, providerRequestId: "req_offline_schema_regex", providerErrorType: "invalid_request_error", providerErrorClass: "schema_regex", providerSchemaPath: "output_config.format.schema" });
    expect(diagnosticSnapshot()).not.toHaveProperty("stopReason"); expect(diagnosticSnapshot()).not.toHaveProperty("fieldPath");
    expect(JSON.stringify(diagnosticSnapshot())).not.toContain("OFFLINE_PRIVATE");
  });
  expect(request).toHaveBeenCalledOnce();
});
it("dispatches a regex-free complete-CV schema without model-authored originals or metadata", async () => {
  const request = vi.fn(async (_url, options) => {
    const body = JSON.parse(options!.body as string), schema = body.output_config.format.schema;
    expect(hasPattern(schema)).toBe(false); expect(schema).toEqual(rewriteSchemaFor(cv));
    inspect(schema, node => { for (const key of ["pattern", "minLength", "maxLength", "maxItems", "uniqueItems"]) expect(node).not.toHaveProperty(key); });
    expect(Object.keys(schema.properties)).toEqual(["header", "sections"]);
    expect(body.system).toContain("Never return original copies, replacements");
    expect(body.system).toContain("Preserve protected/ambiguous sentences verbatim");
    return Response.json(envelope(completeRewriteFixture(cv, { b3: "Helped customers." })));
  });
  const result = await performRewrite(payload, createClaudeProvider(config, request), new AbortController().signal);
  expect(result.document).toContain("Helped customers."); expect(result.document).toContain("My manager negotiated contracts, not me.");
  expect(result.format).toBe("structured-cv-v1"); expect(result).not.toHaveProperty("replacements");
  expect(request).toHaveBeenCalledOnce();
});
it.each(["changes", "notes"] as const)("keeps public %s bounds but no presentation vocabulary gate", field => {
  const max = field === "notes" ? rewriteLimits.note : rewriteLimits.change;
  for (const message of ["Custom presentation wording.", "🙂".repeat(80)]) {
    expect(parseRewrite({ ...good, [field]: [message] }, cv, true)[field]).toEqual([message]);
    expect(() => parseRewritePlan({ ...selectedRewrite(good), [field]: [message] }, cv)).toThrow(expect.objectContaining({ constraint: "allowed_fields" }));
  }
  expect(() => parseRewrite({ ...good, [field]: ["x".repeat(max + 1)] }, cv, true)).toThrow(expect.objectContaining({ constraint: "max_length" }));
});
