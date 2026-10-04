import { constants, accessSync, cpSync, mkdirSync, mkdtempSync, rmSync, statSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const binary = process.env.PROOF_BROWSER_EXECUTABLE;
try {
  if (!statSync(path.join(root, ".next/BUILD_ID")).isFile()) throw new Error();
  if (binary) { if (!path.isAbsolute(binary) || !statSync(binary).isFile()) throw new Error(); accessSync(binary, constants.X_OK); }
} catch { console.error("UI rendering blocked: run pnpm build and make a local Chromium executable available first."); process.exit(1); }
const temporary = mkdtempSync(path.join(tmpdir(), "exe-ui-render-"));
try {
  const app = path.join(temporary, "app"); mkdirSync(app);
  // No environment file, source document, credential or account data copied.
  cpSync(path.join(root, ".next"), path.join(app, ".next"), { recursive: true, mode: constants.COPYFILE_FICLONE, filter: (source) => source !== path.join(root, ".next/cache") });
  cpSync(path.join(root, "package.json"), path.join(app, "package.json"));
  symlinkSync(path.join(root, "node_modules"), path.join(app, "node_modules"), "dir");
  const probe = createServer();
  await new Promise((resolve, reject) => { probe.once("error", reject); probe.listen(0, "127.0.0.1", resolve); });
  const address = probe.address();
  if (!address || typeof address === "string") throw new Error();
  const port = address.port; await new Promise((resolve) => probe.close(resolve));
  const env = { UI_TEST_TEMP: temporary, UI_TEST_PORT: String(port), NEXT_TELEMETRY_DISABLED: "1" };
  for (const name of ["PATH", "HOME", "XDG_CACHE_HOME", "PLAYWRIGHT_BROWSERS_PATH", "LD_LIBRARY_PATH", "FONTCONFIG_PATH", "PROOF_BROWSER_EXECUTABLE"]) if (process.env[name]) env[name] = process.env[name];
  const child = spawn(process.execPath, [path.join(root, "node_modules/@playwright/test/cli.js"), "test", "--config", "e2e/workspace-ui.config.mts"], { cwd: root, env, stdio: "inherit" });
  for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => child.kill(signal));
  process.exitCode = await new Promise((resolve) => { child.once("error", () => resolve(1)); child.once("exit", (code) => resolve(code === 0 ? 0 : 1)); });
} catch { console.error("UI rendering could not complete. No private configuration is required by this fixture test."); process.exitCode = 1; }
finally { rmSync(temporary, { recursive: true, force: true }); }
