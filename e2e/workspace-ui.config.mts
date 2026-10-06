import { defineConfig } from "@playwright/test";
import path from "node:path";
import { tmpdir } from "node:os";

const temporary = process.env.UI_TEST_TEMP;
const port = process.env.UI_TEST_PORT;
if (!temporary || path.dirname(temporary) !== tmpdir() || !/^exe-ui-render-[A-Za-z0-9]+$/.test(path.basename(temporary)) || !port || !/^\d{1,5}$/.test(port) || Number(port) < 1024 || Number(port) > 65535) throw new Error("RUN_ONLY_THROUGH_UI_RENDER_HARNESS");
const quote = (value: string) => "'" + value.replaceAll("'", "'\\''") + "'";
export default defineConfig({
  testDir: ".", testMatch: ["workspace-ui.spec.ts", "assessment-layout.spec.ts"], workers: 1, retries: 0, timeout: 30000,
  outputDir: path.join(temporary, "results"), preserveOutput: "never", reporter: [["./safe-reporter.ts"]],
  webServer: { command: quote(process.execPath) + " " + quote(path.join(temporary, "app/node_modules/next/dist/bin/next")) + " start --hostname 127.0.0.1 --port " + port, cwd: path.join(temporary, "app"), url: "http://127.0.0.1:" + port + "/credential-versions", reuseExistingServer: false, stdout: "ignore", stderr: "ignore", timeout: 30000, gracefulShutdown: { signal: "SIGTERM", timeout: 5000 } },
  use: { baseURL: "http://127.0.0.1:" + port, browserName: "chromium", headless: true, screenshot: "off", trace: "off", video: "off", serviceWorkers: "block", launchOptions: { executablePath: process.env.PROOF_BROWSER_EXECUTABLE } },
});
