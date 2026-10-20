import { defineConfig } from "@playwright/test";
import path from "node:path";
import { tmpdir } from "node:os";

const baseURL = process.env.OWNPATH_TEST_URL ?? "http://127.0.0.1:3000";
const url = new URL(baseURL);
if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("Translator browser tests require an already running disposable loopback app.");
const temporary = process.env.OWNPATH_BROWSER_TEMP;
if (temporary && (path.dirname(temporary) !== tmpdir() || !/^ownpath-browser-ci-[A-Za-z0-9]+$/.test(path.basename(temporary)))) throw new Error("OWNED_TRANSLATOR_TEMP_REQUIRED");
export default defineConfig({
  testDir: ".", testMatch: "translator.spec.ts", workers: 1, retries: 0, timeout: 30000,
  preserveOutput: "never", reporter: [["./safe-reporter.ts"]],
  outputDir: temporary ? path.join(temporary, "results") : "test-results/ownpath",
  use: { baseURL, browserName: "chromium", headless: true, screenshot: "off", trace: "off", video: "off", serviceWorkers: "block", launchOptions: temporary ? { downloadsPath: path.join(temporary, "downloads") } : {} },
});
