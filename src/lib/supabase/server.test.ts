import { afterEach, describe, expect, it, vi } from "vitest";

const { createServerClient, cookies, getUser } = vi.hoisted(() => ({ createServerClient: vi.fn(), cookies: vi.fn(), getUser: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient }));
vi.mock("next/headers", () => ({ cookies }));

import { getCurrentUser } from "./server";

afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); });

describe("server identity from the cookie session", () => {
  function setup() {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "synthetic-publishable-key");
    cookies.mockResolvedValue({ getAll: () => [{ name: "exe-session", value: "synthetic-cookie" }], set: vi.fn() });
    createServerClient.mockReturnValue({ auth: { getUser } });
  }

  it("verifies the cookie session with Auth before returning an identity", async () => {
    setup();
    getUser.mockResolvedValue({ data: { user: { id: "synthetic-owner" } }, error: null });
    expect(await getCurrentUser()).toEqual({ id: "synthetic-owner" });
    expect(getUser).toHaveBeenCalledOnce();
    expect(createServerClient.mock.calls[0][2].cookies.getAll()).toEqual([{ name: "exe-session", value: "synthetic-cookie" }]);
  });

  it("rejects a user returned alongside an Auth error", async () => {
    setup();
    getUser.mockResolvedValue({ data: { user: { id: "untrusted-owner" } }, error: new Error("invalid session") });
    expect(await getCurrentUser()).toBeNull();
  });

  it("fails closed if Auth is unavailable", async () => {
    setup(); getUser.mockRejectedValue(new Error("provider unavailable"));
    expect(await getCurrentUser()).toBeNull();
  });

  it("reads request cookies even without configuration so entry pages stay dynamic", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    cookies.mockResolvedValue({ getAll: () => [], set: vi.fn() });
    expect(await getCurrentUser()).toBeNull();
    expect(cookies).toHaveBeenCalledOnce();
    expect(createServerClient).not.toHaveBeenCalled();
  });
});
