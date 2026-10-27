import { defineConfig } from "@playwright/test";
import navigation from "./workspace-navigation.config.mjs";
export default defineConfig({ ...navigation, testMatch: ["reduced-navigation.spec.ts", "workspace-navigation.spec.ts", "claude-scan-repair.spec.ts"], timeout: 45000, outputDir: "/tmp/opencode/ownpath-nav-recovery-browser-results" });
