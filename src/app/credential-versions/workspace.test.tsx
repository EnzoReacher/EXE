// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import CredentialWorkspace from "./workspace";
import type { Claim, Version } from "@/lib/credential-versions/types";
const id = "11111111-1111-4111-8111-111111111111";
const response = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 403, json: async () => body }) as Response;
const blank = { cvs: [{ id, filename: "fictional-cv.pdf" }], portfolios: [], credentials: [{ id, filename: "fictional-proof.pdf", withdrawn: false }], experts: [{ id, name: "Fictional expert", specialty: null }], claims: [], versions: [] };
const claim = (state: string, extra: Partial<Claim> = {}): Claim => ({ id, sourceCvId: id, sourceName: "fictional-cv.pdf", skill: "Fictional SQL", wording: "Fictional SQL coursework", state, createdAt: "2026-10-04", credentialId: id, portfolioId: null, note: null, canWithdraw: true, ...extra });
const version = (state: string, extra: Partial<Version> = {}): Version => ({ id, sourceCvId: id, sourceName: "fictional-cv.pdf", number: 1, state, createdAt: "2026-10-04", acceptedAt: null, changes: ["Fictional SQL"], ...extra });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("owner credential forms", () => {
  it("reports malformed workspace data safely and recovers on retry", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ ok: true })).mockResolvedValueOnce(response(blank));
    vi.stubGlobal("fetch", fetchMock);
    render(<CredentialWorkspace />);
    expect((await screen.findByRole("alert")).textContent).toContain("could not be loaded");
    await user.click(screen.getByRole("button", { name: "Retry loading" }));
    await screen.findByText("No skill claims yet.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("announces missing proof/source/wording and focuses the input without submitting", async () => {
    const user = userEvent.setup(); const fetchMock = vi.fn().mockResolvedValue(response(blank)); vi.stubGlobal("fetch", fetchMock);
    render(<CredentialWorkspace />);
    const button = await screen.findByRole("button", { name: "Save draft claim" });
    button.focus(); await user.keyboard("{Enter}");
    await screen.findByRole("alert");
    expect(document.activeElement).toBe(screen.getByLabelText(/Source CV/));
    expect(screen.getByLabelText(/Skill label/).getAttribute("aria-invalid")).toBe("true");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("requires reviewing a candidate and explicit confirmation before acceptance", async () => {
     const user = userEvent.setup(); const fetchMock = vi.fn().mockResolvedValueOnce(response({ ...blank, versions: [{ id, number: 1, state: "candidate", createdAt: "2026-10-03", acceptedAt: null, changes: ["Fictional SQL"] }] })).mockResolvedValueOnce(response({ id, before: "Original fictional CV", content: "Original fictional CV\nFictional SQL", state: "candidate" })).mockResolvedValueOnce(response({ ok: true })).mockResolvedValueOnce(response(blank)); vi.stubGlobal("fetch", fetchMock);
    render(<CredentialWorkspace />);
    expect(screen.queryByRole("button", { name: "Accept candidate after review" })).toBeNull();
    await user.click(await screen.findByRole("button", { name: "Review version 1" }));
    await user.click(await screen.findByRole("button", { name: "Accept candidate after review" }));
    expect(screen.getByRole("heading", { name: "Before — preserved source" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "After — exact approved addition" })).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" })));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("button", { name: "Confirm action" })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole("button", { name: "Accept candidate after review" }));
    await user.click(screen.getByRole("button", { name: "Confirm action" }));
    await screen.findByText(/Private action confirmed/);
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).action).toBe("accept");
  });
  it("does not display an empty authorized workspace after denied access; supports keyboard retry", async () => {
    const user = userEvent.setup(); vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response({}, false)).mockResolvedValue(response(blank)));
    render(<CredentialWorkspace />); await screen.findByRole("alert");
    expect(screen.queryByText("No skill claims yet.")).toBeNull();
    screen.getByRole("button", { name: "Retry loading" }).focus(); await user.keyboard("{Enter}");
    await screen.findByText("No skill claims yet.");
  });
  it("filters same-number CV histories by source and next action without fetching or changing records", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(response({ ...blank, cvs: [...blank.cvs, { id: "other", filename: "other-fictional.pdf" }], claims: [claim("submitted"), claim("draft", { id: "c2", sourceCvId: "other", sourceName: "other-fictional.pdf", skill: "Other skill" })], versions: [version("candidate"), version("accepted", { id: "v2", sourceCvId: "other", sourceName: "other-fictional.pdf", acceptedAt: "2026-10-04" })] }));
    vi.stubGlobal("fetch", fetchMock); render(<CredentialWorkspace />);
    await screen.findByRole("heading", { name: "Your next steps" });
    expect(screen.getAllByRole("heading", { name: "Version 1" })).toHaveLength(2);
    await user.selectOptions(screen.getByLabelText("Filter by source CV"), id);
    await user.selectOptions(screen.getByLabelText("Filter by next step"), "waiting");
    expect(screen.getByText("Waiting for expert", { selector: "p" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Other skill" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Version 1" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getAllByRole("heading", { name: "Version 1" })).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("copies a needs-information claim into a new unsent proposal and requires choosing an expert again", async () => {
    const user = userEvent.setup(); const fetchMock = vi.fn().mockResolvedValue(response({ ...blank, claims: [claim("needs_information", { note: "Fictional missing context" })] }));
    vi.stubGlobal("fetch", fetchMock); render(<CredentialWorkspace />);
    await user.click(await screen.findByRole("button", { name: "Prepare a new claim for Fictional SQL" }));
    expect((screen.getByLabelText(/Skill label/) as HTMLInputElement).value).toBe("Fictional SQL");
    expect((screen.getByLabelText(/Exact proposed CV wording/) as HTMLTextAreaElement).value).toBe("Fictional SQL coursework");
    expect((screen.getByLabelText(/Team-approved expert/) as HTMLSelectElement).value).toBe("");
    expect(document.activeElement).toBe(screen.getByLabelText(/Skill label/));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Expert explanation: Fictional missing context")).toBeTruthy();
  });
  it("closes a stale candidate on refresh after withdrawal and restores focus when a review closes", async () => {
    const user = userEvent.setup(); const fetchMock = vi.fn().mockResolvedValueOnce(response({ ...blank, versions: [version("candidate")] })).mockResolvedValueOnce(response({ id, before: "Original", content: "Original\nSQL", state: "candidate" })).mockResolvedValueOnce(response({ id, before: "Original", content: "Original\nSQL", state: "candidate" })).mockResolvedValueOnce(response({ ...blank, versions: [version("evidence_withdrawn")] }));
    vi.stubGlobal("fetch", fetchMock); render(<CredentialWorkspace />);
    const review = await screen.findByRole("button", { name: "Review version 1" });
    await user.click(review); await user.click(await screen.findByRole("button", { name: "Close version review" }));
    expect(document.activeElement).toBe(review);
    await user.click(review); await screen.findByRole("button", { name: "Accept candidate after review" });
    await user.click(screen.getByRole("button", { name: "Refresh private workspace" }));
    await screen.findByText("Export is unavailable because supporting evidence was withdrawn.");
    expect(screen.queryByRole("button", { name: "Accept candidate after review" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Immutable CV snapshot" })).toBeNull();
  });
  it("reports partial evidence deletion with safe recovery wording instead of a raw response", async () => {
    const user = userEvent.setup(); const fetchMock = vi.fn().mockResolvedValueOnce(response(blank)).mockResolvedValueOnce(response({ code: "delete_pending", error: "private-path-sentinel" }, false));
    vi.stubGlobal("fetch", fetchMock); render(<CredentialWorkspace />);
    await user.click(await screen.findByRole("button", { name: "Withdraw and delete fictional-proof.pdf" }));
    await user.click(screen.getByRole("button", { name: "Confirm action" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("private file deletion is still pending");
    expect(alert.textContent).not.toContain("private-path-sentinel");
    expect(screen.getByRole("button", { name: "Retry loading" })).toBeTruthy();
  });
  it("distinguishes a saved action from a failed refresh and does not resubmit it on retry", async () => {
    const user = userEvent.setup(); const fetchMock = vi.fn().mockResolvedValueOnce(response({ ...blank, claims: [claim("draft")] })).mockResolvedValueOnce(response({ ok: true })).mockRejectedValueOnce(new Error("private-network-sentinel")).mockResolvedValueOnce(response({ ...blank, claims: [claim("submitted")] }));
    vi.stubGlobal("fetch", fetchMock); render(<CredentialWorkspace />);
    await user.click(await screen.findByRole("button", { name: "Submit Fictional SQL for expert review" }));
    expect((await screen.findByRole("alert")).textContent).toContain("action was saved");
    expect(screen.queryByRole("heading", { name: "Skill claims" })).toBeNull();
    expect(screen.queryByText(/private-network-sentinel/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Retry loading" }));
    await screen.findByText("Waiting for expert", { selector: "p" });
    expect(fetchMock.mock.calls.filter((call) => call[1]?.method === "POST")).toHaveLength(1);
  });
  it("refuses mismatched snapshot IDs and leaves no candidate acceptance action", async () => {
    const user = userEvent.setup(); const fetchMock = vi.fn().mockResolvedValueOnce(response({ ...blank, versions: [version("candidate")] })).mockResolvedValueOnce(response({ id: "other-private-version", before: "Fictional source", content: "Fictional addition", state: "candidate" }));
    vi.stubGlobal("fetch", fetchMock); render(<CredentialWorkspace />);
    await user.click(await screen.findByRole("button", { name: "Review version 1" }));
    expect((await screen.findByRole("alert")).textContent).toContain("private detail could not be loaded");
    expect(screen.queryByRole("button", { name: "Accept candidate after review" })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
describe("expert accessible decision form", () => {
  it("reports malformed queue data without rendering unauthorized assignments", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ ok: true })));
    render(<CredentialWorkspace expert />);
    expect((await screen.findByRole("alert")).textContent).toContain("could not be loaded");
    expect(screen.queryByText("No submitted claims assigned to you.")).toBeNull();
  });
  it("requires explanation and reviewed-proof confirmation, then saves only the exact assignment", async () => {
    const user = userEvent.setup(); const detail = { id, skill: "Fictional SQL", wording: "Fictional SQL coursework", context: "Selected fictional context", hasPortfolio: false };
    const fetchMock = vi.fn().mockResolvedValueOnce(response([detail])).mockResolvedValueOnce(response(detail)).mockResolvedValueOnce(response({ ok: true })).mockResolvedValueOnce(response([])); vi.stubGlobal("fetch", fetchMock);
    render(<CredentialWorkspace expert />);
    await user.click(await screen.findByRole("button", { name: "Review Fictional SQL" }));
    const save = await screen.findByRole("button", { name: "Save expert decision" }); save.focus(); await user.keyboard("{Enter}");
    await screen.findByRole("alert"); expect(document.activeElement).toBe(screen.getByLabelText(/Explanation/));
    await user.type(screen.getByLabelText(/Explanation/), "Reviewed only fictional proof.");
    await user.click(save); await screen.findByText(/Confirm that you reviewed/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole("checkbox")); await user.selectOptions(screen.getByLabelText("Expert decision"), "approved"); await user.click(save);
    await screen.findByText(/Expert decision saved/);
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ id, decision: "approved", note: "Reviewed only fictional proof.", proofReviewed: true });
    expect(screen.queryByText(/Private documents/)).toBeNull();
  });
  it("resets decision, note and acknowledgement when opening another assigned claim", async () => {
    const user = userEvent.setup();
    const first = { id, skill: "SQL", wording: "Fictional SQL", context: "Fictional context", hasPortfolio: false };
    const second = { ...first, id: "22222222-2222-4222-8222-222222222222", skill: "Python" };
    const fetchMock = vi.fn().mockResolvedValueOnce(response([first, second])).mockResolvedValueOnce(response(first)).mockResolvedValueOnce(response(second));
    vi.stubGlobal("fetch", fetchMock); render(<CredentialWorkspace expert />);
    await user.click(await screen.findByRole("button", { name: "Review SQL" }));
    await user.type(await screen.findByLabelText(/Explanation/), "Review of first fictional proof only.");
    await user.selectOptions(screen.getByLabelText("Expert decision"), "approved"); await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Review Python" }));
    await screen.findByRole("heading", { name: "Review assigned skill: Python" });
    expect((screen.getByLabelText(/Explanation/) as HTMLTextAreaElement).value).toBe("");
    expect((screen.getByLabelText("Expert decision") as HTMLSelectElement).value).toBe("needs_information");
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
    await user.type(screen.getByLabelText(/Explanation/), "Review of second fictional proof."); await user.click(screen.getByRole("button", { name: "Save expert decision" }));
    await screen.findByText(/Confirm that you reviewed/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await user.click(screen.getByRole("button", { name: "Close assigned review" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Review Python" }));
  });
  it("refuses malformed expert detail and never renders a decision form from it", async () => {
    const user = userEvent.setup(); const fetchMock = vi.fn().mockResolvedValueOnce(response([{ id, skill: "SQL", wording: "Fictional SQL" }])).mockResolvedValueOnce(response({ id, skill: "SQL", wording: "Fictional SQL", context: {}, hasPortfolio: false }));
    vi.stubGlobal("fetch", fetchMock); render(<CredentialWorkspace expert />);
    await user.click(await screen.findByRole("button", { name: "Review SQL" }));
    expect((await screen.findByRole("alert")).textContent).toContain("private detail could not be loaded");
    expect(screen.queryByRole("button", { name: "Save expert decision" })).toBeNull();
  });
});
