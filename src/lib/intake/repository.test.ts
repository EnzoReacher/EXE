import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createServer: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createServer }));

import { createCvRecord, getOwnedCv, removeOwnedCv, saveTargetJob } from "./repository";

const owner = { id: "owner-1" };
const cvRow = { id: "cv-1", owner_id: owner.id, storage_path: "owner-1/file.pdf", original_filename: "fictional.pdf", content_type: "application/pdf", byte_size: 100, processing_status: "ready", extracted_text: "fictional", parse_error_code: null };

function client({ user = owner as { id: string } | null, missing = false, storageError = false } = {}) {
  const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: missing ? null : cvRow, error: missing ? new Error("not found") : null }) })) })),
      update,
      insert: vi.fn(),
    })),
    storage: { from: vi.fn(() => ({ remove: vi.fn().mockResolvedValue({ error: storageError ? new Error("storage unavailable") : null }) })) },
    update,
  };
}

describe("owner-scoped repository operations", () => {
  beforeEach(() => vi.resetAllMocks());

  it("denies unauthenticated reads", async () => {
    mocks.createServer.mockResolvedValue(client({ user: null }));
    await expect(getOwnedCv("cv-1")).rejects.toMatchObject({ code: "unauthenticated", status: 401 });
  });

  it("does not reveal a different user's CV", async () => {
    mocks.createServer.mockResolvedValue(client({ missing: true }));
    await expect(getOwnedCv("other-user-cv")).rejects.toMatchObject({ code: "not_found", status: 404 });
  });

  it("denies creating CV or target-job records for a different owner", async () => {
    mocks.createServer.mockResolvedValue(client());
    await expect(createCvRecord("other-user", { storagePath: "other-user/x.pdf", originalFilename: "fictional.pdf", contentType: "application/pdf", byteSize: 1, processingStatus: "processing", extractedText: null, parseErrorCode: null })).rejects.toMatchObject({ code: "forbidden", status: 403 });
    await expect(saveTargetJob("other-user", { roleTitle: "Fictional role", companyName: null, jobDescription: "A sufficiently long fictional job description for this test." })).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });

  it("keeps the private row for retry when Storage deletion fails", async () => {
    const supabase = client({ storageError: true }); mocks.createServer.mockResolvedValue(supabase);
    await expect(removeOwnedCv("cv-1")).rejects.toMatchObject({ code: "delete_failed", status: 500 });
    expect(supabase.update).toHaveBeenCalledWith({ processing_status: "deleting" });
    expect(supabase.update).toHaveBeenCalledWith({ processing_status: "delete_failed" });
  });
});
