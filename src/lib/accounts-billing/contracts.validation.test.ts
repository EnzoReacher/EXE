import { describe, expect, it } from "vitest";
import { confirmFacts, prepareSession } from "../experience-translator/engine";
import { ContractValidationError, parseAccountPatch, parseCheckout, parseDeleteSession, parseLogout, parsePortal, parseSaveSession, parseSessionList, parseSnapshot, parseUpdateSession, restoreSnapshot } from "./contracts.validation";

const operationId = "12345678-1234-4123-8123-123456789abc";
function snapshot() {
  const intake = { project: "I built product listing and search using React. The demo is working.", jd: "Frontend Developer Intern requirements: React, JavaScript, HTML and CSS." };
  const initial = prepareSession(intake);
  const prepared = confirmFacts(initial, initial.facts.map(fact => fact.id));
  return { schemaVersion: 1, intake, answers: {}, prepared, candidates: [{ id: "ui", text: "Generated wording.", currentText: "I increased revenue by 400%.", factIds: prepared.facts.map(fact => fact.id), requirementIds: [], edited: true, accepted: true, rejected: false }] };
}
describe("frozen accounts/billing request validation", () => {
  it("accepts explicit guarded requests and rejects identity, charge and role injection", () => {
    expect(parseCheckout({ planId: "pro", operationId })).toEqual({ planId: "pro", operationId });
    for (const field of ["uid", "priceId", "amount", "customerId", "returnUrl"]) {
      expect(() => parseCheckout({ planId: "pro", operationId, [field]: "attacker" })).toThrow(ContractValidationError);
    }
    expect(() => parseCheckout({ planId: "free", operationId })).toThrow();
    expect(() => parsePortal({ operationId, customerId: "other" })).toThrow();
    expect(() => parseAccountPatch({ displayName: "Name", tier: "pro" })).toThrow();
    expect(parseAccountPatch({ displayName: " Name " })).toEqual({ displayName: "Name" });
  });
  it("requires operation UUIDs and positive integer revisions", () => {
    const save = { operationId, title: "My project", snapshot: snapshot() };
    expect(parseSaveSession(save).operationId).toBe(operationId);
    expect(parseUpdateSession({ ...save, expectedRevision: 1 }).expectedRevision).toBe(1);
    for (const expectedRevision of [0, -1, 1.5, "1", undefined, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => parseDeleteSession({ operationId, expectedRevision })).toThrow();
    }
    expect(() => parseSaveSession({ ...save, operationId: "same-key" })).toThrow();
    expect(() => parseSaveSession({ ...save, ownerUid: "other" })).toThrow();
  });
  it("bounds pagination and makes revocation scope explicit", () => {
    expect(parseSessionList({ limit: 50, cursor: "opaque" })).toEqual({ limit: 50, cursor: "opaque" });
    for (const limit of [0, 51, 1.5, "20"]) expect(() => parseSessionList({ limit })).toThrow();
    expect(() => parseSessionList({ uid: "other" })).toThrow();
    expect(parseLogout({ scope: "current" })).toEqual({ scope: "current" });
    expect(() => parseLogout({})).toThrow();
  });
});
describe("saved snapshot boundary and renewed review", () => {
  it("round trips source/fact state without granting trust to wording", () => {
    const input = snapshot();
    expect(parseSnapshot(input)).toEqual(input);
    const restored = restoreSnapshot(input);
    expect(restored.reviewRequired).toBe(true);
    expect(restored.prepared.facts.length).toBeGreaterThan(0);
    expect(restored.prepared.facts.every(fact => !fact.confirmed)).toBe(true);
    expect(restored.wordingDrafts[0]).toEqual({ id: "ui", currentText: "I increased revenue by 400%.", previousGeneratedText: "Generated wording.", provenance: "untrusted_saved_wording" });
    expect(restored).not.toHaveProperty("candidates");
    expect(restored.wordingDrafts[0]).not.toHaveProperty("accepted");
    expect(input.prepared.facts.every(fact => fact.confirmed)).toBe(true);
  });
  it("rejects fabricated source spans, facts, requirements and unknown fields", () => {
    const cases = [
      (value: ReturnType<typeof snapshot>) => { value.prepared.facts[0].excerpt = "fabricated"; },
      (value: ReturnType<typeof snapshot>) => { value.prepared.sources[0].text = "invented"; },
      (value: ReturnType<typeof snapshot>) => { value.prepared.requirements = []; },
      (value: ReturnType<typeof snapshot>) => { value.candidates[0].factIds = ["foreign-fact"]; },
    ];
    for (const mutate of cases) { const input = snapshot(); mutate(input); expect(() => parseSnapshot(input)).toThrow(); }
    expect(() => parseSnapshot({ ...snapshot(), verified: true })).toThrow();
    expect(() => parseSnapshot({ ...snapshot(), schemaVersion: 2 })).toThrow(expect.objectContaining({ code: "UNSUPPORTED_SCHEMA" }));
  });
  it("bounds serialized UTF-8 bytes, candidates and malformed structures", () => {
    expect(() => parseSnapshot({ ...snapshot(), padding: "界".repeat(50000) })).toThrow(expect.objectContaining({ code: "PAYLOAD_TOO_LARGE" }));
    const input = snapshot();
    input.candidates.push(input.candidates[0]);
    expect(() => parseSnapshot(input)).toThrow();
    for (const value of [null, [], "x", { schemaVersion: 1 }, { ...snapshot(), answers: { unknown: "x" } }]) expect(() => parseSnapshot(value)).toThrow(ContractValidationError);
  });
});
