import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("compiled-browser CI execution boundary", () => {
  it.each([
    { GITHUB_ACTIONS: "false", CI: "true", SITES_MANAGED_LINUX_CONTAINER: "" },
    { GITHUB_ACTIONS: "true", CI: "true", SITES_MANAGED_LINUX_CONTAINER: "1" },
  ])("refuses owner/Work environments before browser or server startup", (scope) => {
    let code = 0; let stderr = "";
    try { execFileSync(process.execPath, ["scripts/ci-ownpath-browser.mjs"], { env: { PATH: process.env.PATH, ...scope }, stdio: ["ignore", "pipe", "pipe"] }); }
    catch (error) { code = error.status; stderr = error.stderr.toString(); }
    expect(code).toBe(1); expect(stderr).toContain("Disposable GitHub runner required");
    expect(stderr).not.toContain("CACHED_CHROMIUM_REQUIRED");
  });
});
