// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import CredentialWorkspace from "./workspace";
const id = "11111111-1111-4111-8111-111111111111";
const response = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 403, json: async () => body }) as Response;
const blank = { cvs: [{ id, filename: "fictional-cv.pdf" }], portfolios: [], credentials: [{ id, filename: "fictional-proof.pdf", withdrawn: false }], experts: [{ id, name: "Fictional expert", specialty: null }], claims: [], versions: [] };
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
});
