import { describe, expect, it } from "vitest";
import { generateBullets } from "./adapter";
import { composeBullets, confirmFacts, prepareSession, TranslatorError, validateBulletOutput } from "./engine";
import { goldenAnswers, goldenIntake } from "./fixtures";

const confirmed = (project: string, jd = goldenIntake.jd) => {
  const session = prepareSession({ project, jd });
  return confirmFacts(session, session.facts.map((fact) => fact.id));
};
const golden = () => {
  const session = prepareSession(goldenIntake, goldenAnswers);
  return confirmFacts(session, session.facts.map((fact) => fact.id));
};

const debuggingJd = "Frontend Developer Intern\nRequirements:\n- React\n- TypeScript";

describe("DBG-04 action alternatives", () => {
  const alternatives = [
    "I built product listing or search using React.",
    "I built product listing, or search using React.",
    "Mình làm danh sách sản phẩm, hoặc tìm kiếm bằng React.",
    "I built either product listing or search using React.",
    "I built product listing versus search using React.",
    "I built product listing vs search using React.",
    "Mình làm danh sách sản phẩm hoặc tìm kiếm bằng React.",
    "Tôi làm danh sách sản phẩm hay tìm kiếm bằng React.",
    "Em làm danh sách sản phẩm hay là tìm kiếm bằng React.",
    "I built responsive UI or product listing using React.",
    "I built product listing or implemented search using React.",
    "Mình làm danh sách sản phẩm hoặc triển khai tìm kiếm bằng React.",
  ];

  it.each(alternatives)("does not offer ambiguous action facts: %s", (project) => {
    const session = prepareSession({ project, jd: debuggingJd });
    expect(session.facts).toEqual([]);
    expect(session.questions.map((question) => question.id)).toContain("contribution");
    expect(session.requirements.map((requirement) => requirement.code)).toEqual(["react", "typescript"]);
  });

  it.each(alternatives)("does not compose alternatives after confirming remaining facts: %s", (project) => {
    const session = prepareSession({ project, jd: debuggingJd });
    const accepted = confirmFacts(session, session.facts.map((fact) => fact.id));
    expect(composeBullets(accepted)).toEqual([]);
  });

  it("rejects alternative actions in a contextual contribution answer", () => {
    const session = prepareSession({ project: "A coursework catalog project for a student demo.", jd: debuggingJd }, {
      contribution: "product listing or search", technology: "React and TypeScript",
    });
    expect(session.facts.map((fact) => [fact.sourceId, fact.code])).toEqual([
      ["answer-technology", "react"], ["answer-technology", "typescript"],
    ]);
    expect(composeBullets(confirmFacts(session, session.facts.map((fact) => fact.id)))).toEqual([]);
  });

  it.each([
    ["I built product listing and search using React.", ["react", "listing", "search"], "Implemented product listing and search using React."],
    ["I built product listing, and search using React.", ["react", "listing", "search"], "Implemented product listing and search using React."],
    ["Mình làm danh sách sản phẩm, và tìm kiếm bằng React.", ["react", "listing", "search"], "Implemented product listing and search using React."],
    ["Mình làm danh sách sản phẩm và tìm kiếm bằng React.", ["react", "listing", "search"], "Implemented product listing and search using React."],
    ["I built product listing and implemented search using React.", ["react", "listing", "search"], "Implemented product listing and search using React."],
    ["Mình làm danh sách sản phẩm và triển khai tìm kiếm bằng React.", ["react", "listing", "search"], "Implemented product listing and search using React."],
    ["I built product listing using React.", ["react", "listing"], "Implemented product listing using React."],
    ["I built product listing using React and TypeScript.", ["react", "typescript", "listing"], "Implemented product listing using React and TypeScript."],
    ["I built product listing using React for sorting or filtering.", ["react", "listing"], "Implemented product listing using React."],
  ])("preserves unambiguous supported evidence: %s", (project, codes, wording) => {
    const session = prepareSession({ project, jd: debuggingJd });
    expect(session.facts.map((fact) => fact.code)).toEqual(codes);
    expect(session.facts.every((fact) => !fact.confirmed)).toBe(true);
    for (const fact of session.facts) {
      expect(fact.sourceId).toBe("project");
      expect(fact.start).toBe(0);
      expect(fact.end).toBe(project.length - 1);
      expect(fact.excerpt).toBe(project.slice(0, -1));
    }
    const accepted = confirmFacts(session, session.facts.map((fact) => fact.id));
    const bullets = composeBullets(accepted);
    expect(bullets.map((bullet) => bullet.text)).toEqual([wording]);
    expect(validateBulletOutput({ bullets }, accepted)).toEqual(bullets);
  });

  it.each([
    "I built product listing using React",
    "Mình làm danh sách sản phẩm bằng React",
  ])("retains an independent personal sentence and exact nonzero provenance: %s", (clean) => {
    const ambiguous = "I built product listing or search using TypeScript.";
    const project = `${ambiguous} ${clean}.`;
    const session = prepareSession({ project, jd: debuggingJd });
    expect(session.facts.map((fact) => fact.code)).toEqual(["react", "listing"]);
    for (const fact of session.facts) {
      expect(fact.confirmed).toBe(false);
      expect(fact.sourceId).toBe("project");
      expect(fact.start).toBe(ambiguous.length + 1);
      expect(fact.end).toBe(ambiguous.length + 1 + clean.length);
      expect(fact.excerpt).toBe(clean);
      expect(project.slice(fact.start, fact.end)).toBe(clean);
    }
    const accepted = confirmFacts(session, session.facts.map((fact) => fact.id));
    const bullets = composeBullets(accepted);
    expect(bullets.map((bullet) => bullet.text)).toEqual(["Implemented product listing using React."]);
    expect(validateBulletOutput({ bullets }, accepted)).toEqual(bullets);
  });
});

describe("DBG-01 Vietnamese actor boundaries", () => {
  it.each([
    "Mình làm danh sách sản phẩm bằng React và An làm tìm kiếm.",
    "Tôi làm danh sách sản phẩm bằng React và Minh đã xây dựng tìm kiếm.",
    "Em làm danh sách sản phẩm bằng React, Linh triển khai tìm kiếm.",
    "Mình làm danh sách sản phẩm bằng React,Hà phụ trách tìm kiếm.",
    "Mình làm danh sách sản phẩm bằng React và Nguyễn Văn Bình phát triển tìm kiếm.",
  ])("does not offer or compose another actor's search: %s", (project) => {
    const session = prepareSession({ project, jd: debuggingJd });
    expect(session.facts.map((fact) => fact.code)).not.toContain("search");
    const accepted = confirmFacts(session, session.facts.map((fact) => fact.id));
    expect(composeBullets(accepted).some((bullet) => /search/i.test(bullet.text))).toBe(false);
  });
});

describe("DBG-02 technology alternatives", () => {
  it.each([
    "I built product listing using React or TypeScript.",
    "I built product listing using either React or TypeScript.",
    "I built product listing using React versus TypeScript.",
    "Mình làm danh sách sản phẩm bằng React hoặc TypeScript.",
    "Tôi làm danh sách sản phẩm bằng React hay TypeScript.",
  ])("does not treat alternative tools as established use: %s", (project) => {
    const session = prepareSession({ project, jd: debuggingJd });
    expect(session.facts.filter((fact) => ["react", "typescript"].includes(fact.code))).toEqual([]);
    expect(composeBullets(confirmFacts(session, session.facts.map((fact) => fact.id)))).toEqual([]);
    expect(session.requirements.map((requirement) => requirement.code)).toEqual(["react", "typescript"]);
  });

  it("rejects alternatives in contextual technology answers too", () => {
    const session = prepareSession({ project: "A coursework catalog project for a student demo.", jd: debuggingJd }, { contribution: "product listing", technology: "React hoặc TypeScript" });
    expect(session.facts.filter((fact) => fact.sourceId === "answer-technology")).toEqual([]);
    expect(composeBullets(confirmFacts(session, session.facts.map((fact) => fact.id)))).toEqual([]);
  });
});

describe("DBG positive controls and exact provenance", () => {
  it.each([
    ["Mình làm danh sách sản phẩm bằng React.", ["react", "listing"]],
    ["Mình làm danh sách sản phẩm và tìm kiếm bằng React.", ["react", "listing", "search"]],
    ["Mình làm danh sách sản phẩm bằng React và tự triển khai tìm kiếm.", ["react", "listing", "search"]],
    ["I built product listing using React and personally implemented search.", ["react", "listing", "search"]],
    ["Mình làm danh sách sản phẩm bằng React và mình làm tìm kiếm.", ["react", "listing", "search"]],
    ["Tôi làm danh sách sản phẩm bằng React,tôi triển khai tìm kiếm.", ["react", "listing", "search"]],
    ["I built product listing using React and TypeScript.", ["react", "typescript", "listing"]],
    ["Mình làm danh sách sản phẩm bằng React và TypeScript.", ["react", "typescript", "listing"]],
    ["I built product listing using React, TypeScript and JavaScript.", ["react", "javascript", "typescript", "listing"]],
    ["I built product listing using React and TypeScript for sorting.", ["react", "typescript", "listing"]],
    ["I built product listing using React and TypeScript for sorting or filtering.", ["react", "typescript", "listing"]],
  ])("preserves supported personal evidence: %s", (project, codes) => {
    const session = prepareSession({ project, jd: debuggingJd });
    expect(session.facts.map((fact) => fact.code)).toEqual(codes);
    for (const fact of session.facts) {
      expect(fact.excerpt).toBe(project.slice(0, -1));
      expect(fact.start).toBe(0);
      expect(fact.end).toBe(project.length - 1);
      expect(fact.sourceId).toBe("project");
      expect(session.sources[0].text.slice(fact.start, fact.end)).toBe(fact.excerpt);
    }
    const accepted = confirmFacts(session, session.facts.map((fact) => fact.id));
    const bullets = composeBullets(accepted);
    expect(bullets).toHaveLength(1);
    expect(bullets[0].factIds).toEqual([...session.facts.filter((fact) => ["listing", "search"].includes(fact.code)), ...session.facts.filter((fact) => !["listing", "search"].includes(fact.code))].map((fact) => fact.id));
    expect(validateBulletOutput({ bullets }, accepted)).toEqual(bullets);
  });

  it("retains clean evidence with nonzero offsets beside a rejected mixed-actor sentence", () => {
    const clean = "Mình làm danh sách sản phẩm bằng React";
    const project = `A student catalog demo. ${clean}. Mình dùng TypeScript và Hà làm tìm kiếm.`;
    const session = prepareSession({ project, jd: debuggingJd });
    expect(session.facts.map((fact) => fact.code)).toEqual(["react", "listing"]);
    for (const fact of session.facts) {
      expect(fact.start).toBe(project.indexOf(clean));
      expect(fact.end).toBe(project.indexOf(clean) + clean.length);
      expect(fact.excerpt).toBe(clean);
      expect(project.slice(fact.start, fact.end)).toBe(clean);
    }
    const accepted = confirmFacts(session, session.facts.map((fact) => fact.id));
    const bullets = composeBullets(accepted);
    expect(bullets.map((bullet) => bullet.text)).toEqual(["Implemented product listing using React."]);
    expect(validateBulletOutput({ bullets }, accepted)).toEqual(bullets);
  });

  it("leaves alternative JD relevance separate from affirmative personal tool evidence", () => {
    const session = confirmed("I built product listing using React and TypeScript.", "Frontend Developer Intern\nRequirements:\n- React or TypeScript");
    expect(session.requirements.map((requirement) => requirement.code)).toEqual(["react", "typescript"]);
    expect(composeBullets(session).map((bullet) => bullet.text)).toEqual(["Implemented product listing using React and TypeScript."]);
  });
});

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
