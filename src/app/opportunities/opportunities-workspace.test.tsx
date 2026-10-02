// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import OpportunitiesWorkspace from "./opportunities-workspace";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const item = { id: "opportunity-one", targetJobId: "job-one", targetRoleTitle: "Example role", sourceUrl: "https://example.test/job", companyName: "Example employer", note: "Private example", status: "saved", createdAt: "2026-01-01", updatedAt: "2026-01-01" };
const loaded = { items: [item], targetJobs: [{ id: "job-one", roleTitle: "Example role", companyName: "Example employer" }] };
const response = (ok: boolean, body: object) => ({ ok, json: async () => body });
const name = "Example role at Example employer";

describe("opportunity workspace accessibility", () => {
  it("focuses safe cancellation and returns focus on Escape without deleting", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(true, loaded));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<OpportunitiesWorkspace />);
    const trigger = await screen.findByRole("button", { name: `Delete ${name}` });
    await user.click(trigger);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("group", { name: `Confirm deletion of ${name}` }).textContent).toContain("cannot be undone");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("group")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: `Delete ${name}` }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("allows explicit cancellation and focuses the list after confirmed deletion", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(true, loaded)).mockResolvedValueOnce(response(true, {}));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<OpportunitiesWorkspace />);
    await user.click(await screen.findByRole("button", { name: `Delete ${name}` }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: `Delete ${name}` }));
    await user.click(screen.getByRole("button", { name: `Confirm delete ${name}` }));
    await screen.findByText("Your private opportunity was deleted.");
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Saved opportunities" }));
    expect(screen.queryByRole("article")).toBeNull();
    expect(fetchMock.mock.calls[1][1].method).toBe("DELETE");
  });

  it("focuses the editable field, locks concurrent mutations and preserves failed edits", async () => {
    let finish!: (value: object) => void;
    const fetchMock = vi.fn().mockResolvedValueOnce(response(true, loaded))
      .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<OpportunitiesWorkspace />);
    const edit = await screen.findByRole("button", { name: `Edit ${name}` });
    await user.click(edit);
    const company = screen.getByLabelText(/Employer or company/) as HTMLInputElement;
    expect(document.activeElement).toBe(company);
    await user.clear(company);
    await user.type(company, "Changed example");
    await user.click(screen.getByRole("button", { name: "Save private changes" }));
    expect(company.disabled).toBe(true);
    expect((edit as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Cancel edit" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("Saving");
    finish(response(false, { error: "Could not save" }));
    await screen.findByRole("alert");
    expect(company.value).toBe("Changed example");
    expect(company.disabled).toBe(false);
    await user.click(screen.getByRole("button", { name: "Cancel edit" }));
    expect(document.activeElement).toBe(edit);
  });

  it("locks all mutations during deletion and retains the link and confirmation on failure", async () => {
    let finish!: (value: object) => void;
    const fetchMock = vi.fn().mockResolvedValueOnce(response(true, loaded))
      .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<OpportunitiesWorkspace />);
    await user.click(await screen.findByRole("button", { name: `Delete ${name}` }));
    await user.click(screen.getByRole("button", { name: `Confirm delete ${name}` }));
    for (const label of ["Cancel", "Save privately", `Edit ${name}`, `Confirm delete ${name}`]) {
      expect((screen.getByRole("button", { name: label }) as HTMLButtonElement).disabled).toBe(true);
    }
    expect(screen.getByRole("status").textContent).toContain("Deleting");
    finish(response(false, { error: "Could not delete" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("article", { name })).toBeTruthy();
    expect(screen.getByRole("group", { name: `Confirm deletion of ${name}` })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: `Delete ${name}` }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not misrepresent a load failure as empty saved work, and can retry", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("Connection interrupted"))
      .mockResolvedValueOnce(response(true, loaded)));
    const user = userEvent.setup();
    render(<OpportunitiesWorkspace />);
    await screen.findByRole("alert");
    expect(screen.queryByText("No opportunities saved")).toBeNull();
    expect(screen.queryByText("No target jobs available")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Try loading again" }));
    await screen.findByRole("article", { name });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("returns focus to Edit only after a successful save unlocks the actions", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response(true, loaded))
      .mockResolvedValueOnce(response(true, { item })));
    const user = userEvent.setup();
    render(<OpportunitiesWorkspace />);
    const edit = await screen.findByRole("button", { name: `Edit ${name}` });
    await user.click(edit);
    await user.click(screen.getByRole("button", { name: "Save private changes" }));
    await screen.findByText("Your private opportunity was updated.");
    expect(document.activeElement).toBe(edit);
    expect(screen.queryByRole("button", { name: "Cancel edit" })).toBeNull();
  });

  it("explains HTTPS validation and preserves a failed create", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response(true, loaded))
      .mockResolvedValueOnce(response(false, { error: "Could not save" })));
    const user = userEvent.setup();
    render(<OpportunitiesWorkspace />);
    await screen.findByRole("article");
    const url = screen.getByLabelText("HTTPS job link (required)") as HTMLInputElement;
    await user.selectOptions(screen.getByLabelText("Saved target job (required)"), "job-one");
    await user.type(url, "http://example.test/job");
    expect(url.validity.patternMismatch).toBe(true);
    expect(url.getAttribute("aria-describedby")).toBe("opportunity-url-help");
    await user.clear(url);
    await user.type(url, "https://example.test/new-job");
    await user.type(screen.getByLabelText(/Private note/), "Keep this note");
    await user.click(screen.getByRole("button", { name: "Save privately" }));
    await screen.findByRole("alert");
    expect(url.value).toBe("https://example.test/new-job");
    expect((screen.getByLabelText(/Private note/) as HTMLTextAreaElement).value).toBe("Keep this note");
    await waitFor(() => expect((screen.getByRole("button", { name: "Save privately" }) as HTMLButtonElement).disabled).toBe(false));
  });
});
