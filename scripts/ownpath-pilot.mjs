import { constants, closeSync, existsSync, fstatSync, lstatSync, openSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isMain, validDate } from "./cp2-research-common.mjs";

export const PROTOCOL = "ownpath-pilot-v1-2026-10-12";
export const ALLOCATION = {
  S1: [["ownpath", "A"], ["baseline", "B"]], S2: [["baseline", "A"], ["ownpath", "B"]],
  S3: [["ownpath", "B"], ["baseline", "A"]], S4: [["baseline", "B"], ["ownpath", "A"]],
};
const LIMITATIONS = ["convenience_sample", "known_vocabulary", "task_asymmetry", "blinding_limited", "allocation_deviation", "technical_interruption", "other_private_notes"];
const COUNTERS = ["wording_edits", "regenerate_reprompt", "prompt_answers", "fact_requests", "procedural_help"];
const CLAIMS = ["supported", "contradicted", "not_supplied", "ambiguous", "pending"];
const SAFETY = ["unsupported_generated", "jd_only_generated", "stale_accepted", "cross_session_leakage"];
const METRICS = ["elapsed_seconds", "interruption_seconds", "final_bullets", ...COUNTERS, "reviewers", "review_blinding", "unresolved_disagreements", "relevance", "trust", "reuse", "claims", "safety_review_complete", "safety_findings"];
const requireValue = (ok, code) => { if (!ok) throw new Error(code); };
const integer = (n, max = 10000) => Number.isSafeInteger(n) && n >= 0 && n <= max;
const exact = (o, keys) => o && typeof o === "object" && !Array.isArray(o) && Object.keys(o).length === keys.length && keys.every(k => Object.hasOwn(o, k));
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
export const median = (values) => { if (!values.length) return null; const a = [...values].sort((x, y) => x - y); const m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
const distribution = (a) => ({ n: a.length, median: median(a), min: a.length ? Math.min(...a) : null, max: a.length ? Math.max(...a) : null });
const pendingReview = (c) => c.status === "submitted" && (c.claims.pending > 0 || c.claims.ambiguous > 0 || c.reviewers === 0 || c.unresolved_disagreements > 0);
const completed = (c) => c.status === "submitted" && !pendingReview(c) && c.claims.contradicted === 0 && c.claims.not_supplied === 0;

export function validatePilot(data) {
  requireValue(exact(data, ["schema_version", "protocol", "data_kind", "code_sha", "collection_start", "collection_end", "withdrawals_excluded", "ineligible_excluded", "limitations", "sessions"]), "PILOT_SCHEMA");
  requireValue(data.schema_version === 1 && data.protocol === PROTOCOL && ["collected", "synthetic"].includes(data.data_kind), "PILOT_PROVENANCE");
  requireValue(typeof data.code_sha === "string" && /^[a-f0-9]{40}$/.test(data.code_sha), "PILOT_CHECKPOINT");
  requireValue(validDate(data.collection_start) && validDate(data.collection_end) && data.collection_start <= data.collection_end, "PILOT_DATES");
  requireValue(integer(data.withdrawals_excluded) && integer(data.ineligible_excluded), "PILOT_EXCLUSIONS");
  requireValue(Array.isArray(data.limitations) && data.limitations.length > 0 && new Set(data.limitations).size === data.limitations.length && data.limitations.every(v => LIMITATIONS.includes(v)), "PILOT_LIMITATIONS");
  requireValue(Array.isArray(data.sessions) && data.sessions.length <= 1000, "PILOT_SESSIONS");
  const ids = new Set(), indexes = new Set();
  for (const s of data.sessions) {
    requireValue(exact(s, ["participant_code", "enrollment_index", "sequence", "allocation_deviation", "eligible", "consent_to_retained_anonymous_notes", "conditions"]), "PILOT_SESSION_SCHEMA");
    requireValue(typeof s.participant_code === "string" && /^P(?:[0-9]{3}|[1-9][0-9]{3})$/.test(s.participant_code) && Number(s.participant_code.slice(1)) > 0 && !ids.has(s.participant_code), "PILOT_PARTICIPANT_CODE"); ids.add(s.participant_code);
    requireValue(integer(s.enrollment_index) && s.enrollment_index > 0 && !indexes.has(s.enrollment_index), "PILOT_ENROLLMENT_INDEX"); indexes.add(s.enrollment_index);
    requireValue(s.eligible === true && s.consent_to_retained_anonymous_notes === true, "PILOT_RETAINED_CONSENT_REQUIRED");
    requireValue(Object.hasOwn(ALLOCATION, s.sequence) && typeof s.allocation_deviation === "boolean", "PILOT_ALLOCATION");
    requireValue(s.allocation_deviation || s.sequence === `S${(s.enrollment_index - 1) % 4 + 1}`, "PILOT_UNRECORDED_DEVIATION");
    requireValue(Array.isArray(s.conditions) && s.conditions.length === 2, "PILOT_PAIR_SLOTS");
    for (let i = 0; i < 2; i++) {
      const c = s.conditions[i];
      requireValue(exact(c, ["slot", "tool", "card", "tool_family", "tool_version", "status", ...METRICS]), "PILOT_CONDITION_SCHEMA");
      const [tool, card] = ALLOCATION[s.sequence][i];
      requireValue(c.slot === i + 1 && c.tool === tool && c.card === card, "PILOT_SLOT_MAPPING");
      requireValue(["submitted", "time_cap", "stopped", "not_attempted"].includes(c.status), "PILOT_STATUS");
      if (c.status === "not_attempted") {
        requireValue([...METRICS, "tool_family", "tool_version"].every(k => c[k] === null), "PILOT_NOT_ATTEMPTED_VALUES"); continue;
      }
      requireValue((tool === "ownpath" ? c.tool_family === "local_template" : ["chatgpt", "cv_builder", "other"].includes(c.tool_family)) && typeof c.tool_version === "string" && /^[A-Za-z0-9 ._()/+\-]{1,100}$/.test(c.tool_version), "PILOT_TOOL_METADATA");
      requireValue(integer(c.elapsed_seconds, 600) && integer(c.interruption_seconds, c.elapsed_seconds) && (c.status !== "time_cap" || c.elapsed_seconds === 600), "PILOT_TIME");
      requireValue(COUNTERS.every(k => integer(c[k])), "PILOT_COUNTS");
      requireValue(integer(c.final_bullets, 3) && exact(c.claims, CLAIMS) && CLAIMS.every(k => integer(c.claims[k])), "PILOT_CLAIMS");
      requireValue(integer(c.reviewers, 2) && integer(c.unresolved_disagreements) && (c.relevance === null || (integer(c.relevance, 5) && c.relevance >= 1)), "PILOT_REVIEW");
      requireValue(c.reviewers === 0 ? c.review_blinding === "not_performed" : ["blinded", "partial", "not_blinded"].includes(c.review_blinding), "PILOT_BLINDING");
      requireValue((c.trust === null || (integer(c.trust, 5) && c.trust >= 1)) && [null, "yes", "no", "unsure"].includes(c.reuse), "PILOT_SUBJECTIVE");
      requireValue(typeof c.safety_review_complete === "boolean" && exact(c.safety_findings, SAFETY) && SAFETY.every(k => integer(c.safety_findings[k])), "PILOT_SAFETY");
      if (c.status === "submitted") {
        requireValue(c.final_bullets >= 1 && sum(c.claims) > 0, "PILOT_SUBMITTED_OUTPUT");
        requireValue(c.reviewers > 0 || (c.claims.pending > 0 && ["supported", "contradicted", "not_supplied", "ambiguous"].every(k => c.claims[k] === 0) && c.relevance === null && c.unresolved_disagreements === 0), "PILOT_REVIEW_NOT_PERFORMED");
      } else {
        requireValue(c.final_bullets === 0 && sum(c.claims) === 0 && c.reviewers === 0 && c.relevance === null && c.unresolved_disagreements === 0, "PILOT_UNSUBMITTED_OUTPUT");
      }
    }
  }
  return data;
}

export function summarizePilot(input) {
  const data = validatePilot(input);
  const out = { report_kind: "PRIVATE_AGGREGATE_DRAFT_MANUAL_REVIEW_REQUIRED", data_kind: data.data_kind, protocol: data.protocol, code_sha: data.code_sha,
    evidence_status: data.data_kind === "synthetic" ? "SYNTHETIC_TEST_ONLY_NOT_EVIDENCE" : "OWNER_SUPPLIED_UNVERIFIED_REVIEW_PENDING",
    retained_sessions: data.sessions.length, withdrawals_excluded: data.withdrawals_excluded, ineligible_excluded: data.ineligible_excluded,
    allocation: { sequences: Object.fromEntries(Object.keys(ALLOCATION).map(k => [k, data.sessions.filter(s => s.sequence === k).length])), deviations: data.sessions.filter(s => s.allocation_deviation).length },
    limitations: [...data.limitations], tools: {}, paired: {}, notes: ["Private draft: review small-group identifiability before any sharing.", "Validation cannot verify consent, enrollment completeness, human scores, blinding or actual tool use.", "Known vocabulary, unequal cards and possible order/blinding bias limit interpretation.", "Observed unsupported generated/JD-only/stale/leak findings block the affected flow under the protocol; zero recorded counts do not establish safety.", "No research, superiority, course or release approval is produced; never commit session records or this unreviewed draft."] };
  for (const tool of ["ownpath", "baseline"]) {
    const all = data.sessions.flatMap(s => s.conditions).filter(c => c.tool === tool), attempted = all.filter(c => c.status !== "not_attempted"), done = attempted.filter(completed);
    const submitted = attempted.filter(c => c.status === "submitted"), unknown = submitted.filter(pendingReview);
    const unassisted = done.filter(c => c.procedural_help === 0);
    out.tools[tool] = {
      attempted: attempted.length, not_attempted: all.length - attempted.length, submitted: submitted.length, usable_completed: done.length, unassisted_completed: unassisted.length,
      tool_families: Object.fromEntries((tool === "ownpath" ? ["local_template"] : ["chatgpt", "cv_builder", "other"]).map(k => [k, attempted.filter(c => c.tool_family === k).length])),
      stopped: attempted.filter(c => c.status === "stopped").length, time_capped: attempted.filter(c => c.status === "time_cap").length, pending_final_review: unknown.length,
      accuracy_failed: submitted.filter(c => c.claims.contradicted > 0 || c.claims.not_supplied > 0).length,
      completed_seconds: distribution(done.map(c => c.elapsed_seconds)), relevance: distribution(submitted.filter(c => c.relevance !== null).map(c => c.relevance)),
      relevance_missing: submitted.filter(c => c.relevance === null).length,
      final_reviewers: Object.fromEntries([0, 1, 2].map(n => [n, submitted.filter(c => c.reviewers === n).length])),
      final_review_blinding: Object.fromEntries(["not_performed", "blinded", "partial", "not_blinded"].map(k => [k, submitted.filter(c => c.review_blinding === k).length])),
      unresolved_disagreements: submitted.reduce((n, c) => n + c.unresolved_disagreements, 0),
      procedural_help_tasks: attempted.filter(c => c.procedural_help > 0).length,
      interactions: Object.fromEntries(COUNTERS.map(k => [k, attempted.reduce((n, c) => n + c[k], 0)])),
      interruptions: { tasks: attempted.filter(c => c.interruption_seconds > 0).length, seconds: attempted.reduce((n, c) => n + c.interruption_seconds, 0), subtracted_from_elapsed: false },
      final_claims: Object.fromEntries(CLAIMS.map(k => [k, submitted.reduce((n, c) => n + c.claims[k], 0)])),
      safety_observed: Object.fromEntries(SAFETY.map(k => [k, attempted.reduce((n, c) => n + c.safety_findings[k], 0)])),
      safety_conditions_unreviewed: attempted.filter(c => !c.safety_review_complete).length,
      safety_blocking_observed: attempted.some(c => sum(c.safety_findings) > 0),
      trust: distribution(attempted.filter(c => c.trust !== null).map(c => c.trust)), trust_missing: attempted.filter(c => c.trust === null).length,
      reuse: Object.fromEntries(["yes", "no", "unsure", "missing"].map(k => [k, attempted.filter(c => (c.reuse ?? "missing") === k).length])),
    };
    if (tool === "ownpath") {
      const m = out.tools[tool], threshold = attempted.length ? Math.ceil(attempted.length * 0.8) : null;
      m.formative_targets = { release_approval: false, completion_denominator: attempted.length, completion_required: threshold,
        completion_80_percent: !attempted.length ? "not_assessed" : unknown.length ? "pending_review" : unassisted.length >= threshold ? "met" : "missed",
        relevance_median_3: !submitted.length ? "not_assessed" : unknown.length || m.relevance_missing ? "pending_review" : m.relevance.median >= 3 ? "met" : "missed",
        completed_time_median_480: unknown.length ? "pending_review" : !done.length ? "not_assessed" : m.completed_seconds.median <= 480 ? "met" : "missed" };
    }
  }
  const pairs = data.sessions.filter(s => s.conditions.every(completed));
  out.paired = { completed_pairs: pairs.length, incomplete_pairs: data.sessions.length - pairs.length, pairs_with_procedural_help: pairs.filter(s => s.conditions.some(c => c.procedural_help > 0)).length,
    direction: "OWNPATH_MINUS_BASELINE_NEGATIVE_MEANS_LOWER_NOT_SUPERIORITY",
    differences: Object.fromEntries(["elapsed_seconds", "wording_edits", "regenerate_reprompt"].map(k => [k, distribution(pairs.map(s => s.conditions.find(c => c.tool === "ownpath")[k] - s.conditions.find(c => c.tool === "baseline")[k]))])) };
  return out;
}

export function blankPilot() {
  return { schema_version: 1, protocol: PROTOCOL, data_kind: "template", code_sha: null, collection_start: null, collection_end: null,
    withdrawals_excluded: null, ineligible_excluded: null, limitations: ["convenience_sample", "known_vocabulary", "task_asymmetry", "blinding_limited"],
    sessions: [{ participant_code: "P___", enrollment_index: null, sequence: "S1", allocation_deviation: false, eligible: null, consent_to_retained_anonymous_notes: null,
      conditions: ALLOCATION.S1.map(([tool, card], i) => ({ slot: i + 1, tool, card, tool_family: null, tool_version: null, status: "not_attempted", ...Object.fromEntries(METRICS.map(k => [k, null])) })) }] };
}

function privatePath(file, extension) {
  requireValue(typeof file === "string" && path.extname(file) === extension, "PILOT_FILE_TYPE");
  const absolute = path.resolve(file);
  for (let p = absolute; ; p = path.dirname(p)) {
    if (existsSync(p)) requireValue(!lstatSync(p).isSymbolicLink(), "PILOT_SYMLINK_REFUSED");
    requireValue(!existsSync(path.join(p, ".git")), "PILOT_GIT_LOCATION_REFUSED");
    if (p === path.dirname(p)) break;
  }
  return absolute;
}
export function runPilotCli(args) {
  try {
    if (args[0] === "--") args = args.slice(1);
    const opts = {};
    for (let i = 0; i < args.length; i++) {
      const k = args[i]; requireValue(["--init", "--file", "--output"].includes(k) && !Object.hasOwn(opts, k), "PILOT_USAGE");
      if (k === "--init") opts[k] = true;
      else { requireValue(args[i + 1] && !args[i + 1].startsWith("--"), "PILOT_USAGE"); opts[k] = args[++i]; }
    }
    requireValue(opts["--output"] && (!!opts["--init"] !== !!opts["--file"]), "PILOT_USAGE");
    const output = privatePath(opts["--output"], ".json"); let report;
    if (opts["--init"]) report = blankPilot();
    else {
      const input = privatePath(opts["--file"], ".json"); requireValue(input !== output, "PILOT_DISTINCT_OUTPUT_REQUIRED");
      let fd;
      try {
        fd = openSync(input, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        const stat = fstatSync(fd); requireValue(stat.isFile() && stat.size <= 1024 * 1024, "PILOT_INPUT_SIZE_OR_TYPE");
        let data; try { data = JSON.parse(readFileSync(fd, "utf8")); } catch { throw new Error("PILOT_INVALID_JSON"); }
        report = summarizePilot(data);
      } finally { if (fd !== undefined) closeSync(fd); }
    }
    writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(opts["--init"] ? "PILOT_TEMPLATE_CREATED_NOT_EVIDENCE" : "PILOT_PRIVATE_DRAFT_CREATED_REVIEW_REQUIRED"); return 0;
  } catch (e) {
    const code = e instanceof Error && /^PILOT_[A-Z_]+$/.test(e.message) ? e.message : "PILOT_FILE_IO_REFUSED";
    console.error(code); return 1;
  }
}
if (isMain(import.meta.url)) process.exitCode = runPilotCli(process.argv.slice(2));
