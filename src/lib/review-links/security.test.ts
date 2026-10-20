import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createReviewToken, expiryDate, hashReviewToken, isReviewExpiry, isReviewToken, validateFeedback } from "./security";

describe("private review-link security helpers", () => {
  it("creates distinct URL-safe 256-bit tokens and stores a stable SHA-256 hash", () => {
    const first = createReviewToken(); const second = createReviewToken();
    expect(first).toHaveLength(43); expect(second).toHaveLength(43); expect(first).not.toBe(second);
    expect(isReviewToken(first)).toBe(true); expect(hashReviewToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashReviewToken(first)).toBe(hashReviewToken(first)); expect(hashReviewToken(first)).not.toBe(first);
  });

  it("accepts only the documented expiry choices", () => {
    expect(isReviewExpiry("24h")).toBe(true); expect(isReviewExpiry("7d")).toBe(true); expect(isReviewExpiry("30d")).toBe(true); expect(isReviewExpiry("90d")).toBe(false);
    expect(expiryDate("24h", new Date("2026-10-02T00:00:00.000Z")).toISOString()).toBe("2026-10-03T00:00:00.000Z");
  });

  it.each(["constructor", "toString", "__proto__", "hasOwnProperty", null, 24])("rejects inherited or non-string expiry %s", (value) => {
    expect(isReviewExpiry(value)).toBe(false);
  });

  it("validates optional reviewer fields and bounded plain-text feedback", () => {
    expect(validateFeedback({ reviewerName: " Fictional reviewer ", reviewerRole: "Mentor", feedback: "This fictional feedback has enough detail." })).toEqual({ reviewerName: "Fictional reviewer", reviewerRole: "Mentor", feedback: "This fictional feedback has enough detail." });
    expect(() => validateFeedback({ feedback: "Too short" })).toThrow("20 and 4,000");
    expect(() => validateFeedback({ reviewerName: "x".repeat(121), feedback: "This fictional feedback has enough detail." })).toThrow("120 characters");
  });
});
