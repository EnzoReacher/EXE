import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { detectMajor, factoryFiles, installFactory } from "./setup-ownpath-factory.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fail = (code) => { throw new Error(code); };
export function expectedProfiles() {
  const agents = {}; const commands = {};
  for (const [filename, content] of factoryFiles(1)) {
    const name = path.basename(filename, ".md"); const sections = content.split("\n---\n");
    if (filename.includes("/agents/")) agents[name] = { ...JSON.parse(sections[0].slice(4)), prompt: sections[1].trim() };
    else commands[name] = { agent: "ownpath-lead", template: sections[1].trim() };
  }
  return { agents, commands };
}
export function verifyResolvedFactory(config, resolvedAgents) {
  const expected = expectedProfiles();
  const names = Object.keys(config?.agent ?? {}).filter((name) => name.startsWith("ownpath-"));
  if (!isDeepStrictEqual(names.sort(), Object.keys(expected.agents).sort())) fail("FACTORY_AGENT_SET_MISMATCH");
  const commands = Object.keys(config?.command ?? {}).filter((name) => name.startsWith("ownpath-"));
  if (!isDeepStrictEqual(commands.sort(), Object.keys(expected.commands).sort())) fail("FACTORY_COMMAND_SET_MISMATCH");
  for (const [name, profile] of Object.entries(expected.agents)) {
    const actual = config.agent[name];
    if (actual.mode !== profile.mode || actual.prompt?.trim() !== profile.prompt || !isDeepStrictEqual(actual.permission, profile.permission)) fail("FACTORY_PROFILE_MISMATCH");
    const runtime = resolvedAgents?.[name];
    if (runtime?.name !== name || runtime.mode !== profile.mode || !Array.isArray(runtime.permission)) fail("FACTORY_RUNTIME_MISMATCH");
    const expectedRules = Object.entries(profile.permission).flatMap(([permission, value]) => typeof value === "string"
      ? [{ permission, pattern: "*", action: value }]
      : Object.entries(value).map(([pattern, action]) => ({ permission, pattern, action })));
    // Verify the actual ordered policy block, not an invented glob evaluator.
    const starts = runtime.permission.flatMap((rule, index) => isDeepStrictEqual(rule, expectedRules[0]) ? [index] : []);
    const start = starts.findLast((index) => isDeepStrictEqual(runtime.permission.slice(index, index + expectedRules.length), expectedRules));
    if (start === undefined) fail("FACTORY_RULE_ORDER_MISMATCH");
    const trailing = runtime.permission.slice(start + expectedRules.length);
    if (trailing.some((rule) => rule.permission !== "external_directory" || rule.action !== "allow" || typeof rule.pattern !== "string" || !path.isAbsolute(rule.pattern) || !rule.pattern.endsWith("/opencode/tool-output/*") || path.normalize(rule.pattern) !== rule.pattern || /[\*?\[\]{}]/.test(rule.pattern.slice(0, -2)))) fail("FACTORY_TRAILING_OVERRIDE");
    const allowed = new Set(["read", "glob", "question"]);
    if (["ownpath-lead", "ownpath-engineer"].includes(name)) for (const tool of ["edit", "write", "bash"]) allowed.add(tool);
    if (name === "ownpath-lead") { allowed.add("task"); allowed.add("todowrite"); }
    if (!runtime.tools || Object.entries(runtime.tools).some(([tool, enabled]) => typeof enabled !== "boolean" || (enabled && !allowed.has(tool))) || [...allowed].some((tool) => runtime.tools[tool] !== true)) fail("FACTORY_TOOL_AVAILABILITY_MISMATCH");
  }
  for (const [name, command] of Object.entries(expected.commands)) {
    if (config.command[name].agent !== command.agent || config.command[name].template?.trim() !== command.template) fail("FACTORY_COMMAND_BINDING_MISMATCH");
  }
  return { agents: names.length, commands: commands.length };
}
export function checkFactory({ directory = root, isolated = false, executable = "opencode" } = {}) {
  let temporary;
  try {
    temporary = mkdtempSync(path.join(tmpdir(), "ownpath-factory-check-"));
    const env = isolated ? { PATH: process.env.PATH, LANG: "C.UTF-8" } : { ...process.env };
    env.OPENCODE_DISABLE_AUTOUPDATE = "true"; env.OPENCODE_DISABLE_MODELS_FETCH = "true";
    if (isolated) for (const [name, suffix] of [["XDG_CONFIG_HOME", "config"], ["XDG_DATA_HOME", "data"], ["XDG_CACHE_HOME", "cache"], ["XDG_STATE_HOME", "state"]]) {
      env[name] = path.join(temporary, suffix); mkdirSync(env[name]);
    }
    const cwd = isolated ? path.join(temporary, "project") : directory;
    if (isolated) mkdirSync(cwd);
    const call = (args) => {
      try { return execFileSync(executable, args, { cwd, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30000, maxBuffer: 4 * 1024 * 1024 }); }
      catch { fail("FACTORY_CLI_UNAVAILABLE_OR_FAILED"); }
    };
    const version = call(["--version"]).trim();
    if (detectMajor(version) !== 1) fail("FACTORY_V2_RUNTIME_NOT_VERIFIED");
    if (isolated) installFactory(cwd, version, true);
    const read = (args) => { const output = call(args); try { return JSON.parse(output); } catch { fail("FACTORY_DEBUG_OUTPUT_INVALID"); } };
    const config = read(["debug", "config", "--pure"]);
    const runtime = Object.fromEntries(Object.keys(expectedProfiles().agents).map((name) => [name, read(["debug", "agent", name, "--pure"])]));
    return { version, isolated, ...verifyResolvedFactory(config, runtime) };
  } finally { if (temporary) rmSync(temporary, { recursive: true, force: true }); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.slice(2).some((arg) => arg !== "--isolated")) fail("FACTORY_CHECK_USAGE_INVALID");
    const result = checkFactory({ isolated: process.argv.includes("--isolated") });
    console.log(`Factory config self-check: PASS (${result.agents} agents, ${result.commands} commands; OpenCode ${result.version}; ${result.isolated ? "isolated fixture" : "current project"}).`);
    console.log("Discovery, ordered policies and tool availability only. Resource matching, permission prompts, delegation, models and owner acceptance are not exercised. No config/debug values emitted.");
  } catch (error) {
    const code = error instanceof Error && /^FACTORY_[A-Z0-9_]+$/.test(error.message) ? error.message : "FACTORY_CHECK_FAILED";
    console.error(`Factory config self-check: ${code}. No private configuration or CLI error content emitted.`); process.exitCode = 1;
  }
}
