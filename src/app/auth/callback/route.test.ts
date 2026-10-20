import { afterEach, describe, expect, it, vi } from "vitest";

const { exchangeCodeForSession, getUser } = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn(), getUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { exchangeCodeForSession, getUser } }),
}));

import { GET } from "./route";

afterEach(() => {
  exchangeCodeForSession.mockReset();
  getUser.mockReset();
  vi.unstubAllEnvs();
});

describe("Supabase Auth callback", () => {
  it("exchanges a provider code, verifies identity and continues to /app by default", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    getUser.mockResolvedValue({ data: { user: { id: "fictional" } }, error: null });
    const response = await GET(new Request("http://127.0.0.1:3000/auth/callback?code=synthetic-code"));

    expect(exchangeCodeForSession).toHaveBeenCalledWith("synthetic-code");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://127.0.0.1:3000/app");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("fails safely when the callback has no code", async () => {
    const response = await GET(new Request("http://127.0.0.1:3000/auth/callback"));

    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://127.0.0.1:3000/sign-in?status=confirmation-failed");
  });

  it("does not expose provider errors when a code cannot be exchanged", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: new Error("synthetic provider detail") });
    const response = await GET(new Request("http://127.0.0.1:3000/auth/callback?code=synthetic-code"));

    expect(response.headers.get("location")).toBe("http://127.0.0.1:3000/sign-in?status=confirmation-failed");
    expect(await response.text()).not.toContain("synthetic provider detail");
  });

  it("requires a configured public origin for production redirects", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const response = await GET(new Request("https://untrusted.example/auth/callback?code=synthetic-code"));

    expect(response.status).toBe(503);
    expect(response.headers.get("location")).toBeNull();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  for (const next of ["/app", "/reset-password", "/app/tailor", "/app/profile"]) {
    it(`allows ${next} only after exchange and verified identity`, async () => {
      exchangeCodeForSession.mockResolvedValue({ error: null });
      getUser.mockResolvedValue({ data: { user: { id: "fictional" } }, error: null });
      const response = await GET(new Request(`http://127.0.0.1:3000/auth/callback?code=fictional&next=${encodeURIComponent(next)}`));
      expect(response.headers.get("location")).toBe("http://127.0.0.1:3000" + next);
      expect(response.headers.get("location")).not.toContain("code=");
    });
  }
  for (const next of ["//evil.test", "https://evil.test", "/account?next=//evil.test", "/reset-password#fragment"]) {
    it(`defaults unsafe callback target ${next} to /app`, async () => {
      exchangeCodeForSession.mockResolvedValue({ error: null });
      getUser.mockResolvedValue({ data: { user: { id: "fictional" } }, error: null });
      const response = await GET(new Request(`http://127.0.0.1:3000/auth/callback?code=fictional&next=${encodeURIComponent(next)}`));
      expect(response.headers.get("location")).toBe("http://127.0.0.1:3000/app");
    });
  }
  it("does not trust exchange success when getUser rejects the identity", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    getUser.mockResolvedValue({ data: { user: null }, error: new Error("expired") });
    const response = await GET(new Request("http://127.0.0.1:3000/auth/callback?code=fictional&next=/reset-password"));
    expect(response.headers.get("location")).toContain("confirmation-failed");
  });
  for (const query of ["code=a&code=b", "error=denied&code=a", "code=", "next=/reset-password"]) {
    it(`rejects invalid callback envelope ${query}`, async () => {
      const response = await GET(new Request("http://127.0.0.1:3000/auth/callback?" + query));
      expect(response.headers.get("location")).toContain("confirmation-failed");
      expect(exchangeCodeForSession).not.toHaveBeenCalled();
    });
  }
});
