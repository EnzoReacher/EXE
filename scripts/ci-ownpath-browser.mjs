import { existsSync, cpSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { spawn, execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

// This process owns only a disposable CI app/server. Work previews and the
// owner's running application/DB are never started or changed by this command.
if (process.env.GITHUB_ACTIONS !== "true" || process.env.CI !== "true" || process.env.SITES_MANAGED_LINUX_CONTAINER === "1") {
  console.error("Disposable GitHub runner required; no local preview or browser installation performed.");
  process.exit(1);
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporary = mkdtempSync(path.join(tmpdir(), "ownpath-browser-ci-"));
let child; let interrupted = false; let phase = "cached Chromium";
function stop(processToStop) {
  if (!processToStop?.pid || processToStop.exitCode !== null || processToStop.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    processToStop.once("exit", resolve);
    try { process.kill(-processToStop.pid, "SIGTERM"); } catch { processToStop.kill("SIGTERM"); }
    const timer = setTimeout(() => { try { process.kill(-processToStop.pid, "SIGKILL"); } catch { processToStop.kill("SIGKILL"); } }, 5000);
    processToStop.once("exit", () => clearTimeout(timer));
  });
}
const signal = () => { interrupted = true; process.exitCode = 1; void stop(child); };
process.on("SIGINT", signal); process.on("SIGTERM", signal);
async function run(command, args, cwd, env, output = "ignore") {
  if (interrupted) throw new Error("INTERRUPTED");
  child = spawn(command, args, { cwd, env, stdio: output, detached: true });
  const result = await new Promise((resolve) => { child.once("error", () => resolve(1)); child.once("exit", (code) => resolve(code ?? 1)); });
  if (result || interrupted) throw new Error("OWNPATH_CI_COMMAND_FAILED");
}
let server;
try {
  if (!existsSync(chromium.executablePath())) throw new Error("CACHED_CHROMIUM_REQUIRED");
  phase = "unchanged application copy";
  const app = path.join(temporary, "app"); mkdirSync(app);
  for (const name of ["src", "public", "next.config.ts", "tsconfig.json", "package.json", "pnpm-lock.yaml"]) {
    if (name === "public" && !existsSync(path.join(root, name))) continue;
    cpSync(path.join(root, name), path.join(app, name), { recursive: true });
  }
  execFileSync("cp", ["-a", "--reflink=auto", path.join(root, "node_modules"), path.join(app, "node_modules")], { stdio: "ignore" });
  const env = { NODE_ENV: "production", CI: "true", NEXT_TELEMETRY_DISABLED: "1", TMPDIR: temporary };
  for (const name of ["PATH", "HOME", "PLAYWRIGHT_BROWSERS_PATH", "LD_LIBRARY_PATH", "FONTCONFIG_PATH"]) if (process.env[name]) env[name] = process.env[name];
  // No .env files, Supabase settings, provider keys or arbitrary runner env
  // are copied to the application. No source fixture is server-submitted.
  phase = "production build";
  await run(process.execPath, [path.join(app, "node_modules/next/dist/bin/next"), "build"], app, env);
  console.log("OwnPath unchanged application production build: PASS.");
  const probe = createServer();
  await new Promise((resolve, reject) => { probe.once("error", reject); probe.listen(0, "127.0.0.1", resolve); });
  const address = probe.address(); if (!address || typeof address === "string") throw new Error("LOCAL_PORT_REQUIRED");
  await new Promise((resolve) => probe.close(resolve));
  const origin = `http://127.0.0.1:${address.port}`;
  phase = "owned compiled server";
  server = spawn(process.execPath, [path.join(app, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(address.port)], { cwd: app, env, stdio: "ignore", detached: true });
  let spawnFailed = false; server.once("error", () => { spawnFailed = true; });
  let ready = false;
  for (let attempt = 0; attempt < 60 && !interrupted; attempt++) {
    if (spawnFailed || server.exitCode !== null) break;
    try { const response = await fetch(origin + "/experience-translator", { redirect: "error", signal: AbortSignal.timeout(2000) }); if (response.ok) { ready = true; break; } } catch { /* No source/private error output. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error("COMPILED_TRANSLATOR_START_FAILED");
  phase = "four responsive browser journeys";
  await run(process.execPath, [path.join(root, "node_modules/@playwright/test/cli.js"), "test", "--config", "e2e/translator.config.mts"], root,
    { ...env, NODE_ENV: "test", TMPDIR: tmpdir(), OWNPATH_TEST_URL: origin, OWNPATH_BROWSER_TEMP: temporary }, "inherit");
  console.log("OwnPath compiled desktop/mobile-width browser acceptance: PASS.");
} catch (error) {
  const code = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message) ? error.message : "OWNPATH_CI_HARNESS_FAILED";
  console.error(`OwnPath acceptance failed during ${phase}: ${code}. No private content emitted.`); process.exitCode = 1;
} finally {
  await stop(child); await stop(server);
  rmSync(temporary, { recursive: true, force: true });
  process.removeListener("SIGINT", signal); process.removeListener("SIGTERM", signal);
  console.log("Owned browser/server/temp scope cleaned up.");
}
