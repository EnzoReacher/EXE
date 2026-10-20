import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, statSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ALLOCATION, PROTOCOL, blankPilot, median, summarizePilot, validatePilot } from "./ownpath-pilot.mjs";

function condition(slot, tool, card) {
  return { slot, tool, card, tool_family: tool === "ownpath" ? "local_template" : "chatgpt", tool_version: "fictional-test-v1", status: "submitted",
    elapsed_seconds: tool === "ownpath" ? 300 : 400, interruption_seconds: 0, final_bullets: 1,
    wording_edits: 1, regenerate_reprompt: 0, prompt_answers: 2, fact_requests: 2, procedural_help: 0,
    reviewers: 2, review_blinding: "partial", unresolved_disagreements: 0, relevance: 4, trust: 3, reuse: "unsure",
    claims: { supported: 3, contradicted: 0, not_supplied: 0, ambiguous: 0, pending: 0 },
    safety_review_complete: true, safety_findings: { unsupported_generated: 0, jd_only_generated: 0, stale_accepted: 0, cross_session_leakage: 0 } };
}
function fixture(n = 4) {
  return { schema_version: 1, protocol: PROTOCOL, data_kind: "synthetic", code_sha: "1".repeat(40), collection_start: "2026-10-12", collection_end: "2026-10-12",
    withdrawals_excluded: 0, ineligible_excluded: 0, limitations: ["known_vocabulary", "task_asymmetry", "convenience_sample"],
    sessions: Array.from({ length: n }, (_, i) => { const sequence = `S${i % 4 + 1}`; return { participant_code: `P${String(i + 1).padStart(3, "0")}`, enrollment_index: i + 1,
      sequence, allocation_deviation: false, eligible: true, consent_to_retained_anonymous_notes: true, conditions: ALLOCATION[sequence].map(([tool, card], j) => condition(j + 1, tool, card)) }; }) };
}
const own = (data, index = 0) => data.sessions[index].conditions.find(c => c.tool === "ownpath");
function unfinished(c, status) {
  c.status = status; c.final_bullets = 0; c.claims = { supported: 0, contradicted: 0, not_supplied: 0, ambiguous: 0, pending: 0 };
  c.reviewers = 0; c.review_blinding = "not_performed"; c.unresolved_disagreements = 0; c.relevance = null;
  if (status === "time_cap") c.elapsed_seconds = 600;
  if (status === "not_attempted") for (const k of Object.keys(c)) if (!["slot", "tool", "card", "status"].includes(k)) c[k] = null;
}
describe("private pilot preparation, synthetic fixtures only", () => {
  it("summarizes all four prescribed sequences without mutating input or leaking identifiers/versions", () => {
    const f = fixture(); const before = JSON.stringify(f); const out = summarizePilot(f);
    expect(out.paired.completed_pairs).toBe(4); expect(out.paired.differences.elapsed_seconds).toEqual({ n: 4, median: -100, min: -100, max: -100 });
    expect(out.evidence_status).toBe("SYNTHETIC_TEST_ONLY_NOT_EVIDENCE");
    expect(out.tools.ownpath.unassisted_completed).toBe(4); expect(out.tools.ownpath.formative_targets.completion_80_percent).toBe("met");
    expect(out.tools.ownpath.formative_targets.release_approval).toBe(false);
    expect(JSON.stringify(out)).not.toContain("P001"); expect(JSON.stringify(out)).not.toContain("fictional-test-v1"); expect(JSON.stringify(f)).toBe(before);
  });
  it("keeps capped/stopped tasks in denominators and excludes incomplete pairs/time caps from completed-time medians", () => {
    const f = fixture(); unfinished(own(f), "time_cap"); unfinished(own(f, 1), "stopped"); unfinished(own(f, 2), "not_attempted");
    const out = summarizePilot(f); expect(out.tools.ownpath.attempted).toBe(3); expect(out.tools.ownpath.not_attempted).toBe(1);
    expect(out.tools.ownpath.time_capped).toBe(1); expect(out.tools.ownpath.stopped).toBe(1); expect(out.tools.ownpath.completed_seconds.n).toBe(1);
    expect(out.tools.ownpath.formative_targets.completion_required).toBe(3); expect(out.tools.ownpath.formative_targets.completion_80_percent).toBe("missed");
    expect(out.paired.completed_pairs).toBe(1); expect(out.paired.incomplete_pairs).toBe(3);
  });
  it("counts factual requests as normal information and procedural coaching as assistance", () => {
    const f = fixture(1); own(f).fact_requests = 15; own(f).interruption_seconds = 20;
    expect(summarizePilot(f).tools.ownpath.unassisted_completed).toBe(1);
    own(f).procedural_help = 1; const out = summarizePilot(f);
    expect(out.tools.ownpath.usable_completed).toBe(1); expect(out.tools.ownpath.unassisted_completed).toBe(0);
    expect(out.paired.pairs_with_procedural_help).toBe(1); expect(out.tools.ownpath.completed_seconds.median).toBe(300);
    expect(out.tools.ownpath.interruptions).toEqual({ tasks: 1, seconds: 20, subtracted_from_elapsed: false });
  });
  it("never treats unsupported/ambiguous/unreviewed claims or reviewer disagreements as valid completion", () => {
    for (const k of ["contradicted", "not_supplied", "ambiguous", "pending"]) {
      const f = fixture(1); own(f).claims[k] = 1; const out = summarizePilot(f);
      expect(out.tools.ownpath.usable_completed).toBe(0); expect(out.paired.completed_pairs).toBe(0);
      expect(out.tools.ownpath.formative_targets.completion_80_percent).toBe(["ambiguous", "pending"].includes(k) ? "pending_review" : "missed");
      if (["ambiguous", "pending"].includes(k)) { expect(out.tools.ownpath.formative_targets.relevance_median_3).toBe("pending_review"); expect(out.tools.ownpath.formative_targets.completed_time_median_480).toBe("pending_review"); }
    }
    const f = fixture(1); own(f).unresolved_disagreements = 1; expect(summarizePilot(f).tools.ownpath.pending_final_review).toBe(1);
    own(f).unresolved_disagreements = 0; own(f).reviewers = 0; own(f).review_blinding = "not_performed"; expect(() => validatePilot(f)).toThrow("PILOT_REVIEW_NOT_PERFORMED");
    own(f).claims.pending = 3; own(f).relevance = null; expect(() => validatePilot(f)).toThrow("PILOT_REVIEW_NOT_PERFORMED");
    own(f).claims.supported = 0; expect(summarizePilot(f).tools.ownpath.pending_final_review).toBe(1);
  });
  it("keeps unsafe generated candidates visible even when the human edited final output is supported", () => {
    const f = fixture(1); own(f).safety_findings.unsupported_generated = 2; own(f).safety_review_complete = false;
    const out = summarizePilot(f); expect(out.tools.ownpath.usable_completed).toBe(1); expect(out.tools.ownpath.safety_observed.unsupported_generated).toBe(2);
    expect(out.tools.ownpath.safety_conditions_unreviewed).toBe(1); expect(out.tools.ownpath.final_claims.not_supplied).toBe(0); expect(out.tools.ownpath.safety_blocking_observed).toBe(true);
  });
  it("uses median of within-pair differences rather than difference of marginal medians", () => {
    const f = fixture(3), times = [[100, 90], [200, 50], [300, 280]];
    f.sessions.forEach((s, i) => { s.conditions.find(c => c.tool === "ownpath").elapsed_seconds = times[i][0]; s.conditions.find(c => c.tool === "baseline").elapsed_seconds = times[i][1]; });
    expect(summarizePilot(f).paired.differences.elapsed_seconds.median).toBe(20);
    expect(median([100, 200, 300]) - median([90, 50, 280])).toBe(110);
    expect(median([4, 2])).toBe(3); expect(median([])).toBeNull();
  });
  it("implements exact 80-percent counts for N5/6/7/8 without inventing empty-sample success", () => {
    for (const [n, threshold] of [[5, 4], [6, 5], [7, 6], [8, 7]]) {
      const f = fixture(n); for (let i = threshold; i < n; i++) unfinished(own(f, i), "time_cap");
      expect(summarizePilot(f).tools.ownpath.formative_targets.completion_required).toBe(threshold);
      expect(summarizePilot(f).tools.ownpath.formative_targets.completion_80_percent).toBe("met");
      unfinished(own(f, threshold - 1), "time_cap"); expect(summarizePilot(f).tools.ownpath.formative_targets.completion_80_percent).toBe("missed");
    }
    const out = summarizePilot(fixture(0)); expect(out.tools.ownpath.completed_seconds.median).toBeNull(); expect(out.tools.ownpath.formative_targets.completion_80_percent).toBe("not_assessed");
    expect(out.paired.differences.elapsed_seconds.median).toBeNull(); expect(() => summarizePilot(blankPilot())).toThrow("PILOT_PROVENANCE");
  });
  it("reports missing ratings, single reviewers and exclusions without hiding incompleteness", () => {
    const f = fixture(1); f.withdrawals_excluded = 2; f.ineligible_excluded = 1; own(f).trust = null; own(f).reuse = null; own(f).relevance = null; own(f).reviewers = 1;
    const out = summarizePilot(f); expect(out.withdrawals_excluded).toBe(2); expect(out.tools.ownpath.trust_missing).toBe(1); expect(out.tools.ownpath.reuse.missing).toBe(1);
    expect(out.tools.ownpath.formative_targets.relevance_median_3).toBe("pending_review");
    expect(out.tools.ownpath.final_reviewers[1]).toBe(1); expect(out.tools.ownpath.final_review_blinding.partial).toBe(1);
  });
  it("rejects private text/unknown fields, duplicate IDs/indexes, absent consent, mixed/checkpoint mismatch and malformed metrics", () => {
    const mutations = [f => { f.sessions[0].email = "PRIVATE_SENTINEL@example.invalid"; }, f => { own(f).claims.raw_output = "PRIVATE_SENTINEL"; },
      f => { f.sessions[1].participant_code = "P001"; }, f => { f.sessions[0].participant_code = "P000"; }, f => { f.sessions[0].participant_code = "P0001"; }, f => { f.sessions[1].enrollment_index = 1; }, f => { f.sessions[0].consent_to_retained_anonymous_notes = false; },
      f => { f.code_sha = "short"; }, f => { f.protocol = "unknown"; }, f => { own(f).elapsed_seconds = NaN; }, f => { own(f).wording_edits = "1"; },
      f => { own(f).claims.pending = -1; }, f => { own(f).trust = 6; }, f => { f.collection_start = "2026-02-30"; }, f => { own(f).final_bullets = 0; },
      f => { unfinished(own(f), "time_cap"); own(f).elapsed_seconds = 599; }, f => { own(f).interruption_seconds = 601; },
      f => { f.sessions[0].conditions.pop(); }, f => { f.sessions[0].conditions[0].card = "B"; }, f => { own(f).tool_version = "https://private.invalid?token=PRIVATE_SENTINEL"; }];
    for (const mutate of mutations) { const f = fixture(); mutate(f); expect(() => validatePilot(f)).toThrow(/^PILOT_[A-Z_]+$/); }
  });
  it("requires explicit deviations from enrollment cycling, while preserving actual sequence slot mapping", () => {
    const f = fixture(1); f.sessions[0].enrollment_index = 2; expect(() => validatePilot(f)).toThrow("PILOT_UNRECORDED_DEVIATION");
    f.sessions[0].allocation_deviation = true; expect(summarizePilot(f).allocation.deviations).toBe(1);
    f.sessions[0].conditions.reverse(); expect(() => validatePilot(f)).toThrow("PILOT_SLOT_MAPPING");
  });
  it("preserves comparator-family mix and owner-supplied provenance without claiming verified collection", () => {
    const f = fixture(3); f.data_kind = "collected";
    f.sessions[1].conditions.find(c => c.tool === "baseline").tool_family = "cv_builder";
    f.sessions[2].conditions.find(c => c.tool === "baseline").tool_family = "other";
    const out = summarizePilot(f); expect(out.tools.baseline.tool_families).toEqual({ chatgpt: 1, cv_builder: 1, other: 1 });
    expect(out.evidence_status).toBe("OWNER_SUPPLIED_UNVERIFIED_REVIEW_PENDING"); expect(out.tools.ownpath.formative_targets.release_approval).toBe(false);
  });
  it("CLI creates private new files, refuses raw input/stdout metrics, malformed JSON, existing files, symlinks and Git locations", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "ownpath-pilot-fixture-")); const script = path.resolve("scripts/ownpath-pilot.mjs");
    const run = (args) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8", timeout: 5000 });
    try {
      const input = path.join(directory, "private.json"), output = path.join(directory, "draft.json"), template = path.join(directory, "blank.json");
      const f = fixture(); writeFileSync(input, JSON.stringify(f), { mode: 0o600 });
      const good = run(["--file", input, "--output", output]); expect(good.status).toBe(0); expect(good.stdout.trim()).toBe("PILOT_PRIVATE_DRAFT_CREATED_REVIEW_REQUIRED");
      expect(good.stderr).toBe(""); expect(statSync(output).mode & 0o777).toBe(0o600); expect(JSON.parse(readFileSync(output, "utf8")).paired.completed_pairs).toBe(4);
      const before = readFileSync(output, "utf8"); expect(run(["--file", input, "--output", output]).status).toBe(1); expect(readFileSync(output, "utf8")).toBe(before);
      expect(run(["--init", "--output", template]).status).toBe(0); const blank = JSON.parse(readFileSync(template, "utf8")); expect(blank.data_kind).toBe("template"); expect(blank.sessions[0].participant_code).toBe("P___");
      expect(blank.sessions[0].conditions.every(c => c.status === "not_attempted" && c.elapsed_seconds === null)).toBe(true);
      expect(run(["--file", template, "--output", path.join(directory, "template-draft.json")]).stderr).toContain("PILOT_PROVENANCE");
      const unsafe = "PRIVATE_PATH_SENTINEL"; f.sessions[0].private_text = unsafe; writeFileSync(input, JSON.stringify(f));
      for (const args of [["--file", input], ["--file", input, "--output", path.join(directory, unsafe + ".json")]]) {
        const rejected = run(args); expect(rejected.status).toBe(1); expect(rejected.stdout + rejected.stderr).not.toContain(unsafe);
      }
      writeFileSync(input, '{"PRIVATE_RAW_JSON_SENTINEL":'); const malformed = run(["--file", input, "--output", path.join(directory, "bad.json")]); expect(malformed.stderr.trim()).toBe("PILOT_INVALID_JSON");
      const link = path.join(directory, "link.json"); symlinkSync(input, link); expect(run(["--file", link, "--output", path.join(directory, "linked.json")]).stderr).toContain("PILOT_SYMLINK_REFUSED");
      expect(run(["--init", "--output", link]).stderr).toContain("PILOT_SYMLINK_REFUSED");
      const linkedDir = path.join(directory, "linked-dir"); symlinkSync(directory, linkedDir); expect(run(["--init", "--output", path.join(linkedDir, "linked-output.json")]).stderr).toContain("PILOT_SYMLINK_REFUSED");
      writeFileSync(input, "X".repeat(1024 * 1024 + 1)); expect(run(["--file", input, "--output", path.join(directory, "large.json")]).stderr).toContain("PILOT_INPUT_SIZE_OR_TYPE");
      const git = path.join(directory, "repo"); mkdirSync(git); writeFileSync(path.join(git, ".git"), "gitdir: fictional");
      expect(run(["--init", "--output", path.join(git, "records.json")]).stderr).toContain("PILOT_GIT_LOCATION_REFUSED");
      expect(run(["--init", "--file", input, "--output", path.join(directory, "mixed.json")]).stderr).toContain("PILOT_USAGE");
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
