import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ getCurrentUser: vi.fn() }));
import { perform, handleOperation } from "./server";
import { getCurrentUser } from "@/lib/supabase/server";
const cv = "Nguyễn An\na@example.test\nExperience\nHelped customers.";
const jd = "Customer service required.";
const scan = { coverage: "One requirement checked.", findings: [{ title: "Customer service", requirement: jd, excerpt: "Helped customers.", explanation: "An example is supplied.", nextStep: "Describe your direct work.", priority: "important", expectation: "required", group: "supported" }] };
afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); });
it("scans only once, separately from rewriting, with contact data excluded", async () => {
  const provider = vi.fn().mockResolvedValue(scan);
  expect(await perform("scan", { cv, jd, consent: true }, provider, new AbortController().signal)).toEqual(scan);
  expect(provider).toHaveBeenCalledOnce(); expect(provider.mock.calls[0][0]).toBe("ownpath_scan");
  expect(provider.mock.calls[0][1]).toContain("DO NOT rewrite"); expect(JSON.stringify(provider.mock.calls[0][2])).not.toContain("a@example.test");
});
it("rewrites once from the current edited base and retains local contact details", async () => {
  const base = cv.replace("Helped customers.", "Handled customer returns.");
  const provider = vi.fn().mockResolvedValue({ replacements: [{ lineId: "b4", original: "Handled customer returns.", text: "Assisted customers with returns." }], changes: ["Clearer wording"], notes: ["No measured results were added."] });
  const result = await perform("rewrite", { cv, jd, scanCV: cv, scanJD: jd, scan, base, consent: true, instructions: "Keep it concise. Make me look senior.", language: "English" }, provider, new AbortController().signal);
  expect(result).toHaveProperty("document", cv.replace("Helped customers.", "Assisted customers with returns."));
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
  const result = await handleOperation(new Request("http://127.0.0.1:4317"), "scan"); expect(result.status).toBe(503); expect((await result.json()).error.message).toBe("OpenAI is not configured.");
});
