import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntakeError, type OwnedCv } from "@/lib/intake/types";
vi.mock("@/lib/intake/parser", () => ({ extractCvText: vi.fn() }));
vi.mock("@/lib/intake/validation", () => ({ validateCvFile: vi.fn().mockResolvedValue("pdf") }));
vi.mock("@/lib/intake/repository", () => ({ createCvRecord: vi.fn(), getOwnedCv: vi.fn(), listOwnedCvs: vi.fn(), replaceOwnedCv: vi.fn(), requireCurrentUser: vi.fn(), updateCvRecord: vi.fn() }));
import { extractCvText } from "@/lib/intake/parser";
import { createCvRecord, getOwnedCv, replaceOwnedCv, requireCurrentUser, updateCvRecord } from "@/lib/intake/repository";
import { POST } from "./route";
const id = "83f7a4ec-f0ec-42b7-964a-165191d9e8be";
const upload = vi.fn(); const remove = vi.fn();
const saved = { id: "new-cv", processingStatus: "processing" } as OwnedCv;
function request(replace?: string) { const body = new FormData(); body.set("file", new File(["%PDF-1.4 fictional"], "fictional.pdf", { type: "text/plain" })); if (replace) body.set("replaceCvId", replace); return new Request("https://example.test/api/intake/cv", { method: "POST", body }); }
describe("CV upload and replacement recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upload.mockResolvedValue({ error: null }); remove.mockResolvedValue({ error: null });
    vi.mocked(requireCurrentUser).mockResolvedValue({ user: { id: "fictional-owner" }, supabase: { storage: { from: () => ({ upload, remove }) } } } as unknown as Awaited<ReturnType<typeof requireCurrentUser>>);
    vi.mocked(createCvRecord).mockResolvedValue(saved); vi.mocked(getOwnedCv).mockResolvedValue({ id } as OwnedCv);
    vi.mocked(extractCvText).mockResolvedValue("Fictional parsed source.");
    vi.mocked(updateCvRecord).mockImplementation(async (_id, patch) => ({ ...saved, ...patch }));
    vi.mocked(replaceOwnedCv).mockResolvedValue(undefined);
  });
  it("checks replacement ownership before storing a new file", async () => {
    vi.mocked(getOwnedCv).mockRejectedValue(new IntakeError("not_found", "That CV is unavailable.", 404));
    expect((await POST(request(id))).status).toBe(404); expect(upload).not.toHaveBeenCalled(); expect(createCvRecord).not.toHaveBeenCalled();
  });
  it("keeps the old CV when the replacement cannot be parsed", async () => {
    vi.mocked(extractCvText).mockRejectedValue(new IntakeError("parse_failed", "Could not read this file."));
    const response = await POST(request(id)); expect(response.status).toBe(201); expect((await response.json()).cv.processingStatus).toBe("failed"); expect(replaceOwnedCv).not.toHaveBeenCalled();
  });
  it("replaces only after the new CV is ready and uses the validated MIME", async () => {
    const response = await POST(request(id)); expect(response.status).toBe(201);
    expect(upload).toHaveBeenCalledWith(expect.any(String), expect.any(Uint8Array), { contentType: "application/pdf", upsert: false });
    expect(replaceOwnedCv).toHaveBeenCalledWith(id, expect.objectContaining({ processingStatus: "ready" }));
  });
  it("rejects oversized requests before reading multipart data", async () => {
    const oversized = new Request("https://example.test/api/intake/cv", { method: "POST", headers: { "Content-Length": String(7 * 1024 * 1024) } });
    const response = await POST(oversized); expect(response.status).toBe(400); expect(upload).not.toHaveBeenCalled(); expect(await response.json()).toMatchObject({ code: "file_too_large" });
  });
});
