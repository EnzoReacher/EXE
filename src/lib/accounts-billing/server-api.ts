import "server-only";
import { randomUUID } from "node:crypto";
import { adminServices } from "./admin";
import { CONTRACT_LIMITS } from "./contracts";
import type { ApiError, ErrorCode, SessionExchangeResponse } from "./contracts";
import { ContractValidationError, parseAccountPatch, parseCheckout, parseDeleteSession, parseLogout, parsePortal, parseSaveSession, parseSessionExchange, parseSessionId, parseSessionList, parseUpdateSession } from "./contracts.validation";
import { AccountsUnavailable, accountsConfig } from "./server-config";
import { ApiFailure, ERROR_STATUS, failure } from "./server-errors";
import { authenticate, bootstrapProfile, getAccount, identityFromToken, pendingAccount, requireRecent, requireVerified, updateProfile } from "./server-identity";
import { billingStatus, sandboxStripe, unavailableCatalog } from "./server-billing";
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
  if (endpoint === "plans" && method === "GET") return json(unavailableCatalog());
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
  if (endpoint === "session" && method === "POST") {
    await rateLimit(db, "exchange-global", 300);
    const input = parseSessionExchange(await readJson(request, CONTRACT_LIMITS.authRequestBytes));
    const identity = await identityFromToken(auth, input.idToken);
    await rateLimit(db, `exchange:${identity.uid}`, 20);
    const sessionCookie = await auth.createSessionCookie(input.idToken, { expiresIn: config.sessionMilliseconds });
    let account;
    try { await bootstrapProfile(db, identity); account = await getAccount(db, identity); }
    catch { account = pendingAccount(identity); }
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
      return json(await getAccount(db, identity));
    }
    if (method === "PATCH") {
      requireVerified(identity);
      return json(await updateProfile(db, identity, parseAccountPatch(await readJson(request, 4096)).displayName));
    }
  }
  if (endpoint === "status" && method === "GET") return json(billingStatus(identity));
  if (endpoint === "checkout" && method === "POST") {
    requireVerified(identity);
    parseCheckout(await readJson(request, 4096));
    return failure("BILLING_UNAVAILABLE");
  }
  if (endpoint === "portal" && method === "POST") {
    requireVerified(identity);
    parsePortal(await readJson(request, 4096));
    return failure("BILLING_UNAVAILABLE");
  }
  const repository = new SavedSessionRepository(db, async () => failure("PRO_REQUIRED"));
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
  // Never acknowledge a valid event without durable processing. Lifecycle is intentionally BLOCKED.
  if (request.method !== "POST") return json({ received: false }, 405);
  let adapter: ReturnType<typeof sandboxStripe>;
  try { adapter = sandboxStripe(); } catch { return json({ received: false }, 503); }
  let body: Uint8Array;
  try { body = await readBoundedBody(request, 1024 * 1024); }
  catch (error) { return json({ received: false }, error instanceof ApiFailure && error.code === "PAYLOAD_TOO_LARGE" ? 413 : 400); }
  let event;
  try { event = adapter.stripe.webhooks.constructEvent(Buffer.from(body), request.headers.get("stripe-signature") ?? "", adapter.webhookSecret); }
  catch { return json({ received: false }, 400); }
  if (event.livemode || (event.account && event.account !== adapter.accountId)) return json({ received: false }, 400);
  // No provider state is mutated and no entitlement is granted. Stripe must retry, not drop this event.
  return json({ received: false }, 503);
}
