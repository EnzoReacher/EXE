import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { IntakeError } from "@/lib/intake/types";
import { ANALYSIS_ENGINE_VERSION, ANALYSIS_PROVIDER_NAME, ANALYSIS_PROVIDER_VERSION, ANALYSIS_SCHEMA_VERSION, type AnalysisDetails, type AnalysisFinding, type AnalysisRun, type StoredFinding } from "./types";

type RunRow = {
  id: string;
  owner_id: string;
  cv_document_id: string;
  target_job_id: string;
  client_request_id: string;
  status: AnalysisRun["status"];
  provider_name: string;
  provider_version: string;
  schema_version: string;
  engine_version: string;
  prompt_version: string | null;
  failure_code: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type FindingRow = {
  id: string;
  ordinal: number;
  requirement_text: string;
  status: StoredFinding["status"];
  evidence_kind: StoredFinding["evidenceKind"];
  evidence_excerpt: string | null;
  source_start: number | null;
  source_end: number | null;
  rationale: string;
  caveat: string;
};

type JobRow = { id: string; owner_id: string; role_title: string; company_name: string | null; job_description: string };
type CvRow = { id: string; owner_id: string; original_filename: string; processing_status: string; extracted_text: string | null };

const runFromRow = (row: RunRow): AnalysisRun => ({
  id: row.id,
  ownerId: row.owner_id,
  cvDocumentId: row.cv_document_id,
  targetJobId: row.target_job_id,
  clientRequestId: row.client_request_id,
  status: row.status,
  providerName: row.provider_name,
  providerVersion: row.provider_version,
  schemaVersion: row.schema_version,
  engineVersion: row.engine_version,
  promptVersion: row.prompt_version,
  failureCode: row.failure_code,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  completedAt: row.completed_at,
});

const findingFromRow = (row: FindingRow): StoredFinding => ({
  id: row.id,
  ordinal: row.ordinal,
  requirement: row.requirement_text,
  status: row.status,
  evidenceKind: row.evidence_kind,
  evidenceExcerpt: row.evidence_excerpt,
  sourceStart: row.source_start,
  sourceEnd: row.source_end,
  rationale: row.rationale,
  caveat: row.caveat,
});

async function requireOwner(ownerId?: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new IntakeError("unauthenticated", "Sign in to access your private analysis.", 401);
  if (ownerId && ownerId !== user.id) throw new IntakeError("forbidden", "You cannot create an analysis for another account.", 403);
  return { supabase, user };
}

export async function getOwnedAnalysisInputs(cvId: string, jobId: string) {
  const { supabase, user } = await requireOwner();
  const [cvResult, jobResult] = await Promise.all([
    supabase.from("cv_documents").select("id,owner_id,original_filename,processing_status,extracted_text").eq("id", cvId).single(),
    supabase.from("target_jobs").select("id,owner_id,role_title,company_name,job_description").eq("id", jobId).single(),
  ]);
  if (cvResult.error || !cvResult.data) throw new IntakeError("cv_not_found", "That CV is unavailable or does not belong to you.", 404);
  if (jobResult.error || !jobResult.data) throw new IntakeError("job_not_found", "That target job is unavailable or does not belong to you.", 404);
  const cv = cvResult.data as CvRow;
  const job = jobResult.data as JobRow;
  if (cv.owner_id !== user.id) throw new IntakeError("cv_not_found", "That CV is unavailable or does not belong to you.", 404);
  if (job.owner_id !== user.id) throw new IntakeError("job_not_found", "That target job is unavailable or does not belong to you.", 404);
  if (cv.processing_status !== "ready" || !cv.extracted_text?.trim()) throw new IntakeError("cv_not_ready", "Choose a CV that has finished processing before creating a report.", 409);
  return {
    cv: { id: cv.id, ownerId: cv.owner_id, originalFilename: cv.original_filename, extractedText: cv.extracted_text },
    job: { id: job.id, ownerId: job.owner_id, roleTitle: job.role_title, companyName: job.company_name, jobDescription: job.job_description },
  };
}

export async function createOrGetAnalysisRun(ownerId: string, cvId: string, jobId: string, clientRequestId: string) {
  const { supabase, user } = await requireOwner(ownerId);
  const { data: existing, error: lookupError } = await supabase.from("analysis_runs").select().eq("owner_id", user.id).eq("client_request_id", clientRequestId).maybeSingle();
  if (lookupError) throw new IntakeError("analysis_load_failed", "We could not check your report. Try again.", 500);
  if (existing) return { run: runFromRow(existing as RunRow), existed: true };

  const { data, error } = await supabase.from("analysis_runs").insert({
    owner_id: user.id,
    cv_document_id: cvId,
    target_job_id: jobId,
    client_request_id: clientRequestId,
    status: "processing",
    provider_name: ANALYSIS_PROVIDER_NAME,
    provider_version: ANALYSIS_PROVIDER_VERSION,
    schema_version: ANALYSIS_SCHEMA_VERSION,
    engine_version: ANALYSIS_ENGINE_VERSION,
    prompt_version: null,
    failure_code: null,
  }).select().single();
  if (!error && data) return { run: runFromRow(data as RunRow), existed: false };

  // A parallel request can win the unique request-id insert. Return its run instead of creating a duplicate.
  const { data: concurrent } = await supabase.from("analysis_runs").select().eq("owner_id", user.id).eq("client_request_id", clientRequestId).maybeSingle();
  if (concurrent) return { run: runFromRow(concurrent as RunRow), existed: true };
  throw new IntakeError("analysis_start_failed", "We could not start this report. Try again.", 500);
}

export async function getOwnedAnalysisRun(id: string) {
  const { supabase } = await requireOwner();
  const { data, error } = await supabase.from("analysis_runs").select().eq("id", id).single();
  if (error || !data) throw new IntakeError("analysis_not_found", "That report is unavailable or does not belong to you.", 404);
  return runFromRow(data as RunRow);
}

export async function resetAnalysisRun(id: string) {
  const { supabase } = await requireOwner();
  const { error: deleteError } = await supabase.from("requirement_findings").delete().eq("analysis_run_id", id);
  if (deleteError) throw new IntakeError("analysis_retry_failed", "We could not prepare the report for retry.", 500);
  const { data, error } = await supabase.from("analysis_runs").update({ status: "processing", failure_code: null, completed_at: null, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error || !data) throw new IntakeError("analysis_retry_failed", "We could not prepare the report for retry.", 500);
  return runFromRow(data as RunRow);
}

export async function saveAnalysisFindings(runId: string, findings: AnalysisFinding[]) {
  const { supabase } = await requireOwner();
  const { data: rawRun, error: runError } = await supabase.from("analysis_runs").select("id,owner_id").eq("id", runId).single();
  if (runError || !rawRun) throw new IntakeError("analysis_not_found", "That report is unavailable or does not belong to you.", 404);
  const run = rawRun as { id: string; owner_id: string };
  const { error: clearError } = await supabase.from("requirement_findings").delete().eq("analysis_run_id", runId);
  if (clearError) throw new IntakeError("analysis_save_failed", "We could not save the report. Try again.", 500);
  if (findings.length > 0) {
    const rows = findings.map((finding, ordinal) => ({
      analysis_run_id: runId,
      owner_id: run.owner_id,
      ordinal,
      requirement_text: finding.requirement,
      status: finding.status,
      evidence_kind: finding.evidenceKind,
      evidence_excerpt: finding.evidenceExcerpt,
      source_start: finding.sourceStart,
      source_end: finding.sourceEnd,
      rationale: finding.rationale,
      caveat: finding.caveat,
    }));
    const { error } = await supabase.from("requirement_findings").insert(rows);
    if (error) throw new IntakeError("analysis_save_failed", "We could not save the report. Try again.", 500);
  }
  const { error: completeError } = await supabase.from("analysis_runs").update({ status: "completed", failure_code: null, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", runId);
  if (completeError) throw new IntakeError("analysis_save_failed", "We could not finish saving the report. Try again.", 500);
}

export async function failAnalysisRun(id: string) {
  const { supabase } = await requireOwner();
  const { error } = await supabase.from("analysis_runs").update({ status: "failed", failure_code: "analysis_unavailable", updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new IntakeError("analysis_save_failed", "The report could not be saved. Try again.", 500);
}

export async function getOwnedAnalysisDetails(id: string): Promise<AnalysisDetails> {
  const [run, { supabase }] = await Promise.all([getOwnedAnalysisRun(id), requireOwner()]);
  const [{ data: jobData, error: jobError }, { data: cvData, error: cvError }, { data: findingData, error: findingError }] = await Promise.all([
    supabase.from("target_jobs").select("role_title,company_name").eq("id", run.targetJobId).single(),
    supabase.from("cv_documents").select("original_filename").eq("id", run.cvDocumentId).single(),
    supabase.from("requirement_findings").select().eq("analysis_run_id", id).order("ordinal", { ascending: true }),
  ]);
  if (jobError || !jobData || cvError || !cvData) throw new IntakeError("analysis_not_found", "That report is unavailable or does not belong to you.", 404);
  if (findingError) throw new IntakeError("analysis_load_failed", "We could not load this report. Try again.", 500);
  const job = jobData as { role_title: string; company_name: string | null };
  const cv = cvData as { original_filename: string };
  return {
    run,
    roleTitle: job.role_title,
    companyName: job.company_name,
    cvFilename: cv.original_filename,
    findings: ((findingData ?? []) as FindingRow[]).map(findingFromRow),
  };
}
