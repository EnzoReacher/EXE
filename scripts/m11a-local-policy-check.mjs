import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

// Explicit local test-only administration. Never runs from product code and never
// provisions a real expert. Reuses the already-running local database container.
export async function runM11aPolicyChecks(url, key) {
  const parsed = new URL(url);
  assert.ok(parsed.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname), "M11A acceptance requires loopback only");
  const runId = `m11a-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const admin = (sql) => execFileSync("docker", ["exec", "-i", "supabase_db_EXE", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-t", "-A"], { input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  const users = []; const objects = [];
  async function signup(label) {
    const supabase = client();
    const result = await supabase.auth.signUp({ email: `${runId}-${label}@example.test`, password: "Fictional-M11A-Policy-Only-1" });
    assert.equal(result.error, null, "temporary fictional account creation");
    assert.ok(result.data.session && result.data.user);
    const actor = { supabase, id: result.data.user.id }; users.push(actor); return actor;
  }
  const ok = (result, description) => { assert.equal(result.error, null, description); return result.data; };
  const denied = (result, description) => assert.ok(result.error || (Array.isArray(result.data) && !result.data.length), description);
  try {
    const owner = await signup("owner"); const other = await signup("other"); const expert = await signup("expert"); const inactive = await signup("inactive");
    const profile = randomUUID(); const inactiveProfile = randomUUID();
    admin(`insert into public.team_expert_profiles(id,reviewer_id,display_name,active,approval_status,approved_at) values ('${profile}','${expert.id}','Fictional local policy expert',true,'approved',now()),('${inactiveProfile}','${inactive.id}','Fictional inactive test expert',false,'pending',null);`);
    const anonymous = client();
    denied(await other.supabase.from("team_expert_profiles").insert({ reviewer_id: other.id, display_name: "Forbidden self-assignment", active: true }), "no self-service role assignment");
    denied(await other.supabase.rpc("m11a_expert_queue"), "non-expert queue denial");
    denied(await inactive.supabase.rpc("m11a_expert_queue"), "inactive expert queue denial");
    denied(await anonymous.rpc("m11a_experts"), "unauthenticated profile denial");
    const cv = ok(await owner.supabase.from("cv_documents").insert({ owner_id: owner.id, storage_path: `${owner.id}/${runId}.pdf`, original_filename: "fictional-policy-cv.pdf", content_type: "application/pdf", byte_size: 30, processing_status: "ready", extracted_text: "Original fictional CV text. No additional skill claim is present." }).select("id").single(), "source CV fixture");
    async function document(kind, proofType = "certificate") {
      const path = `${owner.id}/${randomUUID()}.pdf`; const bucket = kind === "credential" ? "credential-private" : "portfolio-private";
      ok(await owner.supabase.storage.from(bucket).upload(path, new Blob(["%PDF-1.4 fictional local proof"], { type: "application/pdf" }), { contentType: "application/pdf" }), "private fictional evidence upload");
      objects.push({ bucket, path });
      const id = ok(await owner.supabase.rpc("m11a_register_document", { p_kind: kind, p_path: path, p_filename: "fictional-evidence.pdf", p_mime: "application/pdf", p_size: 28, p_type: kind === "credential" ? proofType : null }), "private evidence record");
      return { id, path, bucket };
    }
    const proof = await document("credential"); const portfolio = await document("portfolio");
    denied(await other.supabase.storage.from(portfolio.bucket).download(portfolio.path), "cross-owner portfolio read denial");
    denied(await other.supabase.rpc("m11a_register_document", { p_kind: "portfolio", p_path: portfolio.path, p_filename: "fictional.pdf", p_mime: "application/pdf", p_size: 28, p_type: null }), "cross-owner portfolio registration denial");
    denied(await other.supabase.storage.from(proof.bucket).download(proof.path), "cross-owner proof read denial");
    denied(await expert.supabase.storage.from(proof.bucket).download(proof.path), "unassigned expert proof read denial");
    denied(await owner.supabase.storage.from(proof.bucket).update(proof.path, new Blob(["replacement"])), "immutable proof object denial");
    denied(await owner.supabase.storage.from(proof.bucket).remove([proof.path]), "proof cannot be removed without withdrawal");
    const publicResponse = await fetch(`${url}/storage/v1/object/public/${proof.bucket}/${proof.path}`);
    assert.notEqual(publicResponse.status, 200, "no public proof URL");
    const input = { p_cv: cv.id, p_credential: proof.id, p_portfolio: portfolio.id, p_expert: profile, p_skill: "Fictional SQL", p_wording: "Fictional SQL coursework evidenced by submitted proof." };
    denied(await owner.supabase.rpc("m11a_create_claim", { ...input, p_cv: null }), "source CV required");
    denied(await owner.supabase.rpc("m11a_create_claim", { ...input, p_credential: null }), "proof required");
    denied(await owner.supabase.rpc("m11a_create_claim", { ...input, p_expert: inactiveProfile }), "inactive selected expert denial");
    denied(await expert.supabase.rpc("m11a_create_claim", input), "cannot use another owner's evidence");
    const claim = ok(await owner.supabase.rpc("m11a_create_claim", input), "draft claim creation");
    denied(await other.supabase.from("credential_skill_claims").select().eq("id", claim), "cross-owner claim read denial");
    denied(await anonymous.rpc("m11a_submit_claim", { p_claim: claim }), "anonymous submission denial");
    denied(await owner.supabase.from("credential_skill_claims").update({ state: "approved" }).eq("id", claim), "owner cannot forge approval");
    denied(await owner.supabase.rpc("m11a_create_version", { p_claim: claim }), "draft cannot add a skill");
    ok(await owner.supabase.rpc("m11a_submit_claim", { p_claim: claim }), "submit frozen snapshot");
    denied(await owner.supabase.rpc("m11a_decide", { p_claim: claim, p_decision: "approved", p_note: "Forbidden self-approval" }), "self-approval denial");
    denied(await other.supabase.rpc("m11a_decide", { p_claim: claim, p_decision: "approved", p_note: "Forbidden ordinary account" }), "non-expert decision denial");
    denied(await inactive.supabase.rpc("m11a_decide", { p_claim: claim, p_decision: "approved", p_note: "Forbidden inactive expert" }), "inactive decision denial");
    assert.equal(ok(await expert.supabase.rpc("m11a_expert_queue"), "assigned queue").length, 1);
    const detail = ok(await expert.supabase.rpc("m11a_expert_detail", { p_claim: claim }), "assigned narrow detail");
    for (const key of ["owner_id", "ownerId", "storage_path", "jobDescription", "credentialId", "cvFilename"]) assert.equal(key in detail, false, "narrow expert detail");
    denied(await expert.supabase.from("cv_documents").select().eq("id", cv.id), "expert cannot browse source library");
    ok(await expert.supabase.storage.from(proof.bucket).download(proof.path), "assigned expert private proof access");
    ok(await expert.supabase.rpc("m11a_decide", { p_claim: claim, p_decision: "approved", p_note: "Fictional policy approval only, not a real expert result." }), "approve exact fictional wording");
    denied(await expert.supabase.storage.from(proof.bucket).download(proof.path), "review completion revokes expert proof access");
    const candidate = ok(await owner.supabase.rpc("m11a_create_version", { p_claim: claim }), "approved candidate creation");
    assert.equal(ok(await owner.supabase.rpc("m11a_create_version", { p_claim: claim }), "retry candidate"), candidate, "one candidate per claim");
    let version = ok(await owner.supabase.from("cv_versions").select().eq("id", candidate).single(), "candidate read");
    assert.equal(version.state, "candidate", "approval is not acceptance"); assert.equal(version.accepted_at, null);
    assert.equal(version.content_snapshot, `Original fictional CV text. No additional skill claim is present.\n\nApproved additional skills\n${input.p_wording}`, "only exact approved statement appended in marked section");
    const original = version.content_snapshot;
    denied(await other.supabase.from("cv_versions").select().eq("id", candidate), "cross-owner version denial");
    denied(await expert.supabase.rpc("m11a_review_version", { p_version: candidate, p_accept: true }), "expert cannot accept owner's version");
    denied(await owner.supabase.from("cv_versions").update({ state: "accepted" }).eq("id", candidate), "client cannot bypass acceptance function");
    denied(await owner.supabase.from("cv_versions").update({ content_snapshot: "Forged CV" }).eq("id", candidate), "snapshot write denial");
    ok(await owner.supabase.rpc("m11a_review_version", { p_version: candidate, p_accept: true }), "explicit owner acceptance");
    denied(await owner.supabase.rpc("m11a_withdraw_claim", { p_claim: claim }), "accepted claims require evidence withdrawal");
    const abandoned = ok(await owner.supabase.rpc("m11a_create_claim", input), "unaccepted fictional claim");
    denied(await other.supabase.rpc("m11a_withdraw_claim", { p_claim: abandoned }), "cross-owner withdrawal denial");
    ok(await owner.supabase.rpc("m11a_withdraw_claim", { p_claim: abandoned }), "individual claim withdrawal");
    denied(await owner.supabase.rpc("m11a_submit_claim", { p_claim: abandoned }), "withdrawn claim cannot be submitted");
    for (const decision of ["needs_information", "rejected"]) {
      const next = ok(await owner.supabase.rpc("m11a_create_claim", { ...input, p_portfolio: null }), "optional portfolio");
      ok(await owner.supabase.rpc("m11a_submit_claim", { p_claim: next }), "submit additional fictional claim");
      ok(await expert.supabase.rpc("m11a_decide", { p_claim: next, p_decision: decision, p_note: "Fictional policy decision only." }), "non-approval decision");
      denied(await owner.supabase.rpc("m11a_create_version", { p_claim: next }), "non-approved decision blocks version");
    }
    const proof2 = await document("credential", "degree");
    const next = ok(await owner.supabase.rpc("m11a_create_claim", { ...input, p_credential: proof2.id, p_portfolio: null, p_wording: "Second exact fictional skill statement." }), "next immutable claim");
    ok(await owner.supabase.rpc("m11a_submit_claim", { p_claim: next }), "submit second version claim");
    admin(`update public.team_expert_profiles set active=false where id='${profile}';`);
    denied(await expert.supabase.rpc("m11a_decide", { p_claim: next, p_decision: "approved", p_note: "Deactivated account denied." }), "deactivation after assignment denial");
    admin(`update public.team_expert_profiles set active=true where id='${profile}';`);
    ok(await expert.supabase.rpc("m11a_decide", { p_claim: next, p_decision: "approved", p_note: "Fictional policy approval." }), "second fictional approval");
    admin(`update public.team_expert_profiles set active=false where id='${profile}';`);
    denied(await owner.supabase.rpc("m11a_create_version", { p_claim: next }), "deactivated approving expert blocks candidate creation");
    admin(`update public.team_expert_profiles set active=true where id='${profile}';`);
    const candidate2 = ok(await owner.supabase.rpc("m11a_create_version", { p_claim: next }), "second candidate");
    ok(await owner.supabase.rpc("m11a_review_version", { p_version: candidate2, p_accept: true }), "second owner acceptance");
    version = ok(await owner.supabase.from("cv_versions").select().eq("id", candidate).single(), "historical read");
    assert.equal(version.state, "superseded"); assert.equal(version.content_snapshot, original, "historical content unchanged");
    assert.ok(ok(await owner.supabase.from("cv_versions").select("content_snapshot").eq("id", candidate2).single(), "new content").content_snapshot.startsWith(original), "prior text fully preserved");
    ok(await owner.supabase.rpc("m11a_withdraw_document", { p_kind: "credential", p_document: proof.id }), "proof withdrawal");
    const withdrawn = ok(await owner.supabase.from("cv_versions").select("state,content_snapshot"), "withdrawal history");
    assert.ok(withdrawn.every((v) => v.state === "evidence_withdrawn"), "withdrawal affects descendant versions too");
    assert.equal(withdrawn.find((v) => v.content_snapshot === original)?.content_snapshot, original);
    ok(await owner.supabase.storage.from(proof.bucket).remove([proof.path]), "private proof deletion after truthful withdrawal");
    denied(await expert.supabase.rpc("m11a_expert_detail", { p_claim: claim }), "withdrawn assignment denial");
    const source = ok(await owner.supabase.from("cv_documents").select("extracted_text").eq("id", cv.id).single(), "source unchanged");
    assert.equal(source.extracted_text, "Original fictional CV text. No additional skill claim is present.");
    console.log("M11A local fictional credential, assigned-expert, immutable-version, acceptance, withdrawal, RLS and private Storage checks passed.");
  } finally {
    // Test-created users/records only. Remove objects before cascading fixture rows.
    for (const actor of users) {
      if (actor === users[0]) {
        for (const item of objects) {
          admin(`update public.credential_documents set withdrawn_at=now() where owner_id='${actor.id}'; update public.portfolio_documents set withdrawn_at=now() where owner_id='${actor.id}';`);
          await actor.supabase.storage.from(item.bucket).remove([item.path]);
        }
      }
    }
    if (users[0]) admin(`delete from auth.users where id='${users[0].id}';`);
    for (const actor of users.slice(1)) admin(`delete from auth.users where id='${actor.id}';`);
  }
}
