import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ require: vi.fn() }));
vi.mock("@/lib/intake/repository", () => ({ requireCurrentUser: mocks.require }));
import { expertQueue, expertDetail, expertDecision, evidenceFile, ownerAction, versionDetail, loadWorkspace } from "./repository";
import { failure } from "./http";
const id = "11111111-1111-4111-8111-111111111111";
let rpc: ReturnType<typeof vi.fn>;
beforeEach(() => { rpc = vi.fn(); mocks.require.mockReset(); mocks.require.mockResolvedValue({ user: { id: "fictional-owner" }, supabase: { rpc } }); });
describe("credential API boundaries", () => {
  it("loads before/after snapshots through exact provenance and owner filtering", async () => {
    const results = [
      { data: { id, content_snapshot: "Original fictional CV\n\nApproved additional skills\nFictional SQL", state: "candidate", parent_version_id: null }, error: null },
      { data: { claim_id: id }, error: null },
      { data: { source_snapshot: "Original fictional CV" }, error: null },
    ];
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockImplementation(async () => results.shift()) };
    const from = vi.fn<(table: string) => typeof query>(() => query);
    mocks.require.mockResolvedValue({ user: { id: "fictional-owner" }, supabase: { from } });
    expect(await versionDetail(id)).toEqual({ id, before: "Original fictional CV", content: "Original fictional CV\n\nApproved additional skills\nFictional SQL", state: "candidate" });
    expect(from.mock.calls.map((call) => call[0])).toEqual(["cv_versions", "cv_version_skill_claims", "credential_skill_claims"]);
    expect(query.eq).toHaveBeenCalledWith("owner_id", "fictional-owner");
    expect(query.eq).toHaveBeenCalledWith("version_id", id);
  });
  it("rejects unauthenticated owner and expert access", async () => {
    mocks.require.mockRejectedValue(new Error("fictional-private-config"));
    await expect(ownerAction({ action: "submit", id })).rejects.toThrow();
    await expect(expertQueue()).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each(["non-expert", "inactive", "self", "unassigned"])("returns neutral errors when database denies %s", async () => {
    rpc.mockResolvedValue({ error: { message: "fictional-secret-path/account" } });
    await expect(expertQueue()).rejects.toThrow(/unavailable/);
    await expect(expertDetail(id)).rejects.toThrow(/unavailable/);
    await expect(expertDecision({ id, decision: "approved", note: "Fictional proof reviewed", proofReviewed: true })).rejects.toThrow(/unavailable/);
  });
  it("does not accept client approval or active status mutations", async () => {
    await expect(ownerAction({ action: "approved", id })).rejects.toThrow(/available action/);
    await expect(ownerAction({ action: "active", id })).rejects.toThrow(/available action/);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("delegates candidate and acceptance to distinct checked database operations", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await ownerAction({ action: "create_version", id });
    await ownerAction({ action: "accept", id });
    expect(rpc.mock.calls).toEqual([["m11a_create_version", { p_claim: id }], ["m11a_review_version", { p_version: id, p_accept: true }]]);
  });
  it("blocks version creation when the database reports a rejected/incomplete claim", async () => {
    rpc.mockResolvedValue({ error: { message: "sensitive record" } });
    await expect(ownerAction({ action: "create_version", id })).rejects.toThrow(/unavailable/);
  });
  it("does not report file removal as success after failed withdrawal cleanup", async () => {
    rpc.mockResolvedValue({ data: "fictional-owner/private-proof.pdf", error: null });
    const remove = vi.fn().mockResolvedValue({ error: {} });
    mocks.require.mockResolvedValue({ user: { id: "fictional-owner" }, supabase: { rpc, storage: { from: () => ({ remove }) } } });
    await expect(ownerAction({ action: "withdraw", id, kind: "credential" })).rejects.toThrow(/withdrawn.*not removed/);
  });
  it("downloads only a checked evidence path and emits bytes, never a public URL", async () => {
    rpc.mockResolvedValue({ data: { path: "fictional-owner/private-proof.pdf", bucket: "credential-private", mime: "application/pdf" }, error: null });
    const download = vi.fn().mockResolvedValue({ data: new Blob(["%PDF-fictional"]), error: null });
    mocks.require.mockResolvedValue({ supabase: { rpc, storage: { from: () => ({ download }) } } });
    const result = await evidenceFile(id, "credential");
    expect(Object.keys(result)).toEqual(["bytes", "mime"]);
    expect(download).toHaveBeenCalledWith("fictional-owner/private-proof.pdf");
  });
  it("filters private version detail by authenticated owner and handles cross-owner denial neutrally", async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ error: {} }) };
    mocks.require.mockResolvedValue({ user: { id: "fictional-owner" }, supabase: { from: () => query } });
    await expect(versionDetail(id)).rejects.toThrow(/unavailable/);
    expect(query.eq).toHaveBeenCalledWith("owner_id", "fictional-owner");
  });
  it("workspace DTOs exclude raw content, owner IDs, private paths and configuration", async () => {
    const rows = { id, owner_id: "account-sentinel", storage_path: "path-sentinel", content_snapshot: "cv-sentinel", extracted_text: "raw-sentinel", filename: "fictional.pdf", original_filename: "fictional.pdf", state: "draft", skill_label: "Fictional SQL", proposed_wording: "Fictional SQL coursework", version_number: 1, created_at: "2026-10-03", credential_id: id };
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), then: (resolve: (v: unknown) => unknown) => resolve({ data: [rows], error: null }) };
    rpc.mockResolvedValue({ data: [], error: null });
    mocks.require.mockResolvedValue({ user: { id: "fictional-owner" }, supabase: { rpc, from: () => query } });
    const result = JSON.stringify(await loadWorkspace());
    for (const sentinel of ["account-sentinel", "path-sentinel", "cv-sentinel", "raw-sentinel"]) expect(result).not.toContain(sentinel);
  });
  it("does not leak unexpected errors or configuration", async () => {
    const result = failure(new Error("fictional-secret-config"));
    expect(result.status).toBe(500);
    expect(await result.text()).not.toContain("fictional-secret-config");
  });
});
