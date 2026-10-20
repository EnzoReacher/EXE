import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
const mocks = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/intake/repository", () => ({ requireCurrentUser: mocks.requireCurrentUser }));
import { buildSavedWorkItems } from "./repository";
import { listOwnedSavedWork } from "./repository";

const run = (id: string, owner = "owner-a") => ({ id, owner_id: owner, status: "completed" as const, created_at: "2026-10-02T00:00:00.000Z", updated_at: "2026-10-02T00:00:00.000Z", target_jobs: { role_title: "Fictional junior analyst", company_name: "Example Campus Co." }, cv_documents: { original_filename: "fictional-cv.pdf" } });

describe("saved work DTO", () => {
  beforeEach(() => vi.resetAllMocks());
  it("derives finding counts and draft review state without exposing private source fields", () => {
    const [item] = buildSavedWorkItems([run("run-a")], [{ analysis_run_id: "run-a", status: "supported" }, { analysis_run_id: "run-a", status: "supported" }, { analysis_run_id: "run-a", status: "missing" }], [{ analysis_run_id: "run-a", accepted_at: null }]);
    expect(item.findingCounts).toEqual({ supported: 2, partly_supported: 0, unclear: 0, missing: 1 });
    expect(item).toMatchObject({ hasDraft: true, draftAccepted: false, roleTitle: "Fictional junior analyst" });
    expect(item).not.toHaveProperty("ownerId");
    expect(item).not.toHaveProperty("extractedText");
  });

  it("handles an empty saved-work response safely", () => {
    expect(buildSavedWorkItems([], [], [])).toEqual([]);
  });

  it("does not combine another run's findings or draft metadata", () => {
    const [item] = buildSavedWorkItems([run("run-a")], [{ analysis_run_id: "run-b", status: "missing" }], [{ analysis_run_id: "run-b", accepted_at: "2026-10-02T00:00:00.000Z" }]);
    expect(item.findingCounts.missing).toBe(0);
    expect(item.hasDraft).toBe(false);
  });

  it("requires authentication before listing saved work", async () => {
    mocks.requireCurrentUser.mockRejectedValue({ code: "unauthenticated", status: 401 });
    await expect(listOwnedSavedWork()).rejects.toMatchObject({ code: "unauthenticated", status: 401 });
  });

  it("queries only the authenticated owner's report, finding, and draft metadata", async () => {
    const ownerId = "owner-a";
    const calls: Array<{ table: string; eq: ReturnType<typeof vi.fn> }> = [];
    const supabase = {
      from: vi.fn((table: string) => {
        const eq = vi.fn(() => query); const inFilter = vi.fn(() => query); const order = vi.fn(async () => table === "analysis_runs"
          ? { data: [run("run-a")], error: null }
          : { data: [], error: null });
        const query = { select: vi.fn(() => query), eq, in: inFilter, order };
        calls.push({ table, eq });
        return query;
      }),
    };
    mocks.requireCurrentUser.mockResolvedValue({ supabase, user: { id: ownerId } });
    const items = await listOwnedSavedWork();
    expect(items).toHaveLength(1);
    expect(calls.map((call) => call.table)).toEqual(["analysis_runs", "requirement_findings", "cv_drafts"]);
    expect(calls.every((call) => call.eq.mock.calls.some(([field, value]) => field === "owner_id" && value === ownerId))).toBe(true);
  });
});
