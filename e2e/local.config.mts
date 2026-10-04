import { defineConfig } from "@playwright/test";
import { loopbackOrigin } from "../scripts/e2e-local-support.mjs";

if (!process.env.E2E_TEMP || !/^\/tmp\/opencode\/exe-browser-[A-Za-z0-9]+$/.test(process.env.E2E_TEMP) || !process.env.E2E_FIXTURES) throw new Error("RUN_ONLY_THROUGH_LOCAL_HARNESS");
const baseURL = loopbackOrigin(process.env.E2E_APP_URL);
loopbackOrigin(process.env.E2E_SUPABASE_URL);
export default defineConfig({
  testDir: ".", testMatch: "credential-flow.spec.ts", workers: 1, retries: 0, timeout: 180000,
  outputDir: `${process.env.E2E_TEMP}/results`, preserveOutput: "never",
  reporter: [["./safe-reporter.ts"]],
  use: { baseURL, browserName: "chromium", headless: true, screenshot: "off", trace: "off", video: "off",
    launchOptions: { downloadsPath: `${process.env.E2E_TEMP}/downloads` } },
});
