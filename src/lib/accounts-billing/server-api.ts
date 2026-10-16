import "server-only";
import { randomUUID } from "node:crypto";
import { adminServices } from "./admin";
import { CONTRACT_LIMITS } from "./contracts";
import type { ApiError, ErrorCode, SessionExchangeResponse } from "./contracts";
import { ContractValidationError, parseAccountPatch, parseCheckout, parseDeleteSession, parseLogout, parsePortal, parseSaveSession, parseSessionExchange, parseSessionId, parseSessionList, parseUpdateSession } from "./contracts.validation";
import { AccountsUnavailable, accountsConfig } from "./server-config";
import { ApiFailure, ERROR_STATUS, failure } from "./server-errors";
import { authenticate, bootstrapProfile, freeEntitlement, getAccount, identityFromToken, pendingAccount, requireRecent, requireVerified, updateProfile } from "./server-identity";
import type { ServerIdentity } from "./server-identity";
import { billingStatus } from "./server-billing";
import { billingForRequest, configuredQuota, configuredStripe, publicBillingCatalog } from "./billing-runtime";
import { BillingSignatureError } from "./billing-provider";
import { cookieValue, CSRF_COOKIE, issueCsrf, readBoundedBody, readJson, serializeCookie, SESSION_COOKIE, validateCsrf, validateOrigin } from "./server-security";
import { rateLimit } from "./server-rate-limit";
import { SavedSessionRepository } from "./server-sessions";

export type Endpoint = "csrf" | "session" | "account" | "plans" | "status" | "checkout" | "portal" | "sessions" | "savedSession" | "stripeWebhook";
const safeMessages: Partial<Record<ErrorCode, string>> = {
  UNAUTHENTICATED: "Sign in to continue.", SESSION_EXPIRED: "Your session has expired. Sign in again.",
  EMAIL_VERIFICATION_REQUIRED: "Verify your email and sign in again to continue.",
  RECENT_AUTH_REQUIRED: "Sign in again before this action.", PRO_REQUIRED: "Saving requires an active Pro subscription.",
  REVISION_CONFLICT: "This session changed. Reload it before trying again.",
  QUOTA_EXCEEDED: "Your saved-session limit has been reached.", BILLING_UNAVAILABLE: "Sandbox billing is not available yet.",
  SERVICE_UNAVAILABLE: "The service is temporarily unavailable. Please try again.",
  RATE_LIMITED: "Too many requests. Please wait before trying again.",
};
function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
function errors(error: unknown, requestId: string): Response {
  let code: ErrorCode = "SERVICE_UNAVAILABLE";
  let retryable = true;
  if (error instanceof ApiFailure) { code = error.code; retryable = error.retryable; }
  if (error instanceof ContractValidationError) { code = error.code; retryable = false; }
  if (error instanceof AccountsUnavailable) retryable = false;
  const body: ApiError = { error: { code, message: safeMessages[code] ?? "The request could not be completed. Check the request and try again.", retryable, requestId } };
  const response = json(body, ERROR_STATUS[code]);
  response.headers.set("X-Request-Id", requestId);
  if (code === "RATE_LIMITED") response.headers.set("Retry-After", "60");
  return response;
}
/** Explicit method exports in route.ts restrict HTTP methods; dispatcher never serves catch-all paths. */
export async function handleApi(endpoint: Endpoint, request: Request, id?: string): Promise<Response> {
  const requestId = randomUUID();
  try {
    const response = await dispatch(endpoint, request, id);
    response.headers.set("X-Request-Id", requestId);
    return response;
  } catch (error) { return errors(error, requestId); }
}
async function dispatch(endpoint: Endpoint, request: Request, id?: string): Promise<Response> {
  const method = request.method;
  if (endpoint === "plans" && method === "GET") return json(await publicBillingCatalog());
  if (endpoint === "stripeWebhook") return stripeWebhook(request);
  const config = accountsConfig();
  if (method !== "GET") validateCsrf(request, config);
  if (endpoint === "csrf" && method === "GET") {
    const origin = request.headers.get("origin");
    if (origin) validateOrigin(request, config);
    const site = request.headers.get("sec-fetch-site");
    if (site && !["same-origin", "none"].includes(site)) failure("CSRF_INVALID");
    const { db } = adminServices();
    await rateLimit(db, "csrf-global", 600);
    const existing = cookieValue(request, CSRF_COOKIE);
    const csrfToken = existing && /^[a-f0-9]{64}$/.test(existing) ? existing : issueCsrf();
    const response = json({ csrfToken });
    response.headers.append("Set-Cookie", serializeCookie(CSRF_COOKIE, csrfToken, 3600, config));
    return response;
  }
  const { auth, db } = adminServices();
  const quota = configuredQuota();
  // Lazily resolve provider configuration outside every Firestore transaction. Missing configuration
  // cannot mint Pro. Provider failures may affect billing but never misreport profile repair as failed.
  const billing = () => billingForRequest(db, config);
  const entitlement = async (identity: ServerIdentity) => {
    try { return await (await billing())?.entitlement(identity) ?? freeEntitlement(identity, new Date(), quota); }
    catch { return freeEntitlement(identity, new Date(), quota); }
  };
  if (endpoint === "session" && method === "POST") {
    await rateLimit(db, "exchange-global", 300);
    const input = parseSessionExchange(await readJson(request, CONTRACT_LIMITS.authRequestBytes));
    const identity = await identityFromToken(auth, input.idToken);
    await rateLimit(db, `exchange:${identity.uid}`, 20);
    const sessionCookie = await auth.createSessionCookie(input.idToken, { expiresIn: config.sessionMilliseconds });
    let account;
    try { await bootstrapProfile(db, identity); account = await getAccount(db, identity); }
    catch { account = pendingAccount(identity); }
    account.entitlement = await entitlement(identity);
    const body: SessionExchangeResponse = { account, expiresAt: new Date(Date.now() + config.sessionMilliseconds).toISOString() };
    const response = json(body);
    response.headers.append("Set-Cookie", serializeCookie(SESSION_COOKIE, sessionCookie, Math.floor(config.sessionMilliseconds / 1000), config));
    return response;
  }
  if (endpoint === "session" && method === "DELETE") {
    const input = parseLogout(await readJson(request, 4096));
    if (input.scope === "all") {
      const identity = await authenticate(auth, request);
      requireRecent(identity);
      await rateLimit(db, `revoke:${identity.uid}`, 10);
      await auth.revokeRefreshTokens(identity.uid);
    }
    const response = json({ signedOut: true, scope: input.scope });
    response.headers.append("Set-Cookie", serializeCookie(SESSION_COOKIE, "", 0, config));
    response.headers.append("Set-Cookie", serializeCookie(CSRF_COOKIE, "", 0, config));
    return response;
  }
  const identity = await authenticate(auth, request);
  await rateLimit(db, `account:${identity.uid}`, 120);
  if (endpoint === "account") {
    if (method === "GET") {
      await bootstrapProfile(db, identity);
      const account = await getAccount(db, identity);
      account.entitlement = await entitlement(identity);
      return json(account);
    }
    if (method === "PATCH") {
      requireVerified(identity);
      const account = await updateProfile(db, identity, parseAccountPatch(await readJson(request, 4096)).displayName);
      account.entitlement = await entitlement(identity);
      return json(account);
    }
  }
  if (endpoint === "status" && method === "GET") {
    let service;
    try { service = await billing(); } catch { return json(billingStatus(identity, quota)); }
    if (!service) return json(billingStatus(identity, quota));
    const status = await service.status(identity);
    if (status.canManageBilling && (status.reconciliation !== "current" || status.subscription === "pending")) {
      try { await service.reconcile(identity.uid); } catch { /* Durable pending/unavailable state remains fail-closed. */ }
    }
    return json(await service.status(identity));
  }
  if (endpoint === "checkout" && method === "POST") {
    requireVerified(identity);
    const input = parseCheckout(await readJson(request, 4096));
    const service = await billing();
    if (!service) return failure("BILLING_UNAVAILABLE");
    return json(await service.checkout(identity, input));
  }
  if (endpoint === "portal" && method === "POST") {
    requireVerified(identity);
    const input = parsePortal(await readJson(request, 4096));
    const service = await billing();
    if (!service) return failure("BILLING_UNAVAILABLE");
    return json(await service.portal(identity, input));
  }
  const service = endpoint === "sessions" && method === "POST" || endpoint === "savedSession" && method === "PATCH" ? await billing() : null;
  const repository = new SavedSessionRepository(db, service?.authorizeWrite ?? (async () => failure("PRO_REQUIRED")), Date.now, async () => ({ limit: quota }));
  if (endpoint === "sessions") {
    requireVerified(identity);
    if (method === "GET") {
      const params = new URL(request.url).searchParams;
      if ([...params.keys()].some(key => !["limit", "cursor"].includes(key) || params.getAll(key).length !== 1)) failure("INVALID_REQUEST");
      const raw: Record<string, unknown> = {};
      if (params.has("cursor")) raw.cursor = params.get("cursor");
      if (params.has("limit")) {
        if (!/^[0-9]+$/.test(params.get("limit") ?? "")) failure("INVALID_REQUEST");
        raw.limit = Number(params.get("limit"));
      }
      return json(await repository.list(identity, parseSessionList(raw)));
    }
    if (method === "POST") return json(await repository.create(identity, parseSaveSession(await readJson(request, CONTRACT_LIMITS.requestBytes))), 201);
  }
  if (endpoint === "savedSession") {
    requireVerified(identity);
    const sessionId = parseSessionId(id);
    if (method === "GET") return json(await repository.get(identity, sessionId));
    if (method === "PATCH") return json(await repository.update(identity, sessionId, parseUpdateSession(await readJson(request, CONTRACT_LIMITS.requestBytes))));
    if (method === "DELETE") return json(await repository.delete(identity, sessionId, parseDeleteSession(await readJson(request, 4096))));
  }
  return failure("NOT_FOUND");
}
async function stripeWebhook(request: Request): Promise<Response> {
  // No browser session/CSRF: exact raw bytes + actual SDK signature, then durable processing.
  if (request.method !== "POST") return json({ received: false }, 405);
  let provider: ReturnType<typeof configuredStripe>;
  try { provider = configuredStripe(); } catch { return json({ received: false }, 503); }
  if (!provider) return json({ received: false }, 503);
  let body: Uint8Array;
  try { body = await readBoundedBody(request, 1024 * 1024); }
  catch (error) { return json({ received: false }, error instanceof ApiFailure && error.code === "PAYLOAD_TOO_LARGE" ? 413 : 400); }
  try { provider.verifyWebhook(body, request.headers.get("stripe-signature") ?? ""); }
  catch (error) { return json({ received: false }, error instanceof BillingSignatureError ? 400 : 503); }
  try {
    const { db, config } = adminServices();
    const service = await billingForRequest(db, config, provider);
    if (!service) return json({ received: false }, 503);
    const receipt = await service.receiveWebhook(body, request.headers.get("stripe-signature") ?? "");
    // Failed processing is durably pending AND returns 503: provider retries remain a real recovery
    // path until an explicitly operated retryPending worker/scheduler is supplied.
    await service.processEvent(receipt.eventId);
    return json({ received: true });
  } catch { return json({ received: false }, 503); }
}
