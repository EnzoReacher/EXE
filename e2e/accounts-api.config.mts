import { defineConfig } from "@playwright/test";
import path from "node:path";
import { tmpdir } from "node:os";

const baseURL = process.env.OWNPATH_TEST_URL;
const temporary = process.env.OWNPATH_ACCOUNTS_BROWSER_TEMP;
if (!baseURL || !temporary || process.env.OWNPATH_ACCOUNTS_BROWSER_ACCEPTANCE !== "1") throw new Error("OWNED_ACCOUNTS_BROWSER_SCOPE_REQUIRED");
const url = new URL(baseURL);
if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || !url.port || url.username || url.password || url.pathname !== "/" || url.search || url.hash || path.dirname(temporary) !== tmpdir() || !/^accounts-browser-[A-Za-z0-9]+$/.test(path.basename(temporary))) throw new Error("OWNED_ACCOUNTS_BROWSER_SCOPE_REQUIRED");
export default defineConfig({
  testDir: ".", testMatch: "accounts-api.spec.ts", workers: 1, retries: 0, timeout: 30000,
  preserveOutput: "never", reporter: [["./safe-reporter.ts"]], outputDir: path.join(temporary, "results"),
  use: { baseURL, browserName: "chromium", headless: true, screenshot: "off", trace: "off", video: "off", serviceWorkers: "block", launchOptions: { downloadsPath: path.join(temporary, "downloads") } },
});
