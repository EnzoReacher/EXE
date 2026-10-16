import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, existsSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { detectMajor, factoryFiles, installFactory } from "./setup-ownpath-factory.mjs";

describe("version-aware OwnPath Factory", () => {
  it("refuses unknown versions instead of guessing schema", () => {
    expect(detectMajor("1.4.2")).toBe(1); expect(detectMajor("opencode 2.1.0-beta.1")).toBe(2);
    for (const v of ["3.0.0", "unknown", "1", "2.0.0\nprivate configuration"]) expect(() => detectMajor(v)).toThrow();
  });
  it.each([1, 2])("keeps auditors read-only and avoids injected shell expansions on v%s", (major) => {
    const files = factoryFiles(major); expect(files.size).toBe(9);
    const auditor = files.get(".opencode/agents/ownpath-auditor.md");
    const front = JSON.parse(auditor.split("---\n")[1]);
    if (major === 1) { expect(front.permission.edit).toBe("deny"); expect(front.permission.bash).toBe("deny"); expect(front.permission.grep).toBe("deny"); }
    else { expect(front.permissions[0]).toEqual({ action: "*", resource: "*", effect: "deny" }); expect(front.permissions.some((p) => ["edit", "shell"].includes(p.action) && p.effect === "allow")).toBe(false); }
    for (const [name, body] of files) if (name.includes("commands/")) expect(body).not.toContain("!`");
    const writer = JSON.parse(files.get(".opencode/agents/ownpath-engineer.md").split("---\n")[1]);
    if (major === 1) { expect(writer.permission.bash["pnpm test"]).toBeUndefined(); expect(writer.permission.bash["*"]).toBe("ask"); }
    else expect(writer.permissions.some((p) => p.resource === "pnpm test" && p.effect === "allow")).toBe(false);
  });
  it("dry run preserves files; matching install is idempotent and never replaces AGENTS", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "ownpath-factory-"));
    try {
      writeFileSync(path.join(directory, "AGENTS.md"), "Existing instructions");
      expect(installFactory(directory, "2.1.0").written).toBe(false); expect(existsSync(path.join(directory, ".opencode"))).toBe(false);
      installFactory(directory, "2.1.0", true); installFactory(directory, "2.1.0", true);
      expect(readFileSync(path.join(directory, "AGENTS.md"), "utf8")).toBe("Existing instructions");
    } finally { rmSync(directory, { recursive: true }); }
  });
  it.each([1, 2])("limits integration writer to declared root tooling on v%s", (major) => {
    const writer = JSON.parse(factoryFiles(major).get(".opencode/agents/ownpath-integration.md").split("---\n")[1]);
    const grants = major === 1 ? Object.entries(writer.permission.edit).filter(([, effect]) => effect === "allow").map(([resource]) => resource) : writer.permissions.filter((p) => p.action === "edit" && p.effect === "allow").map((p) => p.resource);
    expect(grants).toContain("firebase.json"); expect(grants).toContain("package.json");
    expect(grants).toContain("scripts/verify-ownpath-factory.mjs"); expect(grants).toContain("scripts/verify-ownpath-factory.test.mjs");
    expect(grants.some((p) => p.startsWith("src/") || p.startsWith(".opencode/"))).toBe(false);
    if (major === 1) expect(writer.permission.bash["*"]).toBe("ask");
    else expect(writer.permissions).toContainEqual({ action: "shell", resource: "*", effect: "ask" });
  });
  it.each([1, 2])("keeps the backend writer out of both frontend owners' files on v%s", (major) => {
    const writer = JSON.parse(factoryFiles(major).get(".opencode/agents/ownpath-engineer.md").split("---\n")[1]);
    const grants = major === 1 ? Object.entries(writer.permission.edit).filter(([, effect]) => effect === "allow").map(([resource]) => resource) : writer.permissions.filter((p) => p.action === "edit" && p.effect === "allow").map((p) => p.resource);
    expect(grants).toContain("src/app/api/auth/session/*"); expect(grants).toContain("src/lib/accounts-billing/*");
    expect(grants.filter((p) => p.startsWith("src/app/") && !p.startsWith("src/app/api/"))).toEqual([]);
    expect(grants.some((p) => p.startsWith("src/components/"))).toBe(false);
    if (major === 1) expect(writer.permission.edit["src/lib/experience-translator/types.ts"]).toBe("deny");
    else expect(writer.permissions.filter((p) => p.action === "edit").at(-1)).toEqual({ action: "edit", resource: "src/lib/experience-translator/types.ts", effect: "deny" });
  });
  it("preflights all names before writes and refuses differing config or symlinks", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "ownpath-factory-")); const outside = mkdtempSync(path.join(tmpdir(), "ownpath-outside-"));
    try {
      mkdirSync(path.join(directory, ".opencode", "commands"), { recursive: true });
      writeFileSync(path.join(directory, ".opencode", "commands", "ownpath-verify.md"), "Owner custom configuration");
      expect(() => installFactory(directory, "1.1.0", true)).toThrow(/differs/); expect(existsSync(path.join(directory, ".opencode", "agents"))).toBe(false);
      rmSync(path.join(directory, ".opencode"), { recursive: true }); symlinkSync(outside, path.join(directory, ".opencode"));
      expect(() => installFactory(directory, "2.1.0", true)).toThrow(/escapes/); expect(existsSync(path.join(outside, "agents"))).toBe(false);
    } finally { rmSync(directory, { recursive: true }); rmSync(outside, { recursive: true }); }
  });
});
