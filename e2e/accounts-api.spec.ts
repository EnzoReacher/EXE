import { test as base, expect, type Page, type BrowserContext } from "@playwright/test";
import { randomUUID, generateKeyPairSync } from "node:crypto";
import { cert, initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { API_PATHS, type ApiError, type SavedSnapshotV1 } from "../src/lib/accounts-billing/contracts";
import { prepareSession } from "../src/lib/experience-translator/engine";
import { goldenIntake, goldenAnswers } from "../src/lib/experience-translator/fixtures";
import { restoreSnapshot } from "../src/lib/accounts-billing/contracts.validation";

// Separate authenticated browser API transport suite. No FE UI or Stripe claim.
const projectId = process.env.GCLOUD_PROJECT ?? "";
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "";
if (!/^demo-ownpath-accounts-[a-z0-9]+$/.test(projectId) || !/^127\.0\.0\.1:\d+$/.test(authHost) || !/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST ?? "")) throw new Error("OWNED_ACCOUNTS_BROWSER_SCOPE_REQUIRED");
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
const app = initializeApp({ projectId, credential: cert({ projectId, clientEmail: `browser-fixture@${projectId}.iam.gserviceaccount.com`, privateKey }) }, `browser-${randomUUID()}`);
const auth = getAuth(app), db = getFirestore(app);
type Identity = { uid: string; token: string };
type BrowserResponse = { status: number; noStore: boolean; body: unknown };
const snapshot: SavedSnapshotV1 = { schemaVersion: 1, intake: goldenIntake, answers: goldenAnswers, prepared: prepareSession(goldenIntake, goldenAnswers), candidates: [] };

const test = base.extend<{ identity: (verified?: boolean) => Promise<Identity> }>({
  identity: async ({}, provide) => {
    const created: string[] = [];
    try {
      await provide(async (verified = true) => {
        const uid = `browser-fixture-${randomUUID()}`;
        const email = `${uid}@example.test`, password = "SyntheticBrowser-only-2026!";
        await auth.createUser({ uid, email, password, emailVerified: verified }); created.push(uid);
        const response = await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=synthetic-emulator-only`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
        const value = await response.json() as { idToken?: string };
        if (!response.ok || !value.idToken) throw new Error("SYNTHETIC_AUTH_FIXTURE_FAILED");
        return { uid, token: value.idToken };
      });
    } finally {
      const results = await Promise.allSettled(created.flatMap(uid => [db.recursiveDelete(db.collection("users").doc(uid)), auth.deleteUser(uid)]));
      if (results.some(result => result.status === "rejected")) throw new Error("SYNTHETIC_IDENTITY_CLEANUP_FAILED");
    }
  },
});
test.afterAll(async () => { await deleteApp(app); });
async function guard(page: Page, context: BrowserContext, baseURL: string) {
  let errors = 0; const unexpected: string[] = [];
  page.on("pageerror", () => { errors++; });
  await context.route("**/*", route => {
    const request = route.request(), url = new URL(request.url());
    const isApi = Object.values(API_PATHS).filter(value => value !== API_PATHS.stripeWebhook).some(value => url.pathname === value) || /^\/api\/sessions\/[a-f0-9-]{36}$/.test(url.pathname);
    const isPublic = request.method() === "GET" && (["/", "/experience-translator", "/icon.svg", "/favicon.ico"].includes(url.pathname) || url.pathname.startsWith("/_next/static/"));
    if (url.origin !== baseURL || (!isApi && !isPublic)) { unexpected.push("UNEXPECTED_AUTHENTICATED_REQUEST"); return route.abort(); }
    return route.continue();
  });
  await context.routeWebSocket("**/*", socket => { unexpected.push("UNEXPECTED_SOCKET"); socket.close(); });
  await page.goto("/experience-translator");
  // Expose only counters, never tokens, cookies or response bodies in logs.
  checks.set(page, () => { expect(unexpected).toEqual([]); expect(errors).toBe(0); });
}
const checks = new WeakMap<Page, () => void>();
test.beforeEach(async ({ page, context, baseURL }) => { await guard(page, context, baseURL!); });
test.afterEach(async ({ page }) => { checks.get(page)?.(); });

async function request(page: Page, path: string, method = "GET", body?: unknown, csrf?: string): Promise<BrowserResponse> {
  return page.evaluate(async ({ path, method, body, csrf }) => {
    const response = await fetch(path, { method, credentials: "same-origin", cache: "no-store", headers: method === "GET" ? undefined : { "content-type": "application/json", ...(csrf ? { "x-csrf-token": csrf } : {}) }, body: method === "GET" ? undefined : JSON.stringify(body) });
    return { status: response.status, noStore: (response.headers.get("cache-control") ?? "").split(",").some(value => value.trim().toLowerCase() === "no-store"), body: await response.json() };
  }, { path, method, body, csrf });
}
async function csrf(page: Page): Promise<string> {
  const response = await request(page, API_PATHS.csrf);
  expect(response.status).toBe(200); expect(response.noStore).toBe(true);
  const token = (response.body as { csrfToken: string }).csrfToken;
  expect(typeof token === "string" && /^[a-f0-9]{64}$/.test(token)).toBe(true);
  return token;
}
async function login(page: Page, identity: Identity) {
  const binding = await csrf(page);
  const response = await request(page, API_PATHS.session, "POST", { idToken: identity.token }, binding);
  expect(response.status).toBe(200); expect(response.noStore).toBe(true);
  return binding;
}
function expectError(response: BrowserResponse, status: number, code: string) {
  expect(response.status).toBe(status); expect(response.noStore).toBe(true);
  expect((response.body as ApiError).error.code).toBe(code);
}

test("real browser cookie exchange, CSRF, trusted profile and current logout", async ({ page, context, identity }) => {
  await test.step("AUTH_COOKIE_CSRF_PROFILE", async () => {
    expectError(await request(page, API_PATHS.account), 401, "UNAUTHENTICATED");
    const user = await identity(); const binding = await csrf(page);
    expectError(await request(page, API_PATHS.session, "POST", { idToken: user.token }), 403, "CSRF_INVALID");
    expect((await request(page, API_PATHS.session, "POST", { idToken: user.token }, binding)).status).toBe(200);
    const cookies = await context.cookies(); const session = cookies.find(cookie => cookie.name === "ownpath_session");
    expect(Boolean(session?.httpOnly && session.sameSite === "Strict" && !session.secure && session.path === "/")).toBe(true);
    expect(await page.evaluate(() => document.cookie.includes("ownpath_session") || document.cookie.includes("ownpath_csrf"))).toBe(false);
    expect((await request(page, API_PATHS.account)).body).toMatchObject({ identity: { uid: user.uid, emailVerified: true }, setup: "ready", entitlement: { planId: "free", capabilities: { savedSessionLimit: 2 } } });
    expect((await request(page, API_PATHS.account, "PATCH", { displayName: "Synthetic browser owner" }, binding)).status).toBe(200);
    expectError(await request(page, API_PATHS.account, "PATCH", { displayName: "Synthetic" }), 403, "CSRF_INVALID");
    expectError(await request(page, API_PATHS.account, "PATCH", { displayName: "Synthetic" }, "b".repeat(64)), 403, "CSRF_INVALID");
    expectError(await request(page, API_PATHS.account, "PATCH", { displayName: "Synthetic", planId: "pro" }, binding), 422, "INVALID_REQUEST");
  });
  await test.step("CURRENT_LOGOUT_COOKIE_CLEAR", async () => {
    const binding = await csrf(page);
    expect((await request(page, API_PATHS.session, "DELETE", { scope: "current" }, binding)).status).toBe(200);
    expect((await context.cookies()).some(cookie => cookie.name === "ownpath_session")).toBe(false);
    expectError(await request(page, API_PATHS.account), 401, "UNAUTHENTICATED");
  });
});

test("two owners, Free write denial and retained owner history deletion", async ({ page, browser, baseURL, identity }) => {
  const owner = await identity(); const other = await identity(); const binding = await login(page, owner);
  const id = randomUUID(), date = new Date().toISOString();
  // Explicit server-only persistence fixture, NOT payment-issued Pro or a browser write grant.
  const ref = db.collection("users").doc(owner.uid);
  await ref.collection("sessions").doc(id).set({ id, ownerUid: owner.uid, title: "Synthetic retained history", revision: 1, createdAt: date, updatedAt: date, snapshot });
  await ref.update({ savedSessionCount: 1 });
  await test.step("FREE_DENIAL_OWNER_HISTORY_RESTORE", async () => {
    expectError(await request(page, API_PATHS.sessions, "POST", { title: "Explicit synthetic save", operationId: randomUUID(), snapshot }, binding), 403, "PRO_REQUIRED");
    const existing = await request(page, `${API_PATHS.sessions}/${id}`); expect(existing.status).toBe(200);
    const restored = restoreSnapshot((existing.body as { session: { snapshot: unknown } }).session.snapshot);
    expect(restored.reviewRequired).toBe(true); expect(restored.prepared.facts.every(fact => !fact.confirmed)).toBe(true);
    expect((await request(page, `${API_PATHS.sessions}?limit=1`)).body).toMatchObject({ quota: { used: 1, limit: 2 } });
  });
  await test.step("CROSS_OWNER_NOT_FOUND_AND_DELETE_REPLAY", async () => {
    const isolated = await browser.newContext({ baseURL });
    try {
      const otherPage = await isolated.newPage(); await guard(otherPage, isolated, baseURL!); const otherBinding = await login(otherPage, other);
      expectError(await request(otherPage, `${API_PATHS.sessions}/${id}`), 404, "NOT_FOUND");
      expectError(await request(otherPage, `${API_PATHS.sessions}/${id}`, "DELETE", { expectedRevision: 1, operationId: randomUUID() }, otherBinding), 404, "NOT_FOUND");
      expectError(await request(otherPage, API_PATHS.account, "PATCH", { displayName: "Synthetic" }, binding), 403, "CSRF_INVALID");
      expect((await request(otherPage, API_PATHS.sessions)).body).toMatchObject({ sessions: [], quota: { used: 0, limit: 2 } });
      checks.get(otherPage)?.();
    } finally { await isolated.close(); }
    const deletion = { expectedRevision: 1, operationId: randomUUID() };
    expect((await request(page, `${API_PATHS.sessions}/${id}`, "DELETE", deletion, binding)).status).toBe(200);
    expect((await request(page, `${API_PATHS.sessions}/${id}`, "DELETE", deletion, binding)).status).toBe(200);
    expect((await request(page, API_PATHS.sessions)).body).toMatchObject({ sessions: [], quota: { used: 0, limit: 2 } });
  });
});

test("unverified and disabled identity denial with unavailable sandbox catalog", async ({ page, identity }) => {
  await test.step("UNVERIFIED_PRIVILEGED_ACTION_DENIAL", async () => {
    const user = await identity(false); const binding = await login(page, user);
    expect((await request(page, API_PATHS.account)).body).toMatchObject({ verification: "required", entitlement: { capabilities: { canSave: false } } });
    expectError(await request(page, API_PATHS.sessions), 403, "EMAIL_VERIFICATION_REQUIRED");
    expectError(await request(page, API_PATHS.checkout, "POST", { planId: "pro", operationId: randomUUID() }, binding), 403, "EMAIL_VERIFICATION_REQUIRED");
    const catalog = await request(page, API_PATHS.plans); expect(catalog.status).toBe(200);
    expect(catalog.body).toMatchObject({ environment: "sandbox", pro: { availability: "unavailable" } });
  });
  await test.step("DISABLED_IDENTITY_RECHECK", async () => {
    const user = await identity(); await login(page, user); await auth.updateUser(user.uid, { disabled: true });
    expectError(await request(page, API_PATHS.account), 401, "UNAUTHENTICATED");
  });
});
