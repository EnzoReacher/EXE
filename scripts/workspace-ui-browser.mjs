import { constants, accessSync, cpSync, mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const binary = process.env.PROOF_BROWSER_EXECUTABLE;
try {
  if (binary) { if (!path.isAbsolute(binary) || !statSync(binary).isFile()) throw new Error(); accessSync(binary, constants.X_OK); }
} catch { console.error("UI rendering blocked: make the selected local Chromium executable available first."); process.exit(1); }
const temporary = mkdtempSync(path.join(tmpdir(), "exe-ui-render-"));
try {
  const app = path.join(temporary, "app"); mkdirSync(app);
  // Component-only fixture host: no API routes, proxy, Auth configuration,
  // account data or production build are copied. Real session/backend coverage
  // remains in test:e2e:local, which runs the unchanged complete application.
  for (const name of ["package.json", "tsconfig.json", "src/lib"]) {
    cpSync(path.join(root, name), path.join(app, name), { recursive: true });
  }
  const files = ["src/app/layout.tsx", "src/app/globals.css", "src/components/workspace-header.tsx",
    ...["page.tsx", "workspace.tsx", "workspace-summary.tsx", "export-controls.tsx"].map((name) => "src/app/credential-versions/" + name)];
  for (const name of files) {
    mkdirSync(path.dirname(path.join(app, name)), { recursive: true });
    cpSync(path.join(root, name), path.join(app, name));
  }
  // Retain pnpm's relative dependency links without installation/downloads.
  execFileSync("cp", ["-a", "--reflink=auto", path.join(root, "node_modules"), path.join(app, "node_modules")], { stdio: "ignore" });
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
