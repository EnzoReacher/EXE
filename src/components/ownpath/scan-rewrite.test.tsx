// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ScanRewrite from "./scan-rewrite";
const cv = "Nguyễn An\nExperience\nHelped customers.\nEducation\nDiploma 2023";
const jd = "Customer service required.";
const scan = { coverage: "Selected requirements; review the JD for other details.", findings: [{ title: "Customer service", requirement: jd, excerpt: "Helped customers.", explanation: "Your CV describes direct customer assistance.", nextStep: "Clarify the service you provided.", priority: "important", expectation: "required", group: "supported" }] };
const rewrite = { replacements: [{ lineId: "b3", original: "Helped customers.", text: "Assisted customers." }], changes: ["Clearer action wording"], notes: [] };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function fill() { fireEvent.change(screen.getByLabelText("Your CV"), { target: { value: cv } }); fireEvent.change(screen.getByLabelText("Target job description"), { target: { value: jd } }); fireEvent.click(screen.getByRole("checkbox")); }
async function scanned() { fireEvent.click(screen.getByRole("button", { name: "Scan CV" })); await screen.findByRole("heading", { name: "Your scan" }); fireEvent.change(screen.getByLabelText("How should we improve it?"), { target: { value: "Keep it concise." } }); }
it("delivers Scan → explain → instructions → complete editable Rewrite without profile or saving", async () => {
  const fetch = vi.fn((url: string) => Promise.resolve(json(url.endsWith("scan") ? scan : rewrite))); vi.stubGlobal("fetch", fetch);
  render(<ScanRewrite />); fill(); await scanned(); expect(fetch).toHaveBeenCalledTimes(1); expect(screen.queryByLabelText("Formatted CV")).toBeNull();
  expect(screen.getByText("Your CV describes direct customer assistance.")).toBeTruthy(); fireEvent.click(screen.getByRole("button", { name: "Rewrite CV" }));
  await screen.findByRole("heading", { name: "Your CV draft" }); expect(screen.getByLabelText("Complete CV text").textContent).toBe(cv.replace("Helped", "Assisted")); expect(fetch).toHaveBeenCalledTimes(2);
  fireEvent.change(screen.getByLabelText("Complete CV text"), { target: { value: "User edited complete CV." } }); expect(screen.getByLabelText("Formatted CV").textContent).toBe("User edited complete CV."); expect(fetch).toHaveBeenCalledTimes(2);
});
it("blocks duplicate scans and ignores late response after source changes", async () => {
  let finish!: (r: Response) => void; const fetch = vi.fn(() => new Promise<Response>(r => { finish = r; })); vi.stubGlobal("fetch", fetch);
  render(<ScanRewrite />); fill(); const button = screen.getByRole("button", { name: "Scan CV" }); act(() => { fireEvent.click(button); fireEvent.click(button); }); expect(fetch).toHaveBeenCalledOnce();
  fireEvent.change(screen.getByLabelText("Your CV"), { target: { value: "A newer CV" } }); await act(async () => finish(json(scan))); expect(screen.queryByRole("heading", { name: "Your scan" })).toBeNull();
});
it("keeps manual edits and cancels an in-flight rewrite when instructions change", async () => {
  let finish!: (r: Response) => void; const fetch = vi.fn().mockResolvedValueOnce(json(scan)).mockResolvedValueOnce(json(rewrite)).mockImplementationOnce(() => new Promise<Response>(r => { finish = r; })); vi.stubGlobal("fetch", fetch);
  render(<ScanRewrite />); fill(); await scanned(); fireEvent.click(screen.getByRole("button", { name: "Rewrite CV" })); await screen.findByRole("heading", { name: "Your CV draft" });
  fireEvent.click(screen.getByRole("button", { name: "Rewrite again" })); fireEvent.change(screen.getByLabelText("Complete CV text"), { target: { value: "My latest manual edit." } });
  fireEvent.change(screen.getByLabelText("How should we improve it?"), { target: { value: "New instructions" } }); await act(async () => finish(json(rewrite))); expect(screen.getByLabelText("Formatted CV").textContent).toBe("My latest manual edit.");
});
it.each([new Response("<html>private error</html>", { status: 502 }), json({ findings: [null], coverage: "bad" }), json({ error: { message: "OpenAI is not configured." } }, 503)])("preserves inputs on malformed/configuration errors", async response => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response)); render(<ScanRewrite />); fill(); fireEvent.click(screen.getByRole("button", { name: "Scan CV" })); await screen.findByRole("alert"); expect((screen.getByLabelText("Your CV") as HTMLTextAreaElement).value).toBe(cv); expect(screen.queryByRole("heading", { name: "Your scan" })).toBeNull();
});
it("cancels a pending operation at session end", async () => {
  let finish!: (r: Response) => void; vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(r => { finish = r; }))); render(<ScanRewrite />); fill(); fireEvent.click(screen.getByRole("button", { name: "Scan CV" }));
  act(() => window.dispatchEvent(new Event("ownpath:session-ended"))); await act(async () => finish(json(scan))); await waitFor(() => expect(screen.queryByRole("heading", { name: "Your scan" })).toBeNull());
});
it("keeps the last usable edited draft when regeneration fails", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(json(scan)).mockResolvedValueOnce(json(rewrite)).mockResolvedValueOnce(json({ error: "Provider unavailable. Retry." }, 502)); vi.stubGlobal("fetch", fetch);
  render(<ScanRewrite />); fill(); await scanned(); fireEvent.click(screen.getByRole("button", { name: "Rewrite CV" })); await screen.findByRole("heading", { name: "Your CV draft" });
  fireEvent.change(screen.getByLabelText("Complete CV text"), { target: { value: "My latest usable draft." } }); fireEvent.click(screen.getByRole("button", { name: "Rewrite again" })); await screen.findByRole("alert");
  expect(screen.getByLabelText("Formatted CV").textContent).toBe("My latest usable draft."); expect(fetch).toHaveBeenCalledTimes(3);
});
it("requires a save acknowledgement, deduplicates an identical retry and marks subsequent edits unsaved", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(json(scan)).mockResolvedValueOnce(json(rewrite)).mockResolvedValueOnce(json({})).mockImplementationOnce((_url, options) => Promise.resolve(json({ saved: true, id: JSON.parse(options.body).id }))); vi.stubGlobal("fetch", fetch);
  render(<ScanRewrite />); fill(); await scanned(); fireEvent.click(screen.getByRole("button", { name: "Rewrite CV" })); await screen.findByRole("heading", { name: "Your CV draft" });
  fireEvent.click(screen.getByRole("button", { name: "Save CV", hidden: true })); await screen.findByRole("alert"); expect(screen.queryByText("CV saved.")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Save CV", hidden: true })); await screen.findByText("CV saved.");
  expect(JSON.parse(fetch.mock.calls[2][1].body).id).toBe(JSON.parse(fetch.mock.calls[3][1].body).id);
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "New title" } }); expect(screen.getByText("Current edits are not saved.")).toBeTruthy(); expect(fetch).toHaveBeenCalledTimes(4);
});
