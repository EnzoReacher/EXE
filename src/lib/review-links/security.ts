import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { REVIEW_EXPIRIES, type ReviewExpiry } from "./types";

export function createReviewToken() { return randomBytes(32).toString("base64url"); }
export function hashReviewToken(token: string) { return createHash("sha256").update(token, "utf8").digest("hex"); }
export function isReviewToken(value: unknown): value is string { return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value); }
export function isReviewExpiry(value: unknown): value is ReviewExpiry { return typeof value === "string" && Object.hasOwn(REVIEW_EXPIRIES, value); }
export function expiryDate(expiry: ReviewExpiry, from = new Date()) { return new Date(from.getTime() + REVIEW_EXPIRIES[expiry] * 60 * 60 * 1000); }
export function validateFeedback(input: { reviewerName?: unknown; reviewerRole?: unknown; feedback?: unknown }) {
  const clean = (value: unknown, maximum: number) => typeof value === "string" ? value.trim().slice(0, maximum) : "";
  const reviewerName = clean(input.reviewerName, 120) || null;
  const reviewerRole = clean(input.reviewerRole, 120) || null;
  const feedback = typeof input.feedback === "string" ? input.feedback.trim() : "";
  if (typeof input.reviewerName === "string" && input.reviewerName.trim().length > 120) throw new Error("Keep your display name to 120 characters or fewer.");
  if (typeof input.reviewerRole === "string" && input.reviewerRole.trim().length > 120) throw new Error("Keep your role to 120 characters or fewer.");
  if (feedback.length < 20 || feedback.length > 4000) throw new Error("Enter feedback between 20 and 4,000 characters.");
  return { reviewerName, reviewerRole, feedback };
}
