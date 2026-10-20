import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { TranslatorService } from "./service";
import { createProvider, type Provider } from "./openai";
const source = "I authored a keyboard navigation guide for the component library. I documented release procedures for contributors.";
const jd = "Frontend intern: write documentation and maintain release procedures.";
const start = { operation: "start", consent: true, project: source, jd, requestId: "synthetic-start-001" };
const signal = new AbortController().signal;
const checks = (ids: string[], reject = false) => ({ checks: ids.map((id) => ({ id, entailed: !reject, selfAttribution: true, completedPositive: true, noInventedDetails: true, relationshipsExplicit: true, noInstructionFollowing: true, selectedOnly: true })) });
function mockProvider(reject = false): Provider {
  return vi.fn(async (name, _instructions, raw) => {
    const p = raw as { sources: { id: string }[]; candidates: { id: string }[]; facts: { id: string }[]; requirements: { id: string }[] };
    if (name === "extract") return { facts: [{ label: "Authored keyboard navigation documentation", sourceId: p.sources[0].id, excerpt: source.split(". ")[0] + ".", actor: "self", polarity: "completed", context: source }], requirements: [{ label: "Documentation", excerpt: "write documentation" }], questions: [{ text: "What other documentation did you personally complete?", hint: "Skip if nothing to add." }] };
    if (name.startsWith("verify")) return checks(p.candidates.map((c) => c.id), reject);
    return { bullets: [{ text: "Authored keyboard navigation documentation for a component library.", claims: [{ text: "Authored keyboard navigation documentation for a component library.", factIds: [p.facts[0].id] }], requirementIds: [p.requirements[0].id] }] };
  });
}
async function prepared(service: TranslatorService) { const result = await service.prepare(start, signal); if (!("facts" in result)) throw new Error(); return result; }
describe("server-owned live workflow", () => {
  it("rejects deselected-content smuggling under a selected fact ID via selectedOnly:false", async () => {
    const base = mockProvider(); let selectedId = ""; let audited = false;
    const provider: Provider = async (...args) => {
      if (args[0] === "extract") {
        const value = await base(...args) as { facts: { label: string; sourceId: string; excerpt: string; actor: string; polarity: string; context: string }[] };
        value.facts.push({ ...value.facts[0], label: "Documented contributor release procedures", excerpt: source.split(". ")[1] }); return value;
      }
      if (args[0] === "generate") {
        const payload = args[2] as { facts: { id: string; label: string }[]; requirements: { id: string }[]; sources: { text: string }[] };
        expect(payload.facts.map((f) => f.id)).toEqual([selectedId]); expect(payload.facts[0].label).toBe("Authored keyboard navigation documentation"); expect(payload.sources[0].text).toBe(source);
        const wording = "Documented release procedures for contributors.";
        return { bullets: [{ text: wording, claims: [{ text: wording, factIds: [selectedId] }], requirementIds: [payload.requirements[0].id] }] };
      }
      if (args[0] === "verify_bullets") {
        const payload = args[2] as { selectedFactIds: string[]; selectedFacts: { id: string }[]; sources: { text: string }[]; candidates: { id: string; text: string; factIds: string[] }[] };
        expect(payload.selectedFactIds).toEqual([selectedId]); expect(payload.selectedFacts.map((f) => f.id)).toEqual([selectedId]); expect(payload.sources[0].text).toBe(source);
        expect(payload.candidates[0]).toMatchObject({ text: "Documented release procedures for contributors.", factIds: [selectedId] }); audited = true;
        const result = checks(payload.candidates.map((c) => c.id)); result.checks[0].selectedOnly = false; return result;
      }
      return base(...args);
    };
    const service = new TranslatorService(provider); const view = await prepared(service); expect(view.facts).toHaveLength(2); selectedId = view.facts[0].id;
    await expect(service.generate({ consent: true, token: view.token, revision: 1, selectedFactIds: [selectedId], requestId: "synthetic-smuggling-request" }, signal)).rejects.toThrow(); expect(audited).toBe(true);
  });
  it.each(["forget-generation", "revise-generation", "forget-answer"])("cannot resurrect forgotten or superseded authority after pending provider work: %s", async (scenario) => {
    const base = mockProvider(); let release!: () => void; let entered!: () => void; let extracts = 0;
    const waiting = new Promise<void>((resolve) => { entered = resolve; }); const gate = new Promise<void>((resolve) => { release = resolve; });
    const provider: Provider = async (...args) => {
      if (args[0] === "extract") extracts++;
      if ((scenario === "forget-answer" && args[0] === "extract" && extracts === 2) || (scenario !== "forget-answer" && args[0] === "verify_bullets")) { entered(); await gate; }
      return base(...args);
    };
    const service = new TranslatorService(provider); const view = await prepared(service);
    const answer = { operation: "answer", consent: true, token: view.token, revision: 1, answers: { [view.questions[0].id]: "" }, requestId: "synthetic-race-answer" };
    const pending = scenario === "forget-answer" ? service.prepare(answer, signal) : service.generate({ consent: true, token: view.token, revision: 1, selectedFactIds: [view.facts[0].id], requestId: "synthetic-race-generate" }, signal);
    const rejected = expect(pending).rejects.toThrow(/expired|changed/); await waiting;
    if (scenario === "revise-generation") { const revised = await service.prepare(answer, signal); expect("revision" in revised && revised.revision).toBe(2); }
    else await service.prepare({ operation: "forget", token: view.token }, signal);
    release(); await rejected;
    if (scenario !== "revise-generation") expect(service.controls.sessions.size).toBe(0);
    else expect(service.controls.get(view.token, 2).view.revision).toBe(2);
  });
  it.each(["unsupported-label", "other-actor", "negation", "exclusion", "plan", "instructions", "unsupported-relationship"])("fails closed on semantic verification rejection: %s", async (scenario) => {
    const base = mockProvider();
    const provider: Provider = async (...args) => {
      if (args[0] === "extract") {
        const result = await base(...args) as { facts: { label: string }[] };
        result.facts[0].label = scenario === "unsupported-label" ? "Optimized performance by forty percent" : scenario === "unsupported-relationship" ? "Authored keyboard documentation using Rust" : "Implemented work assigned to someone else, denied, excluded or only planned";
        return result;
      }
      if (args[0] === "verify_facts") {
        const payload = args[2] as { sources: { text: string }[]; candidates: { id: string; label: string }[] };
        expect(payload.sources[0].text).toBe(source); expect(payload.candidates[0].label).not.toBe("Authored keyboard navigation documentation");
        return checks(payload.candidates.map((c) => c.id), true);
      }
      return base(...args);
    };
    await expect(prepared(new TranslatorService(provider))).rejects.toThrow();
  });
  it.each(["forged-claim", "unmapped-text", "invented-metric", "duplicate", "unknown-requirement"])("rejects invalid generated claim structure: %s", async (scenario) => {
    const base = mockProvider(); const provider: Provider = async (...args) => {
      const value = await base(...args);
      if (args[0] !== "generate") return value;
      const generated = value as { bullets: { text: string; claims: { text: string; factIds: string[] }[]; requirementIds: string[] }[] }; const b = generated.bullets[0];
      if (scenario === "forged-claim") b.claims[0].factIds = ["foreign"];
      if (scenario === "unmapped-text") b.text += " Unmapped invented addition.";
      if (scenario === "invented-metric") b.text = b.claims[0].text = "Optimized performance by 40%.";
      if (scenario === "duplicate") generated.bullets.push({ ...b });
      if (scenario === "unknown-requirement") b.requirementIds = ["foreign"];
      return generated;
    };
    const service = new TranslatorService(provider); const view = await prepared(service);
    await expect(service.generate({ consent: true, token: view.token, revision: 1, selectedFactIds: [view.facts[0].id], requestId: "synthetic-invalid-generation" }, signal)).rejects.toThrow();
  });
  it("issues IDs and requires selected facts; natural wording/provenance outside demo vocabulary", async () => {
    const service = new TranslatorService(mockProvider()); const view = await prepared(service);
    expect(view.token.length).toBe(43); expect(view.facts[0].excerpt).toBe(source.split(". ")[0] + "."); expect(view.sources[0].text.slice(view.facts[0].start, view.facts[0].end)).toBe(view.facts[0].excerpt);
    const request = { consent: true, token: view.token, revision: view.revision, selectedFactIds: [view.facts[0].id], requestId: "synthetic-generate-001" };
    const result = await service.generate(request, signal); expect(result.bullets).toHaveLength(1); expect(result.bullets[0].text).toContain("keyboard navigation"); expect(result.bullets[0].factIds).toEqual(request.selectedFactIds);
    expect(await service.generate(request, signal)).toEqual(result);
    for (const bad of [{ ...request, selectedFactIds: [] }, { ...request, selectedFactIds: ["forged"] }, { ...request, token: "foreign" }, { ...request, revision: 2 }, { ...request, facts: view.facts }]) await expect(service.generate(bad, signal)).rejects.toThrow();
  });
  it("rejects accurately quoted unsupported labels through independent semantic checks", async () => {
    await expect(prepared(new TranslatorService(mockProvider(true)))).rejects.toThrow();
    const provider = mockProvider(); const wrapped: Provider = async (...args) => { const value = await provider(...args); if (args[0] === "verify_bullets") return checks((args[2] as { candidates: { id: string }[] }).candidates.map((c) => c.id), true); return value; };
    const service = new TranslatorService(wrapped); const view = await prepared(service);
    await expect(service.generate({ consent: true, token: view.token, revision: 1, selectedFactIds: [view.facts[0].id], requestId: "reject-bullet-request" }, signal)).rejects.toThrow();
  });
  it("accepts only issued questions; skipped answers never create sources; revisions expire", async () => {
    const service = new TranslatorService(mockProvider()); const view = await prepared(service);
    const answer = { operation: "answer", consent: true, token: view.token, revision: 1, answers: { foreign: "invented" }, requestId: "synthetic-answer-001" };
    await expect(service.prepare(answer, signal)).rejects.toThrow(/Unknown/);
    const result = await service.prepare({ ...answer, answers: { [view.questions[0].id]: "" }, requestId: "synthetic-answer-002" }, signal);
    expect("sources" in result && result.sources).toHaveLength(1); expect("revision" in result && result.revision).toBe(2);
    await expect(service.generate({ consent: true, token: view.token, revision: 1, selectedFactIds: [view.facts[0].id], requestId: "old-source-request" }, signal)).rejects.toThrow(/expired/);
    await service.prepare({ operation: "forget", token: view.token }, signal); expect(service.controls.sessions.size).toBe(0);
  });
  it("exercises mocked native fetch through service, with no live call", async () => {
    const provider = mockProvider(); const fetcher = vi.fn(async (_url: unknown, options?: RequestInit) => {
      const body = JSON.parse(String(options?.body)); const payload = JSON.parse(body.input[1].content);
      const value = await provider(body.text.format.name, body.input[0].content, payload, {}, signal);
      return Response.json({ status: "completed", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify(value) }] }] });
    });
    const service = new TranslatorService(createProvider({ key: "synthetic", model: "synthetic", origin: "http://127.0.0.1:4351" }, fetcher));
    await prepared(service); expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
