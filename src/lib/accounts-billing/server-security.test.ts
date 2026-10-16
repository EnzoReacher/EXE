import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { accountsConfig, AccountsUnavailable } from "./server-config";
import { cookieValue, CSRF_COOKIE, issueCsrf, readBoundedBody, readJson, safeNext, serializeCookie, validateCsrf } from "./server-security";
import { requireRecent, requireVerified } from "./server-identity";
import { freeEntitlement } from "./server-identity";
import { billingStatus, sandboxStripe, unavailableCatalog } from "./server-billing";

const env = { OWNPATH_ACCOUNTS_MODE: "emulator", OWNPATH_FIREBASE_PROJECT_ID: "demo-ownpath-accounts", OWNPATH_APP_ORIGIN: "http://127.0.0.1:3000", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099", FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" };
const config = accountsConfig(env);
describe("server environment and browser security", () => {
  it("refuses disabled/cloud/non-loopback/malformed configuration and unbounded cookie policies", () => {
    for (const patch of [
      { OWNPATH_ACCOUNTS_MODE: "disabled" }, { OWNPATH_ACCOUNTS_MODE: "production" },
      { OWNPATH_FIREBASE_PROJECT_ID: "real-project" }, { FIRESTORE_EMULATOR_HOST: "cloud.example:8080" },
      { FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:65536" }, { FIREBASE_AUTH_EMULATOR_HOST: "http://127.0.0.1:9099" },
      { OWNPATH_APP_ORIGIN: "https://example.test" }, { OWNPATH_APP_ORIGIN: "http://user@127.0.0.1:3000" },
      { OWNPATH_APP_ORIGIN: "http://127.0.0.1:3000/path" }, { OWNPATH_SESSION_DAYS: "15" }, { OWNPATH_SESSION_DAYS: "0" },
    ]) expect(() => accountsConfig({ ...env, ...patch })).toThrow(AccountsUnavailable);
    expect(config.sessionMilliseconds).toBe(5 * 86400000);
    expect(serializeCookie("test", "value", 30, config)).toContain("HttpOnly; SameSite=Strict");
    expect(serializeCookie("test", "value", 30, { ...config, origin: "https://127.0.0.1:3000" })).toContain("Secure");
  });
  it("requires the exact Origin plus matching header and HttpOnly cookie binding", () => {
    const token = issueCsrf();
    const make = (headers: Record<string, string>) => new Request(`${config.origin}/api/account`, { method: "PATCH", headers });
    const headers = { origin: config.origin, cookie: `${CSRF_COOKIE}=${token}`, "x-csrf-token": token };
    expect(() => validateCsrf(make(headers), config)).not.toThrow();
    const patches: Record<string, string>[] = [{ origin: "https://evil.test" }, { origin: "null" }, { "x-csrf-token": issueCsrf() }, { cookie: "" }, { "sec-fetch-site": "cross-site" }];
    for (const patch of patches) expect(() => validateCsrf(make({ ...headers, ...patch }), config)).toThrow(expect.objectContaining({ code: "CSRF_INVALID" }));
    expect(cookieValue(make({ cookie: `ownpath_session=one; ownpath_session=two` }), "ownpath_session")).toBeNull();
  });
  it("bounds streamed bytes without trusting Content-Length and rejects encoding/invalid JSON", async () => {
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(3)); controller.enqueue(new Uint8Array(3)); controller.close(); } });
    const request = new Request(`${config.origin}/api/account`, { method: "POST", body: stream, duplex: "half" } as RequestInit);
    await expect(readBoundedBody(request, 5)).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
    await expect(readBoundedBody(new Request(config.origin, { method: "POST", headers: { "content-length": "1000" }, body: "x" }), 10)).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
    const headerCases: Record<string, string>[] = [{ "content-type": "text/plain" }, { "content-type": "application/json", "content-encoding": "gzip" }];
    for (const headers of headerCases) await expect(readJson(new Request(config.origin, { method: "POST", headers, body: "{}" }), 10)).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    await expect(readJson(new Request(config.origin, { method: "POST", headers: { "content-type": "application/json" }, body: "{" }), 10)).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    await expect(readJson(new Request(config.origin, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }), 10)).resolves.toEqual({});
  });
  it("rejects open redirects and preserves only approved same-origin destinations", () => {
    for (const value of ["https://evil.test", "//evil.test", "/\\evil.test", "/%2f%2fevil.test", "/assessment", "/accounting", "/account\nX", undefined]) expect(safeNext(value, config.origin)).toBe("/account");
    expect(safeNext("/experience-translator", config.origin)).toBe("/experience-translator");
    expect(safeNext("/account/billing?return=1", config.origin)).toBe("/account/billing?return=1");
  });
  it("bounds recent auth and never promotes client/projection state while billing is gated", () => {
    const now = Date.now();
    const identity = { uid: "synthetic", email: "x@example.test", emailVerified: true, authTime: Math.floor(now / 1000) };
    expect(() => requireRecent(identity, now)).not.toThrow();
    for (const authTime of [0, Number.NaN, now / 1000 - 301, now / 1000 + 61]) expect(() => requireRecent({ ...identity, authTime }, now)).toThrow(expect.objectContaining({ code: "RECENT_AUTH_REQUIRED" }));
    expect(() => requireVerified({ ...identity, emailVerified: false })).toThrow(expect.objectContaining({ code: "EMAIL_VERIFICATION_REQUIRED" }));
    expect(freeEntitlement(identity).capabilities.canSave).toBe(false);
    expect(billingStatus(identity).reconciliation).toBe("unavailable");
    expect(unavailableCatalog().pro.availability).toBe("unavailable");
    expect(() => sandboxStripe({ STRIPE_SECRET_KEY: "sk_live_forbidden" })).toThrow(expect.objectContaining({ code: "BILLING_UNAVAILABLE" }));
  });
});
