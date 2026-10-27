import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ getCurrentUser: vi.fn() }));
vi.mock("./usage", () => ({ reserveUsage: vi.fn() }));
const clock = vi.hoisted(() => ({ now: 1000000 }));
vi.mock("@/lib/experience-translator/server/requestcontrols", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/experience-translator/server/requestcontrols")>();
  return { ...actual, Controls: class extends actual.Controls { constructor() { super(() => clock.now); } } };
});
import { perform, handleOperation } from "./server";
import { getCurrentUser } from "@/lib/supabase/server";
import { reserveUsage } from "./usage";
import { LiveError } from "@/lib/experience-translator/server/validation";
import { transmission } from "./provider";
import { examples } from "@/lib/cv-review/examples";
import { selectedScan } from "./scan-selection.fixture";
import { completeRewriteFixture } from "./structured-rewrite.fixture";
const cv = "Nguyễn An\na@example.test\nExperience\nHelped customers.";
const jd = "Customer service required.";
const scan = { coverage: "One requirement checked.", findings: [{ title: "Customer service", requirement: jd, requirementSourceId: "jd", excerptSourceId: "cv:b4", excerpt: "Helped customers.", explanation: "An example is supplied.", nextStep: "Describe your direct work.", priority: "important", expectation: "required", group: "supported" }] };
afterEach(() => { clock.now += 61000; vi.resetAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("scans only once, separately from rewriting, with contact data excluded", async () => {
  const provider = vi.fn().mockResolvedValue(selectedScan(scan));
  expect(await perform("scan", { cv, jd, consent: true }, provider, new AbortController().signal)).toEqual(scan);
  expect(provider).toHaveBeenCalledOnce(); expect(provider.mock.calls[0][0]).toBe("ownpath_scan");
  expect(provider.mock.calls[0][1]).toContain("DO NOT rewrite"); expect(JSON.stringify(provider.mock.calls[0][2])).not.toContain("a@example.test");
});
it("rewrites once from the current edited base and retains local contact details", async () => {
  const base = cv.replace("Helped customers.", "Handled customer returns.");
  const provider = vi.fn().mockResolvedValue(completeRewriteFixture(base, { b4: "Assisted customers with returns." }));
  const result = await perform("rewrite", { cv, jd, scanCV: cv, scanJD: jd, scan, base, consent: true, instructions: "Keep it concise. Make me look senior.", language: "English" }, provider, new AbortController().signal);
  expect(result.document).toContain("Assisted customers with returns."); expect(result.document).toContain("a@example.test"); expect(result.format).toBe("structured-cv-v1");
  expect(provider).toHaveBeenCalledOnce(); expect(provider.mock.calls[0][1]).toContain("'Make me senior' is not a fact");
});
it("rejects no-consent and stale scan before provider calls", async () => {
  const provider = vi.fn(); const signal = new AbortController().signal;
  await expect(perform("scan", { cv, jd, consent: false }, provider, signal)).rejects.toThrow();
  await expect(perform("rewrite", { cv, jd, scanCV: "older", scanJD: jd, consent: true }, provider, signal)).rejects.toThrow(/again/);
  expect(provider).not.toHaveBeenCalled();
});
it("protects both operations before configuration and returns truthful missing configuration", async () => {
  vi.mocked(getCurrentUser).mockResolvedValue(null);
  for (const operation of ["scan", "rewrite"] as const) expect((await handleOperation(new Request("http://127.0.0.1:4317"), operation)).status).toBe(401);
  vi.mocked(getCurrentUser).mockResolvedValue({ id: "synthetic" } as Awaited<ReturnType<typeof getCurrentUser>>); vi.stubEnv("OWNPATH_OPENAI_LOCAL_ENABLED", "false");
  const result = await handleOperation(new Request("http://127.0.0.1:4317"), "scan"); expect(result.status).toBe(503); expect((await result.json()).error.message).toBe("AI is not configured for this local workspace. Ask the site owner to check the connection. Your work is kept.");
});
function configuredRequest(id: string) {
  vi.stubEnv("OWNPATH_OPENAI_LOCAL_ENABLED", "true"); vi.stubEnv("OWNPATH_OPENAI_LOCAL_ORIGIN", "http://127.0.0.1:4317"); vi.stubEnv("OPENAI_API_KEY", "synthetic-unit-key"); vi.stubEnv("OPENAI_MODEL", "synthetic-unit-model");
  vi.mocked(getCurrentUser).mockResolvedValue({ id: "synthetic-quota-owner" } as Awaited<ReturnType<typeof getCurrentUser>>);
  return new Request("http://127.0.0.1:4317/api/cv-review/scan", { method: "POST", headers: { host: "127.0.0.1:4317", origin: "http://127.0.0.1:4317", "content-type": "application/json" }, body: JSON.stringify({ cv, jd, consent: true, consentPurpose: transmission().purpose, requestId: id }) });
}
it("missing durable reservations prevents any provider attempt", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch); vi.mocked(reserveUsage).mockRejectedValue(new LiveError("setup", "Usage setup required.", 503));
  expect((await handleOperation(configuredRequest("missing-quota-request"), "scan")).status).toBe(503); expect(fetch).not.toHaveBeenCalled();
});
it("duplicate current requests share one reservation and one controlled provider attempt", async () => {
  const finish = vi.fn(); vi.mocked(reserveUsage).mockResolvedValue(finish);
  const fetch = vi.fn().mockImplementation(async () => Response.json({ status: "completed", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify(selectedScan(scan)) }] }] })); vi.stubGlobal("fetch", fetch);
  const replies = await Promise.all([handleOperation(configuredRequest("duplicate-quota-request"), "scan"), handleOperation(configuredRequest("duplicate-quota-request"), "scan")]);
  expect(replies.map(r => r.status)).toEqual([200, 200]); expect(reserveUsage).toHaveBeenCalledOnce(); expect(fetch).toHaveBeenCalledOnce(); expect(finish).toHaveBeenCalledWith("completed");
});
it("ambiguous provider failure keeps an unknown reservation without retrying", async () => {
  const finish = vi.fn(); vi.mocked(reserveUsage).mockResolvedValue(finish); const fetch = vi.fn().mockRejectedValue(new Error("synthetic disconnect")); vi.stubGlobal("fetch", fetch);
  expect((await handleOperation(configuredRequest("unknown-quota-request"), "scan")).status).toBe(502); expect(fetch).toHaveBeenCalledOnce(); expect(finish).toHaveBeenCalledWith("unknown");
});

function claudeRequest(id: string, overrides: Record<string, unknown> = {}, operation = "scan", signal?: AbortSignal) {
  vi.stubEnv("OWNPATH_SCAN_PROVIDER", "anthropic"); vi.stubEnv("OWNPATH_CLAUDE_LOCAL_ENABLED", "true");
  vi.stubEnv("OWNPATH_CLAUDE_LOCAL_ORIGIN", "http://127.0.0.1:4317"); vi.stubEnv("ANTHROPIC_API_KEY", "synthetic-unit-key");
  vi.stubEnv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001"); vi.stubEnv("OWNPATH_BILLING_MODE", "OFF");
  vi.mocked(getCurrentUser).mockResolvedValue({ id: "synthetic-claude-owner" } as Awaited<ReturnType<typeof getCurrentUser>>);
  return new Request(`http://127.0.0.1:4317/api/cv-review/${operation}`, { method: "POST", signal, headers: { host: "127.0.0.1:4317", origin: "http://127.0.0.1:4317", "content-type": "application/json" }, body: JSON.stringify({ cv, jd, consent: true, consentPurpose: transmission().purpose, requestId: id, ...overrides }) });
}
const claudeEnvelope = (value: unknown) => ({ type: "message", role: "assistant", stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(value) }] });

it("rejects an unselectable JD before reservation or provider dispatch", async () => {
  const request = vi.fn(); vi.stubGlobal("fetch", request);
  const response = await handleOperation(claudeRequest("unselectable-requirements-fixture", { jd: "x".repeat(1201) }), "scan");
  expect(response.status).toBe(400); expect((await response.json()).error.message).toContain("line breaks");
  expect(reserveUsage).not.toHaveBeenCalled(); expect(request).not.toHaveBeenCalled();
});
it.each(["unknown_reference", "generated_quote"])("rejects an entire source-selection result after provider 200 on %s, preserving unknown and safe correlation", async kind => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  try {
    const finish = vi.fn(); vi.mocked(reserveUsage).mockResolvedValue(finish);
    const valid = selectedScan(scan), invalid = { ...valid.findings[0], ...(kind === "unknown_reference" ? { excerptSourceId: "cv:PRIVATE_UNKNOWN" } : { excerpt: "PRIVATE_INVENTED_EXCEL_IMPORT_EXPORT" }) };
    const request = vi.fn().mockResolvedValue(Response.json(claudeEnvelope({ ...valid, findings: [valid.findings[0], invalid] }), { headers: { "request-id": "req_offline_selection" } })); vi.stubGlobal("fetch", request);
    const response = await handleOperation(claudeRequest("33333333-aaaa-4333-8333-333333333333"), "scan");
    expect(response.status).toBe(502); const body = await response.json(); expect(body.error.code).toBe("result_rejected"); expect(body).not.toHaveProperty("findings");
    expect(finish).toHaveBeenCalledExactlyOnceWith("unknown"); expect(request).toHaveBeenCalledOnce(); expect(reserveUsage).toHaveBeenCalledOnce();
    const event = JSON.parse(log.mock.calls.find(call => call[0] === "ownpath.ai")![1]);
    expect(event).toMatchObject({ requestId: "33333333-aaaa-4333-8333-333333333333", providerRequestId: "req_offline_selection", httpStatus: 200, stopReason: "end_turn", reservation: "unknown", actualType: kind === "unknown_reference" ? "string" : "object", constraint: kind === "unknown_reference" ? "source_reference" : "allowed_fields", fieldPath: kind === "unknown_reference" ? "findings[1].excerptSourceId" : "findings[1]" });
    expect(JSON.stringify(event)).not.toContain("PRIVATE"); expect(JSON.stringify(event)).not.toContain(cv);
  } finally { log.mockRestore(); }
});

it.each(["category", "source"])("rejects the whole synthetic Sales Scan on %s conflict, preserving unknown and sanitized diagnostics", async kind => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  try {
    const finish = vi.fn(); vi.mocked(reserveUsage).mockResolvedValue(finish);
    const good = { ...selectedScan(scan).findings[0], excerptSourceId: "", group: "not_found" };
    const invalid = { ...good, excerptSourceId: kind === "category" ? "cv:b5" : "cv:b999", group: kind === "category" ? "not_found" : "unclear" };
    const request = vi.fn().mockResolvedValue(Response.json(claudeEnvelope({ coverage: "Selected requirements only.", findings: [good, good, invalid] }))); vi.stubGlobal("fetch", request);
    const response = await handleOperation(claudeRequest(`sales-conflict-${kind}-fixture`, { cv: examples.Sales, jd: "Preferred: supplier negotiation experience." }), "scan");
    expect(response.status).toBe(502);
    const body = await response.json(); expect(body).not.toHaveProperty("findings"); expect(body.error.code).toBe("result_rejected");
    expect(body.error.message).toContain("No new CV result was applied"); expect(body.error.message).toContain("usage is retained");
    expect(finish).toHaveBeenCalledExactlyOnceWith("unknown"); expect(request).toHaveBeenCalledOnce();
    const events = log.mock.calls.map(call => call.join(" ")).join("\n");
    expect(events).toContain('"stage":"grounding"'); expect(events).toContain('"reservation":"unknown"');
    expect(events).toContain(`"validationRule":"${kind === "category" ? "not_found_excerpt" : "line_reference"}"`);
    expect(events).toContain(`"fieldPath":"findings[2].${kind === "category" ? "excerpt" : "excerptSourceId"}"`); expect(events).not.toContain(examples.Sales);
  } finally { log.mockRestore(); }
});

it("Claude duplicate requests share the existing reservation and attempt", async () => {
  const finish = vi.fn(); vi.mocked(reserveUsage).mockResolvedValue(finish);
  const request = vi.fn().mockResolvedValue(Response.json(claudeEnvelope(selectedScan(scan)))); vi.stubGlobal("fetch", request);
  const replies = await Promise.all([handleOperation(claudeRequest("claude-duplicate-request"), "scan"), handleOperation(claudeRequest("claude-duplicate-request"), "scan")]);
  expect(replies.map(r => r.status)).toEqual([200, 200]); expect(reserveUsage).toHaveBeenCalledOnce(); expect(request).toHaveBeenCalledOnce(); expect(finish).toHaveBeenCalledWith("completed");
  expect(request.mock.calls[0][0]).toBe("https://api.anthropic.com/v1/messages");
});
it("rejects obsolete recipient acknowledgement and foreign origins before reservation or transmission", async () => {
  const request = vi.fn(); vi.stubGlobal("fetch", request);
  const old = await handleOperation(claudeRequest("claude-old-consent-id", { consentPurpose: "scan-rewrite-v1-openai" }), "scan");
  expect(old.status).toBe(409); expect((await old.json()).error.code).toBe("consent_changed");
  const foreign = claudeRequest("claude-foreign-origin"); foreign.headers.set("origin", "https://example.test");
  expect((await handleOperation(foreign, "scan")).status).toBe(403);
  expect(reserveUsage).not.toHaveBeenCalled(); expect(request).not.toHaveBeenCalled();
});
it.each(["duplicate", "plan_limit", "reconcile"])("Claude does not bypass durable %s rejection", async code => {
  vi.mocked(reserveUsage).mockRejectedValue(new LiveError(code, "No request permitted.", 409));
  const request = vi.fn(); vi.stubGlobal("fetch", request);
  expect((await handleOperation(claudeRequest(`claude-reservation-${code.replaceAll("_", "-")}`), "scan")).status).toBe(409);
  expect(request).not.toHaveBeenCalled();
});
it("Claude malformed nested output fails safely after exactly one attempt", async () => {
  const finish = vi.fn(); vi.mocked(reserveUsage).mockResolvedValue(finish);
  const request = vi.fn().mockResolvedValue(Response.json(claudeEnvelope({ ...scan, findings: [null] }))); vi.stubGlobal("fetch", request);
  const result = await handleOperation(claudeRequest("claude-malformed-nested"), "scan");
  expect(result.status).toBe(502); expect(JSON.stringify(await result.json())).not.toContain("synthetic-unit-key");
  expect(request).toHaveBeenCalledOnce(); expect(finish).toHaveBeenCalledWith("unknown");
});
it("holds post-dispatch grounding rejection rather than releasing possibly billed usage", async () => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  try {
    const finish = vi.fn(); vi.mocked(reserveUsage).mockResolvedValue(finish);
    const request = vi.fn().mockResolvedValue(Response.json(claudeEnvelope({ ...selectedScan(scan), findings: [{ ...selectedScan(scan).findings[0], excerptSourceId: "cv:PRIVATE_SYNTHETIC_OUTPUT_NEVER_LOG" }] }), { headers: { "request-id": "req_synthetic_grounding" } })); vi.stubGlobal("fetch", request);
    const response = await handleOperation(claudeRequest("claude-grounding-held-fixture"), "scan");
    expect(finish).toHaveBeenCalledWith("unknown"); expect(finish).not.toHaveBeenCalledWith("failed"); expect(request).toHaveBeenCalledOnce();
    expect(response.status).toBe(502); const publicBody = JSON.stringify(await response.json()); expect(publicBody).toContain("result_rejected"); expect(publicBody).not.toContain("retry"); expect(finish).not.toHaveBeenCalledWith("completed");
    const evidence = log.mock.calls.map(call => call.join(" ")).join("\n"); expect(evidence).toContain('"stage":"grounding"'); expect(evidence).toContain('"fieldPath":"findings[0].excerptSourceId"'); expect(evidence).toContain('"validationRule":"line_reference"'); expect(evidence).toContain('"httpStatus":200'); expect(evidence).toContain("req_synthetic_grounding"); expect(evidence).not.toContain("PRIVATE_SYNTHETIC_OUTPUT"); expect(evidence).not.toContain(cv); expect(evidence).not.toContain("synthetic-unit-key");
  } finally { log.mockRestore(); }
});
it("does not claim completion or retry finalization after unconfirmed acknowledgement", async () => {
  const finish = vi.fn().mockRejectedValue(new LiveError("usage_acknowledgement", "Safe acknowledgement failure", 503)); vi.mocked(reserveUsage).mockResolvedValue(finish);
  const request = vi.fn().mockResolvedValue(Response.json(claudeEnvelope(selectedScan(scan)))); vi.stubGlobal("fetch", request);
  const response = await handleOperation(claudeRequest("claude-finish-unconfirmed"), "scan");
  expect(response.status).toBe(503); expect((await response.json()).error.code).toBe("usage_acknowledgement"); expect(finish).toHaveBeenCalledOnce(); expect(finish).toHaveBeenCalledWith("completed"); expect(request).toHaveBeenCalledOnce();
});
it("Claude truncation keeps uncertain usage held, without a second call", async () => {
  const finish = vi.fn(); vi.mocked(reserveUsage).mockResolvedValue(finish);
  const request = vi.fn().mockResolvedValue(Response.json({ ...claudeEnvelope(scan), stop_reason: "max_tokens" })); vi.stubGlobal("fetch", request);
  expect((await handleOperation(claudeRequest("claude-truncated-output"), "scan")).status).toBe(502);
  expect(request).toHaveBeenCalledOnce(); expect(finish).toHaveBeenCalledWith("unknown");
});
it("Claude cancellation retains unknown usage and never exposes raw abort details", async () => {
  const finish = vi.fn(); vi.mocked(reserveUsage).mockResolvedValue(finish); const controller = new AbortController();
  const request = vi.fn((_url, options) => new Promise<Response>((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new Error("private synthetic provider detail")), { once: true });
  })); vi.stubGlobal("fetch", request);
  const pending = handleOperation(claudeRequest("claude-cancelled-request", {}, "scan", controller.signal), "scan");
  await vi.waitFor(() => expect(request).toHaveBeenCalledOnce()); controller.abort();
  const reply = await pending; expect(reply.status).toBe(502); expect(JSON.stringify(await reply.json())).not.toContain("private synthetic");
  expect(finish).toHaveBeenCalledWith("unknown"); expect(request).toHaveBeenCalledOnce();
});
it("Claude Rewrite uses the edited base, preserves local identity and the complete CV", async () => {
  const finish = vi.fn(); vi.mocked(reserveUsage).mockResolvedValue(finish);
  const base = cv.replace("Helped customers.", "Handled customer returns.");
  const request = vi.fn().mockResolvedValue(Response.json(claudeEnvelope(completeRewriteFixture(base, { b4: "Assisted customers with returns." })))); vi.stubGlobal("fetch", request);
  const response = await handleOperation(claudeRequest("claude-rewrite-edited", { scan, scanCV: cv, scanJD: jd, base, instructions: "Keep it concise without adding qualifications.", language: "English" }, "rewrite"), "rewrite");
  expect(response.status).toBe(200); const result = await response.json(); expect(result.document).toContain("Assisted customers with returns."); expect(result.document).toContain("a@example.test");
  expect(request).toHaveBeenCalledOnce(); expect(finish).toHaveBeenCalledWith("completed");
});
it("rejects a Rewrite base with no nonblank shareable units before reservation or transport", async () => {
  const request = vi.fn(); vi.stubGlobal("fetch", request);
  const response = await handleOperation(claudeRequest("rewrite-private-base-fixture", { scan, scanCV: cv, scanJD: jd, base: "Contact\nEmail: private@example.test", instructions: "Keep the source facts.", language: "English" }, "rewrite"), "rewrite");
  expect(response.status).toBe(422); expect((await response.json()).error.code).toBe("invalid_input");
  expect(reserveUsage).not.toHaveBeenCalled(); expect(request).not.toHaveBeenCalled();
});
it.each([false, true])("checks the entire structured CV before finalization; ninth-entry invented fact=%s", async invented => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  try {
    const prefix = "Experience\n" + Array(9).fill("Handled customer enquiries and maintained paper records.").join("\n") + "\nAdditional context\n";
    const shortBase = prefix + "x".repeat(1859 - prefix.length); // Fictional measured fixture only.
    const output = completeRewriteFixture(shortBase, Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`b${i + 2}`, i === 8 && invented ? "Used Excel for customer reports." : "Assisted with customer enquiries and maintained paper records."])));
    const finish = vi.fn(); vi.mocked(reserveUsage).mockResolvedValue(finish);
    const request = vi.fn().mockResolvedValue(Response.json(claudeEnvelope(output), { headers: { "request-id": "req_offline_ninth_plan" } })); vi.stubGlobal("fetch", request);
    const id = `66666666-aaaa-4666-8666-${invented ? "111111111111" : "222222222222"}`;
    const response = await handleOperation(claudeRequest(id, { cv: shortBase, scan: { coverage: "Selected requirements.", findings: [] }, scanCV: shortBase, scanJD: jd, base: shortBase, instructions: "Preserve all source facts.", language: "English" }, "rewrite"), "rewrite");
    expect(request).toHaveBeenCalledOnce(); expect(reserveUsage).toHaveBeenCalledOnce();
    if (invented) {
      expect(response.status).toBe(502); const body = await response.json(); expect(body.error.code).toBe("result_rejected"); expect(body).not.toHaveProperty("document");
      expect(finish).toHaveBeenCalledExactlyOnceWith("unknown");
      const event = JSON.parse(log.mock.calls.find(call => call[0] === "ownpath.ai")![1]);
      expect(event).toMatchObject({ requestId: id, providerRequestId: "req_offline_ninth_plan", stage: "grounding", fieldPath: "sections[0].entries[8]", validationRule: "rewrite_guard", httpStatus: 200, stopReason: "end_turn", reservation: "unknown" });
      expect(JSON.stringify(event)).not.toContain("Used Excel"); expect(JSON.stringify(event)).not.toContain(shortBase);
    } else {
      expect(response.status).toBe(200); const result = await response.json(); expect(result.cv.sections[0].entries).toHaveLength(11);
      expect(result).not.toHaveProperty("replacements");
      expect(result.document).toContain("Additional context\n"); expect(result.changes[0]).toContain("complete CV");
      expect(finish).toHaveBeenCalledExactlyOnceWith("completed");
    }
  } finally { log.mockRestore(); }
});
it.each([
  { note: { text: "PRIVATE_NOTE_NEVER_LOG" }, actualType: "object", constraint: "type" },
  { note: "", actualType: "string", constraint: "non_blank" },
  { note: "PRIVATE_NOTE_NEVER_LOG".repeat(40), actualType: "string", constraint: "max_length" },
])("rejects forbidden model notes ($constraint) without dropping them or weakening the wire contract", async ({ note, constraint }) => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  try {
    const finish = vi.fn(); vi.mocked(reserveUsage).mockResolvedValue(finish);
    const request = vi.fn().mockResolvedValue(Response.json(claudeEnvelope({ replacements: [], changes: [], notes: [note] }))); vi.stubGlobal("fetch", request);
    const response = await handleOperation(claudeRequest(`rewrite-note-${constraint.replaceAll("_", "-")}-fixture`, { scan, scanCV: cv, scanJD: jd, base: cv, instructions: "Keep my direct responsibilities.", language: "English" }, "rewrite"), "rewrite");
    expect(response.status).toBe(502); const body = await response.json(); expect(body.error.code).toBe("result_rejected"); expect(body).not.toHaveProperty("document"); expect(body).not.toHaveProperty("notes");
    expect(finish).not.toHaveBeenCalledWith("completed"); expect(finish).not.toHaveBeenCalledWith("failed");
    expect(reserveUsage).toHaveBeenCalledExactlyOnceWith(expect.any(String), "rewrite", expect.any(String));
    expect(finish).toHaveBeenCalledExactlyOnceWith("unknown"); expect(request).toHaveBeenCalledOnce();
    const event = JSON.parse(log.mock.calls.find(call => call[0] === "ownpath.ai")![1]);
    expect(event).toMatchObject({ operation: "rewrite", stage: "output_schema", reservation: "unknown", httpStatus: 200, stopReason: "end_turn", fieldPath: "$", validationRule: "field_shape", actualType: "object", constraint: "allowed_fields" });
    expect(JSON.stringify(event)).not.toContain("PRIVATE_NOTE"); expect(JSON.stringify(event)).not.toContain(cv); expect(JSON.stringify(event)).not.toContain("synthetic-unit-key");
  } finally { log.mockRestore(); }
});
it.each(["plan_limit", "reconcile"])("Rewrite %s rejection prevents transport, with no finish or allowance changes", async code => {
  vi.mocked(reserveUsage).mockRejectedValue(new LiveError(code, `Authoritative ${code} gate.`, 409));
  const request = vi.fn(); vi.stubGlobal("fetch", request);
  const response = await handleOperation(claudeRequest(`rewrite-blocked-${code.replaceAll("_", "-")}-fixture`, { scan, scanCV: cv, scanJD: jd, base: cv, instructions: "Keep my direct responsibilities.", language: "English" }, "rewrite"), "rewrite");
  expect(response.status).toBe(409); expect((await response.json()).error.code).toBe(code); expect(request).not.toHaveBeenCalled(); expect(reserveUsage).toHaveBeenCalledExactlyOnceWith(expect.any(String), "rewrite", expect.any(String));
});
it.each(["document", "source_reference", "allowed_fields"])("keeps Rewrite %s rejection atomic with safe UUID diagnostics and unknown usage", async kind => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  try {
    const finish = vi.fn(); vi.mocked(reserveUsage).mockResolvedValue(finish);
    const base = kind === "document" ? "Experience\n" + ["a", "b", "c", "d"].map(c => c.repeat(5000)).join("\n") : cv;
    const wire = completeRewriteFixture(base, kind === "document" ? Object.fromEntries(["a", "b", "c", "d"].map((c, i) => [`b${i + 2}`, c.repeat(6000)])) : {});
    if (kind === "source_reference") wire.sections[0].entries[0].sourceIds = ["b999"];
    const value = { ...wire, ...(kind === "allowed_fields" ? { unexpected: "PRIVATE_OUTPUT" } : {}) };
    const request = vi.fn().mockResolvedValue(Response.json(claudeEnvelope(value), { headers: { "request-id": "req_offline_rewrite_contract" } })); vi.stubGlobal("fetch", request);
    const id = `44444444-aaaa-4444-8444-${kind === "document" ? "111111111111" : kind === "source_reference" ? "222222222222" : "333333333333"}`;
    const response = await handleOperation(claudeRequest(id, { cv: base, scan: { coverage: "Selected requirements.", findings: [] }, scanCV: base, scanJD: jd, base, instructions: "Keep every fact unchanged.", language: "English" }, "rewrite"), "rewrite");
    expect(response.status).toBe(502); const body = await response.json(); expect(body.error.code).toBe("result_rejected"); expect(body).not.toHaveProperty("document");
    expect(request).toHaveBeenCalledOnce(); expect(finish).toHaveBeenCalledExactlyOnceWith("unknown");
    const event = JSON.parse(log.mock.calls.find(call => call[0] === "ownpath.ai")![1]);
    expect(event).toMatchObject({ requestId: id, operation: "rewrite", providerRequestId: "req_offline_rewrite_contract", httpStatus: 200, stopReason: "end_turn", stage: kind === "source_reference" ? "grounding" : "output_schema", reservation: "unknown", fieldPath: kind === "document" ? "document" : kind === "source_reference" ? "sections[0].entries[0].sourceIds" : "$", constraint: kind === "document" ? "max_length" : kind });
    expect(JSON.stringify(event)).not.toContain("PRIVATE");
  } finally { log.mockRestore(); }
});
it("holds Rewrite unknown after HTTP 400 and logs only the redacted provider error citation", async () => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  try {
    const finish = vi.fn(); vi.mocked(reserveUsage).mockResolvedValue(finish);
    const request = vi.fn().mockResolvedValue(Response.json({ type: "error", error: { type: "invalid_request_error", message: "output_config.format.schema.properties.sections.items.properties.entries.items.properties.paragraphs.items.type: PRIVATE_ERROR_SOURCE" } }, { status: 400, headers: { "request-id": "req_synthetic_400_web" } })); vi.stubGlobal("fetch", request);
    const response = await handleOperation(claudeRequest("rewrite-http-400-fixture", { scan, scanCV: cv, scanJD: jd, base: cv, instructions: "Preserve all direct responsibilities.", language: "English" }, "rewrite"), "rewrite");
    expect(response.status).toBe(502); const publicBody = JSON.stringify(await response.json()); expect(publicBody).toContain("reconciliation_required"); expect(publicBody).not.toContain("PRIVATE"); expect(publicBody).not.toContain("properties.notes");
    const event = JSON.parse(log.mock.calls.find(call => call[0] === "ownpath.ai")![1]); expect(event).toMatchObject({ stage: "provider_http", httpStatus: 400, reservation: "unknown", providerErrorType: "invalid_request_error", providerSchemaPath: "output_config.format.schema.properties.sections.items.properties.entries.items.properties.paragraphs.items.type" });
    expect(JSON.stringify(event)).not.toContain("PRIVATE"); expect(finish).toHaveBeenCalledExactlyOnceWith("unknown"); expect(request).toHaveBeenCalledOnce();
  } finally { log.mockRestore(); }
});
it("distinguishes a schema-regex HTTP400 from result validation/finalization and keeps exactly one attempt unknown", async () => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  try {
    const finish = vi.fn(); vi.mocked(reserveUsage).mockResolvedValue(finish);
    const request = vi.fn().mockResolvedValue(Response.json({ type: "error", error: { type: "invalid_request_error", param: "output_config.format.schema", message: "JSON schema regex pattern unsupported. PRIVATE_REJECTED_OUTPUT" } }, { status: 400, headers: { "request-id": "req_offline_schema_root" } })); vi.stubGlobal("fetch", request);
    const id = "55555555-aaaa-4555-8555-555555555555";
    const response = await handleOperation(claudeRequest(id, { scan, scanCV: cv, scanJD: jd, base: cv, instructions: "Keep the source facts.", language: "English" }, "rewrite"), "rewrite");
    expect(response.status).toBe(502); const body = await response.json(); expect(body.error.code).toBe("reconciliation_required"); expect(body).not.toHaveProperty("document");
    expect(request).toHaveBeenCalledOnce(); expect(finish).toHaveBeenCalledExactlyOnceWith("unknown");
    const event = JSON.parse(log.mock.calls.find(call => call[0] === "ownpath.ai")![1]);
    expect(event).toMatchObject({ requestId: id, operation: "rewrite", stage: "provider_http", reservation: "unknown", httpStatus: 400, providerRequestId: "req_offline_schema_root", code: "provider_failure", providerErrorClass: "schema_regex", providerSchemaPath: "output_config.format.schema" });
    expect(event).not.toHaveProperty("fieldPath"); expect(event).not.toHaveProperty("stopReason"); expect(event).not.toHaveProperty("actualType"); expect(JSON.stringify(event)).not.toContain("PRIVATE");
  } finally { log.mockRestore(); }
});
it("duplicate validation-rejected requests share one dispatch and never finalize as successful or free", async () => {
  const finish = vi.fn(); vi.mocked(reserveUsage).mockResolvedValue(finish);
  const request = vi.fn().mockResolvedValue(Response.json(claudeEnvelope({ ...scan, findings: [{ ...scan.findings[0], excerpt: "Not in this CV" }] })));
  vi.stubGlobal("fetch", request);
  const replies = await Promise.all([handleOperation(claudeRequest("duplicate-rejected-result"), "scan"), handleOperation(claudeRequest("duplicate-rejected-result"), "scan")]);
  expect(replies.map(reply => reply.status)).toEqual([502, 502]);
  for (const reply of replies) { const body = await reply.json(); expect(body.error.code).toBe("result_rejected"); expect(body).not.toHaveProperty("findings"); }
  expect(reserveUsage).toHaveBeenCalledOnce(); expect(request).toHaveBeenCalledOnce(); expect(finish).toHaveBeenCalledExactlyOnceWith("unknown");
});
it.each([
 {coverage:'',actualType:'string',constraint:'non_blank'},
 {coverage:'SYNTHETIC_PRIVATE_OUTPUT'.repeat(40),actualType:'string',constraint:'max_length'},
 {coverage:{text:'SYNTHETIC_PRIVATE_OUTPUT'},actualType:'object',constraint:'type'},
])('retains unknown accounting and safe diagnostics at the observed coverage/$constraint rejection boundary',async({coverage,actualType,constraint})=>{
 const log=vi.spyOn(console,'info').mockImplementation(()=>{});
 try{
  const finish=vi.fn();vi.mocked(reserveUsage).mockResolvedValue(finish);
  const request=vi.fn().mockResolvedValue(Response.json(claudeEnvelope({coverage,findings:[]}),{headers:{'request-id':'req_synthetic_coverage'}}));vi.stubGlobal('fetch',request);
  const id='22222222-bbbb-4222-8222-222222222222';const response=await handleOperation(claudeRequest(id),'scan');
  expect(response.status).toBe(502);const body=await response.json();expect(body.error.code).toBe('result_rejected');expect(body).not.toHaveProperty('findings');expect(JSON.stringify(body)).not.toContain('SYNTHETIC_PRIVATE');
  expect(request).toHaveBeenCalledOnce();expect(reserveUsage).toHaveBeenCalledOnce();expect(finish).toHaveBeenCalledExactlyOnceWith('unknown');
  const event=JSON.parse(log.mock.calls.find(call=>call[0]==='ownpath.ai')![1]);expect(event).toMatchObject({operation:'scan',requestId:id,stage:'output_schema',fieldPath:'coverage',validationRule:'field_shape',actualType,constraint,reservation:'unknown',httpStatus:200,stopReason:'end_turn',providerRequestId:'req_synthetic_coverage'});expect(JSON.stringify(event)).not.toContain('SYNTHETIC_PRIVATE');
 }finally{log.mockRestore();}
});
