import { mkdtempSync, rmSync, statSync, accessSync, constants } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

// A separate rendering regression: no accounts, Supabase, app server or
// document uploads. Uses installed browser tooling; never downloads a browser.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const binary = process.env.PROOF_BROWSER_EXECUTABLE;
if (binary) {
  try {
    if (!path.isAbsolute(binary) || !statSync(binary).isFile()) throw new Error();
    accessSync(binary, constants.X_OK);
  } catch {
    console.error("Proof rendering blocked: the explicitly selected local browser is unavailable.");
    process.exit(1);
  }
}
const temporary = mkdtempSync(path.join(tmpdir(), "exe-proof-render-"));
const env = { PROOF_TEST_TEMP: temporary, TMPDIR: tmpdir() };
for (const name of ["PATH", "HOME", "XDG_CACHE_HOME", "PLAYWRIGHT_BROWSERS_PATH", "LD_LIBRARY_PATH", "FONTCONFIG_PATH", "PROOF_BROWSER_EXECUTABLE"]) {
  if (process.env[name]) env[name] = process.env[name];
}
try {
  const child = spawn(process.execPath, [path.join(root, "node_modules/@playwright/test/cli.js"), "test", "--config", "e2e/proof-preview.config.mts"], { cwd: root, env, stdio: "inherit" });
  for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => child.kill(signal));
  process.exitCode = await new Promise((resolve) => { child.once("error", () => resolve(1)); child.once("exit", (code) => resolve(code === 0 ? 0 : 1)); });
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
