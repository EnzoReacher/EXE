import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createClaudeProvider, parseClaudeEnvelope } from "./claude";
import { perform, scanSchema } from "./server";
import { selectedScan } from "./scan-selection.fixture";
import { scanCatalog, selectionSchema } from "./scan-selection";
import { rewriteSchemaFor } from "./rewrite-workflow";
import { selectedRewrite } from "./rewrite-plan.fixture";
import { completeRewriteFixture } from "./structured-rewrite.fixture";

const config = { key: "synthetic-key-do-not-display", model: "claude-haiku-4-5-20251001", origin: "http://127.0.0.1:4317" };
const cv = "Jamie Reed\njamie@example.test\nRiverside Shop, 2023–2025\nHelped customers choose products.\nMy manager maintained stock records, not me.\nI did not approve payments.\nBusiness diploma, 2023";
const jd = "Help customers select products and maintain stock records.";
const scan = { coverage: "Selected requirements only; review the rest of the job description.", findings: [
  { title: "Customer support", requirement: jd, requirementSourceId: "jd", excerptSourceId: "cv:b4", excerpt: "Helped customers choose products.", explanation: "Customer assistance is demonstrated.", nextStep: "Keep this direct example.", group: "supported", priority: "important", expectation: "required" },
  { title: "Stock records", requirement: jd, requirementSourceId: "jd", excerptSourceId: "cv:b5", excerpt: "My manager maintained stock records, not me.", explanation: "The task is attributed to the manager, not the applicant.", nextStep: "Clarify only if you have your own relevant example.", group: "unclear", priority: "important", expectation: "required" },
] };
const rewrite = { replacements: [{ lineId: "b4", original: "Helped customers choose products.", text: "Assisted customers with product selection." }], changes: ["Clearer wording."], notes: [] };
const envelope = (value: unknown) => ({ type: "message", role: "assistant", stop_reason: "end_turn", stop_sequence: null, content: [{ type: "text", text: JSON.stringify(value) }] });
const payload = { cv, jd, consent: true, scanCV: cv, scanJD: jd, scan, base: cv, instructions: "Make this clearer. Do not add experience. Add a certification only if supported.", language: "English" };
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it("uses pinned Haiku for both operations, thinking disabled, and one request per operation", async () => {
  const request = vi.fn().mockResolvedValueOnce(Response.json(envelope(selectedScan(scan)))).mockResolvedValueOnce(Response.json(envelope(completeRewriteFixture(cv, { b4: "Assisted customers with product selection." }))));
  const provider = createClaudeProvider(config, request);
  const signal = new AbortController().signal;
  expect(await perform("scan", payload, provider, signal)).toEqual(scan);
  const result = await perform("rewrite", payload, provider, signal);
  expect(result.document).toContain("Assisted customers with product selection."); expect(result.document).toContain("jamie@example.test");
  expect(result.document).toContain("My manager maintained stock records, not me."); expect(result.notes[0]).toContain("Review every fact");
  expect(request).toHaveBeenCalledTimes(2);
  for (const [index, call] of request.mock.calls.entries()) {
    expect(call[0]).toBe("https://api.anthropic.com/v1/messages");
    const options = call[1];
    expect(options).toMatchObject({ method: "POST", redirect: "error", cache: "no-store", headers: { "x-api-key": config.key, "anthropic-version": "2023-06-01" } });
    const body = JSON.parse(options.body);
    expect(body).toMatchObject({ model: config.model, max_tokens: 8000, stream: false, thinking: { type: "disabled" }, output_config: { format: { type: "json_schema", schema: index ? rewriteSchemaFor(cv) : selectionSchema(scanCatalog({cv,jd})) } } });
    expect(body.thinking).not.toHaveProperty("budget_tokens");
    expect(body.output_config).not.toHaveProperty("effort");
    expect(body.system).toContain("untrusted source DATA");
    expect(body.system).toContain("instructions faithfully");
    expect(body.system).toContain("Preserve negation, exclusions");
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[0].content).not.toContain("jamie@example.test");
    expect(body.messages[0].content).not.toContain(config.key);
    expect(body).not.toHaveProperty("tools");
    expect(body).not.toHaveProperty("temperature");
    if (index) expect(JSON.parse(body.messages[0].content).instructions).toBe(payload.instructions);
  }
});

it("discards thinking blocks without exposing them or changing structured output", () => {
  const message = envelope(scan);
  message.content.unshift({ type: "thinking", thinking: "private internal reasoning", signature: "synthetic" } as never);
  expect(parseClaudeEnvelope(message)).toEqual(scan);
});

it.each(["max_tokens", "refusal", "tool_use", "pause_turn", "stop_sequence", null])("rejects %s even if the text contains complete JSON", async stop_reason => {
  const request = vi.fn().mockResolvedValue(Response.json({ ...envelope(scan), stop_reason }));
  await expect(createClaudeProvider(config, request)("test", "safety", {}, scanSchema, new AbortController().signal)).rejects.toMatchObject({ code: "provider_output" });
  expect(request).toHaveBeenCalledOnce();
});

it.each([null, [], {}, { ...envelope(scan), content: [null] }, { ...envelope(scan), content: [{ type: "refusal", text: "private refusal" }] }, { ...envelope(scan), content: [{ type: "text", text: "{" }] }, { ...envelope(scan), content: [{ type: "text", text: "x".repeat(60001) }] }, { ...envelope(scan), content: [...envelope(scan).content, ...envelope(scan).content] }])("rejects malformed envelopes without accepting raw text, case %#", value => {
  expect(() => parseClaudeEnvelope(value)).toThrow(/could not be verified/);
});

it.each([null, { ...scan, findings: [null] }, { ...scan, findings: [{ ...scan.findings[0], excerpt: "Invented evidence" }] }, { ...scan, findings: [{ ...scan.findings[0], excerpt: "maintained stock records", group: "supported" }] }])("validates nested Scan evidence after Claude JSON parsing", async value => {
  const request = vi.fn().mockResolvedValue(Response.json(envelope(value)));
  await expect(perform("scan", payload, createClaudeProvider(config, request), new AbortController().signal)).rejects.toThrow();
  expect(request).toHaveBeenCalledOnce();
});

it.each([
  { ...rewrite, replacements: [null] },
  { ...rewrite, replacements: [{ lineId: "b5", original: "My manager maintained stock records, not me.", text: "Maintained stock records." }] },
  { ...rewrite, replacements: [{ lineId: "b6", original: "I did not approve payments.", text: "Approved payments." }] },
  { ...rewrite, replacements: [{ ...rewrite.replacements[0], text: "Assisted 50 customers." }] },
])("rejects malformed nested Rewrite, reassigned work, lost negation and invented numbers", async value => {
  const request = vi.fn().mockResolvedValue(Response.json(envelope(selectedRewrite(value))));
  await expect(perform("rewrite", payload, createClaudeProvider(config, request), new AbortController().signal)).rejects.toThrow();
  expect(request).toHaveBeenCalledOnce();
});

it.each([401, 403, 429, 400, 404, 500, 529])("sanitizes HTTP %s and never retries or falls back", async status => {
  const request = vi.fn().mockResolvedValue(new Response(`private provider message ${config.key}`, { status, headers: { "retry-after": "0" } }));
  const error = await createClaudeProvider(config, request)("test", "safety", {}, scanSchema, new AbortController().signal).catch(e => e);
  expect(error).toHaveProperty("code", status === 401 || status === 403 ? "provider_auth" : status === 429 ? "provider_rate" : status === 404 ? "provider_model" : status === 400 ? "provider_request" : "provider");
  expect(String((error as Error).message)).not.toContain(config.key); expect(String((error as Error).message)).not.toContain("private provider");
  expect(request).toHaveBeenCalledOnce();
});

it("bounds a stalled provider body with cancellation, without a retry", async () => {
  const controller = new AbortController();
  const cancel = vi.fn();
  const request = vi.fn().mockResolvedValue(new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"type":"message"')); }, cancel })));
  const pending = createClaudeProvider(config, request)("test", "safety", {}, scanSchema, controller.signal);
  await Promise.resolve(); controller.abort();
  await expect(pending).rejects.toThrow(/cancelled or timed out/);
  expect(cancel).toHaveBeenCalled(); expect(request).toHaveBeenCalledOnce();
});

it("caps duration at 45 seconds even without a caller deadline", async () => {
  const timeout = vi.spyOn(AbortSignal, "timeout");
  const controller = new AbortController(); timeout.mockReturnValue(controller.signal);
  const request = vi.fn((_url, options) => new Promise<Response>((_resolve, reject) => options?.signal?.addEventListener("abort", () => reject(new Error(config.key)), { once: true })));
  const pending = createClaudeProvider(config, request)("test", "safety", {}, scanSchema, new AbortController().signal);
  expect(timeout).toHaveBeenCalledWith(45000); controller.abort();
  await expect(pending).rejects.toThrow(/cancelled or timed out/);
  expect(request).toHaveBeenCalledOnce(); timeout.mockRestore();
});

it("does not send an already-cancelled request", async () => {
  const request = vi.fn(); const controller = new AbortController(); controller.abort();
  await expect(createClaudeProvider(config, request)("test", "safety", {}, scanSchema, controller.signal)).rejects.toThrow(/cancelled/);
  expect(request).not.toHaveBeenCalled();
});

it("bounds response bytes without returning provider content", async () => {
  const request = vi.fn().mockResolvedValue(new Response("x".repeat(160001)));
  await expect(createClaudeProvider(config, request)("test", "safety", {}, scanSchema, new AbortController().signal)).rejects.toMatchObject({ code: "provider_output" });
  expect(request).toHaveBeenCalledOnce();
});
