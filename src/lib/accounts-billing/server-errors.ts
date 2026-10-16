import "server-only";
import type { ErrorCode } from "./contracts";

export const ERROR_STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401, SESSION_EXPIRED: 401, RECENT_AUTH_REQUIRED: 403,
  EMAIL_VERIFICATION_REQUIRED: 403, FORBIDDEN: 403, CSRF_INVALID: 403,
  INVALID_REQUEST: 422, PAYLOAD_TOO_LARGE: 413, UNSUPPORTED_SCHEMA: 422,
  NOT_FOUND: 404, REVISION_CONFLICT: 409, OPERATION_CONFLICT: 409, OPERATION_PENDING: 409,
  PRO_REQUIRED: 403, QUOTA_EXCEEDED: 409, ALREADY_SUBSCRIBED: 409,
  RATE_LIMITED: 429, BILLING_UNAVAILABLE: 503, SERVICE_UNAVAILABLE: 503,
};
export class ApiFailure extends Error {
  constructor(public readonly code: ErrorCode, public readonly retryable = false) {
    super("The request could not be completed.");
  }
}
export function failure(code: ErrorCode, retryable = false): never { throw new ApiFailure(code, retryable); }
