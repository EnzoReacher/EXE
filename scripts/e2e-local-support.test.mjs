import { describe, expect, it, vi } from "vitest";
import { loopbackOrigin, publicKeyOnly, localFetch, publicLocalSettings } from "./e2e-local-support.mjs";
describe("local browser harness network and credential guards", () => {
  it("accepts public local Supabase settings and a loopback auth origin", () => {
    expect(publicLocalSettings({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic-placeholder",
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
    })).toEqual({
      supabase: "http://127.0.0.1:54321",
      key: "sb_publishable_synthetic-placeholder",
      siteUrl: "http://127.0.0.1:3000",
    });
  });
  it("defaults the callback origin to the repository local site URL", () => {
    expect(publicLocalSettings({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic-placeholder",
    }).siteUrl).toBe("http://127.0.0.1:3000");
  });
  it("rejects a hosted callback URL and extra settings without echoing values", () => {
    expect(() => publicLocalSettings({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic-placeholder",
      NEXT_PUBLIC_SITE_URL: "https://hosted.example",
    })).toThrow("LOOPBACK_URL_REQUIRED");
    expect(() => publicLocalSettings({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic-placeholder",
      SUPABASE_SERVICE_ROLE_KEY: "must-never-be-printed",
    })).toThrow("ONLY_PUBLIC_LOCAL_SETTINGS_ALLOWED");
  });
  it.each(["http://127.0.0.1:3111", "http://localhost:3111", "http://[::1]:3111"])("permits explicit loopback origin %s", (url) => {
    expect(loopbackOrigin(url)).toBe(url);
  });
  it.each(["https://example.invalid", "http://127.0.0.1.example.invalid", "https://localhost", "http://user:secret@localhost", "http://localhost/private", "http://localhost/?token=private", "file:///private", "http://0.0.0.0"])("fails closed for unsupported origin %s", (url) => {
    expect(() => loopbackOrigin(url)).toThrow();
  });
  it("rejects service-role and secret credentials without echoing them", () => {
    const jwt = (role) => `header.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.signature`;
    expect(publicKeyOnly(jwt("anon"))).toBe(jwt("anon"));
    expect(publicKeyOnly("sb_publishable_synthetic-placeholder")).toBe("sb_publishable_synthetic-placeholder");
    expect(() => publicKeyOnly(jwt("service_role"))).toThrow("PUBLIC_KEY_REQUIRED");
    expect(() => publicKeyOnly("sb_secret_synthetic-placeholder")).toThrow("PUBLIC_KEY_REQUIRED");
  });
  it("blocks other origins before fetch and forbids redirects", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal("fetch", fetch);
    try {
      const guarded = localFetch(["http://127.0.0.1:54321"]);
      expect(() => guarded("https://example.invalid")).toThrow("NON_LOCAL_NETWORK_BLOCKED");
      expect(fetch).not.toHaveBeenCalled();
      await guarded("http://127.0.0.1:54321/auth/v1/health", { redirect: "follow" });
      expect(fetch.mock.calls[0][1].redirect).toBe("error");
    } finally { vi.unstubAllGlobals(); }
  });
});
