// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import NextStepsWorkspace from "./next-steps/next-steps-workspace";
import ReviewLinks from "./review-links";
import type { NextStepsDetails } from "@/lib/next-steps/types";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const response = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;
const details: NextStepsDetails = {
  analysisId: "analysis", roleTitle: "Test role", companyName: null, cvFilename: "test.txt", roadmapItems: [],
  draft: { id: "draft", version: 1, content: "Source text", acceptedAt: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", claims: [] },
};

describe("draft review safeguards", () => {
  it("sends expected revision, preserves conflict edits and never auto-retries or accepts stale content", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "private conflict detail" }), { status: 409 })); vi.stubGlobal("fetch",fetch);
    render(<NextStepsWorkspace analysisId="analysis" initialDetails={details} />);fireEvent.change(screen.getByRole("textbox",{name:"CV draft"}),{target:{value:"My conflicting local draft"}});fireEvent.click(screen.getByRole("button",{name:"Save edits"}));await screen.findByRole("button",{name:"Reload saved draft"});
    expect(JSON.parse(fetch.mock.calls[0][1].body).expectedRevision).toBe(1);expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("My conflicting local draft");expect(document.body.textContent).not.toContain("private conflict detail");fireEvent.click(screen.getByRole("button",{name:"Save edits"}));expect(fetch).toHaveBeenCalledOnce();expect((screen.getByRole("button",{name:"Accept after review"}) as HTMLButtonElement).disabled).toBe(true);
  });
  it("ignores a late draft acknowledgement after session end",async()=>{
    let finish!:(value:Response)=>void;vi.stubGlobal("fetch",vi.fn().mockReturnValue(new Promise<Response>(r=>{finish=r;})));render(<NextStepsWorkspace analysisId="analysis" initialDetails={details}/>);fireEvent.click(screen.getByRole("button",{name:"Save edits"}));act(()=>window.dispatchEvent(new Event("ownpath:session-ended")));await act(async()=>finish(response({draft:{...details.draft,version:2}})));expect(screen.queryByRole("textbox")).toBeNull();expect(screen.queryByText(/Your edited draft is saved/)).toBeNull();
  });
  it("retries failed creation without presenting a ready workspace", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response({ error: "Creation failed" }, false)).mockResolvedValueOnce(response({ details })));
    render(<NextStepsWorkspace analysisId="analysis" initialDetails={null} />);
    await user.click(screen.getByRole("button", { name: /Create my roadmap and draft/ }));
    await screen.findByRole("alert");
    expect(screen.queryByRole("textbox")).toBeNull();
    await user.click(screen.getByRole("button", { name: /Create my roadmap and draft/ }));
    await screen.findByRole("textbox", { name: "CV draft" });
  });

  it("prevents draft mutations during a roadmap update", async () => {
    const user = userEvent.setup();
    const item = { id: "item", ordinal: 0, requirement: "Test requirement", findingStatus: "missing" as const, priority: "high" as const, action: "Review text", rationale: "No text found", progress: "not_started" as const, createdAt: "2026-01-01", updatedAt: "2026-01-01" };
    let finish!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; })));
    render(<NextStepsWorkspace analysisId="analysis" initialDetails={{ ...details, roadmapItems: [item] }} />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Progress for Test requirement" }), "in_progress");
    expect((screen.getByRole("button", { name: "Save edits" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Accept after review" }) as HTMLButtonElement).disabled).toBe(true);
    finish(response({ item: { ...item, progress: "in_progress" } }));
    await screen.findByText("Roadmap progress saved: In progress.");
  });

  it("keeps unsaved edits and blocks acceptance after a failed save, then permits review after retry", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ error: "Save failed" }, false))
      .mockResolvedValueOnce(response({ draft: { ...details.draft, version: 2, content: "Edited" } }))
      .mockResolvedValueOnce(response({ draft: { ...details.draft, version: 3, content: "Edited", acceptedAt: "2026-01-02" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<NextStepsWorkspace analysisId="analysis" initialDetails={details} />);
    const editor = screen.getByRole("textbox", { name: "CV draft" });
    await user.clear(editor); await user.type(editor, "Edited");
    await user.click(screen.getByRole("button", { name: "Save edits" }));
    await screen.findByRole("alert");
    expect((editor as HTMLTextAreaElement).value).toBe("Edited");
    expect(editor.getAttribute("aria-describedby")).toContain("draft-error");
    expect((screen.getByRole("button", { name: "Accept after review" }) as HTMLButtonElement).disabled).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Save edits" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Accept after review" }) as HTMLButtonElement).disabled).toBe(false));
    await user.click(screen.getByRole("button", { name: "Accept after review" }));
    await screen.findByText("Saved version accepted");
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).action).toBe("accept_draft");
  });

  it("locks editing and acceptance while save is pending and rejects an unconfirmed success", async () => {
    const user = userEvent.setup();
    let finish!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; })));
    render(<NextStepsWorkspace analysisId="analysis" initialDetails={details} />);
    await user.click(screen.getByRole("button", { name: "Save edits" }));
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Accept after review" }) as HTMLButtonElement).disabled).toBe(true);
    finish(response({}));
    await screen.findByRole("alert");
    expect((screen.getByRole("button", { name: "Accept after review" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText(/Your edited draft is saved/)).toBeNull();
  });
});

describe("review link recovery", () => {
  it("distinguishes loading failure from empty links and supports keyboard retry", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(response({ shares: [] })));
    render(<ReviewLinks analysisId="analysis" />);
    await screen.findByRole("alert");
    expect(screen.queryByText(/No review links yet/)).toBeNull();
    screen.getByRole("button", { name: "Retry loading links" }).focus();
    await user.keyboard("{Enter}");
    await screen.findByText(/No review links yet/);
  });

  it("provides manual copy recovery and updates revoked state without a follow-up load", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    const share = { id: "share", state: "active", createdAt: "2026-01-01", expiresAt: "2026-02-01", expiryHours: 168, includesAcceptedDraft: false, feedback: [] };
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ shares: [] })).mockResolvedValueOnce(response({ token: "a".repeat(43), share })).mockResolvedValueOnce(response({ revoked: true, shareId: share.id }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ReviewLinks analysisId="analysis" />);
    await screen.findByText(/No review links yet/);
    await user.click(screen.getByRole("button", { name: "Create private review link" }));
    await user.click(await screen.findByRole("button", { name: "Copy link" }));
    await screen.findByText(/Clipboard access failed/);
    expect(document.activeElement).toBe(screen.getByRole("textbox"));
    await user.click(screen.getByRole("button", { name: /Revoke link created/ }));
    await screen.findByText("Revoked link");
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
