import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Called with the existing fictional M1 actors; never needs a privileged key.
export async function runM15PolicyChecks(a, b, anonymous, source, target) {
  const created = await a.supabase.from("analysis_runs").insert({
    owner_id: a.user.id, cv_document_id: source.id, target_job_id: target.id,
    client_request_id: randomUUID(), status: "completed", provider_name: "local-evidence",
    provider_version: "1.0.0", schema_version: "m2.1", engine_version: "local-evidence-1",
  }).select("id").single();
  assert.equal(created.error, null, "M15 synthetic run created");
  const id = created.data.id;
  const finding = { owner_id: a.user.id, analysis_run_id: id, ordinal: 0, requirement_text: "SQL coursework", status: "supported", evidence_kind: "cv_claim", evidence_excerpt: "SQL coursework", source_start: 28, source_end: 42, rationale: "Synthetic source excerpt.", caveat: "Fictional data only." };
  const gap = { ...finding, ordinal: 1, requirement_text: "Python", status: "missing", evidence_kind: null, evidence_excerpt: null, source_start: null, source_end: null };
  assert.equal((await a.supabase.from("requirement_findings").insert([finding, gap])).error, null, "M15 synthetic findings saved");
  const args = { p_analysis: id, p_content: "Fictional source-grounded SQL coursework draft for testing.",
    p_roadmap: [{ ordinal: 0, requirement: "Python", findingStatus: "missing", priority: "high", action: "Practice Python using a fictional project.", rationale: "Python wording was not found." }],
    p_claims: [{ ordinal: 0, requirement: finding.requirement_text, claimText: finding.evidence_excerpt, sourceExcerpt: finding.evidence_excerpt, sourceStart: finding.source_start, sourceEnd: finding.source_end }] };
  try {
    for (const caller of [b.supabase, anonymous]) assert.ok((await caller.rpc("m15_create_next_steps", args)).error, "M15 cross-owner and anonymous creation denied");
    const invalid = await a.supabase.rpc("m15_create_next_steps", { ...args, p_claims: [{ ...args.p_claims[0], claimText: "Invented SQL qualification" }] });
    assert.ok(invalid.error, "M15 unsupported provenance denied");
    for (const table of ["cv_drafts", "roadmap_items"]) {
      const remaining = await a.supabase.from(table).select("id").eq("analysis_run_id", id);
      assert.equal(remaining.error, null); assert.equal(remaining.data.length, 0, "M15 failed transaction leaves no partial records");
    }
    const results = await Promise.all([a.supabase.rpc("m15_create_next_steps", args), a.supabase.rpc("m15_create_next_steps", args)]);
    for (const result of results) assert.equal(result.error, null, "M15 concurrent creation succeeds");
    assert.equal(results[0].data, results[1].data, "M15 concurrent requests return one draft");
    const draftId = results[0].data;
    const provenance = await a.supabase.from("cv_draft_claims").select("claim_text,source_excerpt").eq("cv_draft_id", draftId);
    assert.equal(provenance.error, null); assert.equal(provenance.data.length, 1); assert.equal(provenance.data[0].claim_text, finding.evidence_excerpt);
    const accepted = await a.supabase.from("cv_drafts").update({ content: "Owner-edited fictional draft must survive retries.", accepted_at: new Date().toISOString() }).eq("id", draftId);
    assert.equal(accepted.error, null);
    assert.equal((await a.supabase.rpc("m15_create_next_steps", args)).data, draftId, "M15 retry retains draft identity");
    const preserved = await a.supabase.from("cv_drafts").select("content,accepted_at").eq("id", draftId).single();
    assert.equal(preserved.data.content, "Owner-edited fictional draft must survive retries."); assert.ok(preserved.data.accepted_at);
    console.log("M15 atomic rollback, concurrent retry, exact provenance, accepted-draft preservation and owner isolation passed.");
  } finally {
    assert.equal((await a.supabase.from("analysis_runs").delete().eq("id", id)).error, null, "M15 run cleaned up");
  }
}
