import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const result = (code, messages, extra = {}) => ({ code, messages, ...extra });
export const isMain = (url) => process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(url);
export const filename = (file) => path.basename(file).replace(/[\x00-\x1f\x7f]/g, "_").slice(0, 160);
export const validDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

export function cliArguments(args, allowOutput = false) {
  // pnpm forwards an optional separator to scripts.
  if (args[0] === "--") args = args.slice(1);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]; const value = args[i + 1];
    if (!["--file", ...(allowOutput ? ["--output"] : [])].includes(key) || !value || value.startsWith("--") || Object.hasOwn(options, key)) return null;
    options[key] = value;
  }
  return options["--file"] ? { file: options["--file"], output: options["--output"] } : null;
}

export function readInput(file, extensions) {
  if (!file) return result(3, ["Usage error: an explicit --file path is required."]);
  if (!extensions.includes(path.extname(file).toLowerCase())) return result(1, ["Unsupported input file type."]);
  try {
    const stat = statSync(file);
    if (!stat.isFile() || stat.size > 2 * 1024 * 1024) return result(1, ["Input must be a regular file of at most 2 MiB."]);
    return result(0, [], { text: readFileSync(file, "utf8").replace(/^\uFEFF/, "") });
  } catch { return result(1, ["Input file is missing or unreadable. Check its local path and permissions."]); }
}

export function sensitiveContent(text) {
  const categories = [];
  const normalized = text.normalize("NFKC");
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(normalized)) categories.push("email");
  const withoutDates = normalized.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "");
  if (/(?:\+?\d[\d(). -]{7,}\d)(?![-\d])/.test(withoutDates)) categories.push("phone-like pattern");
  if (/\b(?:name|surname|full[ _-]?name|first[ _-]?name|last[ _-]?name|participant[ _-]?(?:name|id)|respondent[ _-]?(?:name|id)|email(?:[ _-]?address)?|e-mail|phone(?:[ _-]?number)?|telephone|mobile[ _-]?number|contact(?:[ _-]?(?:name|details|list))?|(?:home|street|postal|ip)[ _-]?address|address|postal|postcode|zip[ _-]?code|employer[ _-]?(?:name|id)|application[ _-]?id|account[ _-]?id|cv[ _-]?text|resume[ _-]?text|transcript|recording|password|credential|api[ _-]?key|access[ _-]?token|secret|service[ _-]?role)\b\s*["']?\s*[:=,]/i.test(normalized)) categories.push("identity/contact/private field");
  if (/\b(?:full CV|curriculum vitae|raw (?:resume|application|transcript)|confidential employer|private employer)\b|\.(?:mp3|mp4|wav|m4a|mov)\b/i.test(normalized)) categories.push("private document/recording");
  if (/["']?\b(?:recording|transcript|cv|resume|full_cv|raw_application|employer|application|credentials?)(?:[_-](?:url|path|reference|text|id|data|name|details))?["']?\s*[:=,]/i.test(normalized)) categories.push("private research field");
  if (/-----BEGIN .*PRIVATE KEY-----|\b(?:sb_secret_|sk_live_|ghp_)[A-Za-z0-9_-]+|\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\./.test(normalized)) categories.push("credential signature");
  // Reject URL credentials and direct contact/application query parameters without fetching.
  for (const match of normalized.matchAll(/https?:\/\/[^\s<>"|]+/g)) {
    try {
      const url = new URL(match[0]);
      if (url.username || url.password || [...url.searchParams.keys()].some((key) => /email|phone|contact|name|token|secret|password|(?:participant|respondent|application|account|employer)[_-]?id/i.test(key))) categories.push("private URL identifier");
    } catch { /* URL completeness is checked separately. */ }
  }
  return [...new Set(categories)];
}

export function claimDetected(text) {
  return /\b(?:validated|best|cheaper|better|easier|safer|superior|market[ -]?ready|more (?:private|affordable)|market demand|product[ -]?market fit|guaranteed)\b/i.test(text.normalize("NFKC").replaceAll("_", " "));
}

export function reportCli(file, validation) {
  console.log(`${filename(file)}: ${validation.code === 0 ? "structure checks passed" : "input rejected"}.`);
  for (const message of validation.messages) console.log(message);
  process.exitCode = validation.code;
}

export function parseCsv(text) {
  const rows = []; let row = []; let cell = ""; let quoted = false; let closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else cell += c;
    } else if (c === '"') {
      if (cell || closed) throw new Error("Malformed CSV quoting.");
      quoted = true;
    } else if (c === ",") { row.push(cell); cell = ""; closed = false; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = ""; closed = false;
    } else {
      if (closed) throw new Error("Unexpected text after quoted CSV cell.");
      cell += c;
    }
  }
  if (quoted) throw new Error("Unterminated CSV quote.");
  if (cell || row.length || closed) { row.push(cell); rows.push(row); }
  if (rows.length < 2 || rows.some((r) => r.length !== rows[0].length) || new Set(rows[0]).size !== rows[0].length) throw new Error("Missing, duplicate or uneven CSV columns.");
  return rows.slice(1).map((r) => Object.fromEntries(rows[0].map((key, i) => [key, r[i]])));
}
