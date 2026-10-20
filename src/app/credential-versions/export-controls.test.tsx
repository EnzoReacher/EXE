// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ExportControls from "./export-controls";
const version = { id: "11111111-1111-4111-8111-111111111111", sourceCvId: "fictional-source", sourceName: "fictional-cv.pdf", number: 1, state: "accepted", acceptedAt: "2026-10-04", createdAt: "2026-10-04", changes: ["Fictional SQL"] };
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("keyboard-accessible accepted CV exports", () => {
  it.each(["candidate", "rejected", "evidence_withdrawn"])("explains blocked %s state without download or print actions", (state) => {
    render(<ExportControls version={{ ...version, state }} />);
    expect(screen.queryByRole("button")).toBeNull(); expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText(state === "candidate" ? /Accept this candidate/ : state === "rejected" ? /Rejected versions/ : /supporting evidence was withdrawn/)).toBeTruthy();
  });
  it.each(["accepted", "superseded"])("provides truthful %s download and browser-print labels", (state) => {
    render(<ExportControls version={{ ...version, state }} />);
    expect(screen.getByRole("button", { name: /Download editable DOCX/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Print \/ Save as PDF/ }).getAttribute("href")).toBe(`/credential-versions/${version.id}/print`);
    expect(screen.queryByText(/Download PDF/)).toBeNull();
  });
  it("announces loading, blocks duplicate keyboard requests, and reports safe retryable failures", async () => {
    const user = userEvent.setup(); let complete!: (response: Response) => void;
    const fetch = vi.fn().mockImplementationOnce(() => new Promise<Response>((resolve) => { complete = resolve; })).mockResolvedValue({ ok: false, status: 401 });
    vi.stubGlobal("fetch", fetch); render(<ExportControls version={version} />);
    const button = screen.getByRole("button", { name: /Download editable DOCX/ }); button.focus(); await user.keyboard("{Enter}");
    expect(screen.getByRole("status").textContent).toContain("Preparing your private CV");
    expect(button.hasAttribute("disabled")).toBe(true); await user.keyboard("{Enter}"); expect(fetch).toHaveBeenCalledTimes(1);
    complete({ ok: false, status: 404 } as Response);
    expect((await screen.findByRole("alert")).textContent).toContain("Refresh version history or retry");
    await waitFor(() => expect(document.activeElement).toBe(button)); await user.keyboard("{Enter}");
    expect((await screen.findByRole("alert")).textContent).toContain("Sign in again");
  });
  it("requests the private download by keyboard without claiming the file was saved", async () => {
    const user = userEvent.setup();
    const create = vi.fn(() => "blob:fictional-test"); const revoke = vi.fn();
    const NativeURL = URL;
    vi.stubGlobal("URL", class extends NativeURL { static createObjectURL = create; static revokeObjectURL = revoke; });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": 'attachment; filename="fictional-version-1.txt"' }), blob: async () => new Blob(["Fictional CV"]) }));
    render(<ExportControls version={version} />);
    const button = screen.getByRole("button", { name: /Download TXT/ }); button.focus(); await user.keyboard("{Enter}");
    await screen.findByText(/CV download requested/);
    expect(click).toHaveBeenCalledTimes(1); expect(create).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/File saved successfully/)).toBeNull();
    expect(document.activeElement).toBe(button);
  });
});
