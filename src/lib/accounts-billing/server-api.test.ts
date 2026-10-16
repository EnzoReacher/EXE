import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
vi.mock("server-only", () => ({}));
const fake = vi.hoisted(() => ({
  auth: { verifyIdToken: vi.fn(), verifySessionCookie: vi.fn(), getUser: vi.fn(), createSessionCookie: vi.fn(), revokeRefreshTokens: vi.fn() },
  db: { runTransaction: vi.fn(), collection: vi.fn() },
  services: vi.fn(), rateLimit: vi.fn(),
}));
vi.mock("./admin", () => ({ adminServices: fake.services }));
vi.mock("./server-rate-limit", () => ({ rateLimit: fake.rateLimit }));
import { handleApi } from "./server-api";

const origin = "http://127.0.0.1:3000";
const csrf = "a".repeat(64);
const request = (method: string, body?: unknown, patch: Record<string, string> = {}) => new Request(`${origin}/api/auth/session`, {
  method, headers: { origin, cookie: `ownpath_csrf=${csrf}; ownpath_session=synthetic-cookie`, "x-csrf-token": csrf, "content-type": "application/json", ...patch },
  body: method === "GET" ? undefined : JSON.stringify(body),
});
beforeEach(() => {
  vi.clearAllMocks();
  fake.db.collection.mockReset();
  vi.stubEnv("OWNPATH_ACCOUNTS_MODE", "emulator"); vi.stubEnv("OWNPATH_FIREBASE_PROJECT_ID", "demo-ownpath-accounts");
  vi.stubEnv("OWNPATH_APP_ORIGIN", origin); vi.stubEnv("OWNPATH_SESSION_DAYS", "5");
  vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099"); vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");
  fake.services.mockReturnValue({ auth: fake.auth, db: fake.db });
  fake.auth.verifyIdToken.mockResolvedValue({ uid: "synthetic", email_verified: true, auth_time: Math.floor(Date.now() / 1000) });
  fake.auth.verifySessionCookie.mockResolvedValue({ uid: "synthetic", email_verified: true, auth_time: Math.floor(Date.now() / 1000) });
  fake.auth.getUser.mockResolvedValue({ uid: "synthetic", email: "synthetic@example.test", emailVerified: true, disabled: false });
  fake.auth.createSessionCookie.mockResolvedValue("synthetic-session-cookie");
  fake.db.runTransaction.mockRejectedValue(new Error("synthetic database outage private details"));
});
describe("API error/security and recovery behavior", () => {
  it("fails configured-off services safely without leaking internal errors, caches or request input", async () => {
    vi.stubEnv("OWNPATH_ACCOUNTS_MODE", "disabled");
    const response = await handleApi("account", request("GET"));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(body.error.retryable).toBe(false);
    expect(body.error.requestId).toBe(response.headers.get("x-request-id"));
    expect(fake.services).not.toHaveBeenCalled();
    expect((await handleApi("plans", request("GET"))).status).toBe(200);
  });
  it("rejects origin/CSRF before token validation or provider use", async () => {
    const response = await handleApi("session", request("POST", { idToken: "private" }, { origin: "http://evil.test" }));
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("CSRF_INVALID");
    expect(fake.services).not.toHaveBeenCalled();
  });
  it("recovers identity-created profile outages with an accurate limited session instead of deleting identity", async () => {
    const response = await handleApi("session", request("POST", { idToken: "private-id-token" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.account).toMatchObject({ setup: "profile_pending", profile: null, verification: "verified", entitlement: { planId: "free" } });
    expect(JSON.stringify(body)).not.toContain("private-id-token");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly; SameSite=Strict");
    expect(fake.auth.verifyIdToken).toHaveBeenCalledWith("private-id-token", true);
    expect(fake.auth.getUser).toHaveBeenCalledWith("synthetic");
    // A later exchange repairs the same identity/profile; it never needs account creation again.
    fake.db.runTransaction.mockResolvedValueOnce(undefined);
    fake.db.collection.mockReturnValue({ doc: () => ({ get: async () => ({ data: () => ({ displayName: "Recovered", createdAt: "2026-10-16T00:00:00.000Z", updatedAt: "2026-10-16T00:00:00.000Z" }) }) }) });
    const repaired = await handleApi("session", request("POST", { idToken: "private-id-token" }));
    expect(repaired.status).toBe(200);
    expect((await repaired.json()).account).toMatchObject({ setup: "ready", profile: { displayName: "Recovered" }, identity: { uid: "synthetic" } });
  });
  it("requires recent auth before cookie issuance and all-device revocation", async () => {
    fake.auth.verifyIdToken.mockResolvedValueOnce({ uid: "synthetic", auth_time: 0 });
    const exchange = await handleApi("session", request("POST", { idToken: "private" }));
    expect(exchange.status).toBe(403);
    expect((await exchange.json()).error.code).toBe("RECENT_AUTH_REQUIRED");
    expect(fake.auth.createSessionCookie).not.toHaveBeenCalled();
    fake.auth.verifySessionCookie.mockResolvedValueOnce({ uid: "synthetic", auth_time: 0 });
    const logout = await handleApi("session", request("DELETE", { scope: "all" }));
    expect(logout.status).toBe(403);
    expect(fake.auth.revokeRefreshTokens).not.toHaveBeenCalled();
    const current = await handleApi("session", request("DELETE", { scope: "current" }, { cookie: `ownpath_csrf=${csrf}` }));
    expect(current.status).toBe(200);
    expect(current.headers.get("set-cookie")).toContain("ownpath_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0");
  });
  it("rechecks revoked cookies and current provider verification rather than trusting stale signed flags", async () => {
    fake.auth.verifySessionCookie.mockRejectedValueOnce({ code: "auth/session-cookie-revoked", message: "secret" });
    const revoked = await handleApi("status", request("GET"));
    expect(revoked.status).toBe(401);
    expect((await revoked.json()).error.code).toBe("SESSION_EXPIRED");
    expect(fake.auth.verifySessionCookie).toHaveBeenCalledWith("synthetic-cookie", true);
    fake.auth.getUser.mockResolvedValueOnce({ uid: "synthetic", emailVerified: false, disabled: false });
    const result = await handleApi("checkout", request("POST", { planId: "pro", operationId: "12345678-1234-4123-8123-123456789abc" }));
    expect(result.status).toBe(403);
    expect((await result.json()).error.code).toBe("EMAIL_VERIFICATION_REQUIRED");
  });
});
describe("actual Stripe SDK signature gate without a payment lifecycle", () => {
  it("rejects bad signatures/live mode/wrong account and never falsely acknowledges a valid test event", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_synthetic"); vi.stubEnv("STRIPE_ACCOUNT_ID", "acct_synthetic");
    vi.stubEnv("STRIPE_PRICE_ID", "price_synthetic"); vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_synthetic");
    const stripe = new Stripe("sk_test_synthetic");
    const send = async (event: object, validSignature = true) => {
      const payload = JSON.stringify(event);
      const signature = validSignature ? stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_synthetic" }) : "bad";
      return handleApi("stripeWebhook", new Request(`${origin}/api/webhooks/stripe`, { method: "POST", headers: { "stripe-signature": signature }, body: payload }));
    };
    const event = { id: "evt_synthetic", type: "checkout.session.completed", livemode: false, account: "acct_synthetic", data: { object: {} } };
    expect((await send(event, false)).status).toBe(400);
    expect((await send({ ...event, livemode: true })).status).toBe(400);
    expect((await send({ ...event, account: "acct_other" })).status).toBe(400);
    const valid = await send(event);
    expect(valid.status).toBe(503);
    expect(await valid.json()).toEqual({ received: false });
    const tooLarge = await handleApi("stripeWebhook", new Request(`${origin}/api/webhooks/stripe`, { method: "POST", headers: { "content-length": "1048577" }, body: "bounded" }));
    expect(tooLarge.status).toBe(413);
    expect(await tooLarge.json()).toEqual({ received: false });
    expect(fake.services).not.toHaveBeenCalled();
  });
});
