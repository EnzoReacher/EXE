import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntakeError } from "@/lib/intake/types";
vi.mock("@/lib/intake/repository", () => ({ requireCurrentUser: vi.fn(), getOwnedTargetJob: vi.fn(), removeOwnedTargetJob: vi.fn() }));
import { requireCurrentUser, getOwnedTargetJob, removeOwnedTargetJob } from "@/lib/intake/repository";
import { GET, DELETE } from "./route";

const id = "83f7a4ec-f0ec-42b7-964a-165191d9e8be";
const context = { params: Promise.resolve({ id }) };
const request = new Request("https://example.test/api/intake/jobs/" + id);
describe("private target-job detail and deletion", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.mocked(requireCurrentUser).mockResolvedValue({ user: { id: "fictional-owner" } } as Awaited<ReturnType<typeof requireCurrentUser>>); });
  it("projects only job details needed for a new copy", async () => {
    vi.mocked(getOwnedTargetJob).mockResolvedValue({ id, ownerId: "owner-sentinel", roleTitle: "Fictional analyst", companyName: null, jobDescription: "Fictional job description." });
    const response = await GET(request, context);
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ job: { id, roleTitle: "Fictional analyst", companyName: null, jobDescription: "Fictional job description." } });
  });
  it("denies anonymous deletion before persistence", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValue(new IntakeError("unauthenticated", "Sign in.", 401));
    expect((await DELETE(request, context)).status).toBe(401); expect(removeOwnedTargetJob).not.toHaveBeenCalled();
  });
  it("rejects malformed identifiers before lookup", async () => {
    expect((await GET(request, { params: Promise.resolve({ id: "bad-id" }) })).status).toBe(404); expect(getOwnedTargetJob).not.toHaveBeenCalled();
  });
  it("returns a neutral missing response for cross-owner deletion", async () => {
    vi.mocked(removeOwnedTargetJob).mockRejectedValue(new IntakeError("not_found", "That target job is unavailable or does not belong to you.", 404));
    expect((await DELETE(request, context)).status).toBe(404);
  });
  it("returns 204 only after confirmed deletion", async () => {
    vi.mocked(removeOwnedTargetJob).mockResolvedValue(undefined);
    const response = await DELETE(request, context); expect(response.status).toBe(204); expect(await response.text()).toBe(""); expect(removeOwnedTargetJob).toHaveBeenCalledWith(id);
  });
  it("hides internal database errors", async () => {
    vi.mocked(removeOwnedTargetJob).mockRejectedValue(new Error("database-private-sentinel"));
    const response = await DELETE(request, context); expect(response.status).toBe(500); expect(await response.text()).not.toContain("database-private-sentinel");
  });
});
