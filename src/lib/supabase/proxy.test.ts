import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createServerClientMock } = vi.hoisted(() => ({ createServerClientMock: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: createServerClientMock }));

import { updateSupabaseSession } from "./proxy";

afterEach(() => {
  createServerClientMock.mockReset();
  vi.unstubAllEnvs();
});

describe("Supabase session refresh proxy", () => {
  it("forwards rotated cookies to the current request and preserves refresh cache headers", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "synthetic-publishable-key");
    const request = new NextRequest("http://127.0.0.1:3000/api/intake/cv");
    createServerClientMock.mockImplementation((_url, _key, options) => ({ auth: { getClaims: async () => {
      options.cookies.setAll([{ name: "exe-session", value: "rotated", options: { path: "/" } }], { "Cache-Control": "private, no-store", Pragma: "no-cache", Expires: "0" });
      return { data: { claims: { sub: "synthetic-user" } }, error: null };
    } } }));
    const response = await updateSupabaseSession(request);
    expect(request.cookies.get("exe-session")?.value).toBe("rotated");
    expect(response.cookies.get("exe-session")?.value).toBe("rotated");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(response.headers.get("Expires")).toBe("0");
  });

  it("keeps cookie deletions and no-store headers when redirecting a signed-out private page", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "synthetic-publishable-key");
    createServerClientMock.mockImplementation((_url, _key, options) => ({ auth: { getClaims: async () => {
      options.cookies.setAll([{ name: "exe-session", value: "", options: { path: "/", maxAge: 0 } }], { Pragma: "no-cache" });
      return { data: null, error: null };
    } } }));
    const response = await updateSupabaseSession(new NextRequest("http://127.0.0.1:3000/analysis/private-run?tab=draft", { headers: { host: "127.0.0.1:3000" } }));
    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe("http://127.0.0.1:3000/sign-in");
    expect(response.cookies.get("exe-session")?.maxAge).toBe(0);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("Pragma")).toBe("no-cache");
  });

  it("leaves APIs, private print, confirmation callbacks and public reviews to their route authorization", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "synthetic-publishable-key");
    createServerClientMock.mockReturnValue({ auth: { getClaims: async () => ({ data: null, error: null }) } });
    for (const path of ["/api/intake/cv", "/credential-versions/synthetic-version/print", "/auth/callback", "/review/synthetic-token", "/sign-in", "/sign-up"]) {
      const response = await updateSupabaseSession(new NextRequest("http://127.0.0.1:3000" + path));
      expect(response.status).toBe(200);
      expect(response.headers.get("Location")).toBeNull();
      if (path.startsWith("/sign-")) expect(response.headers.get("Cache-Control")).toContain("no-store");
    }
  });

  it("uses the publishable client, verifies claims, and returns refreshed cookies", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "synthetic-publishable-key");
    createServerClientMock.mockImplementation((_url, _key, options) => ({
      auth: {
        getClaims: async () => {
          options.cookies.setAll([{ name: "exe-session", value: "rotated", options: { path: "/", httpOnly: true } }]);
          return { data: { claims: { sub: "synthetic-user" } }, error: null };
        },
      },
    }));

    const response = await updateSupabaseSession(new NextRequest("http://127.0.0.1:3000/assessment"));

    expect(createServerClientMock).toHaveBeenCalledOnce();
    expect(createServerClientMock.mock.calls[0][0]).toBe("http://127.0.0.1:54321");
    expect(createServerClientMock.mock.calls[0][1]).toBe("synthetic-publishable-key");
    expect(response.cookies.get("exe-session")?.value).toBe("rotated");
  });

  it("passes through when local Supabase settings are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    const response = await updateSupabaseSession(new NextRequest("http://127.0.0.1:3000/"));

    expect(createServerClientMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it("keeps a safe response if Supabase cannot refresh the current session", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "synthetic-publishable-key");
    createServerClientMock.mockReturnValue({ auth: { getClaims: async () => { throw new Error("synthetic provider detail"); } } });

    const response = await updateSupabaseSession(new NextRequest("http://127.0.0.1:3000/"));

    expect(response.status).toBe(200);
  });
});
