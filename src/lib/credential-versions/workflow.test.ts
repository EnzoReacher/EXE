import { describe, expect, it } from "vitest";
import { claimNextStep, filterHistory } from "./workflow";
import type { Claim, Version } from "./types";

const claim = (id: string, sourceCvId: string, state: string): Claim => ({ id, sourceCvId, sourceName: "fictional.pdf", state, skill: "SQL", wording: "SQL coursework", createdAt: "2026-10-04", credentialId: "proof", portfolioId: null, note: null, canWithdraw: true });
const version = (id: string, sourceCvId: string, state: string): Version => ({ id, sourceCvId, sourceName: "fictional.pdf", state, number: 1, createdAt: "2026-10-04", acceptedAt: null, changes: [] });
describe("source-aware next steps", () => {
  it("keeps same-number histories from different CVs distinct without modifying records", () => {
    const items = [version("v1", "a", "candidate"), version("v2", "b", "accepted"), version("v3", "a", "evidence_withdrawn")];
    expect(filterHistory(items, "a", "action", "version").map((v) => v.id)).toEqual(["v1"]);
    expect(filterHistory(items, "a", "history", "version").map((v) => v.id)).toEqual(["v3"]);
    expect(filterHistory(items, "", "waiting", "version")).toEqual([]);
    expect(items).toHaveLength(3);
  });
  it("separates owner actions, expert waiting and withdrawn history", () => {
    const items = [claim("c1", "a", "draft"), claim("c2", "a", "submitted"), claim("c3", "b", "rejected"), claim("c4", "a", "withdrawn")];
    expect(filterHistory(items, "", "action", "claim").map((c) => c.id)).toEqual(["c1", "c3"]);
    expect(filterHistory(items, "a", "waiting", "claim").map((c) => c.id)).toEqual(["c2"]);
    expect(filterHistory(items, "", "history", "claim").map((c) => c.id)).toEqual(["c4"]);
    expect(filterHistory(items, "", "all", "claim")).toEqual(items);
  });
  it("never presents expert approval as owner acceptance or requests rewriting history", () => {
    expect(claimNextStep("approved")).toContain("decide whether to accept");
    expect(claimNextStep("needs_information")).toContain("new claim");
    expect(claimNextStep("withdrawn")).toContain("cannot add a skill");
    expect(claimNextStep("unexpected")).toContain("Refresh");
  });
});
