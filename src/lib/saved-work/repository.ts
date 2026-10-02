import "server-only";
import { requireCurrentUser } from "@/lib/intake/repository";
import { IntakeError } from "@/lib/intake/types";
import type { AnalysisRunStatus, FindingStatus } from "@/lib/analysis/types";

export type SavedWorkItem = {
  analysisId: string;
  roleTitle: string;
  companyName: string | null;
  cvFilename: string;
  createdAt: string;
  updatedAt: string;
  reportStatus: AnalysisRunStatus;
  findingCounts: Record<FindingStatus, number>;
  hasDraft: boolean;
  draftAccepted: boolean;
};

type RunRow = {
  id: string;
  owner_id: string;
  status: AnalysisRunStatus;
  created_at: string;
  updated_at: string;
  target_jobs: { role_title: string; company_name: string | null } | null;
  cv_documents: { original_filename: string } | null;
};
type FindingRow = { analysis_run_id: string; status: FindingStatus };
type DraftRow = { analysis_run_id: string; accepted_at: string | null };

const emptyCounts = (): Record<FindingStatus, number> => ({ supported: 0, partly_supported: 0, unclear: 0, missing: 0 });

// This DTO intentionally excludes source CV/JD text, evidence, owner identifiers,
// storage paths, and provider configuration.
export function buildSavedWorkItems(runs: RunRow[], findings: FindingRow[], drafts: DraftRow[]): SavedWorkItem[] {
  const findingsByRun = new Map<string, Record<FindingStatus, number>>();
  for (const finding of findings) {
    const counts = findingsByRun.get(finding.analysis_run_id) ?? emptyCounts();
    counts[finding.status] += 1;
    findingsByRun.set(finding.analysis_run_id, counts);
  }
  const draftsByRun = new Map(drafts.map((draft) => [draft.analysis_run_id, draft]));
  return runs.flatMap((run) => {
    if (!run.target_jobs || !run.cv_documents) return [];
    const draft = draftsByRun.get(run.id);
    return [{
      analysisId: run.id,
      roleTitle: run.target_jobs.role_title,
      companyName: run.target_jobs.company_name,
      cvFilename: run.cv_documents.original_filename,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      reportStatus: run.status,
      findingCounts: findingsByRun.get(run.id) ?? emptyCounts(),
      hasDraft: Boolean(draft),
      draftAccepted: Boolean(draft?.accepted_at),
    }];
  });
}

export async function listOwnedSavedWork(): Promise<SavedWorkItem[]> {
  const { supabase, user } = await requireCurrentUser();
  const { data: runData, error: runError } = await supabase
    .from("analysis_runs")
    .select("id,owner_id,status,created_at,updated_at,target_jobs!inner(role_title,company_name),cv_documents!inner(original_filename)")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });
  if (runError) throw new IntakeError("saved_work_load_failed", "We could not load your saved work. Please try again.", 500);
  const runs = (runData ?? []) as unknown as RunRow[];
  if (!runs.length) return [];
  const runIds = runs.map((run) => run.id);
  const [{ data: findingData, error: findingError }, { data: draftData, error: draftError }] = await Promise.all([
    supabase.from("requirement_findings").select("analysis_run_id,status").eq("owner_id", user.id).in("analysis_run_id", runIds),
    supabase.from("cv_drafts").select("analysis_run_id,accepted_at").eq("owner_id", user.id).in("analysis_run_id", runIds),
  ]);
  if (findingError || draftError) throw new IntakeError("saved_work_load_failed", "We could not load your saved work. Please try again.", 500);
  return buildSavedWorkItems(runs, (findingData ?? []) as FindingRow[], (draftData ?? []) as DraftRow[]);
}
