/** Frozen v1 browser/server boundary. No provider secrets or persistence document types. */
import type { Answers, Intake, PreparedSession, ReviewedBullet } from "../experience-translator/types";

export const CONTRACT_VERSION = 1 as const;
export const SNAPSHOT_SCHEMA_VERSION = 1 as const;
export const CONTRACT_LIMITS = {
  snapshotBytes: 128 * 1024,
  requestBytes: 144 * 1024,
  authRequestBytes: 16 * 1024,
  savedSessions: 50,
  pageSize: 20,
  maxPageSize: 50,
} as const;
export const API_PATHS = {
  session: "/api/auth/session", csrf: "/api/auth/csrf", account: "/api/account",
  plans: "/api/billing/plans", billingStatus: "/api/billing/status",
  checkout: "/api/billing/checkout", portal: "/api/billing/portal",
  stripeWebhook: "/api/webhooks/stripe", sessions: "/api/sessions",
} as const;
export type IsoDateTime = string;
export type PlanId = "free" | "pro";
export type ErrorCode =
  | "UNAUTHENTICATED" | "SESSION_EXPIRED" | "RECENT_AUTH_REQUIRED"
  | "EMAIL_VERIFICATION_REQUIRED" | "FORBIDDEN" | "CSRF_INVALID"
  | "INVALID_REQUEST" | "PAYLOAD_TOO_LARGE" | "UNSUPPORTED_SCHEMA"
  | "NOT_FOUND" | "REVISION_CONFLICT" | "OPERATION_CONFLICT" | "OPERATION_PENDING"
  | "PRO_REQUIRED" | "QUOTA_EXCEEDED" | "ALREADY_SUBSCRIBED"
  | "RATE_LIMITED" | "BILLING_UNAVAILABLE" | "SERVICE_UNAVAILABLE";
export type ApiError = { error: { code: ErrorCode; message: string; retryable: boolean; requestId: string } };
export type CsrfResponse = { csrfToken: string };
export type SessionExchangeRequest = { idToken: string };
export type LogoutRequest = { scope: "current" | "all" };
export type LogoutResponse = { signedOut: true; scope: "current" | "all" };
export type AccountPatchRequest = { displayName: string };
export type TrustedIdentity = { uid: string; email: string | null; emailVerified: boolean };
export type Capabilities = { canSave: boolean; canReadSaved: boolean; canDeleteSaved: boolean; savedSessionLimit: number };
export type Entitlement = {
  planId: PlanId; capabilities: Capabilities; validUntil: IsoDateTime | null;
  version: number; asOf: IsoDateTime;
};
export type AccountResponse = {
  identity: TrustedIdentity;
  profile: { displayName: string; createdAt: IsoDateTime; updatedAt: IsoDateTime } | null;
  setup: "ready" | "profile_pending";
  verification: "required" | "verified";
  entitlement: Entitlement;
};
export type SessionExchangeResponse = { account: AccountResponse; expiresAt: IsoDateTime };
export type CatalogResponse = {
  environment: "sandbox"; catalogVersion: string;
  free: { planId: "free"; amount: 0 };
  pro: { planId: "pro"; availability: "available"; amount: number; currency: "usd"; interval: "month" }
    | { planId: "pro"; availability: "unavailable"; reason: "not_configured" | "provider_unavailable" };
};
export type BillingStatusResponse = {
  environment: "sandbox"; entitlement: Entitlement;
  subscription: "none" | "pending" | "active" | "past_due" | "unpaid" | "incomplete" | "paused" | "canceled" | "expired" | "blocked";
  cancelAtPeriodEnd: boolean; paidThrough: IsoDateTime | null;
  reconciliation: "current" | "pending" | "unavailable";
  canManageBilling: boolean; asOf: IsoDateTime;
};
/** Operation IDs are browser-generated UUIDs, never identity or provider identifiers. */
export type OperationGuard = { operationId: string };
export type RevisionGuard = { expectedRevision: number };
export type CheckoutRequest = OperationGuard & { planId: "pro" };
export type CheckoutResponse = { operationId: string; checkoutUrl: string; expiresAt: IsoDateTime; environment: "sandbox" };
export type PortalRequest = OperationGuard;
export type PortalResponse = { portalUrl: string; environment: "sandbox" };

/** Historical review flags are retained as data ONLY; never authorization or restore acceptance. */
export type SavedSnapshotV1 = {
  schemaVersion: 1; intake: Intake; answers: Answers;
  prepared: PreparedSession; candidates: ReviewedBullet[];
};
export type SaveSessionRequest = OperationGuard & { title: string; snapshot: SavedSnapshotV1 };
export type UpdateSessionRequest = SaveSessionRequest & RevisionGuard;
export type DeleteSessionRequest = OperationGuard & RevisionGuard;
export type SavedSessionSummary = {
  id: string; title: string; revision: number; createdAt: IsoDateTime; updatedAt: IsoDateTime;
};
export type SavedSessionResponse = { session: SavedSessionSummary & { snapshot: SavedSnapshotV1 } };
export type SessionListRequest = { cursor?: string; limit?: number };
export type SessionListResponse = { sessions: SavedSessionSummary[]; nextCursor: string | null; quota: { used: number; limit: number } };
export type DeleteSessionResponse = { id: string; deleted: true };
export type RestoredSession = {
  intake: Intake; answers: Answers; prepared: PreparedSession;
  wordingDrafts: { id: string; currentText: string; previousGeneratedText: string; provenance: "untrusted_saved_wording" }[];
  reviewRequired: true;
};
