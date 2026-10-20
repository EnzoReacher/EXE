import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const EXAMPLE_LABEL = "Example only — not collected evidence";
const REQUIRED_HEADERS = [
  "Evidence ID",
  "Evidence type",
  "Date collected",
  "Participant/source category",
  "Anonymized summary",
  "Related hypothesis",
  "Signal",
  "Confidence notes / limitations",
  "Owner review status",
];
const VALID_SIGNALS = new Set(["supporting", "neutral", "contradicting"]);

function clean(value) {
  return value.replaceAll("<br>", " ").trim();
}

function splitRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(clean);
}

function isDivider(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

export function parseEvidenceRegister(markdown) {
  const lines = markdown.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.includes("| Evidence ID |") && line.includes("Owner review status"));
  if (headerIndex === -1 || !isDivider(lines[headerIndex + 1] ?? "")) {
    return { error: "The evidence-register Markdown table header is missing or malformed." };
  }

  const headers = splitRow(lines[headerIndex]);
  const rows = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim().startsWith("|")) break;
    const cells = splitRow(line);
    if (cells.length !== headers.length) {
      return { error: `Evidence table row ${index + 1} has ${cells.length} cells; expected ${headers.length}.` };
    }
    rows.push({ line: index + 1, values: Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex]])) });
  }

  return { headers, rows };
}

function hasPlaceholder(value) {
  return !value || /^(not collected|not reviewed|none|n\/?a|tbd|example|unknown|yyyy-mm-dd|\[.*\])$/i.test(value.trim());
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function findUnsafeContent(text) {
  const findings = [];
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) findings.push("email address");
  const textWithoutIsoDates = text.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "");
  if (/(?:\+?\d[\d(). -]{7,}\d)(?![-\d])/.test(textWithoutIsoDates)) findings.push("phone-number pattern");
  if (/\b(?:password|api[_ -]?key|secret|access token|service[- ]role)\s*[:=]/i.test(text)) findings.push("credential-like value");
  if (/\b(?:full CV|curriculum vitae|resume text|raw application)\b/i.test(text)) findings.push("full CV or raw application content");
  if (/\b(?:raw recording|recording transcript|audio recording|video recording)\b/i.test(text)) findings.push("raw recording reference");
  if (/\b(?:confidential employer|private employer|client confidential)\b/i.test(text)) findings.push("private employer information");
  return findings;
}

function unsupportedClaim(text) {
  const normalized = text.toLowerCase();
  const terms = ["validated", "cheaper", "better", "better value", "market-ready", "market demand", "more private", "easier to use", "superior competitor"];
  return terms.find((term) => new RegExp(`\\b${term.replaceAll(" ", "\\s+")}\\b`, "i").test(normalized));
}

function needsCompetitorSources(row) {
  return /^(CM|COMP|PRICE)-/i.test(row["Evidence ID"] ?? "")
    || /competitor|alternative|pricing|price|paid plan|free tier/i.test(`${row["Evidence type"]} ${row["Related hypothesis"]} ${row["Anonymized summary"]}`);
}

function sourceMetadataIsComplete(row) {
  const url = row["Source URL"] ?? "";
  const sourceDate = row["Source date"] ?? "";
  return /^https:\/\//i.test(url.trim()) && validDate(sourceDate.trim());
}

function buildResult(code, messages, summary = {}) {
  return { code, messages, ...summary };
}

export function validateEvidenceMarkdown(markdown, mode) {
  if (mode !== "template" && mode !== "collected") {
    return buildResult(3, ["Usage error: --mode must be template or collected."]);
  }

  const parsed = parseEvidenceRegister(markdown);
  if (parsed.error) return buildResult(1, [parsed.error]);
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !parsed.headers.includes(header));
  if (missingHeaders.length > 0) return buildResult(1, [`Missing required evidence-register column(s): ${missingHeaders.join(", ")}.`]);

  const exampleRows = parsed.rows.filter(({ values }) => Object.values(values).some((value) => value.includes(EXAMPLE_LABEL)));
  const actualRows = parsed.rows.filter((row) => !exampleRows.includes(row));
  const unsafe = findUnsafeContent(parsed.rows.flatMap((row) => Object.values(row.values)).join("\n"));
  if (unsafe.length > 0) {
    return buildResult(2, ["Unsafe or sensitive content detected (" + [...new Set(unsafe)].join(", ") + "). Remove it manually; the validator did not rewrite the register."]);
  }
  const failures = [];

  for (const row of exampleRows) {
    const rowText = Object.values(row.values).join(" ");
    if (!rowText.includes(EXAMPLE_LABEL)) failures.push(`Row ${row.line}: example rows must say “${EXAMPLE_LABEL}”.`);
    if (!/example|not collected|not reviewed/i.test(rowText)) failures.push(`Row ${row.line}: example row could be interpreted as collected research.`);
    const blocked = unsupportedClaim(rowText);
    if (blocked) failures.push(`Row ${row.line}: template/example rows cannot contain unsupported “${blocked}” claim wording.`);
  }

  if (mode === "template") {
    if (actualRows.length > 0) failures.push("Template mode found non-example evidence row(s). Use collected mode only after actual anonymized evidence is entered.");
    if (failures.length > 0) return buildResult(1, failures);
    return buildResult(0, ["CP2 evidence pending: the register is structurally a blank/example-only template.", "No template row is treated as real research, and no product conclusion or market claim is unlocked."], { actualEvidenceCount: 0, ownerReviewedCount: 0 });
  }

  if (actualRows.length === 0) {
    return buildResult(1, ["Collected mode requires at least one actual anonymized, non-example evidence row. CP2 evidence is still pending."]);
  }

  const ids = new Set();
  let ownerReviewedCount = 0;
  for (const row of actualRows) {
    const value = (header) => row.values[header] ?? "";
    if (/example|not collected evidence/i.test(Object.values(row.values).join(" "))) {
      failures.push(`Row ${row.line}: example-only wording cannot be presented as a collected finding.`);
    }
    const required = ["Evidence ID", "Evidence type", "Participant/source category", "Anonymized summary", "Related hypothesis", "Confidence notes / limitations", "Owner review status"];
    for (const header of required) {
      if (hasPlaceholder(value(header))) failures.push(`Row ${row.line}: ${header} is required and cannot be a placeholder.`);
    }
    if (!validDate(value("Date collected"))) failures.push(`Row ${row.line}: Date collected must be an actual YYYY-MM-DD date.`);
    const id = value("Evidence ID");
    if (id && ids.has(id)) failures.push(`Row ${row.line}: Evidence ID must be unique.`);
    ids.add(id);
    if (!/^[A-Z][A-Z0-9]{1,9}-\d{3,}$/i.test(id)) failures.push(`Row ${row.line}: Evidence ID must use a stable prefix and number, such as TU-001.`);
    if (!VALID_SIGNALS.has(value("Signal").trim().toLowerCase())) failures.push(`Row ${row.line}: Signal must be supporting, neutral, or contradicting.`);
    if (/reviewed|approved/i.test(value("Owner review status")) && !/not reviewed|pending/i.test(value("Owner review status"))) ownerReviewedCount += 1;
    const blocked = unsupportedClaim(Object.values(row.values).join(" "));
    if (blocked) failures.push(`Row ${row.line}: unsupported “${blocked}” claim detected. Record an observation and limitation instead; owner review is required before any claim.`);
    if (needsCompetitorSources(row.values) && !sourceMetadataIsComplete(row.values)) failures.push(`Row ${row.line}: competitor/pricing evidence requires an HTTPS Source URL and valid Source date.`);
  }

  if (failures.length > 0) return buildResult(1, failures);
  const pendingReviewCount = actualRows.length - ownerReviewedCount;
  const messages = [
    `Syntactically complete collected evidence: ${actualRows.length} row(s).`,
    `Owner-reviewed evidence: ${ownerReviewedCount} row(s); pending/not-reviewed evidence: ${pendingReviewCount} row(s).`,
    "Limitations remain a required human review item. Formatting does not establish research quality, product-market fit, market demand, usability, willingness to pay, privacy superiority, or competitor position.",
    "Product conclusions and claims about being cheaper, better, better value, validated, market-ready, more private, easier to use, or superior remain blocked unless the owner/team reviews sufficient relevant evidence.",
  ];
  return buildResult(0, messages, { actualEvidenceCount: actualRows.length, ownerReviewedCount });
}

export function validateEvidenceFile(file, mode) {
  if (!file) return buildResult(3, ["Usage error: --file is required."]);
  try {
    return validateEvidenceMarkdown(readFileSync(file, "utf8"), mode);
  } catch (error) {
    if (error?.code === "ENOENT") return buildResult(1, [`Evidence register does not exist: ${file}`]);
    return buildResult(1, ["Could not read the evidence register. Check the file path and permissions."]);
  }
}

export function parseArguments(args) {
  if (args.length !== 4 || args[0] !== "--file" || args[2] !== "--mode") return { error: "Usage: node scripts/validate-cp2-evidence.mjs --file <path> --mode <template|collected>" };
  return { file: args[1], mode: args[3] };
}

function main() {
  const args = parseArguments(process.argv.slice(2));
  const result = args.error ? buildResult(3, [args.error]) : validateEvidenceFile(args.file, args.mode);
  for (const message of result.messages) console.log(message);
  process.exitCode = result.code;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
