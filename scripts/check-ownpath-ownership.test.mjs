import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkOwnership, ownsPath } from "./check-ownpath-ownership.mjs";

describe("three-person OwnPath ownership", () => {
  it("DBG-03 grants only explicit root page/layout colocated tests to shell", () => {
    for (const filename of ["src/app/page.test.tsx", "src/app/layout.test.tsx"]) {
      expect(ownsPath("shell", filename)).toBe(true);
      expect(ownsPath("backend", filename)).toBe(false);
      expect(ownsPath("translator", filename)).toBe(false);
    }
  });
  it("DBG-03 preserves role, traversal, config and local-profile denials", () => {
    for (const filename of ["src/app/experience-translator/translator.test.tsx", "src/app/api/example/route.ts", "src/lib/experience-translator/types.ts", "src/app/unassigned.test.tsx", "src/app/page.spec.tsx", "src/app/page.test.ts", "src/app/page.test.tsx/child", "src/app/../app/page.test.tsx", "src/app/./page.test.tsx", "/src/app/page.test.tsx", "src\\app\\page.test.tsx", "src/app//page.test.tsx", "next.config.ts", "package.json", ".github/workflows/quality.yml", ".opencode/agents/ownpath-engineer.md"]) expect(ownsPath("shell", filename)).toBe(false);
    for (const role of ["backend", "shell", "translator"]) expect(ownsPath(role, ".opencode/agents/ownpath-engineer.md")).toBe(false);
  });
  it("separates backend, shell and Translator files; shared contracts/tooling are frozen", () => {
    for (const name of ["src/app/api/intake/cv/route.ts", "src/lib/experience-translator/engine.ts", "docs/ownpath/TEAM_WORKFLOW.md"]) expect(ownsPath("backend", name)).toBe(true);
    for (const name of ["src/app/page.tsx", "src/components/header.tsx", "src/app/assessment/page.tsx"]) {
      expect(ownsPath("shell", name)).toBe(true); expect(ownsPath("backend", name)).toBe(false); expect(ownsPath("translator", name)).toBe(false);
    }
    expect(ownsPath("translator", "src/app/experience-translator/translator.css")).toBe(true);
    expect(ownsPath("shell", "src/app/experience-translator/translator.css")).toBe(false);
    for (const name of ["scripts/setup-ai-factory.mjs", "scripts/setup-ai-factory.test.mjs", "scripts/setup-ai-factory.check.mjs"]) {
      expect(ownsPath("backend", name)).toBe(true);
      expect(ownsPath("shell", name)).toBe(false);
      expect(ownsPath("translator", name)).toBe(false);
    }
    for (const role of ["backend", "shell", "translator"]) for (const name of ["package.json", "next.config.ts", "src/proxy.ts", "src/lib/experience-translator/types.ts", ".github/workflows/quality.yml", "src/lib/../app/page.tsx"]) expect(ownsPath(role, name)).toBe(false);
  });
  it("detects committed, staged, unstaged, untracked and renamed protected paths", () => {
    const root = mkdtempSync(path.join(tmpdir(), "ownpath-ownership-"));
    const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    const put = (name, content) => { mkdirSync(path.dirname(path.join(root, name)), { recursive: true }); writeFileSync(path.join(root, name), content); };
    try {
      git("init"); git("config", "user.name", "Ownership fixture"); git("config", "user.email", "fixture@example.test");
      put("src/app/page.tsx", "landing"); put("src/app/layout.tsx", "layout"); put("src/components/header.tsx", "header");
      git("add", "."); git("commit", "-m", "baseline"); const base = git("rev-parse", "HEAD");
      expect(checkOwnership(root, "backend", base).violations).toEqual([]);
      put("src/app/page.tsx", "committed change"); git("add", "."); git("commit", "-m", "frontend change");
      put("src/app/layout.tsx", "staged change"); git("add", ".");
      put("src/components/header.tsx", "unstaged change"); put("src/app/experience-translator/new.tsx", "untracked");
      mkdirSync(path.join(root, "src/lib"), { recursive: true }); renameSync(path.join(root, "src/app/page.tsx"), path.join(root, "src/lib/moved.tsx"));
      expect(checkOwnership(root, "backend", base).violations).toEqual(["src/app/experience-translator/new.tsx", "src/app/layout.tsx", "src/app/page.tsx", "src/components/header.tsx"]);
      expect(() => checkOwnership(root, "backend", "HEAD")).toThrow(/full baseline/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
