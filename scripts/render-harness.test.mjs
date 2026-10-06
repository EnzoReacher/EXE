import { EventEmitter } from "node:events";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const { spawn } = vi.hoisted(() => ({ spawn: vi.fn() }));
vi.mock("node:child_process", () => ({ spawn, execFileSync: vi.fn() }));
vi.mock("node:fs", async (importOriginal) => ({ ...await importOriginal(), cpSync: vi.fn() }));
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); spawn.mockReset(); process.exitCode = undefined; });

describe("render harness temporary-directory handoff", () => {
  it.each([
    ["proof-preview-browser.mjs", "PROOF_TEST_TEMP"],
    ["workspace-ui-browser.mjs", "UI_TEST_TEMP"],
  ])("keeps %s child scope valid with a custom temporary root", async (script, variable) => {
    // Use an existing directory without touching application or account data.
    vi.stubEnv("TMPDIR", path.resolve("node_modules"));
    vi.stubEnv("PROOF_BROWSER_EXECUTABLE", "");
    spawn.mockImplementation(() => {
      const child = new EventEmitter();
      child.kill = vi.fn();
      queueMicrotask(() => child.emit("exit", 0));
      return child;
    });
    const signals = ["SIGINT", "SIGTERM"];
    const before = signals.map((signal) => process.listeners(signal));
    try {
      if (script === "proof-preview-browser.mjs") await import("./proof-preview-browser.mjs");
      else await import("./workspace-ui-browser.mjs");
      const env = spawn.mock.calls.at(-1)[2].env;
      const childRoot = env.TMPDIR || "/tmp";
      expect(path.dirname(env[variable])).toBe(tmpdir());
      expect(childRoot).toBe(tmpdir());
    } finally {
      signals.forEach((signal, index) => {
        for (const listener of process.listeners(signal)) {
          if (!before[index].includes(listener)) process.removeListener(signal, listener);
        }
      });
    }
  });
});
