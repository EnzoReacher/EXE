import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "auth-password.spec.ts",
  workers: 1,
  retries: 0,
  reporter: "list",
  outputDir: "/tmp/opencode/ownpath-auth-password-results",
  use: {
    baseURL: process.env.OWNPATH_TEST_URL || "http://127.0.0.1:4317",
    browserName: "chromium",
    headless: true,
    trace: "off",
    video: "off",
    screenshot: "off",
    serviceWorkers: "block",
    permissions: ["clipboard-read", "clipboard-write"],
  },
});
