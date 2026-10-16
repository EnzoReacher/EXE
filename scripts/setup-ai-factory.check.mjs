import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { detectMajor, factoryFiles, installFactory } from "./setup-ai-factory.mjs";

function frontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, "expected OpenCode Markdown frontmatter");
  return JSON.parse(match[1]);
}

assert.equal(detectMajor("opencode v2.0.7"), 2);
assert.equal(detectMajor("1.18.35"), 1);
assert.throws(() => detectMajor("opencode nightly"), /Unsupported or unknown/);

for (const major of [1, 2]) {
  const files = factoryFiles(major);
  assert.equal(files.size, 18);
  const agentFiles = [...files].filter(([name]) => name.startsWith(".opencode/agents/"));
  const commandFiles = [...files].filter(([name]) => name.startsWith(".opencode/commands/"));
  assert.equal(agentFiles.length, 7);
  assert.equal(commandFiles.length, 6);

  const agents = Object.fromEntries(agentFiles.map(([name, body]) => [path.basename(name, ".md"), { profile: frontmatter(body), body }]));
  const lead = agents["factory-lead"].profile;
  const builder = agents["factory-builder"].profile;
  const qa = agents["factory-qa"].profile;
  const researcher = agents["factory-researcher"].profile;
  assert.equal(lead.mode, "primary");
  assert.equal(agents["factory-auditor"].profile.mode, "subagent");

  if (major === 1) {
    assert.equal(lead.permission.task["*"], "deny");
    assert.deepEqual(Object.keys(lead.permission.task).slice(1).sort(), Object.keys(agents).filter((name) => name !== "factory-lead").sort());
    assert.equal(lead.permission.edit[".factory/**"], "ask");
    assert.equal(builder.permission.edit["*"], "ask");
    assert.equal(builder.permission.bash["*"], "ask");
    assert.equal(qa.permission.edit, "deny");
    assert.equal(qa.permission.bash["*"], "ask");
    assert.equal(agents["factory-auditor"].profile.permission.bash, "deny");
    assert.equal(researcher.permission.websearch, "ask");
    assert.equal(lead.permission.read["**/.env.*"], "deny");
    assert.equal(lead.permission.read["**/.env.example"], "allow");
  } else {
    const grants = (profile, action) => profile.permissions.filter((rule) => rule.action === action);
    assert.deepEqual(grants(lead, "subagent").filter((rule) => rule.effect === "allow").map((rule) => rule.resource).sort(), Object.keys(agents).filter((name) => name !== "factory-lead").sort());
    assert.equal(grants(lead, "subagent")[0].effect, "deny");
    assert.equal(grants(lead, "edit")[0].resource, ".factory/**");
    assert.equal(grants(lead, "edit")[0].effect, "ask");
    assert.equal(grants(builder, "edit")[0].effect, "ask");
    assert.equal(grants(qa, "edit").length, 0);
    assert.equal(grants(qa, "shell")[0].effect, "ask");
    assert.equal(grants(agents["factory-auditor"].profile, "shell").length, 0);
    assert.equal(grants(researcher, "websearch")[0].effect, "ask");
    assert.equal(grants(lead, "read").findLast((rule) => rule.resource === "**/.env.*").effect, "deny");
    assert.equal(grants(lead, "read").findLast((rule) => rule.resource === "**/.env.example").effect, "allow");
  }

  for (const [name, body] of commandFiles) {
    assert.match(body, /\nagent: factory-lead\n/);
    assert.match(body, /\$ARGUMENTS/);
    assert.doesNotMatch(body, /!`/);
  }
}

const root = mkdtempSync(path.join(os.tmpdir(), "ai-factory-install-"));
try {
  writeFileSync(path.join(root, "AGENTS.md"), "owner instructions\n");
  assert.equal(installFactory(root, "opencode v2.0.7").written, false);
  assert.deepEqual(readdirSync(root), ["AGENTS.md"]);
  const installed = installFactory(root, "opencode v2.0.7", true);
  assert.equal(installed.count, 18);
  assert.equal(readFileSync(path.join(root, "AGENTS.md"), "utf8"), "owner instructions\n");
  assert.equal(installFactory(root, "opencode v2.0.7", true).written, true);
  assert.equal(readFileSync(path.join(root, ".factory/templates/PROJECT_PROFILE.md"), "utf8").includes("unknown values"), true);
} finally {
  rmSync(root, { recursive: true, force: true });
}

const conflict = mkdtempSync(path.join(os.tmpdir(), "ai-factory-conflict-"));
try {
  mkdirSync(path.join(conflict, ".factory/templates"), { recursive: true });
  writeFileSync(path.join(conflict, ".factory/templates/PROJECT_PROFILE.md"), "owner version\n");
  assert.throws(() => installFactory(conflict, "2.0.7", true), /Existing configuration differs/);
  assert.deepEqual(readdirSync(path.join(conflict, ".factory/templates")), ["PROJECT_PROFILE.md"]);
} finally {
  rmSync(conflict, { recursive: true, force: true });
}

const outside = mkdtempSync(path.join(os.tmpdir(), "ai-factory-symlink-target-"));
const parent = mkdtempSync(path.join(os.tmpdir(), "ai-factory-symlink-parent-"));
try {
  symlinkSync(outside, path.join(parent, ".opencode"));
  assert.throws(() => installFactory(parent, "2.0.7", true), /symbolic link|escapes/);
  assert.deepEqual(readdirSync(outside), []);
} finally {
  rmSync(parent, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
}

console.log("AI Factory template checks: PASS (OpenCode v1/v2 generation, role boundaries, command safety, idempotence, conflict preflight and symlink containment).");
