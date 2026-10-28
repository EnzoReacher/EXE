import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { configuration, createProvider, transmission } from "./provider";
import { GET } from "@/app/api/cv-review/disclosure/route";

function configured() {
  vi.stubEnv("OWNPATH_SCAN_PROVIDER", "anthropic"); vi.stubEnv("OWNPATH_CLAUDE_LOCAL_ENABLED", "true");
  vi.stubEnv("OWNPATH_CLAUDE_LOCAL_ORIGIN", "http://127.0.0.1:4317"); vi.stubEnv("ANTHROPIC_API_KEY", "synthetic-secret");
  vi.stubEnv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001"); vi.stubEnv("OWNPATH_BILLING_MODE", "OFF");
}
afterEach(() => vi.unstubAllEnvs());
it("requires explicit opt-in, verified exact model, credentials, billing OFF and numeric loopback", () => {
  configured(); expect(configuration()).toMatchObject({ model: "claude-haiku-4-5-20251001", provider: "anthropic", origin: "http://127.0.0.1:4317" });
  for (const [key, value] of [["OWNPATH_CLAUDE_LOCAL_ENABLED", "false"], ["ANTHROPIC_API_KEY", ""], ["ANTHROPIC_MODEL", ""], ["ANTHROPIC_MODEL", "guessed-model"], ["OWNPATH_BILLING_MODE", "LIVE"], ["OWNPATH_CLAUDE_LOCAL_ORIGIN", "https://example.test"], ["OWNPATH_CLAUDE_LOCAL_ORIGIN", "http://localhost:4317"], ["OWNPATH_CLAUDE_LOCAL_ORIGIN", "http://0.0.0.0:4317"], ["OWNPATH_CLAUDE_LOCAL_ORIGIN", "http://127.0.0.1:4317/path"]]) {
    configured(); vi.stubEnv(key, value); expect(configuration).toThrow(/not configured/);
  }
});
it("preserves legacy OpenAI selection and never falls back from Claude", () => {
  configured(); vi.stubEnv("ANTHROPIC_API_KEY", ""); vi.stubEnv("OPENAI_API_KEY", "synthetic-openai"); vi.stubEnv("OPENAI_MODEL", "synthetic-model"); vi.stubEnv("OWNPATH_OPENAI_LOCAL_ENABLED", "true"); vi.stubEnv("OWNPATH_OPENAI_LOCAL_ORIGIN", "http://127.0.0.1:4317");
  expect(configuration).toThrow(/not configured/);
  vi.stubEnv("OWNPATH_SCAN_PROVIDER", ""); expect(configuration()).toMatchObject({ provider: "openai", model: "synthetic-model" });
  vi.stubEnv("OWNPATH_SCAN_PROVIDER", "unknown"); expect(configuration).toThrow(/not configured/);
});
it.each(["claude-haiku-4-5", "claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-5-5"])("refuses %s rather than substituting for the owner's pinned Haiku snapshot", model => {
  configured(); vi.stubEnv("ANTHROPIC_MODEL", model); expect(configuration).toThrow(/not configured/);
});
it("identifies the exact configured recipient without reading a key or calling a provider", async () => {
  configured(); vi.stubEnv("ANTHROPIC_API_KEY", "");
  const first = transmission(); expect(first).toMatchObject({ provider: "Anthropic (Claude)", external: true });
  expect(JSON.stringify(first)).not.toContain("claude-haiku-4-5-20251001");
  const response = await GET(); expect(await response.json()).toEqual(first); expect(response.headers.get("Cache-Control")).toBe("no-store");
  vi.stubEnv("ANTHROPIC_MODEL", "different-model"); expect(transmission().purpose).not.toBe(first.purpose);
  vi.stubEnv("OWNPATH_SCAN_PROVIDER", "openai"); expect(transmission().provider).toBe("OpenAI"); expect(transmission().purpose).not.toBe(first.purpose);
  vi.stubEnv("OWNPATH_SCAN_PROVIDER", "invalid"); expect((await GET()).status).toBe(503);
});
it("selects the Claude adapter without substituting the preserved OpenAI adapter", async () => {
  configured(); const request = vi.fn().mockResolvedValue(Response.json({ type: "message", role: "assistant", stop_reason: "end_turn", content: [{ type: "text", text: "{}" }] }));
  await createProvider(configuration(), request, 1)("test", "instructions", {}, { type: "object" }, new AbortController().signal);
  expect(request).toHaveBeenCalledOnce(); expect(request.mock.calls[0][0]).toBe("https://api.anthropic.com/v1/messages");
});
