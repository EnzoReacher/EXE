import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { parseEnv } from "./review-preflight.mjs";
import { publicLocalSettings } from "./e2e-local-support.mjs";

// This is exclusively for a disposable GitHub runner. Ordinary local commands
// never start, stop, reset, or configure the owner's Supabase stack.
if (process.env.GITHUB_ACTIONS !== "true" || process.env.CI !== "true") {
  console.error("Disposable GitHub runner required.");
  process.exit(1);
}
let created = false;
try {
  const status = parseEnv(execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30000 }));
  const settings = {
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY || status.ANON_KEY,
    NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
  };
  const { supabase, key } = publicLocalSettings(settings);
  writeFileSync(".env.local", Object.entries(settings).map(([name, value]) => `${name}=${value}\n`).join(""), { flag: "wx", mode: 0o600 });
  created = true;
  const commands = [
    ["review:verify"], ["test:supabase:local"], ["test:e2e:local"],
    ["test:proof-preview"], ["test:workspace-ui"], ["cp2:validate"],
  ];
  for (const args of commands) {
    console.log(`Disposable acceptance: ${args[0]} START.`);
    const result = spawnSync("pnpm", ["run", ...args], { stdio: "inherit", timeout: 600000,
      env: { ...process.env, SUPABASE_URL: supabase, SUPABASE_PUBLISHABLE_KEY: key, E2E_APP_URL: settings.NEXT_PUBLIC_SITE_URL } });
    if (result.error || result.status !== 0) throw new Error("ACCEPTANCE_CHECK_FAILED");
    console.log(`Disposable acceptance: ${args[0]} PASS.`);
  }
} catch {
  console.error("Disposable local acceptance failed; no configuration or private values were printed by the runner.");
  process.exitCode = 1;
} finally {
  if (created) unlinkSync(".env.local");
}
