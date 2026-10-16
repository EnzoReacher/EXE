import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, realpathSync, rmSync, readdirSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { spawn, execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { assertDemoEnvironment } from "./accounts-emulators.mjs";

export function assertBrowserScope(env) {
  assertDemoEnvironment(env);
  const parent = env.TMPDIR || "";
  const owner = path.dirname(parent);
  if (env.OWNPATH_ACCOUNTS_BROWSER_ACCEPTANCE !== "1" || path.basename(parent) !== "tmp" || !/^ownpathaccounts-[A-Za-z0-9]+$/.test(path.basename(owner)) || env.GCLOUD_PROJECT !== `demo-ownpath-accounts-${path.basename(owner).slice(-6).toLowerCase()}` || env.OWNPATH_TEST_URL || env.OWNPATH_SANDBOX_BILLING_ENABLED === "true") throw new Error("OWNED_ACCOUNTS_BROWSER_SCOPE_REQUIRED");
  return parent;
}
export function groupHasLiveMembers(groupId) {
  // Linux-only harness: group leaders may exit before their workers/browsers.
  // Zombies have no live execution/resources and cannot respond to further signals.
  return readdirSync("/proc").filter(name => /^\d+$/.test(name)).some(name => {
    try {
      const stat = readFileSync(`/proc/${name}/stat`, "utf8");
      const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
      return Number(fields[2]) === groupId && !["Z", "X"].includes(fields[0]);
    } catch { return false; } // Process disappeared during enumeration.
  });
}
export async function stopOwnedGroup(child, { graceMs = 1000, killMs = 4000 } = {}) {
  if (!child?.pid || !groupHasLiveMembers(child.pid)) return;
  const signal = name => { try { process.kill(-child.pid, name); } catch (error) { if (error.code !== "ESRCH") throw new Error("OWNED_PROCESS_CLEANUP_FAILED"); } };
  signal("SIGTERM");
  const deadline = Date.now() + graceMs;
  while (groupHasLiveMembers(child.pid) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
  if (groupHasLiveMembers(child.pid)) signal("SIGKILL");
  const killed = Date.now() + killMs;
  while (groupHasLiveMembers(child.pid) && Date.now() < killed) await new Promise(resolve => setTimeout(resolve, 20));
  if (groupHasLiveMembers(child.pid)) throw new Error("OWNED_PROCESS_CLEANUP_FAILED");
}
export async function waitForOwnedServer(child, probe) {
  // Never issue HTTP readiness probes until this owned Next process reports startup.
  await new Promise((resolve, reject) => {
    let text = "";
    const failed = () => { cleanup(); reject(new Error("OWNED_SERVER_START_FAILED")); };
    const data = chunk => { text = (text + chunk.toString()).slice(-8192); if (/[✓✔] Ready in /.test(text)) { cleanup(); resolve(); } };
    const timer = setTimeout(failed, 20000);
    function cleanup() { clearTimeout(timer); child.stdout?.removeListener("data", data); child.removeListener("exit", failed); child.removeListener("error", failed); }
    child.stdout?.on("data", data); child.once("exit", failed); child.once("error", failed);
    if (!child.pid || child.exitCode !== null || child.signalCode !== null) failed();
  });
  if (child.exitCode !== null || child.signalCode !== null || !groupHasLiveMembers(child.pid)) throw new Error("OWNED_SERVER_START_FAILED");
  const result = await probe();
  if (child.exitCode !== null || child.signalCode !== null || !result) throw new Error("OWNED_SERVER_START_FAILED");
}
export async function runBrowserCheck() {
  const parent = assertBrowserScope(process.env);
  if (!existsSync(parent) || lstatSync(parent).isSymbolicLink() || realpathSync(parent) !== path.resolve(parent)) throw new Error("OWNED_ACCOUNTS_BROWSER_SCOPE_REQUIRED");
  if (!existsSync(chromium.executablePath())) throw new Error("CACHED_CHROMIUM_REQUIRED");
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const owned = mkdtempSync(path.join(parent, "accounts-browser-"));
  const app = path.join(owned, "app"); mkdirSync(app);
  let command; let server; let port; let interrupted = false;
  const interrupt = () => { interrupted = true; void stopOwnedGroup(command).catch(() => {}); void stopOwnedGroup(server).catch(() => {}); };
  process.on("SIGINT", interrupt); process.on("SIGTERM", interrupt);
  async function run(args, cwd, env, output = "ignore") {
    if (interrupted) throw new Error("ACCOUNTS_BROWSER_INTERRUPTED");
    command = spawn(process.execPath, args, { cwd, env, stdio: output, detached: true });
    const status = await new Promise(resolve => { command.once("error", () => resolve(1)); command.once("exit", code => resolve(code ?? 1)); });
    await stopOwnedGroup(command);
    if (status || interrupted) throw new Error("ACCOUNTS_BROWSER_COMMAND_FAILED");
  }
  try {
    for (const name of ["src", "public", "next.config.ts", "tsconfig.json", "package.json", "pnpm-lock.yaml"]) {
      if (name === "public" && !existsSync(path.join(root, name))) continue;
      cpSync(path.join(root, name), path.join(app, name), { recursive: true });
    }
    execFileSync("cp", ["-a", "--reflink=auto", path.join(root, "node_modules"), path.join(app, "node_modules")], { stdio: "ignore" });
    const env = Object.fromEntries(["PATH", "HOME", "PLAYWRIGHT_BROWSERS_PATH", "LD_LIBRARY_PATH", "FONTCONFIG_PATH"].filter(key => process.env[key]).map(key => [key, process.env[key]]));
    Object.assign(env, { NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", CI: "true", TMPDIR: parent, OWNPATH_ACCOUNTS_MODE: "disabled" });
    await run([path.join(app, "node_modules/next/dist/bin/next"), "build"], app, env);
    console.log("Accounts browser unchanged application build: PASS.");
    const probe = createServer();
    await new Promise((resolve, reject) => { probe.once("error", reject); probe.listen(0, "127.0.0.1", resolve); });
    port = probe.address().port; await new Promise(resolve => probe.close(resolve));
    const origin = `http://127.0.0.1:${port}`;
    Object.assign(env, { OWNPATH_ACCOUNTS_MODE: "emulator", OWNPATH_FIREBASE_PROJECT_ID: process.env.GCLOUD_PROJECT, GCLOUD_PROJECT: process.env.GCLOUD_PROJECT, OWNPATH_APP_ORIGIN: origin, OWNPATH_SAVED_SESSION_LIMIT: "2", FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST, FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST });
    server = spawn(process.execPath, [path.join(app, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: app, env, stdio: ["ignore", "pipe", "ignore"], detached: true });
    await waitForOwnedServer(server, async () => {
      const response = await fetch(`${origin}/experience-translator`, { redirect: "error", signal: AbortSignal.timeout(2000) });
      await response.body?.cancel(); return response.ok;
    });
    await run([path.join(root, "node_modules/@playwright/test/cli.js"), "test", "--config", "e2e/accounts-api.config.mts"], root, { ...env, NODE_ENV: "test", OWNPATH_TEST_URL: origin, OWNPATH_ACCOUNTS_BROWSER_TEMP: owned, OWNPATH_ACCOUNTS_BROWSER_ACCEPTANCE: "1" }, "inherit");
    console.log("Actual Firebase authenticated browser API transport: PASS. No UI or Stripe sandbox acceptance claimed.");
  } finally {
    const cleanup = await Promise.allSettled([stopOwnedGroup(command), stopOwnedGroup(server)]);
    process.removeListener("SIGINT", interrupt); process.removeListener("SIGTERM", interrupt);
    if (cleanup.some(result => result.status === "rejected")) throw new Error("OWNED_PROCESS_CLEANUP_FAILED");
    rmSync(owned, { recursive: true, force: true });
    if (port) {
      const probe = createServer();
      await new Promise((resolve, reject) => { probe.once("error", reject); probe.listen(port, "127.0.0.1", () => probe.close(resolve)); });
    }
    console.log("Owned accounts browser app/temp removed; compiled server port rebind PASS.");
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runBrowserCheck().catch(error => { console.error(error instanceof Error && /^[A-Z0-9_]+$/.test(error.message) ? error.message : "ACCOUNTS_BROWSER_FAILED"); process.exitCode = 1; });
}
