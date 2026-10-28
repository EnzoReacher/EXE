import { defineConfig } from "@playwright/test";
import navigation from "./workspace-navigation.config.mjs";
export default defineConfig({ ...navigation, testMatch: "rewrite-compatibility.spec.ts", outputDir: "/tmp/opencode/rewrite-compat-result-browser" });
