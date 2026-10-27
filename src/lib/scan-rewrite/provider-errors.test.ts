import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createClaudeProvider } from "./claude";
import { rewriteSchema } from "./rewrite-workflow";
import { operationDiagnostics, diagnosticSnapshot } from "./diagnostics";
import { sanitizeProviderError } from "./provider-errors";
import { scanSchema } from "./server";
const config = { key: "PRIVATE_SYNTHETIC_KEY", origin: "http://127.0.0.1:4317", model: "claude-haiku-4-5-20251001" };
it.each([
  ['Schema is too complex for compilation. PRIVATE', 'schema_complexity'],
  ['Schema compilation timed out. PRIVATE', 'schema_compilation_timeout'],
  ['Your workspace spend limit has been reached. PRIVATE', 'spend_limit'],
  ['Invalid regex: unsupported escape sequence in pattern. PRIVATE', 'schema_regex'],
  ['Invalid JSON schema. PRIVATE', 'schema_validation'],
])('classifies a bounded provider reason without requiring a parameter path: %s', async (message, classification) => {
  const request=vi.fn().mockResolvedValue(Response.json({error:{type:'invalid_request_error',message}},{status:400}));
  await operationDiagnostics('rewrite',async()=>{
    await createClaudeProvider(config,request)('rewrite','',{},rewriteSchema,new AbortController().signal).catch(()=>{});
    expect(diagnosticSnapshot()).toMatchObject({providerErrorClass:classification});
    expect(diagnosticSnapshot()).not.toHaveProperty('providerSchemaPath');
    expect(JSON.stringify(diagnosticSnapshot())).not.toContain('PRIVATE');
  });expect(request).toHaveBeenCalledOnce();
});
it('retains fixed reason signals for a parameter-free rejection without retaining text or claiming a path',()=>{
 const summary=sanitizeProviderError({error:{type:'invalid_request_error',message:'Regex parsing failed in pattern: unsupported escape \\s. PRIVATE_CV_KEY'}},rewriteSchema);
 expect(summary).toMatchObject({providerErrorClass:'schema_regex',providerErrorSignals:['regex','pattern','escape','unsupported','parse']});
 expect(summary).not.toHaveProperty('providerSchemaPath');expect(JSON.stringify(summary)).not.toContain('PRIVATE');
 expect(sanitizeProviderError({error:{type:'invalid_request_error',message:'PRIVATE_CV_KEY'}},rewriteSchema)).toEqual({providerErrorType:'invalid_request_error',providerErrorDetails:'available',providerErrorSignals:[]});
});
it.each(['$.properties.sections.items.properties.heading.type','schema.properties.sections.items.properties.heading.type','/output_config/format/schema/properties/sections/items/properties/heading/type'])('recognizes trusted path alias %s, never a dynamic field',param=>{
 expect(sanitizeProviderError({error:{type:'invalid_request_error',param}},rewriteSchema)).toMatchObject({providerSchemaPath:'output_config.format.schema.properties.sections.items.properties.heading.type'});
 expect(sanitizeProviderError({error:{type:'invalid_request_error',param:param.replace('sections','PRIVATE')}},rewriteSchema)).not.toHaveProperty('providerSchemaPath');
});

it("retains only an allowlisted provider error type and cited static schema path, never the message", async () => {
  const request = vi.fn().mockResolvedValue(Response.json({ type: "error", error: { type: "invalid_request_error", message: "output_config.format.schema.properties.sections.items.properties.heading.type: PRIVATE_SOURCE_AND_SECRET", extra: config.key }, request_id: config.key }, { status: 400, headers: { "request-id": "req_synthetic_400" } }));
  await operationDiagnostics("rewrite", async () => {
    await expect(createClaudeProvider(config, request)("rewrite", "PRIVATE_CV", {}, rewriteSchema, new AbortController().signal)).rejects.toMatchObject({ code: "provider_request" });
    const event = diagnosticSnapshot();
    expect(event).toMatchObject({ stage: "provider_http", httpStatus: 400, providerRequestId: "req_synthetic_400", providerErrorType: "invalid_request_error", providerParameter: "output_config.format.schema", providerSchemaPath: "output_config.format.schema.properties.sections.items.properties.heading.type", providerSchemaKeyword: "type", providerErrorDetails: "available" });
    expect(JSON.stringify(event)).not.toContain("PRIVATE");
  });
  expect(request).toHaveBeenCalledOnce();
});

it("retains a cited model parameter without inferring a schema error or copying parameter values", async () => {
  const request = vi.fn().mockResolvedValue(Response.json({ type: "error", error: { type: "invalid_request_error", param: "model", message: "PRIVATE_MODEL_AND_KEY" } }, { status: 400 }));
  await operationDiagnostics("rewrite", async () => {
    await createClaudeProvider(config, request)("rewrite", "safety", {}, rewriteSchema, new AbortController().signal).catch(() => {});
    expect(diagnosticSnapshot()).toMatchObject({ providerErrorType: "invalid_request_error", providerParameter: "model" });
    expect(diagnosticSnapshot()).not.toHaveProperty("providerSchemaPath"); expect(JSON.stringify(diagnosticSnapshot())).not.toContain("PRIVATE");
  });
});
it.each([
  { type: "PRIVATE_TYPE", message: "PRIVATE_CV_PRIVATE_KEY", param: "PRIVATE_PARAM", note: "PRIVATE" },
  { type: "invalid_request_error", message: "output_config.format.schema.properties.PRIVATE_SOURCE: PRIVATE", param: "/properties/PRIVATE_SOURCE" },
])("never retains unknown types, dynamic schema fields, param values or free-text messages %#", error => {
  const summary = sanitizeProviderError({ error }, rewriteSchema);
  expect(JSON.stringify(summary)).not.toContain("PRIVATE"); expect(summary).not.toHaveProperty("providerSchemaPath"); expect(summary).not.toHaveProperty("providerParameter");
});
it("recognizes a cited schema JSON pointer only when present in the outgoing trusted schema", () => {
  expect(sanitizeProviderError({ error: { type: "invalid_request_error", param: "/properties/sections/items/properties/heading/type", message: "PRIVATE" } }, rewriteSchema)).toMatchObject({ providerSchemaPath: "output_config.format.schema.properties.sections.items.properties.heading.type", providerSchemaKeyword: "type" });
  expect(sanitizeProviderError({ error: { type: "invalid_request_error", param: "/properties/notes/items/pattern", message: "PRIVATE" } }, rewriteSchema)).not.toHaveProperty("providerSchemaPath");
  expect(sanitizeProviderError({ error: { type: "invalid_request_error", param: "/properties/notes/items/pattern", message: "PRIVATE" } }, scanSchema)).not.toHaveProperty("providerSchemaPath");
});
it.each([
  new Response("PRIVATE_NON_JSON", { status: 400 }),
  new Response("x".repeat(8193), { status: 400 }),
  Response.json({ message: "PRIVATE", error: null }, { status: 400 }),
])("preserves HTTP failure when bounded error extraction is unavailable %#", async response => {
  const request = vi.fn().mockResolvedValue(response);
  await operationDiagnostics("rewrite", async () => {
    await expect(createClaudeProvider(config, request)("rewrite", "safety", {}, rewriteSchema, new AbortController().signal)).rejects.toMatchObject({ code: "provider_request" });
    expect(diagnosticSnapshot()).toMatchObject({ stage: "provider_http", httpStatus: 400, providerErrorDetails: "unavailable" }); expect(JSON.stringify(diagnosticSnapshot())).not.toContain("PRIVATE");
  });
  expect(request).toHaveBeenCalledOnce();
});
it("bounds a stalled error body separately without reclassifying a known HTTP 400 as a timeout or retrying", async () => {
  const original = AbortSignal.timeout.bind(AbortSignal);
  const timer = vi.spyOn(AbortSignal, "timeout").mockImplementation(ms => ms === 2000 ? AbortSignal.abort() : original(ms));
  try {
    const cancel = vi.fn(); const request = vi.fn().mockResolvedValue(new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{"error":')); }, cancel }), { status: 400 }));
    await operationDiagnostics("rewrite", async () => {
      await expect(createClaudeProvider(config, request)("rewrite", "safety", {}, rewriteSchema, new AbortController().signal)).rejects.toMatchObject({ code: "provider_request" });
      expect(diagnosticSnapshot()).toMatchObject({ stage: "provider_http", httpStatus: 400, providerErrorDetails: "unavailable" });
    });
    expect(timer).toHaveBeenCalledWith(2000); expect(request).toHaveBeenCalledOnce(); expect(cancel).toHaveBeenCalled();
  } finally { timer.mockRestore(); }
});
it("keeps both wire schemas free of the rejected pattern feature and unsupported bounds", () => {
  function inspect(value: unknown) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach(inspect); return; }
    const node = value as Record<string, unknown>;
    for (const key of ["maxLength", "minLength", "maxItems", "minimum", "maximum", "output_format"]) expect(node).not.toHaveProperty(key);
    if (node.type === "object") { expect(node.additionalProperties).toBe(false); expect(node.required).toEqual(Object.keys(node.properties as object)); }
    expect(node).not.toHaveProperty("pattern");
    Object.values(node).forEach(inspect);
  }
  inspect(rewriteSchema); inspect(scanSchema);
  expect(JSON.stringify(scanSchema)).not.toContain('"pattern"');
});
