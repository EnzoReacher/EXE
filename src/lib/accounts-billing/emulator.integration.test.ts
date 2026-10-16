import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { prepareSession } from "../experience-translator/engine";
vi.mock("server-only", () => ({}));
import { adminServices } from "./admin";
import { handleApi } from "./server-api";
import { authenticate, bootstrapProfile, freeEntitlement, getAccount } from "./server-identity";
import type { ServerIdentity } from "./server-identity";
import { SavedSessionRepository } from "./server-sessions";
import { failure } from "./server-errors";
import { accountsConfig } from "./server-config";
import { rateLimit } from "./server-rate-limit";

/** Executed only by the owned emulator harness, never inferred from default-suite skip. */
describe.skipIf(process.env.OWNPATH_EMULATOR_ACCEPTANCE !== "1")("actual Firebase Auth/Firestore backend acceptance", () => {
  let auth: Auth;
  let db: Firestore;
  let owner: ServerIdentity;
  let other: ServerIdentity;
  let idToken: string;
  let cookie: string;
  let csrf: string;
  let origin: string;
  let repo: SavedSessionRepository;
  const uids: string[] = [];
  const password = "Synthetic-only-9#password";
  const input = () => {
    const intake = { project: "I built product listing and search using React. My demo is working.", jd: "Frontend Developer Intern requirements: React and HTML and CSS." };
    return { operationId: randomUUID(), title: "Explicit synthetic opt-in", snapshot: { schemaVersion: 1 as const, intake, answers: {}, prepared: prepareSession(intake), candidates: [] } };
  };
  function request(path: string, method = "GET", body?: unknown, session = cookie) {
    return new Request(`${origin}${path}`, {
      method,
      headers: { origin, cookie: `ownpath_session=${session}; ownpath_csrf=${csrf}`, "x-csrf-token": csrf, "content-type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(body),
    });
  }
  beforeAll(async () => {
    const config = accountsConfig();
    origin = config.origin;
    // Strict guard: the harness supplies these values, no ambient cloud endpoint or service is allowed.
    expect(config.projectId).toMatch(/^demo-ownpath-/);
    expect(process.env.GCLOUD_PROJECT).toBe(config.projectId);
    expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBeUndefined();
    ({ auth, db } = adminServices());
    const create = async (emailVerified: boolean): Promise<ServerIdentity> => {
      const uid = `backend-acceptance-${randomUUID()}`;
      const email = `${uid}@example.test`;
      await auth.createUser({ uid, email, password, emailVerified });
      uids.push(uid);
      return { uid, email, emailVerified, authTime: Math.floor(Date.now() / 1000) };
    };
    owner = await create(true);
    other = await create(true);
    const signed = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=synthetic-emulator-key`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: owner.email, password, returnSecureToken: true }) });
    expect(signed.status).toBe(200);
    idToken = (await signed.json()).idToken;
    const csrfResponse = await handleApi("csrf", new Request(`${origin}/api/auth/csrf`));
    expect(csrfResponse.status).toBe(200);
    csrf = (await csrfResponse.json()).csrfToken;
    repo = new SavedSessionRepository(db, async (transaction, identity) => {
      // Test-only server authority fixture, NOT a claim that Stripe can issue entitlements yet.
      const grant = (await transaction.get(db.collection("billingAccounts").doc(identity.uid))).data();
      if (grant?.fixturePro !== true || grant.validUntilMs <= Date.now()) failure("PRO_REQUIRED");
      return { limit: grant.limit };
    });
  }, 30000);
  afterAll(async () => {
    for (const uid of uids) {
      await db.recursiveDelete(db.collection("users").doc(uid));
      await db.collection("billingAccounts").doc(uid).delete();
      await auth.deleteUser(uid);
    }
  }, 30000);
  it("exchanges a real Auth emulator ID token for a verified server cookie and bootstraps once", async () => {
    const response = await handleApi("session", request("/api/auth/session", "POST", { idToken }, ""));
    expect(response.status).toBe(200);
    const value = await response.json();
    expect(value.account.identity).toEqual({ uid: owner.uid, email: owner.email, emailVerified: true });
    expect(value.account.setup).toBe("ready");
    expect(response.headers.get("cache-control")).toBe("no-store");
    const setCookie = response.headers.get("set-cookie")!;
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Strict");
    cookie = setCookie.match(/ownpath_session=([^;]+)/)![1];
    expect((await authenticate(auth, request("/api/account"))).uid).toBe(owner.uid);
    await Promise.all(Array.from({ length: 6 }, () => bootstrapProfile(db, owner)));
    const account = await getAccount(db, owner);
    expect(account.profile?.displayName).toBe("");
    expect((await db.collection("users").doc(owner.uid).get()).data()?.savedSessionCount).toBe(0);
  }, 30000);
  it("rejects CSRF, spoofed account fields and all runtime Pro writes even with a forged projection", async () => {
    const denied = await handleApi("account", new Request(`${origin}/api/account`, { method: "PATCH", headers: { origin: "http://evil.test", "content-type": "application/json" }, body: JSON.stringify({ displayName: "bad" }) }));
    expect(denied.status).toBe(403);
    expect((await denied.json()).error.code).toBe("CSRF_INVALID");
    const spoof = await handleApi("account", request("/api/account", "PATCH", { displayName: "okay", tier: "pro" }));
    expect(spoof.status).toBe(422);
    await db.collection("billingAccounts").doc(owner.uid).set({ fixturePro: true, planId: "pro", limit: 2, validUntilMs: Date.now() + 600000 });
    const save = await handleApi("sessions", request("/api/sessions", "POST", input()));
    expect(save.status).toBe(403);
    expect((await save.json()).error.code).toBe("PRO_REQUIRED");
    expect(freeEntitlement(owner).planId).toBe("free");
    const checkout = await handleApi("checkout", request("/api/billing/checkout", "POST", { planId: "pro", operationId: randomUUID() }));
    expect(checkout.status).toBe(503);
  }, 30000);
  it("uses a shared transactional abuse counter and rejects malformed Auth credentials", async () => {
    const scope = `backend-acceptance:${randomUUID()}`;
    const attempts = await Promise.allSettled(Array.from({ length: 3 }, () => rateLimit(db, scope, 2)));
    expect(attempts.filter(result => result.status === "fulfilled")).toHaveLength(2);
    expect((attempts.find(result => result.status === "rejected") as PromiseRejectedResult).reason.code).toBe("RATE_LIMITED");
    const invalid = await handleApi("session", request("/api/auth/session", "POST", { idToken: "not-a-valid-id-token" }));
    expect(invalid.status).toBe(401);
    expect((await invalid.json()).error.code).toBe("UNAUTHENTICATED");
  }, 30000);
  it("deduplicates concurrent saves and enforces quota atomically under a server test grant", async () => {
    const save = input();
    const results = await Promise.all([repo.create(owner, save), repo.create(owner, save)]);
    expect(results[0]).toEqual(results[1]);
    expect((await db.collection("users").doc(owner.uid).get()).data()?.savedSessionCount).toBe(1);
    await expect(repo.create(owner, { ...save, title: "changed" })).rejects.toMatchObject({ code: "OPERATION_CONFLICT" });
    const competing = await Promise.allSettled([repo.create(owner, input()), repo.create(owner, input())]);
    expect(competing.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const rejected = competing.find(result => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason.code).toBe("QUOTA_EXCEEDED");
    expect((await repo.list(owner, {})).quota.used).toBe(2);
  }, 30000);
  it("isolates Admin ownership, rejects conflicting revisions, paginates and preserves downgrade read/delete", async () => {
    await bootstrapProfile(db, other);
    const first = await repo.list(owner, { limit: 1 });
    expect(first.sessions).toHaveLength(1);
    expect(first.nextCursor).toBeTruthy();
    const second = await repo.list(owner, { cursor: first.nextCursor!, limit: 1 });
    expect(second.sessions[0].id).not.toBe(first.sessions[0].id);
    await expect(repo.list(other, { cursor: first.nextCursor!, limit: 1 })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    const id = first.sessions[0].id;
    await expect(repo.get(other, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(repo.delete(other, id, { expectedRevision: 1, operationId: randomUUID() })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const saved = await repo.get(owner, id);
    const update = { ...input(), snapshot: saved.session.snapshot, expectedRevision: 1 };
    const otherUpdate = { ...update, title: "other tab", operationId: randomUUID() };
    const outcomes = await Promise.allSettled([repo.update(owner, id, update), repo.update(owner, id, otherUpdate)]);
    expect(outcomes.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect((outcomes.find(result => result.status === "rejected") as PromiseRejectedResult).reason.code).toBe("REVISION_CONFLICT");
    const committed = (outcomes.find(result => result.status === "fulfilled") as PromiseFulfilledResult<Awaited<ReturnType<typeof repo.update>>>).value;
    const committedInput = committed.session.title === update.title ? update : otherUpdate;
    // Lost-response replay must be checked before the now-stale expectedRevision.
    expect(await repo.update(owner, id, committedInput)).toEqual(committed);
    await db.collection("billingAccounts").doc(owner.uid).set({ fixturePro: false });
    await expect(repo.create(owner, input())).rejects.toMatchObject({ code: "PRO_REQUIRED" });
    await expect(repo.update(owner, id, committedInput)).rejects.toMatchObject({ code: "PRO_REQUIRED" });
    const current = await repo.get(owner, id);
    expect(current.session.revision).toBe(2);
    const storedRef = db.collection("users").doc(owner.uid).collection("sessions").doc(id);
    await storedRef.update({ snapshot: { ...current.session.snapshot, schemaVersion: 99 } });
    await expect(repo.get(owner, id)).rejects.toMatchObject({ code: "UNSUPPORTED_SCHEMA" });
    expect((await storedRef.get()).exists).toBe(true);
    await storedRef.update({ snapshot: current.session.snapshot });
    const deletion = { operationId: randomUUID(), expectedRevision: current.session.revision };
    expect(await repo.delete(owner, id, deletion)).toEqual({ id, deleted: true });
    expect(await repo.delete(owner, id, deletion)).toEqual({ id, deleted: true });
    expect((await repo.list(owner, {})).quota.used).toBe(1);
    await expect(repo.get(owner, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(repo.delete(owner, id, { ...deletion, operationId: randomUUID() })).rejects.toMatchObject({ code: "NOT_FOUND" });
  }, 30000);
  it("denies unverified owner operations and disabled/revoked Auth cookies", async () => {
    await expect(repo.list({ ...owner, emailVerified: false }, {})).rejects.toMatchObject({ code: "EMAIL_VERIFICATION_REQUIRED" });
    await auth.updateUser(owner.uid, { disabled: true });
    await expect(authenticate(auth, request("/api/account"))).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await auth.updateUser(owner.uid, { disabled: false });
    // Provider revocation uses whole-second timestamps; move past the original issued second.
    await new Promise(resolve => setTimeout(resolve, 1100));
    await auth.revokeRefreshTokens(owner.uid);
    await expect(authenticate(auth, request("/api/account"))).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
  }, 30000);
});
