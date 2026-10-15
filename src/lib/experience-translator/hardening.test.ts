import { describe, expect, it } from "vitest";
import { generateBullets } from "./adapter";
import { composeBullets, confirmFacts, prepareSession, TranslatorError } from "./engine";
import { goldenAnswers, goldenIntake } from "./fixtures";

const confirmed = (project: string, jd = goldenIntake.jd) => {
  const session = prepareSession({ project, jd });
  return confirmFacts(session, session.facts.map((fact) => fact.id));
};
const golden = () => {
  const session = prepareSession(goldenIntake, goldenAnswers);
  return confirmFacts(session, session.facts.map((fact) => fact.id));
};

describe("CF-06 backend audit regressions", () => {
  it.each(["instead of", "rather than", "as opposed to"])("rejects exclusion-bearing excerpts: %s", (exclusion) => {
    const session = confirmed(`I built product listing using JavaScript ${exclusion} TypeScript.`, "Frontend Developer Intern\nRequirements:\n- JavaScript\n- TypeScript");
    expect(session.facts).toEqual([]);
    expect(composeBullets(session)).toEqual([]);
  });

  it.each([
    "I built product listing using React and Alex designed responsive UI.",
    "I built product listing using React and Morgan integrated a REST API.",
    "I built product listing using React and Priya handled error handling.",
    "I built product listing using React and Jordan wrote responsive UI.",
    "I built product listing using React, Alex designed responsive UI.",
    "I built product listing using React,Alex designed responsive UI.",
  ])("rejects mixed-subject action excerpts without a name blacklist: %s", (project) => {
    const session = confirmed(project, "Frontend Developer Intern\nRequirements:\n- React\n- Responsive UI\n- REST API");
    expect(session.facts).toEqual([]);
    expect(composeBullets(session)).toEqual([]);
  });

  it.each([
    "I built product listing and search using React and JavaScript.",
    "I built product listing using React and implemented search.",
    "I built product listing using React and I designed responsive UI.",
    "I built product listing using React, I designed responsive UI.",
    "I built product listing using React,I designed responsive UI.",
    "I built product listing using React, JavaScript and TypeScript.",
  ])("preserves coordinated personal actions and technology lists: %s", (project) => {
    const session = confirmed(project);
    expect(session.facts.some((fact) => fact.code === "listing")).toBe(true);
    expect(composeBullets(session)[0]).toMatchObject({ id: "ui" });
    for (const fact of session.facts) expect(session.sources[0].text.slice(fact.start, fact.end)).toBe(fact.excerpt);
  });

  it.each(["whole", "partial"])("refuses %s sparse adapter bullet arrays", async (kind) => {
    const session = golden();
    const expected = composeBullets(session);
    expect(expected).toHaveLength(2);
    const bullets = new Array(expected.length);
    if (kind === "partial") bullets[0] = expected[0];
    await expect(generateBullets(session, { name: "sparse-fixture", generate: async () => ({ bullets }) })).rejects.toBeInstanceOf(TranslatorError);
  });

  it("preserves timeout-specific failure when the adapter rejects on abort", async () => {
    const signals: AbortSignal[] = [];
    await expect(generateBullets(golden(), {
      name: "signal-aware-fixture",
      generate: (_, signal) => {
        signals.push(signal);
        return new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("Adapter aborted")), { once: true }));
      },
    }, { timeoutMs: 5, retries: 20 })).rejects.toThrow("Generation timed out. Your inputs and edits are kept; try again.");
    expect(signals).toHaveLength(2);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it.each(["sync", "async"])("fails immediately on %s adapter errors", async (kind) => {
    const signals: AbortSignal[] = [];
    await expect(generateBullets(golden(), {
      name: "failure-fixture",
      generate: (_, signal) => {
        signals.push(signal);
        if (kind === "sync") throw new Error("Synthetic provider failure");
        return Promise.reject(new Error("Synthetic provider failure"));
      },
    }, { timeoutMs: 50, retries: 20 })).rejects.toBeInstanceOf(TranslatorError);
    expect(signals).toHaveLength(1);
    expect(signals[0].aborted).toBe(true);
  });
});
