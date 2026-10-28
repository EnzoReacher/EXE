import { defineConfig } from "@playwright/test";
const directory = process.env.OWNPATH_VISUAL_BUILD_DIR;
if (!directory) throw new Error("Use an isolated build, never the owner's server.");
export default defineConfig({
  testDir: ".", testMatch: "workspace-navigation.spec.ts", workers: 1, retries: 0, reporter: "list", outputDir: "/tmp/opencode/navigation-browser-results",
  use: { baseURL: "http://127.0.0.1:4398", browserName: "chromium", headless: true, serviceWorkers: "block", contextOptions: { reducedMotion: "reduce" } },
  webServer: [
    { command: `node --input-type=module -e 'import { startFixture } from "./e2e/ownpath-fixture.mjs"; startFixture({ port: 4399, origin: "http://127.0.0.1:4398" });'`, cwd: "..", url: "http://127.0.0.1:4399/__fixture/account" },
    { command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 4398", cwd: directory, url: "http://127.0.0.1:4398", env: { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:4399", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fictional-visual-key", NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:4398", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", OWNPATH_CLAUDE_LOCAL_ENABLED: "false", OWNPATH_BILLING_MODE: "OFF", SUPABASE_SERVICE_ROLE_KEY: "" } },
  ],
});
