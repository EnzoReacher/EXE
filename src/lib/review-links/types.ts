import type { FindingStatus, EvidenceKind } from "@/lib/analysis/types";

export const REVIEW_EXPIRIES = { "24h": 24, "7d": 7 * 24, "30d": 30 * 24 } as const;
export type ReviewExpiry = keyof typeof REVIEW_EXPIRIES;
export type ReviewShareState = "active" | "expired" | "revoked";

export type ReviewFeedback = { id: string; reviewerName: string | null; reviewerRole: string | null; feedback: string; createdAt: string };
export type OwnerReviewShare = { id: string; createdAt: string; expiresAt: string; expiryHours: number; state: ReviewShareState; includesAcceptedDraft: boolean; feedback: ReviewFeedback[] };
export type PublicReviewFinding = { requirement: string; status: FindingStatus; rationale: string; caveat: string; evidenceExcerpt: string | null; evidenceKind: EvidenceKind | null };
export type PublicReviewContent = { roleTitle: string; companyName: string | null; findings: PublicReviewFinding[]; draftContent: string | null };
