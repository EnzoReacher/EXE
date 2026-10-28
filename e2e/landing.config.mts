import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "landing.spec.ts",
  workers: 1,
  retries: 0,
  reporter: "list",
  outputDir: "/tmp/opencode/landing-results",
  use: { baseURL: "http://127.0.0.1:4396", browserName: "chromium", headless: true, serviceWorkers: "block" },
  webServer: [
    {
      command: `node --input-type=module -e 'import { startFixture } from "./e2e/ownpath-fixture.mjs"; startFixture({ port: 4397, origin: "http://127.0.0.1:4396" });'`,
      cwd: "..",
      url: "http://127.0.0.1:4397/__fixture/account",
    },
    {
      command: "pnpm exec next start --hostname 127.0.0.1 --port 4396",
      cwd: "..",
      url: "http://127.0.0.1:4396",
      env: { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:4397", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fictional-landing-key" },
    },
  ],
});
