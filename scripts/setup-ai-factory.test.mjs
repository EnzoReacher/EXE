import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("cross-project OpenCode AI Factory setup", () => {
  it("checks both profile formats and safe project-local installation", () => {
    const result = spawnSync(process.execPath, [path.join(root, "scripts/setup-ai-factory.check.mjs")], {
      cwd: root,
      encoding: "utf8",
      timeout: 10000,
    });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("AI Factory template checks: PASS");
  });
});
