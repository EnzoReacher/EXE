import { writeFileSync } from "node:fs";
import path from "node:path";
import { cliArguments, filename, isMain, reportCli, result } from "./cp2-research-common.mjs";
import { validateSurveyFile } from "./validate-cp2-survey.mjs";

const escape = (v) => String(v).replace(/[\\`*_{}\[\]()#+.!<>|]/g, "\\$&").replace(/[\r\n]+/g, " ");
export function summarizeSurveyFile(file) {
  const validated = validateSurveyFile(file);
  if (validated.code) return validated;
  const rows = validated.rows; const first = rows[0];
  const lines = ["# CP2 Aggregate Survey Draft", "", "> Aggregate formatting does not establish research quality, market demand, willingness to pay, or product-market fit.", "", `Input file: ${escape(filename(file))}`, `Data kind: ${first.data_kind === "synthetic_aggregate" ? "SYNTHETIC TEST ONLY — not collected evidence" : "Owner-supplied aggregate; review pending"}`, "Evidence ID: SV-___ (assign manually after review; synthetic fixtures must never receive a collected evidence ID)", "Owner/team reviewer and date: pending", "", `Collection period: ${first.collection_start} to ${first.collection_end}`, `Responses started: ${first.responses_started}`, `Eligible responses: ${first.responses_eligible}`, `Completed responses: ${first.responses_completed}`, `Eligible but incomplete: ${first.responses_eligible - first.responses_completed}`, `Started but not eligible: ${first.responses_started - first.responses_eligible}`, `Recruitment channel category: ${first.recruitment_channel}`, "", "## Question-level counts"];
  const ids = [...new Set(rows.map((r) => r.question_id))].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  for (const id of ids) {
    const group = rows.filter((r) => r.question_id === id).sort((a, b) => a.response_label < b.response_label ? -1 : a.response_label > b.response_label ? 1 : 0);
    lines.push("", `### ${id} (${group[0].question_type})`, `Unanswered among completed responses: ${group[0].unanswered_count}`, "", "| Anonymous response category | Count |", "|---|---:|", ...group.map((r) => `| ${escape(r.response_label)} | ${r.count} |`));
    if (group[0].question_type === "multiple_choice") lines.push("Multiple selections allowed; category totals may exceed the number of people answering.");
  }
  const themes = [...new Set(rows.map((r) => r.theme_category).filter(Boolean))].sort();
  lines.push("", "## Already-coded anonymous themes", themes.length ? themes.map((v) => `- ${escape(v)}`).join("\n") : "No theme categories supplied; none inferred.", "", "## Stated limitations", escape(first.limitations), "", "Only included questions can be checked; missing questionnaire items cannot be inferred from this input.", "", "## Observation / interpretation / decision", "Observation: the supplied aggregate counts above only.", "Interpretation: pending human review of denominators, missing answers, recruitment, bias and contradictions.", "Decision: pending owner/team review; no automated hypothesis classification or feature/segment/price recommendation.", "", "## Claims blocked", "No price, affordability, market demand, willingness-to-pay, validation, privacy-superiority, ease-of-use, competitor-superiority or market-readiness claim is unlocked. CP2 remains pending and M11 remains blocked.", "");
  return result(0, [], { markdown: lines.join("\n") });
}

if (isMain(import.meta.url)) {
  const args = cliArguments(process.argv.slice(2), true);
  if (!args) { console.log("Usage: --file <aggregate.csv|aggregate.json> [--output <new-draft.md>]"); process.exitCode = 3; }
  else {
    const summary = summarizeSurveyFile(args.file);
    if (summary.code) reportCli(args.file, summary);
    else if (!args.output) console.log(summary.markdown);
    else if (path.extname(args.output).toLowerCase() !== ".md" || path.resolve(args.file) === path.resolve(args.output)) { console.log("Output must be an explicit new Markdown draft path, distinct from input."); process.exitCode = 3; }
    else {
      try { writeFileSync(args.output, summary.markdown, { flag: "wx", mode: 0o600 }); console.log(`${filename(args.output)}: draft written; manual review required.`); }
      catch { console.log("Could not create output: it may already exist or its directory may be missing. No existing file was overwritten."); process.exitCode = 1; }
    }
  }
}
