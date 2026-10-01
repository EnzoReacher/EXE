import assert from "node:assert/strict";
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
  extracted_text: "Fictional student CV text used only for local policy testing.",
  parse_error_code: null,
});
const job = (ownerId) => ({
  owner_id: ownerId,
  role_title: "Fictional junior analyst",
  company_name: "Example Campus Co.",
  job_description: "A fictional job description with enough text for the local ownership policy test.",
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
  assert.ok(result.error || (Array.isArray(result.data) && result.data.length === 0) || result.data === null, `${description} was unexpectedly allowed`);
}

async function run() {
  const unauthenticated = client();
  const a = await signUp("a");
  const b = await signUp("b");
  const aCv = cv(a.user.id); const bCv = cv(b.user.id);
  const fictionalPdf = new Blob(["%PDF-1.4 fictional policy fixture"], { type: "application/pdf" });

  await expectDenied(() => unauthenticated.from("cv_documents").select().eq("owner_id", a.user.id), "unauthenticated CV read");
  await expectDenied(() => unauthenticated.from("target_jobs").insert(job(a.user.id)), "unauthenticated target-job create");
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

  const ownCvRead = await a.supabase.from("cv_documents").select().eq("storage_path", aCv.storage_path);
  assert.equal(ownCvRead.error, null, "A can read own CV collection");
  assert.equal(ownCvRead.data?.length, 1, "A can see own CV row");
  assert.equal((await a.supabase.storage.from("cv-private").download(aCv.storage_path)).error, null, "A can read own private object");
  assert.equal((await b.supabase.storage.from("cv-private").download(bCv.storage_path)).error, null, "B can read own private object");
  await expectDenied(() => a.supabase.from("cv_documents").select().eq("storage_path", bCv.storage_path), "A reading B CV row");
  await expectDenied(() => a.supabase.from("target_jobs").select().eq("id", bJob.id), "A reading B target job");
  await expectDenied(() => a.supabase.storage.from("cv-private").download(bCv.storage_path), "A reading B private object");
  const publicBObject = await fetch(`${url}/storage/v1/object/public/cv-private/${bCv.storage_path}`);
  assert.notEqual(publicBObject.status, 200, "private bucket unexpectedly served B's object publicly");

  assert.equal((await a.supabase.from("cv_documents").update({ extracted_text: "Updated fictional CV text." }).eq("storage_path", aCv.storage_path)).error, null, "A updates own CV row");
  assert.equal((await a.supabase.from("target_jobs").update({ company_name: "Updated Example Campus Co." }).eq("id", aJob.id)).error, null, "A updates own target job");
  assert.equal((await a.supabase.storage.from("cv-private").update(aCv.storage_path, new Blob(["%PDF-1.4 replacement"], { type: "application/pdf" }))).error, null, "A replaces own private object");
  await expectDenied(() => a.supabase.from("cv_documents").update({ extracted_text: "forbidden" }).eq("storage_path", bCv.storage_path), "A updating B CV row");
  await expectDenied(() => a.supabase.from("target_jobs").update({ company_name: "forbidden" }).eq("id", bJob.id), "A updating B target job");
  await expectDenied(() => a.supabase.storage.from("cv-private").update(bCv.storage_path, fictionalPdf), "A replacing B private object");

  // Exercise the application's retryable failed-deletion state using fictional
  // data, then recover it before executing the successful deletion sequence.
  assert.equal((await a.supabase.from("cv_documents").update({ processing_status: "deleting" }).eq("storage_path", aCv.storage_path)).error, null, "A begins own CV deletion");
  assert.equal((await a.supabase.from("cv_documents").update({ processing_status: "delete_failed" }).eq("storage_path", aCv.storage_path)).error, null, "A retains own failed deletion for retry");
  const retryable = await a.supabase.from("cv_documents").select("processing_status, extracted_text").eq("storage_path", aCv.storage_path).single();
  assert.equal(retryable.error, null, "A can see own failed deletion state");
  assert.equal(retryable.data.processing_status, "delete_failed", "failed deletion state is visible");
  assert.equal(retryable.data.extracted_text, "Updated fictional CV text.", "failed deletion retains text until retry succeeds");

  // The application deletion sequence removes the live object before its row,
  // so successful deletion proves extracted text is no longer reachable.
  assert.equal((await a.supabase.storage.from("cv-private").remove([aCv.storage_path])).error, null, "A deletes own object");
  assert.equal((await a.supabase.from("cv_documents").delete().eq("storage_path", aCv.storage_path)).error, null, "A deletes own CV row and extracted text");
  await expectDenied(() => a.supabase.storage.from("cv-private").download(aCv.storage_path), "A reading deleted object");
  const aDeletedCv = await a.supabase.from("cv_documents").select("extracted_text").eq("storage_path", aCv.storage_path);
  assert.equal(aDeletedCv.data?.length, 0, "deleted CV extracted text remains unreachable");
  await expectDenied(() => a.supabase.from("cv_documents").delete().eq("storage_path", bCv.storage_path), "A deleting B CV row");
  await expectDenied(() => a.supabase.storage.from("cv-private").remove([bCv.storage_path]), "A deleting B object");
  await expectDenied(() => a.supabase.from("target_jobs").delete().eq("id", bJob.id), "A deleting B target job");

  assert.equal((await b.supabase.storage.from("cv-private").remove([bCv.storage_path])).error, null, "B deletes own object");
  assert.equal((await b.supabase.from("cv_documents").delete().eq("storage_path", bCv.storage_path)).error, null, "B deletes own CV row");
  assert.equal((await a.supabase.from("target_jobs").delete().eq("id", aJob.id)).error, null, "A deletes own target job");
  assert.equal((await b.supabase.from("target_jobs").delete().eq("id", bJob.id)).error, null, "B deletes own target job");

  console.log("M1 local Supabase RLS and private Storage policy checks passed for two fictional users.");
}

await run();
