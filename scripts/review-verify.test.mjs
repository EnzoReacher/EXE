import { describe, expect, it, vi } from "vitest";
import { fileURLToPath } from "node:url";
import { runReviewVerify } from "./review-verify.mjs";

function verify(run) {
  const messages = [];
  let time = 0;
  const code = runReviewVerify({ run, log: (message) => messages.push(message), now: () => (time += 1250) });
  return { code, messages };
}

describe("local review verification", () => {
  it("runs only the five local checks in order with inherited output and a truthful final summary", () => {
    const run = vi.fn(() => ({ status: 0 }));
    const { code, messages } = verify(run);
    expect(code).toBe(0);
    expect(run.mock.calls.map(([command, args]) => [command, ...args])).toEqual([
      ["pnpm", "review:preflight"], ["pnpm", "lint"], ["pnpm", "typecheck"], ["pnpm", "test"], ["pnpm", "build"],
    ]);
    for (const [, , options] of run.mock.calls) {
      expect(options).toMatchObject({ stdio: "inherit", shell: false, env: { NEXT_TELEMETRY_DISABLED: "1" } });
      expect(options.cwd).toBe(fileURLToPath(new URL("..", import.meta.url)).replace(/[/\\]$/, ""));
    }
    expect(messages.slice(0, 2)).toEqual([
      "[review:verify 1/5] pnpm review:preflight START",
      "[review:verify 1/5] pnpm review:preflight PASS (1.25s)",
    ]);
    expect(messages.filter((message) => message.includes(" PASS "))).toHaveLength(5);
    expect(messages.at(-1)).toBe("Local engineering verification passed: all 5 checks. Owner browser/accessibility review and CP2 remain pending; M11 remains blocked. No merge or deployment approval.");
  });

  it.each([0, 1, 2, 3, 4])("stops at failing step %i and propagates its non-zero status", (failedStep) => {
    let calls = 0;
    const run = vi.fn(() => ({ status: calls++ === failedStep ? 7 : 0 }));
    const { code, messages } = verify(run);
    expect(code).toBe(7);
    expect(run).toHaveBeenCalledTimes(failedStep + 1);
    expect(messages.at(-1)).toContain("FAIL (1.25s; exit 7) — stopped.");
    expect(messages.join("\n")).not.toContain("verification passed");
  });

  it.each([
    { status: null, error: new Error("fictional-config-sentinel") },
    { status: null, signal: "SIGTERM" },
    { status: 0, error: new Error("fictional-config-sentinel") },
  ])("treats process errors and signals as failures without disclosing details", (result) => {
    const run = vi.fn(() => result);
    const { code, messages } = verify(run);
    expect(code).toBe(1);
    expect(run).toHaveBeenCalledTimes(1);
    expect(messages.join("\n")).not.toContain("fictional-config-sentinel");
    expect(messages.join("\n")).not.toContain("verification passed");
  });

  it("does not place environment values, captured child output, or thrown error details into runner output", () => {
    vi.stubEnv("EXE_REVIEW_TEST_CONFIG", "fictional-config-sentinel");
    try {
      const success = verify(() => ({ status: 0, stdout: "fictional-config-sentinel", stderr: "fictional-config-sentinel" }));
      const failure = verify(() => { throw new Error(process.env.EXE_REVIEW_TEST_CONFIG); });
      expect(failure.code).toBe(1);
      for (const result of [success, failure]) {
        expect(result.messages.join("\n")).not.toContain("fictional-config-sentinel");
        expect(result.messages.join("\n")).not.toContain("EXE_REVIEW_TEST_CONFIG");
      }
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
