import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { expectedProfiles, verifyResolvedFactory } from "./verify-ownpath-factory.mjs";
function fixture() {
  const { agents, commands } = expectedProfiles();
  const runtime = Object.fromEntries(Object.entries(agents).map(([name, profile]) => [name, {
    name, mode: profile.mode,
    permission: [{ permission: "*", pattern: "*", action: "allow" }, ...Object.entries(profile.permission).flatMap(([permission, value]) => typeof value === "string" ? [{ permission, pattern: "*", action: value }] : Object.entries(value).map(([pattern, action]) => ({ permission, pattern, action }))), { permission: "external_directory", pattern: "/fixture/data/opencode/tool-output/*", action: "allow" }],
    tools: { read: true, glob: true, question: true, bash: ["ownpath-lead", "ownpath-engineer", "ownpath-integration"].includes(name), edit: ["ownpath-lead", "ownpath-engineer", "ownpath-integration"].includes(name), write: ["ownpath-lead", "ownpath-engineer", "ownpath-integration"].includes(name), task: name === "ownpath-lead", todowrite: name === "ownpath-lead" },
  }]));
  return { config: { agent: agents, command: commands }, runtime };
}
describe("Factory loaded-policy acceptance", () => {
  it("accepts role policies with the runtime managed-output exception", () => { const f = fixture(); expect(verifyResolvedFactory(f.config, f.runtime)).toEqual({ agents: 5, commands: 4 }); });
  it("accepts stricter global defaults before the complete custom policy", () => { const f=fixture(); for (const runtime of Object.values(f.runtime)) runtime.permission.unshift({permission:"*",pattern:"*",action:"deny"}, {permission:"read",pattern:"*",action:"ask"}); expect(verifyResolvedFactory(f.config,f.runtime)).toEqual({agents:5,commands:4}); });
  it("rejects injected broad writer or private-file permissions without printing values", () => {
    for (const mutate of [(f) => { f.config.agent['ownpath-engineer'].permission.edit['*'] = 'allow'; }, (f) => { f.config.agent['ownpath-auditor'].permission.read['.env*'] = 'allow'; }]) {
      const f = fixture(); mutate(f); expect(() => verifyResolvedFactory(f.config, f.runtime)).toThrow(/^FACTORY_PROFILE_MISMATCH$/);
    }
  });
  it("rejects disabled orchestration or writer capabilities", () => { for (const [role, tool] of [["ownpath-lead", "task"], ["ownpath-engineer", "edit"]]) { const f=fixture(); f.runtime[role].tools[tool]=false; expect(() => verifyResolvedFactory(f.config,f.runtime)).toThrow("FACTORY_TOOL_AVAILABILITY_MISMATCH"); } });
  it("rejects shell/write availability in a read-only reviewer", () => { const f = fixture(); f.runtime['ownpath-qa'].tools.bash = true; expect(() => verifyResolvedFactory(f.config, f.runtime)).toThrow('FACTORY_TOOL_AVAILABILITY_MISMATCH'); });
  it("rejects an allow override after the expected deny policy", () => { const f = fixture(); f.runtime['ownpath-auditor'].permission.push({ permission: 'read', pattern: '*', action: 'allow' }); expect(() => verifyResolvedFactory(f.config, f.runtime)).toThrow('FACTORY_TRAILING_OVERRIDE'); });
  it("rejects reordered rules that would alter precedence", () => { const f = fixture(); const p = f.runtime['ownpath-lead'].permission; [p[1],p[2]] = [p[2],p[1]]; expect(() => verifyResolvedFactory(f.config, f.runtime)).toThrow('FACTORY_RULE_ORDER_MISMATCH'); });
  it("rejects unexpected tools and misleading managed-output paths", () => {
    const f=fixture(); f.runtime['ownpath-qa'].tools.mcp_external = true; expect(() => verifyResolvedFactory(f.config, f.runtime)).toThrow('FACTORY_TOOL_AVAILABILITY_MISMATCH');
    for (const pattern of ["/private/*", "/fixture/*/opencode/tool-output/*", "/fixture/../private/opencode/tool-output/*"]) { const g=fixture(); g.runtime["ownpath-qa"].permission.at(-1).pattern=pattern; expect(() => verifyResolvedFactory(g.config,g.runtime)).toThrow("FACTORY_TRAILING_OVERRIDE"); }
  });
  it("contains private CLI failures and removes its owned fixture", () => {
    const directory=mkdtempSync(path.join(tmpdir(),"ownpath-cli-fixture-"));
    try {
      writeFileSync(path.join(directory,"opencode"), `#!${process.execPath}\nif (process.argv.includes("--version")) console.log("1.18.35"); else { console.error("PRIVATE_SYNTHETIC_DEBUG_SENTINEL"); process.exit(1); }\n`, { mode: 0o700 });
      const result=spawnSync(process.execPath,[path.resolve("scripts/verify-ownpath-factory.mjs"),"--isolated"],{encoding:"utf8",env:{PATH:directory,TMPDIR:directory},timeout:5000});
      expect(result.status).toBe(1); expect(result.stderr).toContain("FACTORY_CLI_UNAVAILABLE_OR_FAILED"); expect(result.stdout+result.stderr).not.toContain("PRIVATE_SYNTHETIC_DEBUG_SENTINEL"); expect(readdirSync(directory)).toEqual(["opencode"]);
    } finally { rmSync(directory,{recursive:true,force:true}); }
  });
  it("rejects a command diverted to a writer or an unknown OwnPath agent", () => {
    const f=fixture(); f.config.command['ownpath-audit'].agent='ownpath-engineer'; expect(() => verifyResolvedFactory(f.config,f.runtime)).toThrow('FACTORY_COMMAND_BINDING_MISMATCH');
    const g=fixture(); g.config.agent['ownpath-extra']={mode:'primary'}; expect(() => verifyResolvedFactory(g.config,g.runtime)).toThrow('FACTORY_AGENT_SET_MISMATCH');
  });
  it("reports the explicit V2 verification limit without treating it as an unknown failure", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "ownpath-cli-v2-"));
    try {
      writeFileSync(path.join(directory, "opencode"), `#!${process.execPath}\nconsole.log("opencode v2.0.7");\n`, { mode: 0o700 });
      const result = spawnSync(process.execPath, [path.resolve("scripts/verify-ownpath-factory.mjs"), "--isolated"], { encoding: "utf8", env: { PATH: directory, TMPDIR: directory }, timeout: 5000 });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("FACTORY_V2_RUNTIME_NOT_VERIFIED");
      expect(result.stdout).not.toContain("PASS");
      expect(readdirSync(directory)).toEqual(["opencode"]);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
