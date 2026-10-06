import { defineConfig } from "@playwright/test";
import { loopbackOrigin } from "../scripts/e2e-local-support.mjs";
import { tmpdir } from "node:os";
import path from "node:path";

// The harness makes this directory the child process's TMPDIR as well. In that
// child os.tmpdir() is E2E_TEMP, not its parent.
if (!process.env.E2E_TEMP || process.env.E2E_TEMP !== tmpdir() || !/^exe-browser-[A-Za-z0-9]+$/.test(path.basename(process.env.E2E_TEMP)) || !process.env.E2E_FIXTURES) throw new Error("RUN_ONLY_THROUGH_LOCAL_HARNESS");
const baseURL = loopbackOrigin(process.env.E2E_APP_URL);
loopbackOrigin(process.env.E2E_SUPABASE_URL);
export default defineConfig({
  testDir: ".", testMatch: ["credential-flow.spec.ts", "auth-flow.spec.ts", "core-flow.spec.ts"], workers: 1, retries: 0, timeout: 180000,
  outputDir: `${process.env.E2E_TEMP}/results`, preserveOutput: "never",
  reporter: [["./safe-reporter.ts"]],
  use: { baseURL, browserName: "chromium", headless: true, screenshot: "off", trace: "off", video: "off",
    launchOptions: { downloadsPath: `${process.env.E2E_TEMP}/downloads` } },
});
