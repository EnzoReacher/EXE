import "server-only";
import type { Auth, DecodedIdToken } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import type { AccountResponse, Entitlement, TrustedIdentity } from "./contracts";
import { ApiFailure, failure } from "./server-errors";
import { cookieValue, SESSION_COOKIE } from "./server-security";

export type ServerIdentity = TrustedIdentity & { authTime: number };
function providerError(error: unknown): never {
  const code = (error as { code?: string })?.code;
  if (["auth/session-cookie-expired", "auth/session-cookie-revoked", "auth/id-token-expired", "auth/id-token-revoked"].includes(code ?? "")) failure("SESSION_EXPIRED");
  if (["auth/argument-error", "auth/invalid-id-token", "auth/invalid-session-cookie", "auth/user-not-found", "auth/user-disabled", "auth/invalid-argument"].includes(code ?? "")) failure("UNAUTHENTICATED");
  return failure("SERVICE_UNAVAILABLE", true);
}
export function requireRecent(identity: ServerIdentity, now = Date.now()): void {
  if (!Number.isFinite(identity.authTime) || identity.authTime * 1000 < now - 300000 || identity.authTime * 1000 > now + 60000) failure("RECENT_AUTH_REQUIRED");
}
export function requireVerified(identity: ServerIdentity): void {
  if (!identity.emailVerified) failure("EMAIL_VERIFICATION_REQUIRED");
}
async function trustedIdentity(auth: Auth, token: DecodedIdToken): Promise<ServerIdentity> {
  try {
    const user = await auth.getUser(token.uid);
    if (user.disabled || !user.uid || user.uid.includes("/") || user.uid.length > 128) failure("UNAUTHENTICATED");
    // Do not grant verified access from stale cookies: both fresh user state and signed token must agree.
    return { uid: user.uid, email: user.email ?? null, emailVerified: user.emailVerified && token.email_verified === true, authTime: token.auth_time };
  } catch (error) {
    if (error instanceof ApiFailure) throw error;
    return providerError(error);
  }
}
export async function identityFromToken(auth: Auth, idToken: string): Promise<ServerIdentity> {
  let token: DecodedIdToken;
  try { token = await auth.verifyIdToken(idToken, true); } catch (error) { return providerError(error); }
  const identity = await trustedIdentity(auth, token);
  requireRecent(identity);
  return identity;
}
export async function authenticate(auth: Auth, request: Request): Promise<ServerIdentity> {
  const cookie = cookieValue(request, SESSION_COOKIE);
  if (!cookie) return failure("UNAUTHENTICATED");
  let token: DecodedIdToken;
  try { token = await auth.verifySessionCookie(cookie, true); } catch (error) { return providerError(error); }
  return trustedIdentity(auth, token);
}
export function freeEntitlement(identity: ServerIdentity, now = new Date(), savedSessionLimit = 50): Entitlement {
  // Conservative fallback only. Positive Pro authorization belongs to BillingService's canonical projection.
  return {
    planId: "free", capabilities: { canSave: false, canReadSaved: identity.emailVerified, canDeleteSaved: identity.emailVerified, savedSessionLimit },
    validUntil: null, version: 0, asOf: now.toISOString(),
  };
}
export async function bootstrapProfile(db: Firestore, identity: ServerIdentity): Promise<void> {
  const ref = db.collection("users").doc(identity.uid);
  await db.runTransaction(async transaction => {
    const existing = await transaction.get(ref);
    if (!existing.exists) {
      const now = new Date().toISOString();
      transaction.create(ref, { displayName: "", createdAt: now, updatedAt: now, savedSessionCount: 0 });
    }
  });
}
function profile(data: FirebaseFirestore.DocumentData | undefined): AccountResponse["profile"] {
  if (!data) return null;
  if (typeof data.displayName !== "string" || data.displayName.length > 80 || typeof data.createdAt !== "string" || typeof data.updatedAt !== "string" || !Number.isFinite(Date.parse(data.createdAt)) || !Number.isFinite(Date.parse(data.updatedAt))) return failure("SERVICE_UNAVAILABLE", true);
  return { displayName: data.displayName, createdAt: data.createdAt, updatedAt: data.updatedAt };
}
export async function getAccount(db: Firestore, identity: ServerIdentity): Promise<AccountResponse> {
  const snapshot = await db.collection("users").doc(identity.uid).get();
  const value = profile(snapshot.data());
  return {
    identity: { uid: identity.uid, email: identity.email, emailVerified: identity.emailVerified },
    profile: value, setup: value ? "ready" : "profile_pending", verification: identity.emailVerified ? "verified" : "required",
    entitlement: freeEntitlement(identity),
  };
}
export function pendingAccount(identity: ServerIdentity): AccountResponse {
  return { identity: { uid: identity.uid, email: identity.email, emailVerified: identity.emailVerified }, profile: null, setup: "profile_pending", verification: identity.emailVerified ? "verified" : "required", entitlement: freeEntitlement(identity) };
}
export async function updateProfile(db: Firestore, identity: ServerIdentity, displayName: string): Promise<AccountResponse> {
  requireVerified(identity);
  await bootstrapProfile(db, identity);
  await db.collection("users").doc(identity.uid).update({ displayName, updatedAt: new Date().toISOString() });
  return getAccount(db, identity);
}
