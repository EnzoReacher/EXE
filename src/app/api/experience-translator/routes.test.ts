import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { POST as prepare } from "./prepare/route";
import { POST as generate } from "./generate/route";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("Translator API routes", () => {
  it.each([prepare, generate])("retired endpoint gives intentional recovery and performs zero fetches", async (handler) => {
    vi.stubEnv("OWNPATH_OPENAI_LOCAL_ENABLED", "false"); const request = vi.fn(); vi.stubGlobal("fetch", request);
    const result = await handler();
    expect(result.status).toBe(410); expect(await result.json()).toEqual({ error: { code: "retired", message: "Experience Translator has retired. Open /app/tailor to review your CV." } }); expect(request).not.toHaveBeenCalled(); expect(result.headers.get("cache-control")).toBe("no-store");
  });
});
