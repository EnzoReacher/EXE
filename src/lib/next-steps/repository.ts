import "server-only";
import { getOwnedAnalysisDetails } from "@/lib/analysis/repository";
import { requireCurrentUser } from "@/lib/intake/repository";
import { IntakeError } from "@/lib/intake/types";
import { generateNextSteps } from "./generator";
import type { CvDraft, DraftClaim, NextStepsDetails, RoadmapItem, RoadmapProgress } from "./types";

type RoadmapRow = {
  id: string;
  ordinal: number;
  requirement_text: string;
  finding_status: RoadmapItem["findingStatus"];
  priority: RoadmapItem["priority"];
  action_text: string;
  rationale: string;
  progress_status: RoadmapProgress;
  created_at: string;
  updated_at: string;
};

type DraftRow = { id: string; version: number; content: string; accepted_at: string | null; created_at: string; updated_at: string };
type ClaimRow = { id: string; ordinal: number; requirement_text: string; claim_text: string; source_excerpt: string; source_start: number; source_end: number };

const roadmapFromRow = (row: RoadmapRow): RoadmapItem => ({
  id: row.id,
  ordinal: row.ordinal,
  requirement: row.requirement_text,
  findingStatus: row.finding_status,
  priority: row.priority,
  action: row.action_text,
  rationale: row.rationale,
  progress: row.progress_status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const claimFromRow = (row: ClaimRow): DraftClaim => ({
  id: row.id,
  ordinal: row.ordinal,
  requirement: row.requirement_text,
  claimText: row.claim_text,
  sourceExcerpt: row.source_excerpt,
  sourceStart: row.source_start,
  sourceEnd: row.source_end,
});

function draftFromRow(row: DraftRow, claims: DraftClaim[]): CvDraft {
  return { id: row.id, version: row.version, content: row.content, acceptedAt: row.accepted_at, createdAt: row.created_at, updatedAt: row.updated_at, claims };
}

async function completedAnalysis(analysisId: string) {
  const details = await getOwnedAnalysisDetails(analysisId);
  if (details.run.status !== "completed") throw new IntakeError("analysis_not_ready", "Finish the evidence report before creating next steps.", 409);
  return details;
}

export async function getOwnedNextSteps(analysisId: string): Promise<NextStepsDetails | null> {
  const details = await completedAnalysis(analysisId);
  const { supabase } = await requireCurrentUser();
  const [{ data: roadmapData, error: roadmapError }, { data: draftData, error: draftError }] = await Promise.all([
    supabase.from("roadmap_items").select().eq("analysis_run_id", analysisId).order("ordinal", { ascending: true }),
    supabase.from("cv_drafts").select("id,version,content,accepted_at,created_at,updated_at").eq("analysis_run_id", analysisId).maybeSingle(),
  ]);
  if (roadmapError || draftError) throw new IntakeError("next_steps_load_failed", "We could not load your next steps. Try again.", 500);
  if (!draftData) return null;
  const { data: claimData, error: claimError } = await supabase.from("cv_draft_claims").select("id,ordinal,requirement_text,claim_text,source_excerpt,source_start,source_end").eq("cv_draft_id", (draftData as DraftRow).id).order("ordinal", { ascending: true });
  if (claimError) throw new IntakeError("next_steps_load_failed", "We could not load your draft evidence. Try again.", 500);
  return {
    analysisId,
    roleTitle: details.roleTitle,
    companyName: details.companyName,
    cvFilename: details.cvFilename,
    roadmapItems: ((roadmapData ?? []) as RoadmapRow[]).map(roadmapFromRow),
    draft: draftFromRow(draftData as DraftRow, ((claimData ?? []) as ClaimRow[]).map(claimFromRow)),
  };
}

export async function createOrGetNextSteps(analysisId: string): Promise<NextStepsDetails> {
  const existing = await getOwnedNextSteps(analysisId);
  if (existing) return existing;

  const [details, { supabase, user }] = await Promise.all([completedAnalysis(analysisId), requireCurrentUser()]);
  const generated = generateNextSteps(details.roleTitle, details.findings);
  const now = new Date().toISOString();

  if (generated.roadmapItems.length) {
    const { error } = await supabase.from("roadmap_items").insert(generated.roadmapItems.map((item) => ({
      analysis_run_id: analysisId,
      owner_id: user.id,
      ordinal: item.ordinal,
      requirement_text: item.requirement,
      finding_status: item.findingStatus,
      priority: item.priority,
      action_text: item.action,
      rationale: item.rationale,
      progress_status: "not_started",
      created_at: now,
      updated_at: now,
    })));
    if (error) throw new IntakeError("next_steps_save_failed", "We could not save your roadmap. Try again.", 500);
  }

  const { data: draftData, error: draftError } = await supabase.from("cv_drafts").insert({
    owner_id: user.id,
    analysis_run_id: analysisId,
    cv_document_id: details.run.cvDocumentId,
    target_job_id: details.run.targetJobId,
    version: 1,
    content: generated.draftContent,
    accepted_at: null,
    created_at: now,
    updated_at: now,
  }).select("id,version,content,accepted_at,created_at,updated_at").single();

  if (draftError || !draftData) {
    const concurrent = await getOwnedNextSteps(analysisId);
    if (concurrent) return concurrent;
    throw new IntakeError("next_steps_save_failed", "We could not save your CV draft. Try again.", 500);
  }

  if (generated.claims.length) {
    const { error } = await supabase.from("cv_draft_claims").insert(generated.claims.map((claim) => ({
      cv_draft_id: (draftData as DraftRow).id,
      owner_id: user.id,
      ordinal: claim.ordinal,
      requirement_text: claim.requirement,
      claim_text: claim.claimText,
      source_excerpt: claim.sourceExcerpt,
      source_start: claim.sourceStart,
      source_end: claim.sourceEnd,
      created_at: now,
    })));
    if (error) throw new IntakeError("next_steps_save_failed", "We could not save your draft evidence. Try again.", 500);
  }

  const saved = await getOwnedNextSteps(analysisId);
  if (!saved) throw new IntakeError("next_steps_save_failed", "We could not load your saved next steps. Try again.", 500);
  return saved;
}

export async function updateRoadmapProgress(analysisId: string, itemId: string, progress: RoadmapProgress) {
  await completedAnalysis(analysisId);
  const { supabase } = await requireCurrentUser();
  const { data, error } = await supabase.from("roadmap_items").update({ progress_status: progress, updated_at: new Date().toISOString() }).eq("id", itemId).eq("analysis_run_id", analysisId).select("id,ordinal,requirement_text,finding_status,priority,action_text,rationale,progress_status,created_at,updated_at").single();
  if (error || !data) throw new IntakeError("roadmap_item_not_found", "That roadmap item is unavailable or does not belong to you.", 404);
  return roadmapFromRow(data as RoadmapRow);
}

export async function updateDraftContent(analysisId: string, draftId: string, content: string) {
  await completedAnalysis(analysisId);
  const trimmed = content.trim();
  if (trimmed.length < 20 || trimmed.length > 12000) throw new IntakeError("invalid_draft", "Keep the draft between 20 and 12,000 characters.");
  const { supabase } = await requireCurrentUser();
  const { data, error } = await supabase.from("cv_drafts").update({ content: trimmed, accepted_at: null, updated_at: new Date().toISOString() }).eq("id", draftId).eq("analysis_run_id", analysisId).select("id,version,content,accepted_at,created_at,updated_at").single();
  if (error || !data) throw new IntakeError("draft_not_found", "That CV draft is unavailable or does not belong to you.", 404);
  return draftFromRow(data as DraftRow, []);
}

export async function acceptDraft(analysisId: string, draftId: string) {
  await completedAnalysis(analysisId);
  const { supabase } = await requireCurrentUser();
  const acceptedAt = new Date().toISOString();
  const { data, error } = await supabase.from("cv_drafts").update({ accepted_at: acceptedAt, updated_at: acceptedAt }).eq("id", draftId).eq("analysis_run_id", analysisId).select("id,version,content,accepted_at,created_at,updated_at").single();
  if (error || !data) throw new IntakeError("draft_not_found", "That CV draft is unavailable or does not belong to you.", 404);
  return draftFromRow(data as DraftRow, []);
}
