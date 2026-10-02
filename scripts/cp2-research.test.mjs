import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateSurveyFile, validateSurveyText } from "./validate-cp2-survey.mjs";
import { summarizeSurveyFile } from "./summarize-cp2-survey.mjs";
import { validateSourceLogFile, validateSourceLogText } from "./validate-cp2-source-log.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = existsSync("/tmp/opencode") ? "/tmp/opencode" : tmpdir();
const fixture = (name) => path.join(root, "scripts/fixtures/cp2-research", name);
const rows = () => JSON.parse(readFileSync(fixture("survey-valid.json"), "utf8"));
const source = () => readFileSync(fixture("source-valid.md"), "utf8");
const run = (script, args = []) => spawnSync(process.execPath, [path.join(root, "scripts", script), ...args], { encoding: "utf8", cwd: root });

describe("CP2 aggregate intake", () => {
  it.each(["survey-valid.csv", "survey-valid.json"])("accepts explicit synthetic aggregate %s, never respondent data", (name) => {
    const r = validateSurveyFile(fixture(name));
    expect(r.code).toBe(0);
    expect(r.rows.every((row) => row.data_kind === "synthetic_aggregate")).toBe(true);
  });
  it.each([["survey-malformed.csv", 1], ["survey-email.json", 2], ["survey-phone.json", 2]])("rejects %s with safe code %s", (name, code) => {
    const r = run("validate-cp2-survey.mjs", ["--file", fixture(name)]);
    expect(r.status).toBe(code);
    expect(r.stdout).toContain(name);
    expect(r.stdout).not.toMatch(/fixture@example.invalid|202 555 0100|Unterminated fictional/);
  });
  it.each([[], ["--file"], ["--wrong", "input.json"], ["--file", "a.json", "--file", "b.json"]])("uses usage code for invalid arguments %j", (args) => {
    expect(run("validate-cp2-survey.mjs", args).status).toBe(3);
  });
  it("rejects missing files, invalid types and invalid JSON", () => {
    expect(validateSurveyFile("missing-aggregate.json").code).toBe(1);
    expect(validateSurveyFile(fixture("README.md")).code).toBe(1);
    expect(validateSurveyText("{", ".json").code).toBe(1);
    expect(validateSurveyText('{"responses":[]}', ".json").code).toBe(1);
    expect(validateSurveyText("[]", ".json").code).toBe(1);
  });
  it.each(["collection_start", "responses_started", "recruitment_channel", "limitations", "question_id", "unanswered_count"])("requires metadata/aggregate field %s", (key) => {
    const data = rows(); delete data[0][key];
    expect(validateSurveyText(JSON.stringify(data), ".json").code).toBe(1);
  });
  it.each(["name", "full_name", "email_address", "phone_number", "street_address", "cv_text", "transcript_url", "recording_path", "password", "employer_id", "application_id"])("rejects private field %s without echoing contents", (key) => {
    const data = rows(); data[0][key] = "fictional sensitive sentinel";
    const r = validateSurveyText(JSON.stringify(data), ".json");
    expect(r.code).toBe(2);
    expect(r.messages.join(" ")).not.toContain("fictional sensitive sentinel");
  });
  it("detects email hidden by JSON unicode escapes after parsing", () => {
    const text = JSON.stringify(rows()).replace("Synthetic test only", "fixture\\u0040example.invalid");
    expect(validateSurveyText(text, ".json").code).toBe(2);
  });
  it.each(["validated", "best", "cheaper", "market-ready", "EXE is more private"])("rejects claim wording %s", (claim) => {
    const data = rows(); data[0].limitations = `Synthetic claim rejection: ${claim}`;
    const r = validateSurveyText(JSON.stringify(data), ".json");
    expect(r.code).toBe(1); expect(r.messages.join(" ")).not.toContain(claim);
  });
  it("rejects unsupported claims hidden in snake_case categories", () => {
    for (const label of ["validated_product", "best_tool", "more_private", "market_ready"]) {
      const data = rows(); data[0].response_label = label;
      expect(validateSurveyText(JSON.stringify(data), ".json").code).toBe(1);
    }
  });
  it("rejects malformed JSON field types without throwing or printing values", () => {
    for (const patch of [{ limitations: 123 }, { limitations: {} }, { limitations: null }, { theme_category: false }, { theme_category: 0 }, { theme_category: [] }]) {
      const data = rows(); Object.assign(data[0], patch);
      expect(validateSurveyText(JSON.stringify(data), ".json").code).toBe(1);
    }
  });
  it("rejects individual rows, unsupported columns and inconsistent denominators", () => {
    for (const patch of [{ data_kind: "individual_response" }, { unexpected: "value" }, { responses_eligible: 3 }, { count: 3 }, { count: -1 }, { count: 1.5 }, { count: "1e3" }, { collection_end: "2030-02-30" }]) {
      const data = rows(); Object.assign(data[0], patch);
      expect(validateSurveyText(JSON.stringify(data), ".json").code).toBe(1);
    }
  });
  it("rejects duplicate categories and allows bounded multi-select totals above answered count", () => {
    const data = rows(); data.push({ ...data[0] });
    expect(validateSurveyText(JSON.stringify(data), ".json").code).toBe(1);
    expect(validateSurveyFile(fixture("survey-valid.csv")).code).toBe(0);
  });
  it("supports quoted CSV commas/newlines/escaped quotes and rejects invalid trailing quoted text", () => {
    const header = Object.keys(rows()[0]).join(",");
    const row = Object.values(rows()[0]).map((v) => String(v)).map((v, i) => i === 7 ? '"Synthetic, fictional\nnotes with ""quoted"" text"' : v).join(",");
    expect(validateSurveyText(header + "\n" + row + "\r\n", ".csv").code).toBe(0);
    expect(validateSurveyText(header + "\n" + row.replace('" text"', '" text"oops'), ".csv").code).toBe(1);
    expect(validateSurveyText("data_kind,data_kind\naggregate,aggregate", ".csv").code).toBe(1);
  });
});

describe("neutral summary and immutable input", () => {
  it("is deterministic, includes omissions/limitations and makes no decision", () => {
    const input = fixture("survey-valid.csv"); const before = readFileSync(input, "utf8");
    const a = summarizeSurveyFile(input); const b = summarizeSurveyFile(input);
    expect(a.markdown).toBe(b.markdown);
    expect(a.markdown).toContain("Aggregate formatting does not establish research quality, market demand, willingness to pay, or product-market fit.");
    for (const term of ["SYNTHETIC TEST ONLY", "SV-___", "Owner/team reviewer and date: pending", "Eligible but incomplete: 1", "Unanswered among completed responses: 1", "Multiple selections allowed", "No price", "M11 remains blocked", "none inferred"]) {
      // CSV contains supplied themes; no-theme behavior is checked on JSON below.
      if (term !== "none inferred") expect(a.markdown).toContain(term);
    }
    expect(summarizeSurveyFile(fixture("survey-valid.json")).markdown).toContain("none inferred");
    expect(readFileSync(input, "utf8")).toBe(before);
  });
  it.each(["survey-email.json", "survey-phone.json", "survey-malformed.csv"])("refuses summary of %s and emits no sensitive values", (name) => {
    const r = run("summarize-cp2-survey.mjs", ["--file", fixture(name)]);
    expect(r.status).not.toBe(0); expect(r.stdout).not.toContain("# CP2 Aggregate Survey Draft");
    expect(r.stdout).not.toMatch(/fixture@example.invalid|202 555 0100/);
  });
  it("creates only explicit new output, refuses overwrite, and never changes input", () => {
    const dir = mkdtempSync(path.join(scratch, "cp2-synthetic-"));
    try {
      const input = path.join(dir, "input.json"); const output = path.join(dir, "draft.md");
      const original = readFileSync(fixture("survey-valid.json"), "utf8"); writeFileSync(input, original);
      expect(run("summarize-cp2-survey.mjs", ["--file", input, "--output", output]).status).toBe(0);
      const draft = readFileSync(output, "utf8");
      expect(run("summarize-cp2-survey.mjs", ["--file", input, "--output", output]).status).toBe(1);
      expect(readFileSync(output, "utf8")).toBe(draft); expect(readFileSync(input, "utf8")).toBe(original);
      expect(run("summarize-cp2-survey.mjs", ["--file", input, "--output", input]).status).toBe(3);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe("public source completeness, not fact verification", () => {
  it.each([["source-valid.md", 0], ["source-missing-url.md", 1], ["source-unsupported-claim.md", 1], ["source-missing-pricing-context.md", 1]])("checks %s with code %s", (name, code) => {
    expect(validateSourceLogFile(fixture(name)).code).toBe(code);
    const r = run("validate-cp2-source-log.mjs", ["--file", fixture(name)]);
    expect(r.status).toBe(code); expect(r.stdout).not.toContain("EXE is cheaper");
  });
  it.each(["source_url", "date_accessed", "source_date", "region", "currency", "supported_fact", "limitation", "owner_review_status"])("requires source field %s", (key) => {
    expect(validateSourceLogText(source().replace(new RegExp(`^- ${key}: .*\\n`, "m"), "")).code).toBe(1);
  });
  it("rejects insecure URLs, invalid dates, duplicates, interpretations and placeholder masquerading", () => {
    for (const changed of [source().replace("https:", "http:"), source().replace("2030-01-02", "2030-02-30"), source() + source().split("\n").slice(3).join("\n"), source().replace("The source lists", "We believe"), source().replace("synthetic_source_log", "source_log"), source().replace("CM-901", "CM-000")]) expect(validateSourceLogText(changed).code).toBe(1);
  });
  it("fails safely for credentials/private query parameters without echo", () => {
    const changed = source().replace("fictional-plan", "fictional-plan?application_id=private-sentinel");
    const r = validateSourceLogText(changed);
    expect(r.code).toBe(2); expect(r.messages.join(" ")).not.toContain("private-sentinel");
  });
  it("checks source CLI usage, nonexistent input and unsupported file type", () => {
    expect(run("validate-cp2-source-log.mjs").status).toBe(3);
    expect(run("validate-cp2-source-log.mjs", ["--file", "missing.md"]).status).toBe(1);
    expect(validateSourceLogFile(fixture("survey-valid.json")).code).toBe(1);
  });
});

it("ignores only private research directories and keeps reviewed evidence trackable", () => {
  const r = spawnSync("git", ["check-ignore", "--stdin"], { cwd: root, input: "research/private/raw.csv\ndocs/evidence/private/raw.md\ndocs/evidence/reviewed.md\nresearch/public-log.md\n", encoding: "utf8" });
  expect(r.stdout.trim().split("\n")).toEqual(["research/private/raw.csv", "docs/evidence/private/raw.md"]);
});

it("fixtures use explicit synthetic markers and reserved source domains", () => {
  expect(rows()[0].data_kind).toBe("synthetic_aggregate");
  expect(validateSourceLogFile(fixture("source-valid.md")).records.every((r) => new URL(r.source_url).hostname.endsWith(".test"))).toBe(true);
  const dir = mkdtempSync(path.join(scratch, "cp2-size-"));
  try { mkdirSync(path.join(dir, "folder.json")); expect(validateSurveyFile(path.join(dir, "folder.json")).code).toBe(1); }
  finally { rmSync(dir, { recursive: true, force: true }); }
});
