import { defineConfig } from "@playwright/test";
const directory = process.env.OWNPATH_VISUAL_BUILD_DIR;
if (!directory) throw new Error("Use a credential-free isolated build directory.");
export default defineConfig({
  testDir: ".", testMatch: "auth-workspace.spec.ts", workers: 1, retries: 0, timeout: 45000,
  reporter: "list", outputDir: "/tmp/opencode/auth-workspace-browser-results",
  use: { baseURL: "http://127.0.0.1:4406", browserName: "chromium", headless: true, serviceWorkers: "block", contextOptions: { reducedMotion: "reduce" } },
  webServer: [
    { command: `node --input-type=module -e 'import { startFixture } from "./e2e/ownpath-fixture.mjs"; startFixture({ port: 4407, origin: "http://127.0.0.1:4406", billingSummary: true });'`, cwd: "..", url: "http://127.0.0.1:4407/__fixture/account" },
    { command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 4406", cwd: directory, url: "http://127.0.0.1:4406", env: { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:4407", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fictional-workspace-key", NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:4406", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", OWNPATH_OPENAI_LOCAL_ENABLED: "false", OWNPATH_CLAUDE_LOCAL_ENABLED: "false", OWNPATH_BILLING_MODE: "OFF", SUPABASE_SERVICE_ROLE_KEY: "" } },
  ],
});
