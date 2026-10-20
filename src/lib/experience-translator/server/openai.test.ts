import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { configuration, createProvider, parseEnvelope, shape } from "./openai";
const config = { key: "synthetic-unit-key", model: "synthetic-unit-model", origin: "http://127.0.0.1:4351" };
const envelope = (text = '{"ok":true}') => ({ status: "completed", output: [{ type: "reasoning" }, { type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text }] }] });
afterEach(() => vi.unstubAllEnvs());
describe("native Responses boundary (mock fetch only)", () => {
  it("uses strict Responses JSON schema, fixed destination, separated instructions, no storage/tools", async () => {
    const request = vi.fn(async () => Response.json(envelope()));
    expect(await createProvider(config, request)("check", "trusted", { project: "untrusted" }, shape({}), new AbortController().signal)).toEqual({ ok: true });
    const [url, options] = request.mock.calls[0] as unknown as [string, RequestInit]; expect(url).toBe("https://api.openai.com/v1/responses"); expect(options.redirect).toBe("error");
    const body = JSON.parse(String(options.body)); expect(body).toMatchObject({ model: config.model, store: false, stream: false, background: false, text: { format: { type: "json_schema", strict: true } } }); expect(body.input).toEqual([{ role: "developer", content: "trusted" }, { role: "user", content: '{"project":"untrusted"}' }]); expect(body.tools).toBeUndefined();
  });
  it.each([{ status: "incomplete", output: [] }, { ...envelope(), error: {} }, { status: "completed", output: [{ type: "function_call" }] }, { status: "completed", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "refusal", refusal: "no" }] }] }, envelope("bad"), envelope("x".repeat(60001))])("rejects invalid envelopes/refusal/truncation", (value) => expect(() => parseEnvelope(value)).toThrow());
  it("retries transient once but not auth, quota, malformed, refusal", async () => {
    const request = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 500 })).mockResolvedValueOnce(Response.json(envelope()));
    await createProvider(config, request)("x", "trusted", {}, shape({}), new AbortController().signal); expect(request).toHaveBeenCalledTimes(2);
    for (const response of [new Response("{}", { status: 401 }), Response.json({ error: { code: "insufficient_quota" } }, { status: 429 }), Response.json(envelope("bad"))]) { const fetcher = vi.fn(async () => response); await expect(createProvider(config, fetcher)("x", "t", {}, {}, new AbortController().signal)).rejects.toThrow(); expect(fetcher).toHaveBeenCalledTimes(1); }
  });
  it("requires explicit complete config and never fetches for missing config or pre-abort", async () => {
    for (const key of ["OPENAI_API_KEY", "OPENAI_MODEL", "OWNPATH_OPENAI_LOCAL_ENABLED", "OWNPATH_OPENAI_LOCAL_ORIGIN"]) vi.stubEnv(key, "");
    expect(() => configuration()).toThrow("OpenAI is not configured.");
    const fetcher = vi.fn(); await expect(createProvider(config, fetcher)("x", "t", {}, {}, AbortSignal.abort())).rejects.toThrow(); expect(fetcher).not.toHaveBeenCalled();
  });
  it("honors abort deadlines without retry and bounds response reads", async () => {
    const fetcher = vi.fn((_url: unknown, init?: RequestInit) => new Promise<Response>((_resolve, reject) => { init?.signal?.addEventListener("abort", () => reject(new Error("synthetic abort")), { once: true }); }));
    await expect(createProvider(config, fetcher)("x", "t", {}, {}, AbortSignal.timeout(10))).rejects.toThrow(/timed out/); expect(fetcher).toHaveBeenCalledTimes(1);
    const oversized = vi.fn(async () => new Response("x".repeat(100001))); await expect(createProvider(config, oversized)("x", "t", {}, {}, new AbortController().signal)).rejects.toThrow(/unchecked/); expect(oversized).toHaveBeenCalledTimes(1);
  });
  it.each([200, 429, 500])("bounds a stalled response body after HTTP %s headers without relying on native fetch abort linkage", async (status) => {
    const cancel = vi.fn(); const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode('{"partial":')); }, cancel });
    // This fetch mock intentionally ignores signal: only the explicit body-reader
    // signal can close the never-ending stream. No prior timeout defect is assumed.
    const request = vi.fn(async () => new Response(stream, { status }));
    const controller = new AbortController(); const abort = setTimeout(() => controller.abort(new Error("synthetic-private-reason")), 20);
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    try {
      await expect(Promise.race([createProvider(config, request)("x", "trusted", {}, {}, controller.signal), new Promise((_, reject) => { watchdog = setTimeout(() => reject(new Error("BODY_DEADLINE_NOT_ENFORCED")), 1000); })])).rejects.toThrow(/Your inputs are kept/);
      expect(request).toHaveBeenCalledTimes(1); expect(cancel).toHaveBeenCalledTimes(1);
    } finally { clearTimeout(abort); clearTimeout(watchdog); }
  });
});
