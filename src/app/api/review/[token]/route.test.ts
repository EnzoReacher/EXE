import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/review-links/repository", () => ({ getPublicReview: vi.fn(), submitPublicReview: vi.fn() }));
import { getPublicReview, submitPublicReview } from "@/lib/review-links/repository";
import { GET, POST } from "./route";

const context = { params: Promise.resolve({ token: "a".repeat(43) }) };
const request = () => new Request("https://example.test/api/review/fictional", { method: "POST", body: JSON.stringify({ feedback: "Fictional feedback for regression testing." }) });

describe("public review error boundary", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns the same non-storable unavailable response for missing links and thrown infrastructure errors", async () => {
    vi.mocked(getPublicReview).mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("secret database detail"));
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await GET(request(), context);
      expect(response.status).toBe(404);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
      expect(await response.json()).toEqual({ error: "This private review link is not available." });
    }
  });

  it("keeps infrastructure details out of feedback failures", async () => {
    vi.mocked(submitPublicReview).mockRejectedValue(new Error("secret database detail"));
    const response = await POST(request(), context);
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
    expect(await response.json()).toEqual({ error: "This private review link is not available." });
  });

  it("returns valid review content without caching it", async () => {
    const review = { roleTitle: "Fictional role", companyName: null, findings: [], draftContent: null };
    vi.mocked(getPublicReview).mockResolvedValue(review);
    const response = await GET(request(), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
    expect(await response.json()).toEqual({ review });
  });
});
