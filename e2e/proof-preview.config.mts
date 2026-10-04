import { defineConfig } from "@playwright/test";
import path from "node:path";
import { tmpdir } from "node:os";

const temporary = process.env.PROOF_TEST_TEMP;
if (!temporary || path.dirname(temporary) !== tmpdir() || !/^exe-proof-render-[A-Za-z0-9]+$/.test(path.basename(temporary))) throw new Error("RUN_ONLY_THROUGH_PROOF_RENDER_HARNESS");
export default defineConfig({
  testDir: ".", testMatch: "proof-preview.spec.ts", workers: 1, retries: 0, timeout: 30000,
  outputDir: path.join(temporary, "results"), preserveOutput: "never", reporter: [["./safe-reporter.ts"]],
  use: { browserName: "chromium", headless: true, screenshot: "off", trace: "off", video: "off",
    // No page scripts can run. Playwright's serviceWorkers:block init script
    // itself reads navigator.serviceWorker and throws in an opaque sandbox.
    javaScriptEnabled: false, serviceWorkers: "allow", launchOptions: { executablePath: process.env.PROOF_BROWSER_EXECUTABLE } },
});
