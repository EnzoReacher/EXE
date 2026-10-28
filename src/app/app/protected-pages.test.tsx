import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { getCurrentUser, redirect } = vi.hoisted(() => ({ getCurrentUser: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getCurrentUser }));
vi.mock("next/navigation", () => ({ redirect }));
import ScanHome from "./page";
import Scan from "./scan/page";
import Rewrite from "./rewrite/page";
import Profile from "./profile/page";
import Tailor from "./tailor/page";
import { GET as session } from "../api/cv-review/session/route";
afterEach(() => vi.resetAllMocks());
it.each([[ScanHome, "/app"], [Scan, "/app/scan"], [Rewrite, "/app/rewrite"], [Profile, "/app/profile"], [Tailor, "/app/tailor"]] as const)("protects a workspace page server-side with its intended destination", async (Page, next) => {
  getCurrentUser.mockResolvedValue(null); redirect.mockImplementation(() => { throw new Error("AUTH_REQUIRED"); });
  await expect(Page()).rejects.toThrow("AUTH_REQUIRED"); expect(redirect).toHaveBeenCalledWith(`/sign-in?next=${next}`);
});
it('leaves the authenticated app alias to the shared Scan workspace without redirecting or mounting legacy content',async()=>{
 getCurrentUser.mockResolvedValue({id:'owner-A'});expect(await ScanHome()).toBeNull();expect(redirect).not.toHaveBeenCalled();
});
it("requires server-verified identity to resume private page memory", async () => {
  getCurrentUser.mockResolvedValue(null); expect((await session()).status).toBe(401);
  getCurrentUser.mockResolvedValue({ id: "owner-A", email: "private@example.test" }); const response = await session();
  expect(await response.json()).toEqual({ owner: "owner-A" }); expect(response.headers.get("cache-control")).toBe("no-store");
});
