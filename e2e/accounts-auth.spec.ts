import { test as base, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID, generateKeyPairSync } from "node:crypto";
import { cert, initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import ts from "typescript";
import type { AccountsAuthAdapter } from "../src/lib/accounts-billing/client-auth";

declare global {
  interface Window {
    ownpathBrowserAdapter: AccountsAuthAdapter;
    ownpathBrowserSdkCleared: () => boolean;
  }
}
const projectId = process.env.GCLOUD_PROJECT ?? "";
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "";
if (process.env.OWNPATH_ACCOUNTS_BROWSER_ACCEPTANCE !== "1" || !/^demo-ownpath-accounts-[a-z0-9]+$/.test(projectId) || !/^127\.0\.0\.1:\d+$/.test(authHost) || !/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST ?? "")) throw new Error("OWNED_AUTH_BROWSER_SCOPE_REQUIRED");
const emulatorOrigin = `http://${authHost}`;
const prefix = "/__ownpath_auth_acceptance__/";
const root = process.cwd();
const version = (JSON.parse(readFileSync(path.join(root, "node_modules/firebase/package.json"), "utf8")) as { version: string }).version;
const assets = new Map([
  ["app.js", readFileSync(path.join(root, "node_modules/firebase/firebase-app.js"), "utf8")],
  ["auth.js", readFileSync(path.join(root, "node_modules/firebase/firebase-auth.js"), "utf8")],
  ...["client-auth", "contracts"].map(name => [name, ts.transpileModule(readFileSync(path.join(root, `src/lib/accounts-billing/${name}.ts`), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText] as [string, string]),
]);
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
const app = initializeApp({ projectId, credential: cert({ projectId, clientEmail: `sdk-fixture@${projectId}.iam.gserviceaccount.com`, privateKey }) }, `auth-browser-${randomUUID()}`);
const admin = getAuth(app), db = getFirestore(app);
type Credentials = { email: string; password: string };
type Fixture = { credentials: Credentials; outage: { exchange: boolean; mail: boolean } };

const test = base.extend<{ fixture: Fixture }>({
  fixture: async ({ page, context, baseURL }, provide) => {
    const credentials = { email: `sdk-browser-${randomUUID()}@example.test`, password: "SyntheticBrowser-only-2026!" };
    const outage = { exchange: false, mail: false };
    let unexpected = 0, pageErrors = 0;
    page.on("pageerror", () => { pageErrors++; });
    await context.route("**/*", async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === baseURL && url.pathname.startsWith(prefix) && request.method() === "GET") {
        const source = assets.get(url.pathname.slice(prefix.length));
        if (source !== undefined) return route.fulfill({ status: 200, contentType: "text/javascript", headers: { "cache-control": "no-store" }, body: source });
      }
      const appRequest = url.origin === baseURL && ((request.method() === "GET" && (["/", "/experience-translator", "/icon.svg", "/favicon.ico", "/api/account", "/api/auth/csrf"].includes(url.pathname) || url.pathname.startsWith("/_next/static/"))) || (url.pathname === "/api/auth/session" && ["POST", "DELETE"].includes(request.method())));
      const authRequest = url.origin === emulatorOrigin && ["GET", "POST", "OPTIONS"].includes(request.method()) && /^\/(identitytoolkit|securetoken)\.googleapis\.com\//.test(url.pathname);
      if (!appRequest && !authRequest) { unexpected++; return route.abort(); }
      if (outage.exchange && url.origin === baseURL && url.pathname === "/api/auth/session" && request.method() === "POST") { outage.exchange = false; return route.abort(); }
      if (outage.mail && authRequest && url.pathname.endsWith("/accounts:sendOobCode")) { outage.mail = false; return route.abort(); }
      return route.continue();
    });
    await context.routeWebSocket("**/*", socket => { unexpected++; socket.close(); });
    try {
      await page.goto("/experience-translator");
      // Playwright-only local module delivery: no app fixture endpoint or SDK mock.
      // The installed Firebase Auth ESM's CDN import is remapped to the exact local App asset.
      await page.addScriptTag({ type: "importmap", content: JSON.stringify({ imports: { "firebase/app": `${prefix}app.js`, "firebase/auth": `${prefix}auth.js`, [`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`]: `${prefix}app.js` } }) });
      await page.evaluate(async ({ prefix, projectId, emulatorOrigin }) => {
        const entry = `${prefix}client-auth`;
        const adapterModule = await import(entry) as typeof import("../src/lib/accounts-billing/client-auth");
        window.ownpathBrowserAdapter = await adapterModule.createAccountsAuthAdapter({ projectId, apiKey: "synthetic-emulator-key", authDomain: `${projectId}.firebaseapp.com` }, emulatorOrigin);
        const { getApps } = await import("firebase/app");
        const { getAuth } = await import("firebase/auth");
        window.ownpathBrowserSdkCleared = () => getApps().every(app => getAuth(app).currentUser === null);
      }, { prefix, projectId, emulatorOrigin });
      await provide({ credentials, outage });
      expect(unexpected).toBe(0); expect(pageErrors).toBe(0);
      await expectMemoryCleared(page);
    } finally {
      try {
        const user = await admin.getUserByEmail(credentials.email);
        const results = await Promise.allSettled([db.recursiveDelete(db.collection("users").doc(user.uid)), admin.deleteUser(user.uid)]);
        if (results.some(result => result.status === "rejected")) throw new Error("SYNTHETIC_AUTH_CLEANUP_FAILED");
      } catch (error) { if ((error as { code?: string }).code !== "auth/user-not-found") throw new Error("SYNTHETIC_AUTH_CLEANUP_FAILED"); }
    }
  },
});
test.afterAll(async () => { await deleteApp(app); });
async function expectMemoryCleared(page: Page) {
  const cleared = await page.evaluate(async () => {
    let persistentAuth = false;
    // getAuth may initialize an empty persistence DB before setPersistence(memory).
    // Inspect credential records, not mere database existence; never return records.
    if ((await indexedDB.databases()).some(database => database.name === "firebaseLocalStorageDb")) {
      persistentAuth = await new Promise<boolean>((resolve, reject) => {
        const open = indexedDB.open("firebaseLocalStorageDb");
        open.onerror = () => reject(new Error("PERSISTENCE_INSPECTION_FAILED"));
        open.onsuccess = () => {
          const database = open.result;
          if (!database.objectStoreNames.contains("firebaseLocalStorage")) { database.close(); resolve(false); return; }
          const transaction = database.transaction("firebaseLocalStorage", "readonly");
          const keys = transaction.objectStore("firebaseLocalStorage").getAllKeys();
          keys.onsuccess = () => { persistentAuth = keys.result.some(key => String(key).startsWith("firebase:authUser:")); };
          transaction.oncomplete = () => { database.close(); resolve(persistentAuth); };
          transaction.onerror = () => { database.close(); reject(new Error("PERSISTENCE_INSPECTION_FAILED")); };
        };
      });
    }
    return { sdk: window.ownpathBrowserSdkCleared(), local: localStorage.length === 0, session: sessionStorage.length === 0, persistentAuth };
  });
  expect(cleared).toEqual({ sdk: true, local: true, session: true, persistentAuth: false });
}
async function actionCode(email: string, requestType: "VERIFY_EMAIL" | "PASSWORD_RESET") {
  const response = await fetch(`${emulatorOrigin}/emulator/v1/projects/${projectId}/oobCodes`, { signal: AbortSignal.timeout(3000) });
  if (!response.ok) throw new Error("EMULATOR_ACTION_FIXTURE_FAILED");
  const data = await response.json() as { oobCodes?: { email: string; requestType: string; oobCode: string }[] };
  const match = data.oobCodes?.filter(code => code.email === email && code.requestType === requestType).at(-1);
  if (!match?.oobCode) throw new Error("EMULATOR_ACTION_FIXTURE_MISSING");
  return match.oobCode;
}

test("official SDK signup, policy and duplicate handling with memory-only cleanup", async ({ page, fixture }) => {
  await test.step("SDK_POLICY_AND_SIGNUP", async () => {
    // Verify observed native SDK failure becomes safe unavailability.
    // Do not infer cloud policy enforcement or a response-schema root cause.
    const policy = await page.evaluate(async () => {
      try { await window.ownpathBrowserAdapter.passwordPolicy("SyntheticBrowser-only-2026!"); return { safeCode: "UNEXPECTED_POLICY_SUCCESS" }; }
      catch (adapterError) {
        const { getApps } = await import("firebase/app");
        const { getAuth, validatePassword } = await import("firebase/auth");
        try { await validatePassword(getAuth(getApps()[0]), "SyntheticBrowser-only-2026!"); }
        catch {
          return { safeCode: (adapterError as { code: string }).code, nativeRejected: true };
        }
        return { safeCode: "UNEXPECTED_NATIVE_POLICY_SUCCESS" };
      }
    });
    if (policy.safeCode !== "UNAVAILABLE") throw new Error("SDK_POLICY_SAFE_UNAVAILABILITY_MISSING");
    expect(policy).toEqual({ safeCode: "UNAVAILABLE", nativeRejected: true });
    const result = await page.evaluate(credentials => window.ownpathBrowserAdapter.register(credentials), fixture.credentials);
    expect(result.verificationEmail).toBe("sent");
    expect(result.session.account).toMatchObject({ setup: "ready", verification: "required", entitlement: { planId: "free" } });
    expect(Number.isFinite(Date.parse(result.session.expiresAt))).toBe(true);
    await expectMemoryCleared(page);
  });
  await test.step("SDK_DUPLICATE_AND_CURRENT_LOGOUT", async () => {
    const duplicate = await page.evaluate(async credentials => {
      try { await window.ownpathBrowserAdapter.register(credentials); return { code: "UNEXPECTED_SUCCESS" }; }
      catch (error) { const safe = error as { code: string; phase: string }; return { code: safe.code, phase: safe.phase }; }
    }, fixture.credentials);
    expect(duplicate).toEqual({ code: "INVALID_CREDENTIALS", phase: "identity" });
    await page.evaluate(() => window.ownpathBrowserAdapter.logout("current"));
    expect((await page.evaluate(async () => (await fetch("/api/account")).status))).toBe(401);
  });
});

test("official SDK verification refresh and reset action lifecycle", async ({ page, fixture }) => {
  await test.step("SDK_REGISTER_RESEND_VERIFY", async () => {
    await page.evaluate(credentials => window.ownpathBrowserAdapter.register(credentials), fixture.credentials);
    expect(await page.evaluate(credentials => window.ownpathBrowserAdapter.resendVerification(credentials), fixture.credentials)).toEqual({ verificationEmail: "sent" });
    const code = await actionCode(fixture.credentials.email, "VERIFY_EMAIL");
    expect(await page.evaluate(code => window.ownpathBrowserAdapter.checkAction(code), code)).toEqual({ operation: "VERIFY_EMAIL" });
    await page.evaluate(code => window.ownpathBrowserAdapter.applyVerification(code), code);
    const stale = await page.evaluate(async () => (await fetch("/api/account")).json());
    expect(stale).toMatchObject({ verification: "required" });
    const refreshed = await page.evaluate(credentials => window.ownpathBrowserAdapter.refreshVerification(credentials), fixture.credentials);
    expect(refreshed.account.verification).toBe("verified");
    expect(await page.evaluate(credentials => window.ownpathBrowserAdapter.resendVerification(credentials), fixture.credentials)).toEqual({ verificationEmail: "already_verified" });
  });
  await test.step("SDK_RESET_ACTION_AND_NEW_LOGIN", async () => {
    expect(await page.evaluate(email => window.ownpathBrowserAdapter.requestPasswordReset(email), fixture.credentials.email)).toEqual({ requested: true });
    expect(await page.evaluate(email => window.ownpathBrowserAdapter.requestPasswordReset(email), `missing-${randomUUID()}@example.test`)).toEqual({ requested: true });
    const code = await actionCode(fixture.credentials.email, "PASSWORD_RESET");
    const wrongMode = await page.evaluate(async code => {
      try { await window.ownpathBrowserAdapter.applyVerification(code); return "UNEXPECTED_SUCCESS"; } catch (error) { return (error as { code: string }).code; }
    }, code);
    expect(wrongMode).toBe("INVALID_ACTION");
    expect(await page.evaluate(code => window.ownpathBrowserAdapter.checkPasswordReset(code), code)).toEqual({ valid: true });
    const password = "NewSyntheticBrowser-only-2026!";
    await page.evaluate(({ code, password }) => window.ownpathBrowserAdapter.completePasswordReset(code, password), { code, password });
    const used = await page.evaluate(async code => {
      try { await window.ownpathBrowserAdapter.checkPasswordReset(code); return "UNEXPECTED_SUCCESS"; } catch (error) { return (error as { code: string }).code; }
    }, code);
    expect(used).toBe("INVALID_ACTION");
    const oldPassword = await page.evaluate(async credentials => {
      try { await window.ownpathBrowserAdapter.login(credentials); return "UNEXPECTED_SUCCESS"; } catch (error) { return (error as { code: string }).code; }
    }, fixture.credentials);
    expect(oldPassword).toBe("INVALID_CREDENTIALS");
    const login = await page.evaluate(credentials => window.ownpathBrowserAdapter.login(credentials), { ...fixture.credentials, password });
    expect(login.account.verification).toBe("verified");
    await page.evaluate(() => window.ownpathBrowserAdapter.logout("all"));
    expect(await page.evaluate(async () => (await fetch("/api/account")).status)).toBe(401);
  });
});

test("official SDK recovers created identity and mail failure under injected network outages", async ({ page, fixture }) => {
  await test.step("SDK_CREATED_IDENTITY_SESSION_OUTAGE", async () => {
    fixture.outage.exchange = true;
    const pending = await page.evaluate(async credentials => {
      try { await window.ownpathBrowserAdapter.register(credentials); return "UNEXPECTED_SUCCESS"; } catch (error) { return (error as { phase: string }).phase; }
    }, fixture.credentials);
    expect(pending).toBe("identity_created_session_pending");
    const existing = await admin.getUserByEmail(fixture.credentials.email);
    expect((await db.collection("users").doc(existing.uid).get()).exists).toBe(false);
    await expectMemoryCleared(page);
    const repaired = await page.evaluate(credentials => window.ownpathBrowserAdapter.login(credentials), fixture.credentials);
    expect(repaired.account.identity.uid).toBe(existing.uid); expect(repaired.account.setup).toBe("ready");
  });
  await test.step("SDK_MAIL_OUTAGE_RESEND_AND_INVALID_CODE", async () => {
    fixture.outage.mail = true;
    const mailFailure = await page.evaluate(async credentials => {
      try { await window.ownpathBrowserAdapter.resendVerification(credentials); return "UNEXPECTED_SUCCESS"; } catch (error) { return (error as { code: string }).code; }
    }, fixture.credentials);
    expect(mailFailure).toBe("UNAVAILABLE");
    expect(await page.evaluate(credentials => window.ownpathBrowserAdapter.resendVerification(credentials), fixture.credentials)).toEqual({ verificationEmail: "sent" });
    const invalid = await page.evaluate(async () => {
      try { await window.ownpathBrowserAdapter.checkAction("synthetic-invalid-action"); return "UNEXPECTED_SUCCESS"; } catch (error) { return (error as { code: string }).code; }
    });
    expect(invalid).toBe("INVALID_ACTION");
    await page.evaluate(() => window.ownpathBrowserAdapter.logout());
  });
});

test("all-session logout revokes a second browser cookie without touching its cookie jar", async ({ page, context, browser, baseURL, fixture }) => {
  await test.step("TWO_BROWSER_SESSIONS_ACTIVE", async () => {
    const first = await page.evaluate(credentials => window.ownpathBrowserAdapter.register(credentials), fixture.credentials);
    expect(first.session.account.identity.email).toBe(fixture.credentials.email);
    expect(await page.evaluate(async () => (await fetch("/api/account")).status)).toBe(200);
  });

  const secondContext = await browser.newContext({ baseURL });
  try {
    let unexpected = 0;
    await secondContext.route("**/*", route => {
      const request = route.request(), url = new URL(request.url());
      const allowed = url.origin === baseURL && (
        request.method() === "GET" && (["/experience-translator", "/", "/api/auth/csrf", "/api/account", "/favicon.ico", "/icon.svg"].includes(url.pathname) || url.pathname.startsWith("/_next/static/"))
        || request.method() === "POST" && url.pathname === "/api/auth/session"
      );
      if (!allowed) { unexpected++; return route.abort(); }
      return route.continue();
    });
    await secondContext.routeWebSocket("**/*", socket => { unexpected++; socket.close(); });
    const second = await secondContext.newPage();
    await second.goto("/experience-translator");
    // Obtain a different recent provider token in memory from the same owned Auth emulator.
    // The second browser uses the real cookie-exchange route, never an Admin-issued app cookie.
    const provider = await fetch(`${emulatorOrigin}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=synthetic-emulator-key`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...fixture.credentials, returnSecureToken: true }), signal: AbortSignal.timeout(3000),
    });
    const token = (await provider.json() as { idToken?: string }).idToken;
    if (!provider.ok || !token) throw new Error("SECOND_EMULATOR_IDENTITY_FAILED");
    const authSecond = (JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()) as { auth_time?: number }).auth_time;
    if (typeof authSecond !== "number" || !Number.isSafeInteger(authSecond) || authSecond <= 0) throw new Error("SECOND_EMULATOR_TOKEN_TIME_MISSING");
    await test.step("SECOND_BROWSER_COOKIE_EXCHANGE", async () => {
      const response = await second.evaluate(async idToken => {
        const csrfResponse = await fetch("/api/auth/csrf", { credentials: "same-origin", cache: "no-store" });
        const { csrfToken } = await csrfResponse.json() as { csrfToken: string };
        const exchange = await fetch("/api/auth/session", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "content-type": "application/json", "x-csrf-token": csrfToken }, body: JSON.stringify({ idToken }) });
        return { csrf: csrfResponse.status, exchange: exchange.status };
      }, token);
      expect(response).toEqual({ csrf: 200, exchange: 200 });
      expect(await second.evaluate(async () => (await fetch("/api/account")).status)).toBe(200);
      expect((await secondContext.cookies()).some(cookie => cookie.name === "ownpath_session" && cookie.httpOnly)).toBe(true);
    });
    await test.step("REVOKE_ALL_SECOND_COOKIE_REJECTED", async () => {
      // Firebase's tokensValidAfterTime is whole-second precision. Cross the
      // observed auth_time second before revoking; no arbitrary fixed sleep.
      await expect.poll(() => Math.floor(Date.now() / 1000), { timeout: 3000, intervals: [25, 50, 100] }).toBeGreaterThan(authSecond);
      await page.evaluate(() => window.ownpathBrowserAdapter.logout("all"));
      expect((await context.cookies()).some(cookie => cookie.name === "ownpath_session")).toBe(false);
      expect(await page.evaluate(async () => (await fetch("/api/account")).status)).toBe(401);
      // No request in the second context cleared its cookie: server authorization must reject it.
      expect((await secondContext.cookies()).some(cookie => cookie.name === "ownpath_session" && cookie.httpOnly)).toBe(true);
      const result = await second.evaluate(async () => {
        const response = await fetch("/api/account", { cache: "no-store", credentials: "same-origin" });
        return { status: response.status, code: (await response.json() as { error?: { code?: string } }).error?.code };
      });
      expect(result).toEqual({ status: 401, code: "SESSION_EXPIRED" });
      expect(unexpected).toBe(0);
    });
  } finally { await secondContext.close(); }
});
