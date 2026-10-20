import { afterEach, describe, expect, it, vi } from "vitest";
import { generateLive, prepareLive, LiveClientError } from "./client";
import type { LiveSession } from "./live-types";
const project = "I authored a fictional keyboard navigation guide for the component library.";
const jd = "Frontend intern: write documentation for a component library.";
const view: LiveSession = { token: "s".repeat(43), revision: 1, sources: [{ id: "s", label: "Project", text: project }], facts: [{ id: "f", label: "Authored a keyboard navigation guide", sourceId: "s", excerpt: project, start: 0, end: project.length }], requirements: [{ id: "r", label: "Documentation", excerpt: "write documentation" }], questions: [] };
const prepare = { operation: "start" as const, consent: true as const, project, jd, requestId: "synthetic-prepare-request" };
const generate = { consent: true as const, token: view.token, revision: 1, selectedFactIds: ["f"], requestId: "synthetic-generate-request" };
afterEach(() => vi.unstubAllGlobals());
describe("live client has no fallback", () => {
  it("QA regression: rejects the exact successful null-fact body before state installation", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ token: "synthetic-capability", revision: 1, sources: [], facts: [null], requirements: [], questions: [] })));
    await expect(prepareLive(prepare)).rejects.toThrow(/unchecked/);
  });
  it("QA regression: rejects the exact successful bullet missing requirementIds before state installation", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ bullets: [{ id: "b", text: "Authored keyboard navigation documentation for a component library.", factIds: ["f"] }] })));
    await expect(generateLive(generate, undefined, view)).rejects.toThrow(/unchecked/);
  });
  it("surfaces exact missing config without leaking arbitrary provider text", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: { code: "not_configured", message: "not-rendered" } }, { status: 503 })));
    await expect(prepareLive({ operation: "start", consent: true, project: "project", jd: "jd", requestId: "synthetic" })).rejects.toThrow("OpenAI is not configured.");
  });
  it("rejects malformed and unselected bullet references", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ bullets: [{ text: "Invented", factIds: ["forged"] }] })));
    await expect(generateLive(generate, undefined, view)).rejects.toThrow(/unchecked/);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not json"))); await expect(prepareLive({ operation: "start", consent: true, project: "p", jd: "j", requestId: "id" })).rejects.toThrow(/unchecked/);
  });
  const invalidSessions: [string, (v: LiveSession) => unknown][] = [
    ["null session", () => null], ["extra session field", (v) => ({ ...v, extra: true })], ["missing field", (v) => ({ ...v, facts: undefined })],
    ["null fact", (v) => ({ ...v, facts: [null] })], ["null source", (v) => ({ ...v, sources: [null] })], ["null requirement", (v) => ({ ...v, requirements: [null] })], ["null question", (v) => ({ ...v, questions: [null] })],
    ["extra fact field", (v) => ({ ...v, facts: [{ ...v.facts[0], actor: "self" }] })], ["missing fact label", (v) => ({ ...v, facts: [{ ...v.facts[0], label: undefined }] })],
    ["extra source field", (v) => ({ ...v, sources: [{ ...v.sources[0], role: "project" }] })], ["missing source text", (v) => ({ ...v, sources: [{ ...v.sources[0], text: undefined }] })],
    ["extra requirement field", (v) => ({ ...v, requirements: [{ ...v.requirements[0], confirmed: true }] })], ["missing requirement excerpt", (v) => ({ ...v, requirements: [{ ...v.requirements[0], excerpt: undefined }] })],
    ["extra question field", (v) => ({ ...v, questions: [{ id: "q", text: "Question?", hint: "Optional", extra: true }] })], ["missing question hint", (v) => ({ ...v, questions: [{ id: "q", text: "Question?" }] })],
    ["short token", (v) => ({ ...v, token: "short" })], ["invalid token", (v) => ({ ...v, token: "!".repeat(43) })], ["nonpositive revision", (v) => ({ ...v, revision: 0 })], ["noninteger revision", (v) => ({ ...v, revision: 1.5 })], ["unexpected initial revision", (v) => ({ ...v, revision: 2 })],
    ["no source", (v) => ({ ...v, sources: [] })], ["extra invented source", (v) => ({ ...v, sources: [...v.sources, { id: "jd", text: jd, label: "JD" }] })],
    ["changed immutable project", (v) => ({ ...v, sources: [{ ...v.sources[0], text: project + " Changed." }] })],
    ["foreign fact source", (v) => ({ ...v, facts: [{ ...v.facts[0], sourceId: "foreign" }] })], ["mismatching excerpt", (v) => ({ ...v, facts: [{ ...v.facts[0], excerpt: "Invented" }] })],
    ["negative start", (v) => ({ ...v, facts: [{ ...v.facts[0], start: -1 }] })], ["fractional offset", (v) => ({ ...v, facts: [{ ...v.facts[0], start: 0.5 }] })], ["wrong end", (v) => ({ ...v, facts: [{ ...v.facts[0], end: project.length + 1 }] })],
    ["duplicate fact ID", (v) => ({ ...v, facts: [...v.facts, v.facts[0]] })], ["cross-kind duplicate ID", (v) => ({ ...v, requirements: [{ ...v.requirements[0], id: v.facts[0].id }] })],
    ["empty ID", (v) => ({ ...v, facts: [{ ...v.facts[0], id: "" }] })], ["long ID", (v) => ({ ...v, facts: [{ ...v.facts[0], id: "a".repeat(101) }] })], ["non-string label", (v) => ({ ...v, facts: [{ ...v.facts[0], label: {} }] })],
    ["empty label", (v) => ({ ...v, facts: [{ ...v.facts[0], label: " " }] })], ["long label", (v) => ({ ...v, facts: [{ ...v.facts[0], label: "x".repeat(251) }] })], ["control character", (v) => ({ ...v, facts: [{ ...v.facts[0], label: "Claim\u0001" }] })],
    ["foreign JD quote", (v) => ({ ...v, requirements: [{ ...v.requirements[0], excerpt: "Rust required" }] })],
    ["too many facts", (v) => ({ ...v, facts: Array(25).fill(v.facts[0]) })], ["too many requirements", (v) => ({ ...v, requirements: Array(13).fill(v.requirements[0]) })],
    ["too many questions", (v) => ({ ...v, questions: Array.from({ length: 5 }, (_, i) => ({ id: `q${i}`, text: `Question ${i}?`, hint: "Optional" })) })],
    ["duplicate questions", (v) => ({ ...v, questions: [{ id: "q1", text: "Question?", hint: "Optional" }, { id: "q2", text: "Question?", hint: "Optional" }] })],
  ];
  it.each(invalidSessions)("rejects malformed prepared success: %s", async (_name, invalid) => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(invalid(structuredClone(view)))));
    await expect(prepareLive(prepare)).rejects.toBeInstanceOf(LiveClientError);
  });
  const bullet = { id: "b", text: "Authored keyboard navigation documentation.", factIds: ["f"], requirementIds: ["r"] };
  it.each([
    ["null envelope", null], ["extra envelope", { bullets: [], extra: true }], ["null bullet", { bullets: [null] }], ["missing id", { bullets: [{ ...bullet, id: undefined }] }],
    ["missing text", { bullets: [{ ...bullet, text: undefined }] }], ["missing factIds", { bullets: [{ ...bullet, factIds: undefined }] }], ["missing requirementIds", { bullets: [{ ...bullet, requirementIds: undefined }] }],
    ["extra field", { bullets: [{ ...bullet, extra: true }] }], ["empty text", { bullets: [{ ...bullet, text: "" }] }], ["long text", { bullets: [{ ...bullet, text: "x".repeat(501) }] }],
    ["empty factIds", { bullets: [{ ...bullet, factIds: [] }] }], ["unknown fact", { bullets: [{ ...bullet, factIds: ["foreign"] }] }], ["duplicate facts", { bullets: [{ ...bullet, factIds: ["f", "f"] }] }],
    ["empty requirementIds", { bullets: [{ ...bullet, requirementIds: [] }] }], ["unknown requirement", { bullets: [{ ...bullet, requirementIds: ["foreign"] }] }], ["duplicate requirements", { bullets: [{ ...bullet, requirementIds: ["r", "r"] }] }],
    ["duplicate ID", { bullets: [bullet, { ...bullet, text: "A distinct documentation contribution." }] }], ["duplicate text", { bullets: [bullet, { ...bullet, id: "b2" }] }], ["too many bullets", { bullets: Array(4).fill(bullet) }],
  ])("rejects malformed generated success: %s", async (_name, body) => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(body)));
    await expect(generateLive(generate, undefined, view)).rejects.toBeInstanceOf(LiveClientError);
  });
  it("validates response agreement with immutable source/answer and current JD context", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(view))); expect(await prepareLive(prepare)).toEqual(view);
    const previous = { ...view, questions: [{ id: "q1", text: "What did you document?", hint: "Optional" }, { id: "q2", text: "Anything else?", hint: "Optional" }] };
    const answer = "I documented fictional release procedures.";
    const answered = { ...view, revision: 2, sources: [...view.sources, { id: "q1-answer", text: answer, label: previous.questions[0].text }] };
    const request = { operation: "answer" as const, consent: true as const, token: view.token, revision: 1, answers: { q1: answer, q2: "" }, requestId: "synthetic-answer-request" };
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(answered))); expect(await prepareLive(request, undefined, { session: previous, jd })).toEqual(answered);
    for (const bad of [{ ...answered, token: "t".repeat(43) }, { ...answered, revision: 1 }, { ...answered, sources: view.sources }, { ...answered, sources: [...view.sources, { ...answered.sources[1], text: "Invented answer." }] }, { ...answered, questions: previous.questions }]) {
      vi.stubGlobal("fetch", vi.fn(async () => Response.json(bad))); await expect(prepareLive(request, undefined, { session: previous, jd })).rejects.toBeInstanceOf(LiveClientError);
    }
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(answered))); await expect(prepareLive(request)).rejects.toBeInstanceOf(LiveClientError);
    await expect(prepareLive({ ...request, answers: { foreign: answer } }, undefined, { session: previous, jd })).rejects.toBeInstanceOf(LiveClientError);
  });
  it("checks selected IDs/context before transfer and permits honest empty or 2–3 distinct valid bullets", async () => {
    const request = vi.fn(async () => Response.json({ bullets: [bullet, { ...bullet, id: "b2", text: "Documented a second supported contribution." }, { ...bullet, id: "b3", text: "Prepared another supported guide." }] })); vi.stubGlobal("fetch", request);
    for (const bad of [{ ...generate, selectedFactIds: [] }, { ...generate, selectedFactIds: ["foreign"] }, { ...generate, selectedFactIds: ["f", "f"] }, { ...generate, token: "foreign" }, { ...generate, revision: 2 }]) await expect(generateLive(bad, undefined, view)).rejects.toBeInstanceOf(LiveClientError);
    expect(request).not.toHaveBeenCalled(); expect(await generateLive(generate, undefined, view)).toHaveLength(3);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ bullets: [] }))); expect(await generateLive(generate, undefined, view)).toEqual([]);
  });
  it("checks UTF16 offsets without normalization and rejects ambiguous repeated quotes", async () => {
    const raw = "😀 Dự án\r\nTôi đã viết hướng dẫn bàn phím."; const excerpt = raw.slice(10);
    const session = { ...view, sources: [{ ...view.sources[0], text: raw }], facts: [{ ...view.facts[0], excerpt, start: 10, end: raw.length }] };
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(session))); expect((await prepareLive({ ...prepare, project: raw })).facts[0].start).toBe(10);
    const repeated = excerpt + " " + excerpt; vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ...session, sources: [{ ...view.sources[0], text: repeated }], facts: [{ ...session.facts[0], start: 0, end: excerpt.length }] })));
    await expect(prepareLive({ ...prepare, project: repeated })).rejects.toBeInstanceOf(LiveClientError);
  });
  it.each(['{"bullets":[],"bullets":[]}', '{"bullets":[],"\\u0062ullets":[]}', JSON.stringify({ bullets: [bullet] }).replace('"id":"b"', '"id":"b","id":"b"')])("rejects duplicate JSON fields before parsing loses them", async (raw) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(raw))); await expect(generateLive(generate, undefined, view)).rejects.toBeInstanceOf(LiveClientError);
  });
});
