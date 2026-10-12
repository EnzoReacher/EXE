// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import Translator from "./translator";
import { goldenAnswers } from "@/lib/experience-translator/fixtures";

beforeEach(() => { vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => { fn(0); return 1; }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
async function createGolden() {
  render(<Translator />); click("Load fictional example"); click("Continue to details");
  fireEvent.change(screen.getByLabelText("What did you personally implement?"), { target: { value: goldenAnswers.contribution } });
  fireEvent.change(screen.getByLabelText("Which technologies did you directly use?"), { target: { value: goldenAnswers.technology } });
  click("Review source facts");
  for (const box of within(screen.getByRole("group", { name: "Confirm facts about your own work" })).getAllByRole("checkbox")) fireEvent.click(box);
  click("Create CV bullets"); await screen.findByLabelText("English CV wording 1");
}

describe("Translator synthetic journey", () => {
  it("recovers intake validation with labeled inputs and no required CV", () => {
    render(<Translator />); click("Continue to details"); expect(screen.getByRole("alert").textContent).toContain("Project");
    expect(screen.getByLabelText("Your project or experience")).toBeTruthy(); expect(screen.queryByLabelText(/CV file/)).toBeNull();
  });
  it("TC07 skips questions without fabricated facts and keeps generation disabled", () => {
    render(<Translator />); click("Load fictional example"); click("Continue to details");
    expect(screen.getAllByRole("button", { name: /^Skip this question:/ })).toHaveLength(4);
    click("Review source facts"); expect(screen.getByText(/No personal implementation facts were recognized/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Create CV bullets" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("targeted skip clears only that answer and requires fresh fact review", () => {
    render(<Translator />); click("Load fictional example"); click("Continue to details");
    const technology=screen.getByLabelText("Which technologies did you directly use?");
    const contribution=screen.getByLabelText("What did you personally implement?");
    fireEvent.change(technology,{target:{value:"React and JavaScript"}});
    fireEvent.change(contribution,{target:{value:"I built product listing and search."}});
    click("Review source facts");
    click("Skip this question: Which technologies did you directly use?");
    expect((technology as HTMLTextAreaElement).value).toBe("");
    expect((contribution as HTMLTextAreaElement).value).toBe("I built product listing and search.");
    expect(screen.queryByRole("group",{name:"Confirm facts about your own work"})).toBeNull();
    expect((screen.getByRole("button",{name:"Create CV bullets"}) as HTMLButtonElement).disabled).toBe(true);
  });
  it("end-to-end component journey gates copying on current per-bullet acceptance", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined); Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    await createGolden();
    expect((screen.getByRole("button", { name: "Review accepted bullets" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: "I confirm bullet 1 accurately describes my work" }));
    click("Review accepted bullets"); click("Copy accepted bullets");
    await screen.findByText("Accepted bullets copied."); expect(writeText).toHaveBeenCalledWith("• Implemented product listing and search using React and JavaScript.");
    expect(writeText.mock.calls[0][0]).not.toContain("REST"); expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Download accepted TXT" })).toBeTruthy();
  });
  it("TC11 regeneration preserves edits and resets acceptance", async () => {
    await createGolden(); const field = screen.getByLabelText("English CV wording 1");
    fireEvent.change(field, { target: { value: "My edited wording about actual project work." } });
    expect(screen.getByText(/Original sources below apply to the generated version/)).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "I confirm bullet 1 accurately describes my work" }));
    click("Regenerate; keep my edits");
    await waitFor(() => expect((screen.getByLabelText("English CV wording 1") as HTMLTextAreaElement).value).toBe("My edited wording about actual project work."));
    expect((screen.getByRole("checkbox", { name: "I confirm bullet 1 accurately describes my work" }) as HTMLInputElement).checked).toBe(false);
    expect(screen.getAllByLabelText(/English CV wording/)).toHaveLength(2);
  });
  it("TC12/13 independent mounts and clear do not share or retain private project state", async () => {
    await createGolden(); click("Forget this session");
    expect((screen.getByLabelText("Your project or experience") as HTMLTextAreaElement).value).toBe("");
    expect(screen.queryByLabelText("English CV wording 1")).toBeNull();
    cleanup(); render(<Translator />); expect((screen.getByLabelText("Frontend Intern job description") as HTMLTextAreaElement).value).toBe("");
  });
  it("clipboard denial keeps accepted text available for manual copying", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    await createGolden(); fireEvent.click(screen.getByRole("checkbox", { name: "I confirm bullet 1 accurately describes my work" }));
    click("Review accepted bullets"); click("Copy accepted bullets");
    expect((await screen.findByRole("alert")).textContent).toContain("copy it manually");
    expect((screen.getByLabelText("Accepted English bullets") as HTMLTextAreaElement).value).toContain("React");
  });
});
