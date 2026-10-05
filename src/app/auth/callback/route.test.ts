import { afterEach, describe, expect, it, vi } from "vitest";

const { exchangeCodeForSession } = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { exchangeCodeForSession } }),
}));

import { GET } from "./route";

afterEach(() => {
  exchangeCodeForSession.mockReset();
  vi.unstubAllEnvs();
});

describe("Supabase Auth callback", () => {
  it("exchanges a confirmation code and returns to the private intake route", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const response = await GET(new Request("http://127.0.0.1:3000/auth/callback?code=synthetic-code"));

    expect(exchangeCodeForSession).toHaveBeenCalledWith("synthetic-code");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://127.0.0.1:3000/assessment");
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
});
