import { defineConfig } from "@playwright/test";

const baseURL = process.env.OWNPATH_TEST_URL ?? "http://127.0.0.1:3000";
const url = new URL(baseURL);
if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("Translator browser tests require an already running disposable loopback app.");
export default defineConfig({
  testDir: ".", testMatch: "translator.spec.ts", workers: 1, retries: 0, timeout: 30000,
  preserveOutput: "never", reporter: [["./safe-reporter.ts"]],
  use: { baseURL, browserName: "chromium", headless: true, screenshot: "off", trace: "off", video: "off", serviceWorkers: "block" },
});
