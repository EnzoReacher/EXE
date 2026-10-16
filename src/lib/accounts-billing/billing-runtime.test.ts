import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { configuredQuota, configuredStripe } from "./billing-runtime";

describe("explicit sandbox billing activation", () => {
  const settings = { STRIPE_SECRET_KEY: "sk_test_synthetic", STRIPE_WEBHOOK_SECRET: "whsec_synthetic", STRIPE_ACCOUNT_ID: "acct_synthetic", STRIPE_PRICE_ID: "price_synthetic" };
  it("requires operator opt-in as well as complete test configuration", () => {
    expect(configuredStripe(settings)).toBeNull();
    expect(configuredStripe({ ...settings, OWNPATH_SANDBOX_BILLING_ENABLED: "false" })).toBeNull();
    expect(configuredStripe({ ...settings, OWNPATH_SANDBOX_BILLING_ENABLED: "true" })).not.toBeNull();
    expect(configuredStripe({ ...settings, OWNPATH_SANDBOX_BILLING_ENABLED: "true", STRIPE_PRICE_ID: "" })).toBeNull();
    expect(() => configuredStripe({ ...settings, OWNPATH_SANDBOX_BILLING_ENABLED: "true", STRIPE_SECRET_KEY: "sk_live_forbidden" })).toThrow();
  });
  it("bounds the shared saved-session quota", () => {
    expect(configuredQuota({})).toBe(50);
    expect(configuredQuota({ OWNPATH_SAVED_SESSION_LIMIT: "2" })).toBe(2);
    for (const raw of ["0", "51", "1.5", "02", "bad"]) expect(() => configuredQuota({ OWNPATH_SAVED_SESSION_LIMIT: raw })).toThrow();
  });
});
