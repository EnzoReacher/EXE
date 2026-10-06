import { readFileSync, existsSync } from "node:fs";
import { mkdtemp, rm, cp, mkdir } from "node:fs/promises";
import { createServer } from "node:net";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "@playwright/test";
import { parseEnv, verifyReviewPreflight } from "./review-preflight.mjs";
import { loopbackOrigin, publicLocalSettings, localFetch, provisionFixtures } from "./e2e-local-support.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let phase = "configuration";
let server; let tests; let cleanFixtures; let temporary; let interrupted = false;
function stop(child) {
  if (!child || !child.pid || child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    child.once("exit", resolve);
    try { process.kill(-child.pid, "SIGTERM"); } catch { child.kill("SIGTERM"); }
    const timer = setTimeout(() => { try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); } }, 8000);
    child.once("exit", () => clearTimeout(timer));
  });
}
async function main() {
  const signal = () => { interrupted = true; process.exitCode = 1; void stop(tests); };
  process.on("SIGINT", signal); process.on("SIGTERM", signal);
  try {
    const app = loopbackOrigin(process.env.E2E_APP_URL ?? "http://127.0.0.1:3111");
    const config = path.join(root, ".env.local");
    if (verifyReviewPreflight(config, root).code) throw new Error("LOCAL_PREFLIGHT_BLOCKED");
    const settings = parseEnv(readFileSync(config, "utf8"));
    const { supabase, key, siteUrl } = publicLocalSettings(settings);
    if (app === supabase) throw new Error("SEPARATE_APPLICATION_PORT_REQUIRED");
    for (const name of [".env", ".env.development", ".env.development.local"]) {
      if (existsSync(path.join(root, name))) throw new Error("ADDITIONAL_NEXT_ENV_FILE_BLOCKED");
    }
    phase = "cached browser";
    if (!existsSync(chromium.executablePath())) throw new Error("CACHED_CHROMIUM_REQUIRED_NO_AUTOMATIC_DOWNLOAD");
    // Probe first; Playwright's actual launch also verifies native browser libraries.
    const browser = await chromium.launch({ headless: true }); await browser.close();
    phase = "existing local Supabase";
    const health = await localFetch([supabase])(`${supabase}/auth/v1/health`, { headers: { apikey: key }, signal: AbortSignal.timeout(10000) });
    if (!health.ok) throw new Error("EXISTING_LOCAL_SUPABASE_REQUIRED");
    phase = "owned application port";
    const url = new URL(app); const host = url.hostname.replace(/^\[|\]$/g, ""); const port = Number(url.port || 80);
    await new Promise((resolve, reject) => { const probe = createServer(); probe.once("error", () => reject(new Error("APPLICATION_PORT_OCCUPIED"))); probe.listen(port, host, () => probe.close(resolve)); });
    temporary = await mkdtemp(path.join(tmpdir(), "exe-browser-"));
    phase = "isolated application copy";
    const serverRoot = path.join(temporary, "application"); await mkdir(serverRoot);
    // Run an unchanged copy of the real application so Next's caches and server
    // logs also remain outside the repository. No test routes/auth hooks are added.
    for (const name of ["src", "public", "next.config.ts", "tsconfig.json", "package.json", "pnpm-lock.yaml"]) {
      if (name === "public" && !existsSync(path.join(root, name))) continue;
      await cp(path.join(root, name), path.join(serverRoot, name), { recursive: true });
    }
    // Preserve pnpm's relative links within the isolated root without downloads.
    // Dependencies are read-only to the server; its generated files live in .next.
    execFileSync("cp", ["-a", "--reflink=auto", path.join(root, "node_modules"), path.join(serverRoot, "node_modules")], { stdio: "ignore" });
    phase = "synthetic fixture provisioning";
    const provisioned = await provisionFixtures(supabase, key); cleanFixtures = provisioned.cleanup;
    if (interrupted) throw new Error("INTERRUPTED");
    const childEnv = { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: temporary, NODE_ENV: "development", NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_SUPABASE_URL: supabase, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key, NEXT_PUBLIC_SITE_URL: siteUrl };
    phase = "owned Next.js server";
    server = spawn(process.execPath, [path.join(serverRoot, "node_modules/next/dist/bin/next"), "dev", "--hostname", host, "--port", String(port)], { cwd: serverRoot, env: childEnv, detached: true, stdio: "ignore" });
    let serverSpawnFailed = false;
    server.once("error", () => { serverSpawnFailed = true; });
    let ready = false;
    for (let count = 0; count < 90 && !interrupted; count++) {
      if (serverSpawnFailed || server.exitCode !== null) break;
      // Private pages now redirect anonymous requests; keep redirect rejection
      // enabled and probe the actual public account-entry page instead.
      try { const response = await localFetch([app])(`${app}/sign-in`, { signal: AbortSignal.timeout(3000) }); if (response.ok) { ready = true; break; } } catch { /* No raw URLs/errors are printed. */ }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error("LOCAL_APP_START_FAILED");
    phase = "browser journeys";
    const status = await new Promise((resolve) => {
      tests = spawn(process.execPath, [path.join(root, "node_modules/@playwright/test/cli.js"), "test", "--config", "e2e/local.config.mts"], {
        cwd: root, detached: true, stdio: ["ignore", "inherit", "ignore"], env: { ...childEnv, E2E_APP_URL: app, E2E_SUPABASE_URL: supabase, E2E_TEMP: temporary, E2E_FIXTURES: JSON.stringify(provisioned.fixtures) },
      });
      tests.once("error", () => resolve(1)); tests.once("exit", (code) => resolve(code ?? 1));
    });
    if (status || interrupted) throw new Error("BROWSER_ACCEPTANCE_FAILED");
  } catch (error) {
    const code = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message) ? error.message : "LOCAL_HARNESS_ERROR";
    console.error(`Local browser acceptance blocked during ${phase}: ${code}.`); process.exitCode = 1;
  } finally {
    await stop(tests); await stop(server);
    if (cleanFixtures) {
      try { await cleanFixtures(); console.log("Current-run synthetic accounts and private objects cleaned up."); }
      catch { console.error("Current-run fixture cleanup failed; investigate locally before retrying."); process.exitCode = 1; }
    }
    if (temporary) await rm(temporary, { recursive: true, force: true });
    process.removeListener("SIGINT", signal); process.removeListener("SIGTERM", signal);
  }
  if (!process.exitCode) console.log("Local automated synthetic browser acceptance and cleanup passed; manual reviews and CP2 remain pending.");
}
await main();
