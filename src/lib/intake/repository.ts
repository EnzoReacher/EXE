import { CV_BUCKET, IntakeError, OwnedCv, TargetJob } from "./types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CvRow = { id: string; owner_id: string; storage_path: string; original_filename: string; content_type: string; byte_size: number; processing_status: OwnedCv["processingStatus"]; extracted_text: string | null; parse_error_code: string | null };
type JobRow = { id: string; owner_id: string; role_title: string; company_name: string | null; job_description: string };
const cvFromRow = (row: CvRow): OwnedCv => ({ id: row.id, ownerId: row.owner_id, storagePath: row.storage_path, originalFilename: row.original_filename, contentType: row.content_type, byteSize: row.byte_size, processingStatus: row.processing_status, extractedText: row.extracted_text, parseErrorCode: row.parse_error_code });
const jobFromRow = (row: JobRow): TargetJob => ({ id: row.id, ownerId: row.owner_id, roleTitle: row.role_title, companyName: row.company_name, jobDescription: row.job_description });

export async function requireCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new IntakeError("unauthenticated", "Sign in to manage your private CV and target job.", 401);
  return { supabase, user };
}

export async function createCvRecord(ownerId: string, input: Omit<OwnedCv, "id" | "ownerId">) {
  const { supabase, user } = await requireCurrentUser();
  if (user.id !== ownerId) throw new IntakeError("forbidden", "You cannot save a CV for another account.", 403);
  const { data, error } = await supabase.from("cv_documents").insert({ owner_id: ownerId, storage_path: input.storagePath, original_filename: input.originalFilename, content_type: input.contentType, byte_size: input.byteSize, processing_status: input.processingStatus, extracted_text: input.extractedText, parse_error_code: input.parseErrorCode }).select().single();
  if (error) throw new IntakeError("save_failed", "We could not save your CV record. Try again.", 500);
  return cvFromRow(data as CvRow);
}

export async function updateCvRecord(id: string, patch: Partial<Pick<OwnedCv, "processingStatus" | "extractedText" | "parseErrorCode">>) {
  const { supabase } = await requireCurrentUser();
  const { data, error } = await supabase.from("cv_documents").update({ processing_status: patch.processingStatus, extracted_text: patch.extractedText, parse_error_code: patch.parseErrorCode }).eq("id", id).select().single();
  if (error || !data) throw new IntakeError("not_found", "That CV is unavailable or does not belong to you.", 404);
  return cvFromRow(data as CvRow);
}

export async function getOwnedCv(id: string) {
  const { supabase } = await requireCurrentUser();
  const { data, error } = await supabase.from("cv_documents").select().eq("id", id).single();
  if (error || !data) throw new IntakeError("not_found", "That CV is unavailable or does not belong to you.", 404);
  return cvFromRow(data as CvRow);
}

export async function listOwnedCvs() {
  const { supabase } = await requireCurrentUser();
  const { data, error } = await supabase.from("cv_documents").select().order("created_at", { ascending: false });
  if (error) throw new IntakeError("load_failed", "We could not load your CVs. Try again.", 500);
  return (data as CvRow[]).map(cvFromRow);
}

export async function removeOwnedCv(id: string) {
  const { supabase } = await requireCurrentUser(); const cv = await getOwnedCv(id);
  const { error: stateError } = await supabase.from("cv_documents").update({ processing_status: "deleting" }).eq("id", id);
  if (stateError) throw new IntakeError("delete_failed", "We could not begin deleting this CV. Try again.", 500);
  const { error: storageError } = await supabase.storage.from(CV_BUCKET).remove([cv.storagePath]);
  if (storageError) { await supabase.from("cv_documents").update({ processing_status: "delete_failed" }).eq("id", id); throw new IntakeError("delete_failed", "The CV was not deleted. Please retry.", 500); }
  const { error: recordError } = await supabase.from("cv_documents").delete().eq("id", id);
  if (recordError) throw new IntakeError("delete_failed", "The file was removed but its private record could not be cleared. Please retry.", 500);
}

export async function replaceOwnedCv(previousId: string, nextCv: OwnedCv) {
  if (previousId === nextCv.id) return;
  const previousCv = await getOwnedCv(previousId);
  if (previousCv.ownerId !== nextCv.ownerId) throw new IntakeError("not_found", "That CV is unavailable or does not belong to you.", 404);
  await removeOwnedCv(previousId);
}

export async function saveTargetJob(ownerId: string, input: Omit<TargetJob, "id" | "ownerId">) {
  const { supabase, user } = await requireCurrentUser();
  if (user.id !== ownerId) throw new IntakeError("forbidden", "You cannot save a target job for another account.", 403);
  const { data, error } = await supabase.from("target_jobs").insert({ owner_id: ownerId, role_title: input.roleTitle, company_name: input.companyName, job_description: input.jobDescription }).select().single();
  if (error) throw new IntakeError("job_save_failed", "We could not save your target job. Try again.", 500);
  return jobFromRow(data as JobRow);
}

export async function listOwnedTargetJobs() {
  const { supabase } = await requireCurrentUser();
  const { data, error } = await supabase.from("target_jobs").select().order("created_at", { ascending: false });
  if (error) throw new IntakeError("load_failed", "We could not load your target jobs. Try again.", 500);
  return (data as JobRow[]).map(jobFromRow);
}
