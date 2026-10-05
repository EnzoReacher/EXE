import { describe, expect, it } from "vitest";
import { getAuthCallbackUrl, getAuthRedirectUrl } from "./auth-redirect";

describe("auth callback URL allow-list", () => {
  it("uses the current loopback origin in development", () => {
    expect(getAuthCallbackUrl("http://localhost:3000", { siteUrl: "", nodeEnv: "development" }))
      .toBe("http://localhost:3000/auth/callback");
  });

  it("uses the explicitly configured HTTPS origin in production", () => {
    expect(getAuthCallbackUrl("https://untrusted.example", { siteUrl: "https://exe.example", nodeEnv: "production" }))
      .toBe("https://exe.example/auth/callback");
  });

  it("fails closed when production has no configured site URL", () => {
    expect(getAuthCallbackUrl("https://exe.example", { siteUrl: "", nodeEnv: "production" })).toBeNull();
  });

  it("rejects an untrusted plain-HTTP host and an unsafe redirect path", () => {
    expect(getAuthCallbackUrl("http://untrusted.example:3000", { siteUrl: "", nodeEnv: "development" })).toBeNull();
    expect(getAuthRedirectUrl("http://127.0.0.1:3000", "//untrusted.example", { siteUrl: "", nodeEnv: "development" })).toBeNull();
  });
});
