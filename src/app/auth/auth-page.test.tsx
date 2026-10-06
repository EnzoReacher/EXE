import { afterEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, redirect } = vi.hoisted(() => ({ getCurrentUser: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getCurrentUser }));
vi.mock("next/navigation", () => ({ redirect }));

import AuthPage from "./auth-page";
import AssessmentPage from "../assessment/page";

afterEach(() => { getCurrentUser.mockReset(); redirect.mockReset(); });

describe("session-aware account and workspace pages", () => {
  for (const mode of ["signIn", "signUp"] as const) {
    it(`redirects an authenticated ${mode} visitor before rendering the form`, async () => {
      getCurrentUser.mockResolvedValue({ id: "synthetic-owner" });
      redirect.mockImplementation(() => { throw new Error("REDIRECT_WORKSPACE"); });
      await expect(AuthPage({ mode, notice: "Confirmation failed" })).rejects.toThrow("REDIRECT_WORKSPACE");
      expect(redirect).toHaveBeenCalledExactlyOnceWith("/assessment");
    });

    it(`keeps ${mode} available to an anonymous visitor`, async () => {
      getCurrentUser.mockResolvedValue(null);
      expect(await AuthPage({ mode })).toBeTruthy();
      expect(redirect).not.toHaveBeenCalled();
    });
  }

  it("redirects an anonymous assessment visitor before mounting private controls", async () => {
    getCurrentUser.mockResolvedValue(null);
    redirect.mockImplementation(() => { throw new Error("REDIRECT_SIGNIN"); });
    await expect(AssessmentPage()).rejects.toThrow("REDIRECT_SIGNIN");
    expect(redirect).toHaveBeenCalledExactlyOnceWith("/sign-in");
  });

  it("renders an authenticated assessment without redirecting", async () => {
    getCurrentUser.mockResolvedValue({ id: "synthetic-owner" });
    expect(await AssessmentPage()).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });
});
