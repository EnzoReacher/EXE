import { defineConfig } from "@playwright/test";
import navigation from "./workspace-navigation.config.mjs";
export default defineConfig({ ...navigation, testMatch: "claude-scan-repair.spec.ts", outputDir: "/tmp/opencode/claude-scan-browser-results" });
