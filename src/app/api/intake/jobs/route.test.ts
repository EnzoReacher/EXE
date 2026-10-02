import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/intake/repository", () => ({ requireCurrentUser: vi.fn(), saveTargetJob: vi.fn(), listOwnedTargetJobs: vi.fn() }));
import { requireCurrentUser, saveTargetJob } from "@/lib/intake/repository";
import { POST } from "./route";

describe("target-job request validation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue({ user: { id: "fictional-owner" } } as Awaited<ReturnType<typeof requireCurrentUser>>);
  });

  it.each(["{", "null", "[]", "{}", '{"roleTitle":42}', JSON.stringify({ roleTitle: "QA", jobDescription: 42 }), JSON.stringify({ roleTitle: "QA", companyName: {}, jobDescription: "Fictional description with sufficient detail." })])("rejects malformed JSON or wrong field types before persistence: %s", async (body) => {
    const response = await POST(new Request("https://example.test/api/intake/jobs", { method: "POST", body }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: expect.stringMatching(/^invalid_/) });
    expect(saveTargetJob).not.toHaveBeenCalled();
  });

  it("preserves normalized valid intake", async () => {
    vi.mocked(saveTargetJob).mockResolvedValue({ id: "job" } as Awaited<ReturnType<typeof saveTargetJob>>);
    const response = await POST(new Request("https://example.test/api/intake/jobs", { method: "POST", body: JSON.stringify({ roleTitle: " QA ", companyName: " Example Co ", jobDescription: " Fictional description with sufficient detail. " }) }));
    expect(response.status).toBe(201);
    expect(saveTargetJob).toHaveBeenCalledWith("fictional-owner", { roleTitle: "QA", companyName: "Example Co", jobDescription: "Fictional description with sufficient detail." });
  });
});
