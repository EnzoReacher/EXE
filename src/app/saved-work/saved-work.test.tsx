// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SavedWorkList from "./saved-work-list";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("offers a sign-in route for an expired session and reloads to an announced empty state", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 401 })).mockResolvedValueOnce(new Response(JSON.stringify({ items: [] })));
  vi.stubGlobal("fetch", fetchMock); render(<SavedWorkList />);
  expect((await screen.findByRole("link", { name: "Go to sign in" })).getAttribute("href")).toBe("/assessment");
  await userEvent.click(screen.getByRole("button", { name: "Reload saved work" }));
  await screen.findByRole("heading", { name: "No saved reports yet" });
  expect(screen.getByRole("status").textContent).toContain("No saved reports yet");
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("names report actions with their role and CV context", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [{ analysisId: "sample-run", roleTitle: "Sample analyst", companyName: null, cvFilename: "sample.pdf", updatedAt: "2026-01-01T00:00:00Z", reportStatus: "failed", findingCounts: { supported: 0, partly_supported: 0, unclear: 0, missing: 0 }, hasDraft: false, draftAccepted: false }] }))));
  render(<SavedWorkList />);
  expect((await screen.findByRole("link", { name: "Open and retry report for Sample analyst, sample.pdf" })).getAttribute("href")).toBe("/analysis/sample-run");
  expect(screen.getByRole("link", { name: "Create next steps and draft for Sample analyst, sample.pdf" }).getAttribute("href")).toBe("/analysis/sample-run/next-steps");
  expect(screen.getByRole("status").textContent).toBe("1 saved report loaded.");
});
