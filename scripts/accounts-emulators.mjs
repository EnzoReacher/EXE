import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, lstatSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function assertDemoEnvironment(env) {
  if (!/^demo-ownpath-[a-z0-9-]+$/.test(env.GCLOUD_PROJECT || "")) throw new Error("DEMO_PROJECT_REQUIRED");
  for (const name of ["FIREBASE_AUTH_EMULATOR_HOST", "FIRESTORE_EMULATOR_HOST"]) {
    if (!/^127\.0\.0\.1:\d{2,5}$/.test(env[name] || "")) throw new Error("LOOPBACK_EMULATORS_REQUIRED");
  }
  if (env.GOOGLE_APPLICATION_CREDENTIALS || env.STRIPE_SECRET_KEY) throw new Error("CLOUD_CREDENTIALS_FORBIDDEN");
  if (env.FIREBASE_CONFIG) {
    let config;
    try { config = JSON.parse(env.FIREBASE_CONFIG); } catch { throw new Error("CLOUD_CONFIG_FORBIDDEN"); }
    if (config.projectId !== env.GCLOUD_PROJECT || Object.keys(config).some((key) => !["projectId", "storageBucket", "databaseURL"].includes(key)) || (config.storageBucket && config.storageBucket !== `${env.GCLOUD_PROJECT}.appspot.com`) || (config.databaseURL && config.databaseURL !== `https://${env.GCLOUD_PROJECT}.firebaseio.com`)) throw new Error("CLOUD_CONFIG_FORBIDDEN");
  }
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

export function createOwnedDirectory(parent = "/tmp/opencode") {
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  if (!lstatSync(parent).isDirectory() || lstatSync(parent).isSymbolicLink()) throw new Error("OWNED_TEMP_PARENT_REQUIRED");
  return mkdtempSync(path.join(parent, "ownpathaccounts-"));
}

export async function runEmulators({ browser = false } = {}) {
  // Never inherit credentials, owner emulator hosts or a cloud project.
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const java = spawnSync("java", ["-version"], { stdio: "ignore" });
  if (java.status !== 0) throw new Error("BLOCKED_JAVA_REQUIRED: Firestore emulator needs Java 21+");
  const owned = createOwnedDirectory();
  const ports = [];
  try {
    while (ports.length < 5) { const port = await freePort(); if (!ports.includes(port)) ports.push(port); }
    // Unique project also isolates Firebase CLI's hub discovery metadata.
    const projectId = `demo-ownpath-accounts-${path.basename(owned).slice(-6).toLowerCase()}`;
    const env = Object.fromEntries(["PATH", "HOME", "JAVA_HOME", "SYSTEMROOT"].filter((key) => process.env[key]).map((key) => [key, process.env[key]]));
    // Configstore/ADC discovery must not see the owner's Firebase/Google login.
    const emulatorCache = process.env.HOME ? path.join(process.env.HOME, ".cache", "firebase", "emulators") : path.join(owned, "emulator-cache");
    Object.assign(env, { HOME: path.join(owned, "home"), XDG_CONFIG_HOME: path.join(owned, "config"), TMPDIR: path.join(owned, "tmp"), FIREBASE_EMULATORS_PATH: emulatorCache });
    mkdirSync(env.HOME, { recursive: true, mode: 0o700 });
    mkdirSync(env.TMPDIR, { recursive: true, mode: 0o700 });
    if (browser) Object.assign(env, { OWNPATH_ACCOUNTS_BROWSER_ACCEPTANCE: "1", PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? path.join(process.env.HOME || owned, ".cache", "ms-playwright") });
    Object.assign(env, { GCLOUD_PROJECT: projectId, OWNPATH_FIREBASE_PROJECT_ID: projectId, OWNPATH_ACCOUNTS_MODE: "emulator", OWNPATH_APP_ORIGIN: "http://127.0.0.1:3000", FIREBASE_AUTH_EMULATOR_HOST: `127.0.0.1:${ports[0]}`, FIRESTORE_EMULATOR_HOST: `127.0.0.1:${ports[1]}`, FIREBASE_CLI_DISABLE_MOTD: "1", CI: "true" });
    assertDemoEnvironment(env);
    const config = JSON.parse(readFileSync(path.join(root, "firebase.json"), "utf8"));
    for (const [index, name] of ["auth", "firestore", "hub", "logging"].entries()) Object.assign(config.emulators[name], { host: "127.0.0.1", port: ports[index] });
    config.emulators.firestore.websocketPort = ports[4];
    config.firestore.rules = path.join(root, "firestore.rules");
    config.firestore.indexes = path.join(root, "firestore.indexes.json");
    const filename = path.join(owned, "firebase.json");
    writeFileSync(filename, JSON.stringify(config));
    const code = await new Promise((resolve, reject) => {
      const child = spawn(path.join(root, "node_modules/.bin/firebase"), ["emulators:exec", "--project", env.GCLOUD_PROJECT, "--config", filename, "--only", "auth,firestore", `node ${path.join(root, "scripts/accounts-emulator-check.mjs")}`], { cwd: owned, env, stdio: "inherit" });
      const stop = () => child.kill("SIGTERM");
      process.once("SIGINT", stop); process.once("SIGTERM", stop);
      child.once("error", reject);
      child.once("exit", (status) => { process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop); resolve(status ?? 1); });
    });
    if (code !== 0) throw new Error("EMULATOR_ACCEPTANCE_FAILED");
  } finally {
    rmSync(owned, { recursive: true, force: true });
    // A leaked owned service is a failure, never reset/reuse another service.
    for (const port of ports) {
      const probe = createServer();
      await new Promise((resolve, reject) => { probe.once("error", reject); probe.listen(port, "127.0.0.1", () => probe.close(resolve)); });
    }
    console.log(`Owned emulator cleanup: data directory removed; all ${ports.length} ports rebound successfully.`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some(arg => arg !== "--browser")) { console.error("Usage: accounts-emulators.mjs [--browser]"); process.exitCode = 1; }
  else runEmulators({ browser: args.includes("--browser") }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
