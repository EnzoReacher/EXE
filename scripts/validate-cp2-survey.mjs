import path from "node:path";
import { claimDetected, cliArguments, isMain, parseCsv, readInput, reportCli, result, sensitiveContent, validDate } from "./cp2-research-common.mjs";

export const SURVEY_FIELDS = ["data_kind", "collection_start", "collection_end", "responses_started", "responses_eligible", "responses_completed", "recruitment_channel", "limitations", "question_id", "question_type", "response_label", "count", "unanswered_count"];
const numeric = ["responses_started", "responses_eligible", "responses_completed", "count", "unanswered_count"];
const metadata = SURVEY_FIELDS.slice(0, 8);
const category = (v) => typeof v === "string" && /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(v) && v.length <= 80;
const textField = (v) => typeof v === "string" && v.trim().length >= 10 && v.length <= 2000;

export function validateSurveyText(text, extension) {
  const unsafeRaw = sensitiveContent(text);
  if (unsafeRaw.length) return result(2, [`Sensitive content detected (${unsafeRaw.join(", ")}). Remove it manually from a separate draft; no input was changed.`]);
  let rows;
  try { rows = extension === ".csv" ? parseCsv(text) : extension === ".json" ? JSON.parse(text) : null; }
  catch { return result(1, ["Malformed CSV or JSON. No input values are printed."]); }
  if (!Array.isArray(rows) || !rows.length || rows.length > 10000 || rows.some((r) => !r || typeof r !== "object" || Array.isArray(r))) return result(1, ["Expected a non-empty array/table of aggregate category rows, not individual responses."]);
  const unsafe = sensitiveContent(JSON.stringify(rows));
  if (unsafe.length) return result(2, [`Sensitive content detected (${unsafe.join(", ")}). Remove it manually; no input was changed.`]);
  const failures = []; const normalized = [];
  rows.forEach((r, index) => {
    const prefix = `Row ${index + 1}: `;
    if (Object.keys(r).some((k) => ![...SURVEY_FIELDS, "theme_category"].includes(k))) failures.push(prefix + "unsupported columns; use the documented aggregate schema.");
    if (SURVEY_FIELDS.some((k) => !Object.hasOwn(r, k))) failures.push(prefix + "required aggregate fields are missing.");
    const value = { ...r };
    for (const key of numeric) {
      if ((typeof r[key] !== "number" && !(typeof r[key] === "string" && /^(0|[1-9]\d*)$/.test(r[key]))) || !Number.isSafeInteger(Number(r[key])) || Number(r[key]) < 0) failures.push(prefix + "counts must be non-negative safe integers.");
      value[key] = Number(r[key]);
    }
    if (!["aggregate", "synthetic_aggregate"].includes(r.data_kind)) failures.push(prefix + "data_kind must identify aggregate input; individual responses are prohibited.");
    if (!validDate(r.collection_start) || !validDate(r.collection_end) || r.collection_start > r.collection_end) failures.push(prefix + "a valid ordered collection period is required.");
    if (!["student_network", "career_service", "community", "mixed", "other_broad"].includes(r.recruitment_channel)) failures.push(prefix + "use a broad recruitment-channel category.");
    if (!textField(r.limitations) || /^(?:none|n\/a|tbd|unknown|placeholder)$/i.test(typeof r.limitations === "string" ? r.limitations.trim() : "")) failures.push(prefix + "state limitations or sampling bias.");
    if (value.responses_completed > value.responses_eligible || value.responses_eligible > value.responses_started) failures.push(prefix + "completed ≤ eligible ≤ started counts required.");
    if (typeof r.question_id !== "string" || !/^Q[1-9]\d{0,3}$/.test(r.question_id)) failures.push(prefix + "use question IDs Q1–Q9999.");
    if (!["single_choice", "multiple_choice"].includes(r.question_type)) failures.push(prefix + "question_type must be single_choice or multiple_choice.");
    if (!category(r.response_label) || (Object.hasOwn(r, "theme_category") && r.theme_category !== "" && !category(r.theme_category))) failures.push(prefix + "answer/theme labels must be broad anonymous snake_case categories.");
    if (Object.values(r).some((v) => typeof v === "string" && claimDetected(v))) failures.push(prefix + "unsupported claim wording; record neutral categories/limitations instead.");
    if (r.data_kind === "aggregate" && /\b(?:fictional|synthetic|placeholder|example only)\b/i.test(JSON.stringify(r))) failures.push(prefix + "synthetic/placeholders cannot be presented as collected aggregates.");
    normalized.push(value);
  });
  const first = normalized[0]; const groups = new Map();
  for (const row of normalized) {
    if (metadata.some((k) => row[k] !== first[k])) failures.push("Metadata and response totals must be identical across all rows in one file.");
    if (!groups.has(row.question_id)) groups.set(row.question_id, []);
    groups.get(row.question_id).push(row);
  }
  for (const group of groups.values()) {
    const q = group[0]; const answered = first.responses_completed - q.unanswered_count;
    if (group.some((r) => r.question_type !== q.question_type || r.unanswered_count !== q.unanswered_count) || new Set(group.map((r) => r.response_label)).size !== group.length) failures.push("Each question needs consistent type/unanswered count and unique answer labels.");
    if (answered < 0 || group.some((r) => r.count > answered)) failures.push("A category or unanswered count exceeds its question denominator.");
    if (q.question_type === "single_choice" && group.reduce((n, r) => n + r.count, 0) !== answered) failures.push("Single-choice distributions plus unanswered must equal completed responses.");
  }
  if (failures.length) return result(1, [...new Set(failures)]);
  return result(0, ["Structurally safe aggregate input; not individual responses. Manual anonymity and research-quality review are still required.", "No hypotheses, claims, target segment, price or feature were selected."], { rows: normalized });
}

export function validateSurveyFile(file) {
  const input = readInput(file, [".csv", ".json"]);
  return input.code ? input : validateSurveyText(input.text, path.extname(file).toLowerCase());
}

if (isMain(import.meta.url)) {
  const args = cliArguments(process.argv.slice(2));
  if (!args) { console.log("Usage: --file <aggregate.csv|aggregate.json>"); process.exitCode = 3; }
  else reportCli(args.file, validateSurveyFile(args.file));
}
