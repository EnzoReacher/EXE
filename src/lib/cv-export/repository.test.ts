import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ require: vi.fn() }));
vi.mock("@/lib/intake/repository", () => ({ requireCurrentUser: mocks.require }));
import { loadExportSnapshot } from "./repository";
import { IntakeError } from "@/lib/intake/types";

const id = "11111111-1111-4111-8111-111111111111";
const owner = "fictional-owner";
const base = "  Fictional CV\n\nSQL coursework & practice\n";
const wording = "Fictional SQL coursework supported by submitted proof.";
const snapshot = `${base}\n\nApproved additional skills\n${wording}`;
function fixture() {
  return {
    owner_id: owner, source_cv_id: "fictional-source", parent_version_id: null as string | null,
    state: "accepted", accepted_at: "2026-10-04", evidence_withdrawn_at: null as string | null,
    content_snapshot: snapshot, version_number: 1, source: { original_filename: "fictional-cv.pdf" },
    links: [{ claim_id: "claim-one", decision_id: "decision-one", claim: {
      id: "claim-one", owner_id: owner, source_cv_id: "fictional-source", state: "version_created",
      proposed_wording: wording, source_snapshot: base, parent_version_id: null as string | null,
      portfolio_id: "portfolio", credential: { owner_id: owner, withdrawn_at: null as string | null },
      portfolio: { owner_id: owner, withdrawn_at: null as string | null },
    }, decision: { id: "decision-one", claim_id: "claim-one", reviewer_id: "fictional-expert", decision: "approved", approved_wording: wording } }],
  };
}
let row = fixture();
let query: { select: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn>; single: ReturnType<typeof vi.fn> };
beforeEach(() => {
  row = fixture();
  query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockImplementation(async () => ({ data: row, error: null })) };
  mocks.require.mockReset(); mocks.require.mockResolvedValue({ user: { id: owner }, supabase: { from: () => query } });
});
describe("accepted CV export boundary", () => {
  it.each(["accepted", "superseded"])("exports %s only with historical acceptance and exact valid provenance", async (state) => {
    row.state = state;
    const result = await loadExportSnapshot(id);
    expect(result).toEqual({ content: snapshot, name: "fictional-cv.pdf", number: 1 });
    expect(query.eq).toHaveBeenCalledWith("id", id);
    expect(query.eq).toHaveBeenCalledWith("owner_id", owner);
    expect(query.single).toHaveBeenCalledTimes(1);
    expect(query.select.mock.calls[0][0]).not.toMatch(/storage_path|filename.*credential|explanation|display_name|\*/);
  });
  it.each(["candidate", "rejected", "evidence_withdrawn"])("denies %s even if an acceptance timestamp is supplied", async (state) => {
    row.state = state;
    await expect(loadExportSnapshot(id)).rejects.toMatchObject({ status: 404, code: "unavailable" });
  });
  it.each(["accepted", "superseded"])("denies %s without owner acceptance", async (state) => {
    row.state = state; Object.assign(row, { accepted_at: null });
    await expect(loadExportSnapshot(id)).rejects.toMatchObject({ status: 404 });
  });
  it("denies unauthenticated access before reading a record", async () => {
    mocks.require.mockRejectedValue(new IntakeError("unauthenticated", "Sign in.", 401));
    await expect(loadExportSnapshot(id)).rejects.toMatchObject({ status: 401 });
    expect(query.select).not.toHaveBeenCalled();
  });
  it("returns the same neutral error for missing and cross-owner records", async () => {
    row.owner_id = "fictional-other-owner";
    const cross = await loadExportSnapshot(id).catch((error: Error) => error.message);
    query.single.mockResolvedValue({ data: null, error: { message: "private-account-sentinel" } });
    expect(await loadExportSnapshot(id).catch((error: Error) => error.message)).toBe(cross);
    expect(cross).not.toContain("private-account-sentinel");
  });
  it.each([
    ["missing provenance", (r: ReturnType<typeof fixture>) => { r.links = []; }],
    ["credential withdrawal", (r: ReturnType<typeof fixture>) => { r.links[0].claim.credential.withdrawn_at = "2026-10-04"; }],
    ["portfolio withdrawal", (r: ReturnType<typeof fixture>) => { r.links[0].claim.portfolio.withdrawn_at = "2026-10-04"; }],
    ["claim withdrawal", (r: ReturnType<typeof fixture>) => { r.links[0].claim.state = "withdrawn"; }],
    ["nonapproval", (r: ReturnType<typeof fixture>) => { r.links[0].decision.decision = "rejected"; }],
    ["different approved wording", (r: ReturnType<typeof fixture>) => { r.links[0].decision.approved_wording = "Unsupported fictional skill"; }],
    ["different decision claim", (r: ReturnType<typeof fixture>) => { r.links[0].decision.claim_id = "unrelated-claim"; }],
    ["cross-owner credential", (r: ReturnType<typeof fixture>) => { r.links[0].claim.credential.owner_id = "fictional-other"; }],
    ["self-approval", (r: ReturnType<typeof fixture>) => { r.links[0].decision.reviewer_id = owner; }],
    ["withdrawal tombstone", (r: ReturnType<typeof fixture>) => { r.evidence_withdrawn_at = "2026-10-04"; }],
    ["extra unsupported text", (r: ReturnType<typeof fixture>) => { r.content_snapshot += "\nInvented achievement"; }],
  ] as const)("fails closed for %s", async (_label, mutate) => {
    mutate(row); await expect(loadExportSnapshot(id)).rejects.toMatchObject({ status: 404 });
  });
  it("validates every inherited skill and denies missing ancestor provenance", async () => {
    const second = structuredClone(row.links[0]);
    second.claim_id = second.claim.id = second.decision.claim_id = "claim-two";
    second.decision_id = second.decision.id = "decision-two";
    second.claim.parent_version_id = "previous-version"; second.claim.source_snapshot = snapshot;
    second.claim.proposed_wording = second.decision.approved_wording = "Second fictional skill.";
    row.links.push(second); row.parent_version_id = "previous-version"; row.version_number = 2;
    row.content_snapshot = `${snapshot}\n\nApproved additional skills\nSecond fictional skill.`;
    expect((await loadExportSnapshot(id)).content).toBe(row.content_snapshot);
    row.links.shift();
    await expect(loadExportSnapshot(id)).rejects.toMatchObject({ status: 404 });
  });
  it("projects no proof metadata, internal identity or unrelated records into the generator input", async () => {
    Object.assign(row, { storage_path: "private-path-sentinel", token: "token-sentinel", unrelated: "unrelated-cv-sentinel" });
    Object.assign(row.links[0].decision, { explanation: "private-note-sentinel", display_name: "private-expert-sentinel" });
    Object.assign(row.links[0].claim.credential, { filename: "private-certificate-sentinel.pdf" });
    const result = JSON.stringify(await loadExportSnapshot(id));
    for (const marker of [owner, "private-path-sentinel", "token-sentinel", "unrelated-cv-sentinel", "private-note-sentinel", "private-expert-sentinel", "private-certificate-sentinel"]) expect(result).not.toContain(marker);
  });
});
