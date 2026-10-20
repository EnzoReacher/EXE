import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createServer: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createServer }));
vi.mock("server-only", () => ({}));

import { createOrGetAnalysisRun, getOwnedAnalysisInputs } from "./repository";

const ownerId = "owner-1";

function client({ user = { id: ownerId }, cvOwner = ownerId, jobOwner = ownerId, cvStatus = "ready" }: { user?: { id: string } | null; cvOwner?: string; jobOwner?: string; cvStatus?: string } = {}) {
  const rows: Record<string, unknown> = {
    cv_documents: { id: "cv-1", owner_id: cvOwner, original_filename: "fictional.pdf", processing_status: cvStatus, extracted_text: "Fictional CV text." },
    target_jobs: { id: "job-1", owner_id: jobOwner, role_title: "Fictional analyst", company_name: null, job_description: "A fictional job requiring SQL and clear communication." },
  };
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn((table: string) => {
      const builder = {
        eq: vi.fn(() => builder),
        single: vi.fn().mockResolvedValue({ data: rows[table], error: null }),
      };
      return { select: vi.fn(() => builder) };
    }),
  };
}

describe("analysis input ownership", () => {
  beforeEach(() => vi.resetAllMocks());

  it("requires an authenticated owner", async () => {
    mocks.createServer.mockResolvedValue(client({ user: null }));
    await expect(getOwnedAnalysisInputs("cv-1", "job-1")).rejects.toMatchObject({ code: "unauthenticated", status: 401 });
  });

  it("does not allow a different user's CV or target job", async () => {
    mocks.createServer.mockResolvedValue(client({ cvOwner: "other-user" }));
    await expect(getOwnedAnalysisInputs("cv-1", "job-1")).rejects.toMatchObject({ code: "cv_not_found", status: 404 });
    mocks.createServer.mockResolvedValue(client({ jobOwner: "other-user" }));
    await expect(getOwnedAnalysisInputs("cv-1", "job-1")).rejects.toMatchObject({ code: "job_not_found", status: 404 });
  });

  it("refuses to analyze a CV that has not been processed", async () => {
    mocks.createServer.mockResolvedValue(client({ cvStatus: "failed" }));
    await expect(getOwnedAnalysisInputs("cv-1", "job-1")).rejects.toMatchObject({ code: "cv_not_ready", status: 409 });
  });

  it("reuses a completed run for the same owner-scoped request ID", async () => {
    const requestId = "8e0fcead-9f17-4b9e-bf36-22785a1dd144";
    const existingRun = {
      id: "run-1", owner_id: ownerId, cv_document_id: "cv-1", target_job_id: "job-1", client_request_id: requestId,
      status: "completed", provider_name: "local-evidence", provider_version: "1.0.0", schema_version: "m2.1",
      engine_version: "local-evidence-1", prompt_version: null, failure_code: null,
      created_at: "2026-10-01T00:00:00.000Z", updated_at: "2026-10-01T00:00:00.000Z", completed_at: "2026-10-01T00:00:00.000Z",
    };
    const query = { eq: vi.fn(() => query), maybeSingle: vi.fn().mockResolvedValue({ data: existingRun, error: null }) };
    const insert = vi.fn();
    mocks.createServer.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: ownerId } }, error: null }) },
      from: vi.fn(() => ({ select: vi.fn(() => query), insert })),
    });

    const result = await createOrGetAnalysisRun(ownerId, "cv-1", "job-1", requestId);
    expect(result.existed).toBe(true);
    expect(result.run.id).toBe("run-1");
    expect(result.run.status).toBe("completed");
    expect(insert).not.toHaveBeenCalled();
  });
});
