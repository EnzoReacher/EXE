import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredKeys = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
const prohibitedKey = /(?:^|_)(?:SUPABASE_)?(?:SERVICE_ROLE|SECRET|DATABASE_URL|PRIVATE_KEY|ACCESS_TOKEN)(?:_|$)/i;

function safeName(file) {
  return path.basename(file).replace(/[\x00-\x1f\x7f]/g, "_").slice(0, 160) || "environment file";
}

function removeWrappingQuotes(value) {
  if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseEnv(text) {
  const entries = {};
  for (const line of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    entries[match[1]] = removeWrappingQuotes(match[2].trim());
  }
  return entries;
}

export function parseArguments(args) {
  if (args[0] === "--") args = args.slice(1);
  if (args.length === 0) return { envFile: ".env.local" };
  if (args.length === 2 && args[0] === "--config" && args[1] && !args[1].startsWith("--")) return { envFile: args[1] };
  return null;
}

function isLocalHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function hasFictionalDemoFixture(rootDir) {
  const fixture = path.join(rootDir, "docs", "demo", "fixtures", "aria-vale-fictional-cv.docx");
  try {
    const stat = statSync(fixture);
    if (!stat.isFile() || stat.size === 0 || stat.size > 5 * 1024 * 1024) return false;
    return readFileSync(fixture).subarray(0, 2).toString("utf8") === "PK";
  } catch {
    return false;
  }
}

export function verifyReviewPreflight(envFile, rootDir = root) {
  const resolved = path.resolve(envFile);
  let text;
  try {
    const stat = statSync(resolved);
    if (!stat.isFile() || stat.size > 64 * 1024) return { code: 1, messages: [`${safeName(resolved)} is not a regular environment file of at most 64 KiB.`] };
    text = readFileSync(resolved, "utf8");
  } catch {
    return { code: 1, messages: [`${safeName(resolved)} is missing or unreadable. Create a local-only review configuration first.`] };
  }

  const env = parseEnv(text);
  const missing = requiredKeys.filter((key) => !env[key]);
  if (missing.length) return { code: 1, messages: ["The local review configuration is missing one or more required public Supabase settings."] };
  if (Object.keys(env).some((key) => key !== "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" && prohibitedKey.test(key))) {
    return { code: 2, messages: ["The local review configuration contains a private credential setting. Remove it before browser testing."] };
  }
  if (!isLocalHttpUrl(env.NEXT_PUBLIC_SUPABASE_URL)) {
    return { code: 1, messages: ["The local review configuration must use an HTTP loopback Supabase URL, not a hosted environment."] };
  }
  if (!hasFictionalDemoFixture(rootDir)) {
    return { code: 1, messages: ["The required fictional DOCX demo fixture is unavailable or invalid. Do not substitute real CV data."] };
  }
  if (!hasReviewChecklist(rootDir)) {
    return { code: 1, messages: ["The owner review checklist is unavailable. Restore it before testing."] };
  }
  return {
    code: 0,
    messages: [
      "Local-only public Supabase settings are present; no values were printed.",
      "The fictional DOCX demo fixture and owner review checklist are available.",
      "This preflight does not perform browser testing, approve a release, collect CP2 evidence, merge, or deploy.",
    ],
  };
}

function hasReviewChecklist(rootDir) {
  try {
    return statSync(path.join(rootDir, "docs", "M10_2_OWNER_REVIEW.md")).isFile();
  } catch {
    return false;
  }
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  if (!options) {
    console.log("Usage: pnpm review:preflight -- [--config path/to/.env.local]");
    process.exitCode = 3;
    return;
  }
  const result = verifyReviewPreflight(options.envFile);
  console.log(`Owner-review preflight ${result.code === 0 ? "passed" : "blocked"}.`);
  for (const message of result.messages) console.log(message);
  process.exitCode = result.code;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
