import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createClaudeProvider } from "./claude";
import { operationDiagnostics, reportDiagnostic, diagnosticField, diagnosticHttp, diagnosticStage, diagnosticProviderError, diagnosticSnapshot, diagnosticRequest } from "./diagnostics";
const config = { key: "PRIVATE_SYNTHETIC_KEY", model: "claude-haiku-4-5-20251001", origin: "http://127.0.0.1:4317" };
afterEach(() => vi.restoreAllMocks());
it('independently allowlists provider classification and reason signals',async()=>{
 await operationDiagnostics('rewrite',async()=>{
  diagnosticProviderError({providerErrorDetails:'available',providerErrorClass:'PRIVATE',providerErrorSignals:['regex','PRIVATE','pattern','regex'],message:'PRIVATE'} as never);
  expect(diagnosticSnapshot()).toMatchObject({providerErrorSignals:['regex','pattern']});expect(diagnosticSnapshot()).not.toHaveProperty('providerErrorClass');expect(JSON.stringify(diagnosticSnapshot())).not.toContain('PRIVATE');
 });
});
it.each([
  { stage: "provider_http", response: () => new Response("PRIVATE_PROVIDER_ERROR", { status: 401 }) },
  { stage: "provider_json", response: () => new Response("PRIVATE_NOT_JSON", { status: 200 }) },
  { stage: "provider_envelope", response: () => Response.json({ type: "message", role: "assistant", stop_reason: "max_tokens", content: [{ type: "text", text: "PRIVATE_INCOMPLETE_OUTPUT" }] }) },
  { stage: "structured_json", response: () => Response.json({ type: "message", role: "assistant", stop_reason: "end_turn", content: [{ type: "text", text: "PRIVATE_NOT_STRUCTURED_JSON" }] }) },
])("distinguishes $stage without recording content or internal errors", async ({ stage, response }) => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {}); const request = vi.fn().mockResolvedValue(response());
  await operationDiagnostics("scan", async () => {
    await createClaudeProvider(config, request)("scan", "PRIVATE_CV_AND_JD", {}, {}, new AbortController().signal).catch(() => reportDiagnostic("rejected", "provider_failure"));
  });
  expect(request).toHaveBeenCalledOnce(); expect(log).toHaveBeenCalledOnce(); const record = JSON.parse(log.mock.calls[0][1]); expect(record.stage).toBe(stage); expect(record.reservation).toBe("not_reserved"); expect(JSON.stringify(record)).not.toContain("PRIVATE_");
});
it("allowlists metadata and reports at most once per request", async () => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  await operationDiagnostics("rewrite", async () => { diagnosticHttp(200, "Bearer_PRIVATE_TOKEN"); diagnosticField("findings[0].PRIVATE_CV"); reportDiagnostic("rejected", "provider_failure"); reportDiagnostic("rejected", "preflight_rejected"); });
  expect(log).toHaveBeenCalledOnce(); const record = JSON.parse(log.mock.calls[0][1]); expect(record).not.toHaveProperty("providerRequestId"); expect(record).not.toHaveProperty("fieldPath"); expect(JSON.stringify(record)).not.toContain("PRIVATE");
});
it("isolates simultaneous operation metadata", async () => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  await Promise.all(["scan", "rewrite"].map(operation => operationDiagnostics(operation as "scan" | "rewrite", async () => {
    diagnosticStage("provider_http"); diagnosticHttp(200, `req_${operation}`); await Promise.resolve(); reportDiagnostic("rejected", "provider_failure");
  })));
  const records = log.mock.calls.map(call => JSON.parse(call[1])); expect(records).toHaveLength(2); for (const record of records) expect(record.providerRequestId).toBe(`req_${record.operation}`); expect(new Set(records.map(record => record.reference)).size).toBe(2);
});
it.each(["requirementSourceId", "excerptSourceId"])("allowlists the fixed %s path, not the rejected source identifier", async field => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  await operationDiagnostics("scan", async () => { diagnosticStage("grounding"); diagnosticField(`findings[2].${field}`, "line_reference"); reportDiagnostic("rejected", "grounding"); });
  expect(JSON.parse(log.mock.calls[0][1])).toMatchObject({ stage: "grounding", fieldPath: `findings[2].${field}`, validationRule: "line_reference" });
});
it("rejects non-allowlisted actual type/constraint metadata without logging values or arbitrary error properties", async () => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  await operationDiagnostics("rewrite", async () => {
    diagnosticField("notes[0]", "field_shape", { actualType: "PRIVATE_NOTE" as never, constraint: "PRIVATE_NOTE" as never, text: "PRIVATE_NOTE" } as never);
    reportDiagnostic("rejected", "output_schema");
  });
  const event = JSON.parse(log.mock.calls[0][1]); expect(event).not.toHaveProperty("actualType"); expect(event).not.toHaveProperty("constraint"); expect(JSON.stringify(event)).not.toContain("PRIVATE");
});
it('correlates only canonical request UUIDs and keeps coverage constraints without source or rejected values',async()=>{
 const log=vi.spyOn(console,'info').mockImplementation(()=>{});
 await operationDiagnostics('scan',async()=>{diagnosticRequest('PRIVATE_CV_OR_CREDENTIAL');expect(diagnosticSnapshot()).not.toHaveProperty('requestId');diagnosticRequest('11111111-aaaa-4111-8111-111111111111');diagnosticField('coverage','field_shape',{actualType:'string',constraint:'max_length',value:'PRIVATE_OUTPUT'} as never);reportDiagnostic('rejected','output_schema');});
 const event=JSON.parse(log.mock.calls[0][1]);expect(event).toMatchObject({requestId:'11111111-aaaa-4111-8111-111111111111',fieldPath:'coverage',validationRule:'field_shape',actualType:'string',constraint:'max_length'});expect(JSON.stringify(event)).not.toContain('PRIVATE');
});
