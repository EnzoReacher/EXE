import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checks = ["review:preflight", "lint", "typecheck", "test", "build"];

export function runReviewVerify({ run = spawnSync, log = console.log, now = () => performance.now() } = {}) {
  for (const [index, check] of checks.entries()) {
    const label = `[review:verify ${index + 1}/${checks.length}] pnpm ${check}`;
    log(`${label} START`);
    const started = now();
    let result;
    try {
      result = run("pnpm", [check], {
        cwd: root,
        stdio: "inherit",
        shell: false,
        // Keep Next's optional telemetry disabled for these local checks.
        env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      });
    } catch {
      // Errors can contain configuration or executable details; do not echo them.
      result = { status: null };
    }
    const elapsed = ((now() - started) / 1000).toFixed(2);
    const code = result.error || result.signal || result.status === null ? 1 : result.status;
    if (code !== 0) {
      log(`${label} FAIL (${elapsed}s; exit ${code}) — stopped.`);
      return code;
    }
    log(`${label} PASS (${elapsed}s)`);
  }
  log("Local engineering verification passed: all 5 checks. Owner browser/accessibility review and CP2 remain pending; M11 remains blocked. No merge or deployment approval.");
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runReviewVerify();
}
