import { claimDetected, cliArguments, isMain, readInput, reportCli, result, sensitiveContent, validDate } from "./cp2-research-common.mjs";

export const SOURCE_FIELDS = ["evidence_id", "source_category", "source_quality", "source_url", "date_accessed", "source_date", "region", "currency", "plan_access_context", "billing_context", "tax_promotion_caveat", "supported_fact", "limitation", "owner_review_status"];
const placeholder = (v) => !v || /^(?:tbd|unknown|none|placeholder|yyyy-mm-dd|\[.*\])$/i.test(v);

export function validateSourceLogText(text) {
  const unsafe = sensitiveContent(text);
  if (unsafe.length) return result(2, [`Sensitive content detected (${unsafe.join(", ")}). Remove it manually; the source log was not changed.`]);
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines[0] !== "# CP2 public source log" || !/^data_kind: (source_log|synthetic_source_log)$/.test(lines[1] ?? "")) return result(1, ["Use the documented source-log title and explicit data_kind."]);
  const synthetic = lines[1] === "data_kind: synthetic_source_log";
  const records = []; let record;
  for (const line of lines.slice(2)) {
    const heading = /^## (CM-\d{3,})$/.exec(line);
    if (heading) { record = { headingId: heading[1], fields: {} }; records.push(record); continue; }
    const field = /^- ([a-z_]+): (.+)$/.exec(line);
    if (!record || !field || !SOURCE_FIELDS.includes(field[1]) || Object.hasOwn(record.fields, field[1])) return result(1, ["Malformed source record, duplicate field, unsupported field or unstructured interpretation. Use one documented field per line."]);
    record.fields[field[1]] = field[2].trim();
  }
  if (!records.length) return result(1, ["At least one complete source record is required; blank templates are not source evidence."]);
  const failures = []; const ids = new Set();
  records.forEach(({ headingId, fields: r }, i) => {
    const prefix = `Record ${i + 1}: `;
    if (SOURCE_FIELDS.some((key) => !Object.hasOwn(r, key) || placeholder(r[key]))) failures.push(prefix + "all required fields must be present with meaningful context.");
    if (r.evidence_id !== headingId || headingId.endsWith("-000") || ids.has(headingId)) failures.push(prefix + "unique non-placeholder CM evidence ID must match its heading.");
    ids.add(headingId);
    if (!["competitor", "alternative", "pricing", "privacy", "market", "other"].includes(r.source_category)) failures.push(prefix + "unsupported source category.");
    if (!["official_primary", "third_party", "unclear"].includes(r.source_quality)) failures.push(prefix + "record source quality separately from its facts.");
    try {
      const url = new URL(r.source_url);
      if (url.protocol !== "https:" || !url.hostname || url.username || url.password) throw new Error();
      const reserved = /\.(?:test|invalid)$/.test(url.hostname) || ["example.test", "example.invalid"].includes(url.hostname);
      if (synthetic !== reserved) failures.push(prefix + "synthetic records require reserved test/invalid domains; reserved domains cannot be real evidence.");
    } catch { failures.push(prefix + "a complete HTTPS public source URL is required."); }
    if (!validDate(r.date_accessed)) failures.push(prefix + "valid access date required.");
    if (r.source_date !== "not_stated" && (!validDate(r.source_date) || r.source_date > r.date_accessed)) failures.push(prefix + "source date must be valid and not later than access, or explicitly not_stated.");
    if (!r.region || r.region === "not_applicable") failures.push(prefix + "record the source region or a stated broad/global scope.");
    const priced = ["pricing", "competitor"].includes(r.source_category);
    if (!(typeof r.currency === "string" && /^[A-Z]{3}$/.test(r.currency)) && (priced || r.currency !== "not_applicable")) failures.push(prefix + "currency required (three-letter code); non-pricing records may use not_applicable.");
    if (priced && ["plan_access_context", "billing_context", "tax_promotion_caveat"].some((k) => !r[k] || /^(?:not_applicable|not_stated|n\/a)$/i.test(r[k]))) failures.push(prefix + "pricing/competitor records require explicit plan/access, billing and tax/promotion context or a detailed unavailability caveat.");
    if (!r.supported_fact || r.supported_fact.length < 15 || /\b(?:we (?:believe|think|infer)|therefore|probably|must mean|recommend|should choose|interpretation)\b/i.test(r.supported_fact)) failures.push(prefix + "record a source-attributed observation, not team interpretation or recommendation.");
    if (!r.supported_fact || !/^(?:The (?:source|page|document)|This source) (?:states|lists|reports|describes|discloses)\b/i.test(r.supported_fact)) failures.push(prefix + "supported_fact must attribute the fact to the source (for example, The source states ...).");
    if (!r.limitation || r.limitation.length < 15) failures.push(prefix + "explain uncertainty and what the source does not establish.");
    if (Object.values(r).some(claimDetected)) failures.push(prefix + "unsupported claim wording; no EXE superiority or validation assertion is permitted.");
    if (r.owner_review_status !== "pending" && !/^reviewed_\d{4}-\d{2}-\d{2}$/.test(r.owner_review_status ?? "")) failures.push(prefix + "owner review must be pending or reviewed_YYYY-MM-DD (actual review only).");
    if (r.owner_review_status?.startsWith("reviewed_") && !validDate(r.owner_review_status.slice(9))) failures.push(prefix + "invalid owner review date.");
    if (!synthetic && /\b(?:synthetic|fictional|placeholder|example only)\b/i.test(Object.values(r).join(" "))) failures.push(prefix + "placeholder/synthetic records cannot be presented as real evidence.");
  });
  return failures.length ? result(1, failures) : result(0, ["Source documentation completeness checks passed; no URL was fetched and no fact was verified.", synthetic ? "SYNTHETIC TEST ONLY — not collected evidence." : "Manual fact, source currency and owner/team review are required; claims and M11 remain blocked."], { records: records.map((r) => r.fields) });
}

export function validateSourceLogFile(file) {
  const input = readInput(file, [".md"]);
  return input.code ? input : validateSourceLogText(input.text);
}

if (isMain(import.meta.url)) {
  const args = cliArguments(process.argv.slice(2));
  if (!args) { console.log("Usage: --file <public-source-log.md>"); process.exitCode = 3; }
  else reportCli(args.file, validateSourceLogFile(args.file));
}
