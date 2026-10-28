import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/cv-intake/server", () => ({ readUpload: vi.fn(), extractUpload: vi.fn(), IntakeError: class extends Error {} }));
import { getCurrentUser } from "@/lib/supabase/server";
import { readUpload, extractUpload } from "@/lib/cv-intake/server";
import { POST } from "./route";
afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); });
const request = (type = "pdf", mime = "application/pdf", origin = "http://127.0.0.1:4317") => new Request(`http://127.0.0.1:4317/api/cv-review/extract?type=${type}`, { method: "POST", headers: { origin, host: "127.0.0.1:4317", "content-type": mime }, body: "synthetic" });
it("auth and origin checks precede upload reading", async () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://127.0.0.1:4317");
  vi.mocked(getCurrentUser).mockResolvedValue(null); expect((await POST(request())).status).toBe(401);
  vi.mocked(getCurrentUser).mockResolvedValue({ id: "synthetic" } as Awaited<ReturnType<typeof getCurrentUser>>);
  expect((await POST(request("pdf", "application/pdf", "https://untrusted.example"))).status).toBe(403); expect(readUpload).not.toHaveBeenCalled();
});
it("checks allowlisted types and recovers without exposing parser internals", async () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://127.0.0.1:4317"); vi.mocked(getCurrentUser).mockResolvedValue({ id: "synthetic" } as Awaited<ReturnType<typeof getCurrentUser>>);
  expect((await POST(request("doc", "application/msword"))).status).toBe(415); expect(readUpload).not.toHaveBeenCalled();
  vi.mocked(readUpload).mockResolvedValue(Buffer.from("synthetic")); vi.mocked(extractUpload).mockResolvedValue({ text: "Fictional CV" });
  const response = await POST(request()); expect(await response.json()).toEqual({ text: "Fictional CV" }); expect(response.headers.get("cache-control")).toContain("no-store");
  vi.mocked(readUpload).mockRejectedValue(new Error("private synthetic diagnostic"));
  const failed = await POST(request()); expect(await failed.text()).not.toContain("private synthetic diagnostic");
});
