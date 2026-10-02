// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ noStore: vi.fn(), getPublicReview: vi.fn() }));
vi.mock("next/cache", () => ({ unstable_noStore: mocks.noStore }));
vi.mock("@/lib/review-links/repository", () => ({ getPublicReview: mocks.getPublicReview }));
import PrivateReviewPage, { dynamic, metadata } from "./page";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("private reviewer page boundaries", () => {
  it("keeps unavailable links private, uncacheable and focusable without workspace navigation", async () => {
    mocks.getPublicReview.mockResolvedValue(null);
    render(await PrivateReviewPage({ params: Promise.resolve({ token: "private-test-token" }) }));
    expect(mocks.noStore).toHaveBeenCalledTimes(1);
    expect(dynamic).toBe("force-dynamic");
    expect(metadata.robots).toEqual({ index: false, follow: false });
    const main = screen.getByRole("main");
    expect(main.id).toBe("main-content");
    expect(main.tabIndex).toBe(-1);
    expect(main.textContent).not.toContain("private-test-token");
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("renders only selected report content, not owner identity or raw input internals", async () => {
    mocks.getPublicReview.mockResolvedValue({ roleTitle: "Example role", companyName: null, findings: [{ requirement: "Example requirement", status: "missing", rationale: "No selected evidence", evidenceExcerpt: null, caveat: "Example caveat" }], draftContent: null,
      ownerEmail: "private-owner@example.test", rawCv: "PRIVATE RAW CV", rawJd: "PRIVATE RAW JD" });
    render(await PrivateReviewPage({ params: Promise.resolve({ token: "private-test-token" }) }));
    const main = screen.getByRole("main");
    expect(main.id).toBe("main-content");
    expect(main.tabIndex).toBe(-1);
    expect(mocks.noStore).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { name: "Selected evidence report" })).toBeTruthy();
    expect(screen.getByText("Missing")).toBeTruthy();
    for (const privateText of ["private-owner@example.test", "PRIVATE RAW CV", "PRIVATE RAW JD", "private-test-token"]) expect(main.textContent).not.toContain(privateText);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("navigation")).toBeNull();
  });
});
