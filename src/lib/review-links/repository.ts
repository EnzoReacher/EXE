import "server-only";
import { randomUUID } from "node:crypto";
import { requireCurrentUser } from "@/lib/intake/repository";
import { IntakeError } from "@/lib/intake/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createReviewToken, expiryDate, hashReviewToken, isReviewExpiry, isReviewToken, validateFeedback } from "./security";
import { REVIEW_EXPIRIES } from "./types";
import type { OwnerReviewShare, PublicReviewContent, ReviewExpiry, ReviewFeedback, ReviewShareState } from "./types";

type ShareRow = { id: string; created_at: string; expires_at: string; expiry_hours: number; revoked_at: string | null; cv_draft_id: string | null };
type FeedbackRow = { id: string; reviewer_name: string | null; reviewer_role: string | null; feedback: string; created_at: string };

const stateFor = (row: Pick<ShareRow, "expires_at" | "revoked_at">, now = Date.now()): ReviewShareState => row.revoked_at ? "revoked" : new Date(row.expires_at).getTime() <= now ? "expired" : "active";
const feedbackFromRow = (row: FeedbackRow): ReviewFeedback => ({ id: row.id, reviewerName: row.reviewer_name, reviewerRole: row.reviewer_role, feedback: row.feedback, createdAt: row.created_at });

export function buildOwnerReviewShares(shares: ShareRow[], feedback: Array<FeedbackRow & { review_share_id: string }>): OwnerReviewShare[] {
  const byShare = new Map<string, ReviewFeedback[]>();
  for (const row of feedback) byShare.set(row.review_share_id, [...(byShare.get(row.review_share_id) ?? []), feedbackFromRow(row)]);
  return shares.map((share) => ({ id: share.id, createdAt: share.created_at, expiresAt: share.expires_at, expiryHours: share.expiry_hours, state: stateFor(share), includesAcceptedDraft: Boolean(share.cv_draft_id), feedback: byShare.get(share.id) ?? [] }));
}

export async function listOwnedReviewShares(analysisId: string) {
  const { supabase, user } = await requireCurrentUser();
  const { data: shares, error: shareError } = await supabase.from("review_shares").select("id,created_at,expires_at,expiry_hours,revoked_at,cv_draft_id").eq("owner_id", user.id).eq("analysis_run_id", analysisId).order("created_at", { ascending: false });
  if (shareError) throw new IntakeError("review_shares_load_failed", "We could not load your private review links. Try again.", 500);
  const rows = (shares ?? []) as ShareRow[];
  if (!rows.length) return [];
  const { data: feedback, error: feedbackError } = await supabase.from("expert_reviews").select("id,review_share_id,reviewer_name,reviewer_role,feedback,created_at").in("review_share_id", rows.map((share) => share.id)).order("created_at", { ascending: false });
  if (feedbackError) throw new IntakeError("review_feedback_load_failed", "We could not load your review feedback. Try again.", 500);
  return buildOwnerReviewShares(rows, (feedback ?? []) as Array<FeedbackRow & { review_share_id: string }>);
}

export async function createOwnedReviewShare(analysisId: string, expiry: ReviewExpiry, includeAcceptedDraft: boolean) {
  if (!isReviewExpiry(expiry)) throw new IntakeError("invalid_review_expiry", "Choose a valid link expiry.");
  const { supabase, user } = await requireCurrentUser();
  const { data: run, error: runError } = await supabase.from("analysis_runs").select("id,status").eq("id", analysisId).eq("owner_id", user.id).single();
  if (runError || !run || run.status !== "completed") throw new IntakeError("review_report_unavailable", "Choose a completed report from your private workspace.", 404);
  let draftId: string | null = null;
  if (includeAcceptedDraft) {
    const { data: draft, error: draftError } = await supabase.from("cv_drafts").select("id,accepted_at").eq("analysis_run_id", analysisId).eq("owner_id", user.id).maybeSingle();
    if (draftError || !draft?.accepted_at) throw new IntakeError("accepted_draft_required", "Accept your CV draft before including it in a review link.", 409);
    draftId = draft.id;
  }
  const token = createReviewToken();
  const { data, error } = await supabase.from("review_shares").insert({ owner_id: user.id, analysis_run_id: analysisId, cv_draft_id: draftId, token_hash: hashReviewToken(token), expiry_hours: REVIEW_EXPIRIES[expiry], expires_at: expiryDate(expiry).toISOString() }).select("id,created_at,expires_at,expiry_hours,revoked_at,cv_draft_id").single();
  if (error || !data) throw new IntakeError("review_share_create_failed", "We could not create your private review link. Try again.", 500);
  return { share: buildOwnerReviewShares([data as ShareRow], [])[0], token };
}

export async function revokeOwnedReviewShare(analysisId: string, shareId: string) {
  const { supabase, user } = await requireCurrentUser();
  const { data, error } = await supabase.from("review_shares").update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", shareId).eq("analysis_run_id", analysisId).eq("owner_id", user.id).is("revoked_at", null).select("id").maybeSingle();
  if (error || !data) throw new IntakeError("review_share_revoke_failed", "We could not revoke that private review link. Try again.", 500);
}

export async function getPublicReview(token: string): Promise<PublicReviewContent | null> {
  if (!isReviewToken(token)) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_private_review", { p_token: token });
  if (error || !data || typeof data !== "object") return null;
  const value = data as PublicReviewContent;
  if (typeof value.roleTitle !== "string" || !Array.isArray(value.findings)) return null;
  return value;
}

export async function submitPublicReview(token: string, input: { reviewerName?: unknown; reviewerRole?: unknown; feedback?: unknown; submissionId?: unknown }) {
  if (!isReviewToken(token)) throw new IntakeError("review_unavailable", "This private review link is not available.", 404);
  let feedback: ReturnType<typeof validateFeedback>;
  try { feedback = validateFeedback(input); } catch (error) { throw new IntakeError("invalid_review_feedback", error instanceof Error ? error.message : "Enter valid feedback."); }
  const submissionId = typeof input.submissionId === "string" ? input.submissionId : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId)) throw new IntakeError("invalid_review_feedback", "Please try submitting your feedback again.");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("submit_private_review", { p_token: token, p_reviewer_name: feedback.reviewerName, p_reviewer_role: feedback.reviewerRole, p_feedback: feedback.feedback, p_submission_id: submissionId || randomUUID() });
  if (error || data !== true) throw new IntakeError("review_unavailable", "This private review link is not available.", 404);
}
