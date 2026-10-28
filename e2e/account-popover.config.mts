import { defineConfig } from "@playwright/test";
import navigation from "./workspace-navigation.config.mjs";
export default defineConfig({ ...navigation, testMatch: "account-popover.spec.ts", outputDir: "/tmp/opencode/account-popover-results" });
