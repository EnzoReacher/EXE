"use client";

import { initializeApp, getApps } from "firebase/app";
import type { FirebaseOptions } from "firebase/app";
import { applyActionCode, checkActionCode, confirmPasswordReset, connectAuthEmulator, createUserWithEmailAndPassword, getAuth, inMemoryPersistence, reload, sendEmailVerification, sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword, signOut, validatePassword, verifyPasswordResetCode } from "firebase/auth";
import type { Auth, User } from "firebase/auth";
import { API_PATHS } from "./contracts";
import type { ApiError, CsrfResponse, LogoutRequest, SessionExchangeResponse } from "./contracts";

export type AuthCredentials = { email: string; password: string };
export type AuthClientCode = "INVALID_CREDENTIALS" | "INVALID_ACTION" | "WEAK_PASSWORD" | "RATE_LIMITED" | "UNAVAILABLE" | "REQUEST_FAILED";
export class AccountAuthError extends Error {
  constructor(public readonly code: AuthClientCode, public readonly phase: "identity" | "identity_created_session_pending" | "session" = "identity", public readonly apiError?: ApiError["error"]) {
    super("The account action could not be completed. Please try again.");
  }
}
function safeAuthError(error: unknown, phase: AccountAuthError["phase"] = "identity"): AccountAuthError {
  if (error instanceof AccountAuthError) return new AccountAuthError(error.code, phase, error.apiError);
  const code = (error as { code?: string })?.code ?? "";
  if (code === "auth/too-many-requests") return new AccountAuthError("RATE_LIMITED", phase);
  if (["auth/invalid-action-code", "auth/expired-action-code", "auth/invalid-continue-uri", "auth/unauthorized-continue-uri"].includes(code)) return new AccountAuthError("INVALID_ACTION", phase);
  if (["auth/weak-password", "auth/password-does-not-meet-requirements"].includes(code)) return new AccountAuthError("WEAK_PASSWORD", phase);
  if (["auth/network-request-failed", "auth/internal-error", "auth/configuration-not-found"].includes(code)) return new AccountAuthError("UNAVAILABLE", phase);
  // Includes existing email, missing account, wrong password and disabled identity: neutral by design.
  return new AccountAuthError("INVALID_CREDENTIALS", phase);
}
async function responseJson<T>(response: Response): Promise<T> {
  let body: unknown;
  try { body = await response.json(); } catch { throw new AccountAuthError("UNAVAILABLE", "session"); }
  if (!response.ok) {
    const error = (body as ApiError)?.error;
    // Never copy a server/provider message into exception text or telemetry.
    throw new AccountAuthError(response.status === 429 ? "RATE_LIMITED" : response.status >= 500 ? "UNAVAILABLE" : "REQUEST_FAILED", "session", error && typeof error.code === "string" ? error : undefined);
  }
  return body as T;
}
/** Same-origin transport for frozen APIs. Every mutation obtains a current HttpOnly-bound CSRF token. */
export async function accountsRequest<T>(path: string, method: "GET" | "POST" | "PATCH" | "DELETE" = "GET", body?: unknown): Promise<T> {
  try { return await requestAccounts<T>(path, method, body); }
  catch (error) {
    if (error instanceof AccountAuthError) throw error;
    throw new AccountAuthError("UNAVAILABLE", "session");
  }
}
let csrfBootstrap: Promise<string> | null = null;
function csrfBinding(): Promise<string> {
  if (csrfBootstrap) return csrfBootstrap;
  const bootstrap = (async () => {
    const response = await fetch(API_PATHS.csrf, { credentials: "same-origin", cache: "no-store" });
    return (await responseJson<CsrfResponse>(response)).csrfToken;
  })();
  const pending = bootstrap.finally(() => { if (csrfBootstrap === pending) csrfBootstrap = null; });
  csrfBootstrap = pending;
  return pending;
}
async function requestAccounts<T>(path: string, method: "GET" | "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
  const allowed = Object.values(API_PATHS).filter(value => value !== API_PATHS.stripeWebhook);
  const base = path.split("?")[0];
  if (path.includes("#") || path.includes("\\") || (!allowed.some(value => base === value) && !/^\/api\/sessions\/[a-f0-9-]{36}$/i.test(base)) || (path.includes("?") && (method !== "GET" || base !== API_PATHS.sessions))) throw new AccountAuthError("REQUEST_FAILED", "session");
  // Serialize once: even a caller mutating its object during a rejected request cannot change the retry.
  const serialized = method === "GET" ? undefined : JSON.stringify(body);
  for (let attempt = 0; attempt < 2; attempt++) {
    const csrfToken = method === "GET" ? undefined : await csrfBinding();
    // Network failures and ambiguous responses are NEVER automatically retried.
    const response = await fetch(path, {
      method, credentials: "same-origin", cache: "no-store",
      headers: method === "GET" ? undefined : { "Content-Type": "application/json", "X-CSRF-Token": csrfToken! },
      body: serialized,
    });
    try { return await responseJson<T>(response); }
    catch (error) {
      // Server rejects CSRF before business side effects. A competing tab can have replaced the
      // cookie after bootstrap. Recover once with a fresh binding; retain the exact operation/body.
      if (method !== "GET" && attempt === 0 && response.status === 403 && error instanceof AccountAuthError && error.apiError?.code === "CSRF_INVALID") continue;
      throw error;
    }
  }
  throw new AccountAuthError("REQUEST_FAILED", "session");
}
export type AccountsAuthAdapter = {
  register(credentials: AuthCredentials): Promise<{ session: SessionExchangeResponse; verificationEmail: "sent" | "pending" }>;
  login(credentials: AuthCredentials): Promise<SessionExchangeResponse>;
  refreshVerification(credentials: AuthCredentials): Promise<SessionExchangeResponse>;
  resendVerification(credentials: AuthCredentials): Promise<{ verificationEmail: "sent" | "already_verified" }>;
  requestPasswordReset(email: string): Promise<{ requested: true }>;
  checkAction(code: string): Promise<{ operation: string }>;
  applyVerification(code: string): Promise<void>;
  checkPasswordReset(code: string): Promise<{ valid: true }>;
  completePasswordReset(code: string, newPassword: string): Promise<void>;
  passwordPolicy(password: string): ReturnType<typeof validatePassword>;
  logout(scope?: LogoutRequest["scope"]): Promise<void>;
};
const configuredEmulators = new WeakSet<Auth>();
const credentialQueues = new WeakMap<Auth, Promise<unknown>>();
/** Explicit emulator-only config. Never writes tokens/passwords to persistent browser storage. */
export async function createAccountsAuthAdapter(options: FirebaseOptions, emulatorUrl: string): Promise<AccountsAuthAdapter> {
  let emulator: URL;
  try { emulator = new URL(emulatorUrl); } catch { throw new AccountAuthError("UNAVAILABLE"); }
  if (!options.projectId?.startsWith("demo-") || !["localhost", "127.0.0.1", "[::1]"].includes(emulator.hostname) || emulator.protocol !== "http:" || emulator.username || emulator.password || emulator.pathname !== "/" || emulator.search || emulator.hash) throw new AccountAuthError("UNAVAILABLE");
  const name = `ownpath-client-${options.projectId}`;
  const app = getApps().find(value => value.name === name) ?? initializeApp(options, name);
  const auth = getAuth(app);
  if (!configuredEmulators.has(auth)) {
    connectAuthEmulator(auth, emulator.origin, { disableWarnings: false });
    configuredEmulators.add(auth);
  }
  await setPersistence(auth, inMemoryPersistence);
  const exchange = async (user: User): Promise<SessionExchangeResponse> => accountsRequest(API_PATHS.session, "POST", { idToken: await user.getIdToken(true) });
  // Serialize SDK credential use: overlapping tab actions cannot exchange a different in-memory user.
  function serial<T>(work: () => Promise<T>): Promise<T> {
    const run = (credentialQueues.get(auth) ?? Promise.resolve()).catch(() => undefined).then(work);
    credentialQueues.set(auth, run);
    return run;
  }
  async function withCredentials<T>(credentials: AuthCredentials, work: (user: User) => Promise<T>): Promise<T> {
    return serial(async () => {
      try { return await work((await signInWithEmailAndPassword(auth, credentials.email, credentials.password)).user); }
      catch (error) { throw safeAuthError(error, error instanceof AccountAuthError ? error.phase : "identity"); }
      finally { try { await signOut(auth); } catch (error) { throw safeAuthError(error, "session"); } }
    });
  }
  return {
    register: credentials => serial(async () => {
      let created = false;
      try {
        const user = (await createUserWithEmailAndPassword(auth, credentials.email, credentials.password)).user;
        created = true;
        let verificationEmail: "sent" | "pending" = "sent";
        try { await sendEmailVerification(user); } catch { verificationEmail = "pending"; }
        return { session: await exchange(user), verificationEmail };
      } catch (error) { throw safeAuthError(error, created ? "identity_created_session_pending" : "identity"); }
      finally { try { await signOut(auth); } catch (error) { throw safeAuthError(error, created ? "identity_created_session_pending" : "identity"); } }
    }),
    login: credentials => withCredentials(credentials, exchange),
    refreshVerification: credentials => withCredentials(credentials, async user => { await reload(user); return exchange(user); }),
    resendVerification: credentials => withCredentials(credentials, async user => {
      await reload(user);
      if (user.emailVerified) return { verificationEmail: "already_verified" };
      await sendEmailVerification(user);
      return { verificationEmail: "sent" };
    }),
    requestPasswordReset: async email => {
      try { await sendPasswordResetEmail(auth, email); return { requested: true }; }
      catch (error) {
        if ((error as { code?: string })?.code === "auth/user-not-found") return { requested: true };
        throw safeAuthError(error);
      }
    },
    checkAction: async code => {
      try { return { operation: (await checkActionCode(auth, code)).operation }; }
      catch (error) { throw safeAuthError(error); }
    },
    applyVerification: async code => {
      try {
        const info = await checkActionCode(auth, code);
        if (info.operation !== "VERIFY_EMAIL") throw new AccountAuthError("INVALID_ACTION");
        await applyActionCode(auth, code);
      } catch (error) { throw safeAuthError(error); }
    },
    checkPasswordReset: async code => {
      try { await verifyPasswordResetCode(auth, code); return { valid: true }; }
      catch (error) { throw safeAuthError(error); }
    },
    completePasswordReset: async (code, password) => {
      try { await confirmPasswordReset(auth, code, password); }
      catch (error) { throw safeAuthError(error); }
    },
    passwordPolicy: async password => {
      try { return await validatePassword(auth, password); }
      catch (error) {
        const safe = safeAuthError(error);
        // Policy lookup does not authenticate credentials. An unsupported schema
        // or malformed SDK response is unavailability, never a wrong password.
        throw safe.code === "INVALID_CREDENTIALS" ? new AccountAuthError("UNAVAILABLE") : safe;
      }
    },
    logout: (scope = "current") => serial(async () => {
      try { await accountsRequest(API_PATHS.session, "DELETE", { scope }); }
      finally { try { await signOut(auth); } catch (error) { throw safeAuthError(error, "session"); } }
    }),
  };
}
