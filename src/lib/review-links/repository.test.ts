import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/intake/repository", () => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
import { buildOwnerReviewShares } from "./repository";

describe("owner review-share DTO", () => {
  it("keeps feedback scoped to its selected share and derives readable link state", () => {
    const now = Date.now();
    const shares = [
      { id: "share-active", created_at: new Date(now - 1000).toISOString(), expires_at: new Date(now + 86_400_000).toISOString(), expiry_hours: 24, revoked_at: null, cv_draft_id: "draft-accepted" },
      { id: "share-revoked", created_at: new Date(now - 1000).toISOString(), expires_at: new Date(now + 86_400_000).toISOString(), expiry_hours: 168, revoked_at: new Date(now).toISOString(), cv_draft_id: null },
    ];
    const items = buildOwnerReviewShares(shares, [
      { id: "feedback-a", review_share_id: "share-active", reviewer_name: "Fictional mentor", reviewer_role: "Career coach", feedback: "Fictional feedback with enough useful detail.", created_at: new Date(now).toISOString() },
      { id: "feedback-b", review_share_id: "other-share", reviewer_name: null, reviewer_role: null, feedback: "This must not be combined with another share.", created_at: new Date(now).toISOString() },
    ]);
    expect(items[0]).toMatchObject({ state: "active", includesAcceptedDraft: true });
    expect(items[0].feedback).toHaveLength(1); expect(items[1]).toMatchObject({ state: "revoked", includesAcceptedDraft: false });
    expect(items[0]).not.toHaveProperty("token"); expect(items[0]).not.toHaveProperty("ownerId");
  });
});
