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

  const [details, { supabase }] = await Promise.all([completedAnalysis(analysisId), requireCurrentUser()]);
  const generated = generateNextSteps(details.roleTitle, details.findings);
  // One authenticated database transaction stores the roadmap, draft and exact
  // provenance together. The run lock makes concurrent requests idempotent.
  const { error } = await supabase.rpc("m15_create_next_steps", {
    p_analysis: analysisId,
    p_roadmap: generated.roadmapItems,
    p_content: generated.draftContent,
    p_claims: generated.claims,
  });
  if (error) throw new IntakeError("next_steps_save_failed", "We could not save your next steps. Try again.", 500);

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

export async function updateDraftContent(analysisId: string, draftId: string, content: string, expectedRevision: number) {
  await completedAnalysis(analysisId);
  const trimmed = content.trim();
  if (trimmed.length < 20 || trimmed.length > 12000) throw new IntakeError("invalid_draft", "Keep the draft between 20 and 12,000 characters.");
  return writeDraft(analysisId, draftId, trimmed, expectedRevision, false);
}

export async function acceptDraft(analysisId: string, draftId: string, content: string, expectedRevision: number) {
  await completedAnalysis(analysisId);
  return writeDraft(analysisId, draftId, content, expectedRevision, true);
}

async function writeDraft(analysisId: string, draftId: string, content: string, expectedRevision: number, accept: boolean) {
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1 || expectedRevision >= 2147483647) throw new IntakeError("invalid_revision", "Reload this draft to obtain a valid revision.", 400);
  const { supabase } = await requireCurrentUser();
  const { data, error } = await supabase.rpc("ownpath_update_legacy_draft", { p_analysis: analysisId, p_draft: draftId, p_expected_revision: expectedRevision, p_content: content, p_accept: accept });
  if (error?.code === "PT409" || error?.code === "40001") throw new IntakeError("draft_conflict", "This draft changed or is unavailable. Your edits are kept. Reload explicitly to resolve the conflict.", 409);
  if (error || !data || data.id !== draftId || data.version !== expectedRevision + 1 || data.content !== content || (accept ? !data.accepted_at : data.accepted_at !== null)) throw new IntakeError("draft_save_failed", "The draft update was not confirmed. Keep your edits and reload before retrying.", 500);
  return draftFromRow(data as DraftRow, []);
}
