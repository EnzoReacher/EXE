import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required.");

const runId = `m1-policy-${Date.now()}`;
const cv = (ownerId, suffix = "source") => ({
  owner_id: ownerId,
  storage_path: `${ownerId}/${runId}-${suffix}.pdf`,
  original_filename: "fictional-student-cv.pdf",
  content_type: "application/pdf",
  byte_size: 42,
  processing_status: "ready",
  extracted_text: "Fictional student completed SQL coursework for a sample project, used only for local policy testing.",
  parse_error_code: null,
});
const job = (ownerId) => ({
  owner_id: ownerId,
  role_title: "Fictional junior analyst",
  company_name: "Example Campus Co.",
  job_description: "A fictional job description with enough text for the local ownership policy test.",
});
const analysisRun = (ownerId, cvId, jobId) => ({
  owner_id: ownerId,
  cv_document_id: cvId,
  target_job_id: jobId,
  client_request_id: randomUUID(),
  status: "completed",
  provider_name: "local-evidence",
  provider_version: "1.0.0",
  schema_version: "m2.1",
  engine_version: "local-evidence-1",
  prompt_version: null,
  failure_code: null,
  completed_at: new Date().toISOString(),
});
const roadmapItem = (ownerId, analysisRunId) => ({
  owner_id: ownerId,
  analysis_run_id: analysisRunId,
  ordinal: 0,
  requirement_text: "Fictional SQL requirement",
  finding_status: "missing",
  priority: "high",
  action_text: "Build one fictional SQL practice project and describe only genuine work.",
  rationale: "The fictional M2 finding had no direct wording in the source fixture.",
  progress_status: "not_started",
});
const draft = (ownerId, analysisRunId, cvId, jobId) => ({
  owner_id: ownerId,
  analysis_run_id: analysisRunId,
  cv_document_id: cvId,
  target_job_id: jobId,
  version: 1,
  content: "Fictional analyst CV draft. Review every statement before using it in a real application.",
  accepted_at: null,
});
const reviewToken = () => randomBytes(32).toString("base64url");
const reviewShare = (ownerId, analysisRunId, draftId, token, patch = {}) => ({
  owner_id: ownerId,
  analysis_run_id: analysisRunId,
  cv_draft_id: draftId,
  token_hash: createHash("sha256").update(token).digest("hex"),
  expiry_hours: 24,
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  ...patch,
});
const opportunity = (ownerId, targetJobId, patch = {}) => ({
  owner_id: ownerId,
  target_job_id: targetJobId,
  source_url: "https://careers.example.test/fictional-junior-analyst",
  company_name: "Fictional Opportunity Co.",
  note: "Fictional private job-link note used only for local policy testing.",
  status: "saved",
  ...patch,
});
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function signUp(label) {
  const supabase = client();
  const { data, error } = await supabase.auth.signUp({
    email: `${runId}-${label}@example.test`, password: "Fictional-Policy-Password-1",
  });
  assert.equal(error, null, `sign up ${label}: ${error?.message}`);
  assert.ok(data.user && data.session, `local sign up ${label} did not return an authenticated session`);
  return { supabase, user: data.user };
}

async function expectDenied(operation, description) {
  const result = await operation();
  assert.ok(result.error || (Array.isArray(result.data) && result.data.length === 0), `${description} was unexpectedly allowed`);
}

async function run() {
  const unauthenticated = client();
  const a = await signUp("a");
  const b = await signUp("b");
  const aCv = cv(a.user.id); const bCv = cv(b.user.id);
  const fictionalPdf = new Blob(["%PDF-1.4 fictional policy fixture"], { type: "application/pdf" });

  await expectDenied(() => unauthenticated.from("cv_documents").select().eq("owner_id", a.user.id), "unauthenticated CV read");
  await expectDenied(() => unauthenticated.from("target_jobs").insert(job(a.user.id)).select(), "unauthenticated target-job create");
  await expectDenied(() => unauthenticated.storage.from("cv-private").upload(aCv.storage_path, fictionalPdf), "unauthenticated Storage upload");

  assert.equal((await a.supabase.storage.from("cv-private").upload(aCv.storage_path, fictionalPdf)).error, null, "A uploads under A path");
  assert.equal((await b.supabase.storage.from("cv-private").upload(bCv.storage_path, fictionalPdf)).error, null, "B uploads under B path");
  await expectDenied(() => a.supabase.storage.from("cv-private").upload(bCv.storage_path, fictionalPdf), "A uploading under B path");
  assert.equal((await a.supabase.from("cv_documents").insert(aCv)).error, null, "A creates own CV row");
  assert.equal((await b.supabase.from("cv_documents").insert(bCv)).error, null, "B creates own CV row");
  const { data: aJob, error: aJobError } = await a.supabase.from("target_jobs").insert(job(a.user.id)).select().single();
  assert.equal(aJobError, null, "A creates own target job");
  const { data: bJob, error: bJobError } = await b.supabase.from("target_jobs").insert(job(b.user.id)).select().single();
  assert.equal(bJobError, null, "B creates own target job");

  // M6b: saved external references remain private and do not cause any fetch.
  await expectDenied(() => unauthenticated.from("opportunity_links").select(), "unauthenticated opportunity read");
  await expectDenied(() => unauthenticated.from("opportunity_links").insert(opportunity(a.user.id, aJob.id)).select(), "unauthenticated opportunity create");
  const { data: aOpportunity, error: aOpportunityError } = await a.supabase.from("opportunity_links").insert(opportunity(a.user.id, aJob.id)).select().single();
  assert.equal(aOpportunityError, null, "A saves own fictional HTTPS opportunity reference");
  const { data: bOpportunity, error: bOpportunityError } = await b.supabase.from("opportunity_links").insert(opportunity(b.user.id, bJob.id)).select().single();
  assert.equal(bOpportunityError, null, "B saves own fictional HTTPS opportunity reference");
  await expectDenied(() => a.supabase.from("opportunity_links").insert(opportunity(a.user.id, bJob.id)).select(), "A attaching an opportunity to B target job");
  const ownOpportunities = await a.supabase.from("opportunity_links").select("id,status");
  assert.equal(ownOpportunities.error, null, "A reads own private opportunities");
  assert.equal(ownOpportunities.data?.length, 1, "A sees only own private opportunity");
  const ownOpportunityUpdate = await a.supabase.from("opportunity_links").update({ status: "preparing", note: "Updated fictional private note." }).eq("id", aOpportunity.id).select().single();
  assert.equal(ownOpportunityUpdate.error, null, "A updates own opportunity status and note");
  assert.equal(ownOpportunityUpdate.data.status, "preparing", "A sees own updated private status");
  const { data: aCvRow, error: aCvReadError } = await a.supabase.from("cv_documents").select("id").eq("storage_path", aCv.storage_path).single();
  assert.equal(aCvReadError, null, "A can load own CV id for analysis");
  const { data: bCvRow, error: bCvReadError } = await b.supabase.from("cv_documents").select("id").eq("storage_path", bCv.storage_path).single();
  assert.equal(bCvReadError, null, "B can load own CV id for analysis");

  const aRunInput = analysisRun(a.user.id, aCvRow.id, aJob.id);
  const { data: aRun, error: aRunError } = await a.supabase.from("analysis_runs").insert(aRunInput).select().single();
  assert.equal(aRunError, null, "A creates own analysis run");
  const duplicateRun = await a.supabase.from("analysis_runs").insert(aRunInput);
  assert.ok(duplicateRun.error, "the same client request id cannot create a duplicate analysis run");
  const { data: bRun, error: bRunError } = await b.supabase.from("analysis_runs").insert(analysisRun(b.user.id, bCvRow.id, bJob.id)).select().single();
  assert.equal(bRunError, null, "B creates own analysis run");
  const fictionalExcerpt = "SQL coursework";
  const fictionalStart = aCv.extracted_text.indexOf(fictionalExcerpt);
  const aFinding = {
    analysis_run_id: aRun.id,
    owner_id: a.user.id,
    ordinal: 0,
    requirement_text: "SQL coursework",
    status: "supported",
    evidence_kind: "cv_example",
    evidence_excerpt: fictionalExcerpt,
    source_start: fictionalStart,
    source_end: fictionalStart + fictionalExcerpt.length,
    rationale: "The fictional requirement wording appears in the local fixture.",
    caveat: "Fictional test data only; no skill is independently verified.",
  };
  const ownFinding = await a.supabase.from("requirement_findings").insert(aFinding).select().single();
  assert.equal(ownFinding.error, null, "A creates own evidence finding");
  const ownFindings = await a.supabase.from("requirement_findings").select("id").eq("analysis_run_id", aRun.id);
  assert.equal(ownFindings.error, null, "A can read own analysis findings");
  assert.equal(ownFindings.data?.length, 1, "A sees own saved evidence excerpt");

  const { data: aRoadmap, error: aRoadmapError } = await a.supabase.from("roadmap_items").insert(roadmapItem(a.user.id, aRun.id)).select().single();
  assert.equal(aRoadmapError, null, "A creates own M3 roadmap item");
  assert.equal(aRoadmap.progress_status, "not_started", "A sees own roadmap progress state");
  const { data: bRoadmap, error: bRoadmapError } = await b.supabase.from("roadmap_items").insert(roadmapItem(b.user.id, bRun.id)).select().single();
  assert.equal(bRoadmapError, null, "B creates own M3 roadmap item");
  const { data: aDraft, error: aDraftError } = await a.supabase.from("cv_drafts").insert(draft(a.user.id, aRun.id, aCvRow.id, aJob.id)).select().single();
  assert.equal(aDraftError, null, "A creates own source-grounded CV draft");
  const { data: bDraft, error: bDraftError } = await b.supabase.from("cv_drafts").insert(draft(b.user.id, bRun.id, bCvRow.id, bJob.id)).select().single();
  assert.equal(bDraftError, null, "B creates own source-grounded CV draft");
  const aDraftClaim = await a.supabase.from("cv_draft_claims").insert({
    cv_draft_id: aDraft.id,
    owner_id: a.user.id,
    ordinal: 0,
    requirement_text: "SQL coursework",
    claim_text: fictionalExcerpt,
    source_excerpt: fictionalExcerpt,
    source_start: fictionalStart,
    source_end: fictionalStart + fictionalExcerpt.length,
  }).select().single();
  assert.equal(aDraftClaim.error, null, "A creates source provenance for own CV draft");

  // M6a: review links use a hash only, are scoped to a completed owned report,
  // and include a draft only after explicit acceptance.
  const draftBeforeAcceptanceToken = reviewToken();
  await expectDenied(() => b.supabase.from("review_shares").insert(reviewShare(b.user.id, bRun.id, bDraft.id, draftBeforeAcceptanceToken)).select(), "B sharing an unaccepted draft");
  const acceptedDraft = await a.supabase.from("cv_drafts").update({ accepted_at: new Date().toISOString() }).eq("id", aDraft.id).select().single();
  assert.equal(acceptedDraft.error, null, "A explicitly accepts own draft before sharing it");
  const activeToken = reviewToken();
  const { data: activeShare, error: activeShareError } = await a.supabase.from("review_shares").insert(reviewShare(a.user.id, aRun.id, aDraft.id, activeToken)).select().single();
  assert.equal(activeShareError, null, "A creates a private review share for own completed report and accepted draft");
  assert.match(activeShare.token_hash, /^[a-f0-9]{64}$/, "only a SHA-256 token hash is stored");
  assert.notEqual(activeShare.token_hash, activeToken, "raw review token is never stored");
  const ownShares = await a.supabase.from("review_shares").select("id,token_hash").eq("id", activeShare.id);
  assert.equal(ownShares.data?.length, 1, "A can list own review share metadata");
  await expectDenied(() => unauthenticated.from("review_shares").select().eq("id", activeShare.id), "anonymous direct review share read");
  await expectDenied(() => unauthenticated.from("expert_reviews").select().eq("review_share_id", activeShare.id), "anonymous direct feedback read");
  await expectDenied(() => b.supabase.from("review_shares").select().eq("id", activeShare.id), "B reading A review share");
  await expectDenied(() => b.supabase.from("review_shares").update({ revoked_at: new Date().toISOString() }).eq("id", activeShare.id).select(), "B revoking A review share");

  const validReview = await unauthenticated.rpc("get_private_review", { p_token: activeToken });
  assert.equal(validReview.error, null, "valid anonymous token calls narrow review RPC");
  assert.equal(validReview.data.roleTitle, "Fictional junior analyst", "valid token returns selected role only");
  assert.equal(validReview.data.companyName, "Example Campus Co.", "valid token returns selected company only");
  assert.equal(validReview.data.findings.length, 1, "valid token returns only selected report findings");
  assert.equal(validReview.data.draftContent, aDraft.content, "valid token returns selected accepted draft only");
  assert.equal("ownerId" in validReview.data, false, "review RPC excludes owner IDs");
  assert.equal("jobDescription" in validReview.data, false, "review RPC excludes raw job description");
  assert.equal("cvFilename" in validReview.data, false, "review RPC excludes CV library metadata");
  const invalidReview = await unauthenticated.rpc("get_private_review", { p_token: reviewToken() });
  assert.equal(invalidReview.data, null, "invalid token returns no review content");

  const feedbackSubmission = randomUUID();
  const submittedFeedback = await unauthenticated.rpc("submit_private_review", { p_token: activeToken, p_reviewer_name: "Fictional reviewer", p_reviewer_role: "Fictional mentor", p_feedback: "This fictional feedback is long enough for the local acceptance test.", p_submission_id: feedbackSubmission });
  assert.equal(submittedFeedback.data, true, "valid token submits fictional feedback");
  const duplicateFeedback = await unauthenticated.rpc("submit_private_review", { p_token: activeToken, p_reviewer_name: "Fictional reviewer", p_reviewer_role: "Fictional mentor", p_feedback: "This fictional feedback is long enough for the local acceptance test.", p_submission_id: feedbackSubmission });
  assert.equal(duplicateFeedback.data, true, "duplicate submission ID is safely idempotent");
  const ownFeedback = await a.supabase.from("expert_reviews").select("feedback").eq("review_share_id", activeShare.id);
  assert.equal(ownFeedback.data?.length, 1, "A reads feedback only on own share");
  await expectDenied(() => b.supabase.from("expert_reviews").select().eq("review_share_id", activeShare.id), "B reading feedback on A share");

  const expiredToken = reviewToken();
  const expiredShare = await a.supabase.from("review_shares").insert(reviewShare(a.user.id, aRun.id, null, expiredToken, { created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() })).select().single();
  assert.equal(expiredShare.error, null, "A creates an expired fictional review fixture");
  assert.equal((await unauthenticated.rpc("get_private_review", { p_token: expiredToken })).data, null, "expired token returns no review content");
  assert.equal((await unauthenticated.rpc("submit_private_review", { p_token: expiredToken, p_reviewer_name: null, p_reviewer_role: null, p_feedback: "This fictional feedback must be rejected after the link expires.", p_submission_id: randomUUID() })).data, false, "expired token cannot submit feedback");

  const revokedToken = reviewToken();
  const revokedShare = await a.supabase.from("review_shares").insert(reviewShare(a.user.id, aRun.id, null, revokedToken)).select().single();
  assert.equal(revokedShare.error, null, "A creates revocable fictional review fixture");
  const revocation = await a.supabase.from("review_shares").update({ revoked_at: new Date().toISOString() }).eq("id", revokedShare.data.id).select().single();
  assert.equal(revocation.error, null, "A revokes own review link immediately");
  assert.equal((await unauthenticated.rpc("get_private_review", { p_token: revokedToken })).data, null, "revoked token returns no review content");
  assert.equal((await unauthenticated.rpc("submit_private_review", { p_token: revokedToken, p_reviewer_name: null, p_reviewer_role: null, p_feedback: "This fictional feedback must be rejected after the link is revoked.", p_submission_id: randomUUID() })).data, false, "revoked token cannot submit feedback");

  const editedDraftToken = reviewToken();
  const editedDraftShare = await a.supabase.from("review_shares").insert(reviewShare(a.user.id, aRun.id, aDraft.id, editedDraftToken)).select().single();
  assert.equal(editedDraftShare.error, null, "A creates a share for an accepted fictional draft before editing it");
  const editedDraft = await a.supabase.from("cv_drafts").update({ content: `${aDraft.content}\nFictional owner edit.`, accepted_at: null }).eq("id", aDraft.id).select().single();
  assert.equal(editedDraft.error, null, "editing a draft clears its acceptance");
  assert.equal((await unauthenticated.rpc("get_private_review", { p_token: editedDraftToken })).data, null, "editing an included draft revokes its review link");

  const ownCvRead = await a.supabase.from("cv_documents").select().eq("storage_path", aCv.storage_path);
  assert.equal(ownCvRead.error, null, "A can read own CV collection");
  assert.equal(ownCvRead.data?.length, 1, "A can see own CV row");
  assert.equal((await a.supabase.storage.from("cv-private").download(aCv.storage_path)).error, null, "A can read own private object");
  assert.equal((await b.supabase.storage.from("cv-private").download(bCv.storage_path)).error, null, "B can read own private object");
  await expectDenied(() => a.supabase.from("cv_documents").select().eq("storage_path", bCv.storage_path), "A reading B CV row");
  await expectDenied(() => a.supabase.from("target_jobs").select().eq("id", bJob.id), "A reading B target job");
  await expectDenied(() => a.supabase.from("analysis_runs").select().eq("id", bRun.id), "A reading B analysis run");
  await expectDenied(() => a.supabase.from("requirement_findings").select().eq("analysis_run_id", bRun.id), "A reading B analysis findings");
  await expectDenied(() => a.supabase.from("roadmap_items").select().eq("id", bRoadmap.id), "A reading B roadmap item");
  await expectDenied(() => a.supabase.from("cv_drafts").select().eq("id", bDraft.id), "A reading B CV draft");
  await expectDenied(() => a.supabase.from("cv_draft_claims").select().eq("cv_draft_id", bDraft.id), "A reading B draft provenance");
  await expectDenied(() => a.supabase.from("opportunity_links").select().eq("id", bOpportunity.id), "A reading B opportunity");
  await expectDenied(() => unauthenticated.from("analysis_runs").select().eq("id", aRun.id), "unauthenticated analysis read");
  await expectDenied(() => unauthenticated.from("cv_drafts").select().eq("id", aDraft.id), "unauthenticated CV draft read");
  await expectDenied(() => a.supabase.from("analysis_runs").insert(analysisRun(a.user.id, bCvRow.id, bJob.id)).select(), "A linking another user's CV and job");
  await expectDenied(() => a.supabase.from("requirement_findings").insert({ ...aFinding, analysis_run_id: bRun.id }).select(), "A writing a finding to B's analysis run");
  await expectDenied(() => a.supabase.from("roadmap_items").insert(roadmapItem(a.user.id, bRun.id)).select(), "A writing a roadmap item to B's analysis run");
  await expectDenied(() => a.supabase.from("cv_drafts").insert(draft(a.user.id, bRun.id, aCvRow.id, aJob.id)).select(), "A writing a CV draft to B's analysis run");
  await expectDenied(() => a.supabase.storage.from("cv-private").download(bCv.storage_path), "A reading B private object");
  const publicBObject = await fetch(`${url}/storage/v1/object/public/cv-private/${bCv.storage_path}`);
  assert.notEqual(publicBObject.status, 200, "private bucket unexpectedly served B's object publicly");

  const ownCvUpdate = await a.supabase.from("cv_documents").update({ extracted_text: "Updated fictional CV text." }).eq("storage_path", aCv.storage_path).select();
  assert.equal(ownCvUpdate.error, null, "A updates own CV row");
  assert.equal(ownCvUpdate.data?.length, 1, "A updates exactly one own CV row");
  const ownJobUpdate = await a.supabase.from("target_jobs").update({ company_name: "Updated Example Campus Co." }).eq("id", aJob.id).select();
  assert.equal(ownJobUpdate.error, null, "A updates own target job");
  assert.equal(ownJobUpdate.data?.length, 1, "A updates exactly one own target job");
  assert.equal((await a.supabase.storage.from("cv-private").update(aCv.storage_path, new Blob(["%PDF-1.4 replacement"], { type: "application/pdf" }))).error, null, "A replaces own private object");
  await expectDenied(() => a.supabase.from("cv_documents").update({ extracted_text: "forbidden" }).eq("storage_path", bCv.storage_path).select(), "A updating B CV row");
  await expectDenied(() => a.supabase.from("target_jobs").update({ company_name: "forbidden" }).eq("id", bJob.id).select(), "A updating B target job");
  await expectDenied(() => a.supabase.from("roadmap_items").update({ progress_status: "completed" }).eq("id", bRoadmap.id).select(), "A updating B roadmap item");
  await expectDenied(() => a.supabase.from("cv_drafts").update({ accepted_at: new Date().toISOString() }).eq("id", bDraft.id).select(), "A updating B CV draft");
  await expectDenied(() => a.supabase.from("opportunity_links").update({ status: "dismissed" }).eq("id", bOpportunity.id).select(), "A updating B opportunity");
  await expectDenied(() => a.supabase.storage.from("cv-private").update(bCv.storage_path, fictionalPdf), "A replacing B private object");

  // Exercise the application's retryable failed-deletion state using fictional
  // data, then recover it before executing the successful deletion sequence.
  const deletionStarted = await a.supabase.from("cv_documents").update({ processing_status: "deleting" }).eq("storage_path", aCv.storage_path).select();
  assert.equal(deletionStarted.error, null, "A begins own CV deletion");
  assert.equal(deletionStarted.data?.length, 1, "A transitions one own CV row to deleting");
  const deletionFailed = await a.supabase.from("cv_documents").update({ processing_status: "delete_failed" }).eq("storage_path", aCv.storage_path).select();
  assert.equal(deletionFailed.error, null, "A retains own failed deletion for retry");
  assert.equal(deletionFailed.data?.length, 1, "A transitions one own CV row to delete_failed");
  const retryable = await a.supabase.from("cv_documents").select("processing_status, extracted_text").eq("storage_path", aCv.storage_path).single();
  assert.equal(retryable.error, null, "A can see own failed deletion state");
  assert.equal(retryable.data.processing_status, "delete_failed", "failed deletion state is visible");
  assert.equal(retryable.data.extracted_text, "Updated fictional CV text.", "failed deletion retains text until retry succeeds");

  // The application deletion sequence removes the live object before its row,
  // so successful deletion proves extracted text is no longer reachable.
  assert.equal((await a.supabase.storage.from("cv-private").remove([aCv.storage_path])).error, null, "A deletes own object");
  const deletedOwnCv = await a.supabase.from("cv_documents").delete().eq("storage_path", aCv.storage_path).select();
  assert.equal(deletedOwnCv.error, null, "A deletes own CV row and extracted text");
  assert.equal(deletedOwnCv.data?.length, 1, "A deletes exactly one own CV row");
  await expectDenied(() => a.supabase.storage.from("cv-private").download(aCv.storage_path), "A reading deleted object");
  const aDeletedCv = await a.supabase.from("cv_documents").select("extracted_text").eq("storage_path", aCv.storage_path);
  assert.equal(aDeletedCv.data?.length, 0, "deleted CV extracted text remains unreachable");
  const aDeletedAnalysis = await a.supabase.from("analysis_runs").select("id").eq("id", aRun.id);
  assert.equal(aDeletedAnalysis.data?.length, 0, "deleting a CV removes its analysis run");
  const aDeletedFindings = await a.supabase.from("requirement_findings").select("id").eq("analysis_run_id", aRun.id);
  assert.equal(aDeletedFindings.data?.length, 0, "deleting a CV removes its evidence excerpts");
  const aDeletedRoadmap = await a.supabase.from("roadmap_items").select("id").eq("analysis_run_id", aRun.id);
  assert.equal(aDeletedRoadmap.data?.length, 0, "deleting a CV removes its M3 roadmap items");
  const aDeletedDraft = await a.supabase.from("cv_drafts").select("id").eq("id", aDraft.id);
  assert.equal(aDeletedDraft.data?.length, 0, "deleting a CV removes its source-grounded draft");
  const aDeletedDraftClaims = await a.supabase.from("cv_draft_claims").select("id").eq("cv_draft_id", aDraft.id);
  assert.equal(aDeletedDraftClaims.data?.length, 0, "deleting a CV removes draft provenance");
  const aDeletedReviewShares = await a.supabase.from("review_shares").select("id").eq("id", activeShare.id);
  assert.equal(aDeletedReviewShares.data?.length, 0, "deleting a CV removes related review shares");
  const aDeletedFeedback = await a.supabase.from("expert_reviews").select("id").eq("review_share_id", activeShare.id);
  assert.equal(aDeletedFeedback.data?.length, 0, "deleting a CV removes related reviewer feedback");
  assert.equal((await unauthenticated.rpc("get_private_review", { p_token: activeToken })).data, null, "source deletion makes active review token unavailable");
  await expectDenied(() => a.supabase.from("cv_documents").delete().eq("storage_path", bCv.storage_path).select(), "A deleting B CV row");
  await expectDenied(() => a.supabase.storage.from("cv-private").remove([bCv.storage_path]), "A deleting B object");
  await expectDenied(() => a.supabase.from("target_jobs").delete().eq("id", bJob.id).select(), "A deleting B target job");
  await expectDenied(() => a.supabase.from("opportunity_links").delete().eq("id", bOpportunity.id).select(), "A deleting B opportunity");

  const deletedBOpp = await b.supabase.from("opportunity_links").delete().eq("id", bOpportunity.id).select();
  assert.equal(deletedBOpp.error, null, "B deletes own private opportunity");

  assert.equal((await b.supabase.storage.from("cv-private").remove([bCv.storage_path])).error, null, "B deletes own object");
  const deletedBCv = await b.supabase.from("cv_documents").delete().eq("storage_path", bCv.storage_path).select();
  assert.equal(deletedBCv.error, null, "B deletes own CV row");
  assert.equal(deletedBCv.data?.length, 1, "B deletes exactly one own CV row");
  const deletedAJob = await a.supabase.from("target_jobs").delete().eq("id", aJob.id).select();
  assert.equal(deletedAJob.error, null, "A deletes own target job");
  assert.equal(deletedAJob.data?.length, 1, "A deletes exactly one own target job");
  const deletedAOpportunity = await a.supabase.from("opportunity_links").select("id").eq("id", aOpportunity.id);
  assert.equal(deletedAOpportunity.data?.length, 0, "deleting A target job removes its private opportunity");
  const deletedBJob = await b.supabase.from("target_jobs").delete().eq("id", bJob.id).select();
  assert.equal(deletedBJob.error, null, "B deletes own target job");
  assert.equal(deletedBJob.data?.length, 1, "B deletes exactly one own target job");

  console.log("M1–M6b local Supabase RLS, private Storage, analysis, roadmap, draft, review-link, feedback, opportunity-link, and cascade checks passed for two fictional users.");
}

await run();
