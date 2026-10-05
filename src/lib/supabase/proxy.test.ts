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
