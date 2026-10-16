import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const shared = new Set(["src/lib/experience-translator/types.ts"]);
const backendScripts = /^scripts\/(?:check-ownpath-ownership|check-ownpath-retired-apis|setup-ownpath-factory|verify-ownpath-factory)(?:\.test)?\.mjs$/;
const legacyPages = /^src\/app\/(?:assessment|analysis|opportunities|saved-work|review|expert|credential-versions)\//;

export function ownsPath(role, filename) {
  if (filename.startsWith("/") || filename.includes("\\") || filename.split("/").some((part) => ["..", ".", ""].includes(part))) return false;
  if (shared.has(filename)) return false;
  if (role === "accounts-integration" && [".github/workflows/ownpath-accounts.yml", "scripts/ci-ownpath-browser.mjs"].includes(filename)) return true;
  if (role === "accounts-backend") return /^src\/lib\/accounts-billing\//.test(filename) || /^src\/app\/api\/(?:auth\/(?:csrf|session)|account|billing\/(?:plans|status|checkout|portal)|webhooks\/stripe|sessions(?:\/\[id\])?)\//.test(filename) || filename.startsWith("docs/ownpath/");
  if (role === "auth-ui" && filename.startsWith("src/components/accounts-auth/")) return true;
  if (role === "billing-ui" && filename.startsWith("src/components/accounts-billing/")) return true;
  if (role === "accounts-integration") return ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", ".env.example", ".gitignore", "firebase.json", "firestore.rules", "firestore.indexes.json"].includes(filename) || /^scripts\/accounts-(?:emulators(?:\.test)?|emulator-check)\.mjs$/.test(filename) || backendScripts.test(filename) || filename.startsWith("docs/ownpath/") || filename.startsWith("docs/ai-factory/");
  if (role === "auth-ui") return /^src\/app\/(?:sign-in|sign-up|auth|forgot-password|reset-password|verify-email)\//.test(filename) || /^src\/app\/account\/page(?:\.test)?\.tsx$/.test(filename);
  if (role === "billing-ui") return /^src\/app\/(?:pricing|checkout|account\/billing|experience-translator)\//.test(filename);
  if (role === "backend") return filename.startsWith("src/app/api/") || filename.startsWith("src/lib/") || filename.startsWith("docs/ownpath/") || filename.startsWith("docs/ai-factory/") || backendScripts.test(filename);
  if (role === "shell") return /^src\/app\/(?:(?:page|layout)(?:\.test)?\.tsx|globals\.css)$/.test(filename) || filename.startsWith("src/components/") || legacyPages.test(filename);
  if (role === "translator") return filename.startsWith("src/app/experience-translator/");
  throw new Error("Unknown ownership role: use backend, shell or translator.");
}

// Compare with the exact assigned checkpoint, NOT a moving remote branch or
// merge-base: include staged/unstaged changes and both sides of a rename.
export function checkOwnership(directory, role, base) {
  if (!/^[a-f0-9]{40}$/.test(base)) throw new Error("An explicit full baseline commit SHA is required.");
  ownsPath(role, "probe");
  const git = (args) => execFileSync("git", args, { cwd: directory, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  git(["cat-file", "-e", `${base}^{commit}`]);
  const changed = git(["diff", "--no-renames", "--name-only", "-z", base, "--"]).split("\0").filter(Boolean);
  const untracked = git(["ls-files", "--others", "--exclude-standard", "-z"]).split("\0").filter(Boolean);
  const files = [...new Set([...changed, ...untracked])].sort();
  return { files, violations: files.filter((filename) => !ownsPath(role, filename)) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [role, base, ...extra] = process.argv.slice(2);
    if (extra.length || !role || !base) throw new Error("Usage: node scripts/check-ownpath-ownership.mjs <backend|shell|translator> <full-baseline-SHA>");
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const result = checkOwnership(root, role, base);
    if (result.violations.length) {
      console.error(`Ownership FAIL (${role}):\n${result.violations.map((name) => JSON.stringify(name)).join("\n")}`);
      process.exitCode = 1;
    } else console.log(`Ownership PASS (${role}): ${result.files.length} changed/untracked paths within assigned boundaries.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
