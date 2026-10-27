// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useState, type ComponentProps } from "react";
import ScanRewriteView from "./scan-rewrite";
import { forgetOperationIdentities, setUncertainAttempt } from "@/lib/scan-rewrite/request-identity";
function ScanRewrite(props: ComponentProps<typeof ScanRewriteView>) {
  const [view, setView] = useState<"scan" | "rewrite" | "hidden">("scan");
  return <><button onClick={() => setView("scan")}>Test Scan view</button><button onClick={() => setView("rewrite")}>Test Rewrite view</button><button onClick={() => setView("hidden")}>Test elsewhere</button><ScanRewriteView {...props} view={view} /></>;
}
HTMLElement.prototype.scrollIntoView = vi.fn();
const cv = "Nguyễn An\nExperience\nHelped customers.\nEducation\nDiploma 2023";
const jd = "Customer service required.";
const scan = { coverage: "Selected requirements; review the JD for other details.", findings: [{ title: "Customer service", requirement: jd, excerpt: "Helped customers.", explanation: "Your CV describes direct customer assistance.", nextStep: "Clarify the service you provided.", priority: "important", expectation: "required", group: "supported" }] };
const rewrite = { replacements: [{ lineId: "b3", original: "Helped customers.", text: "Assisted customers." }], changes: ["Clearer action wording"], notes: [] };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });
HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
function mockFetch(fetch: (url: string, options?: RequestInit) => Promise<Response>, external = false) { vi.stubGlobal("fetch", (url: string, options?: RequestInit) => url.endsWith("disclosure") ? Promise.resolve(json({ provider: "OpenAI", purpose: "test-v1", external })) : url.includes("extract?") ? Promise.resolve(json({ text: cv })) : fetch(url, options)); }
afterEach(() => { cleanup(); forgetOperationIdentities(); document.body.removeAttribute("tabindex"); vi.unstubAllGlobals(); sessionStorage.clear(); });
async function fill() { fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [new File(["synthetic"], "synthetic.pdf", { type: "application/pdf" })] } }); await screen.findByText("Extraction complete."); fireEvent.click(screen.getByText("Review extracted text")); fireEvent.change(screen.getByLabelText("Target job"), { target: { value: jd } }); }
async function scanned() { fireEvent.click(screen.getByRole("button", { name: "Scan CV" })); await screen.findByRole("heading", { name: "Your scan" }); fireEvent.click(screen.getByRole("button", { name: "Test Rewrite view" })); fireEvent.change(screen.getByLabelText("How should we improve it?"), { target: { value: "Keep it concise." } }); }
async function pausedScan(external = false) {
  const send = vi.fn().mockResolvedValue(json({ error: { code: "reconciliation_required", message: "PRIVATE" } }, 502));
  mockFetch(send, external); render(<ScanRewrite />); await fill(); fireEvent.click(screen.getByRole("button", { name: "Scan CV" }));
  await screen.findByRole("button", { name: "Review and continue" });
  return send;
}
async function openRecovery() {
  const trigger = screen.getByRole("button", { name: "Review and continue" }); trigger.focus(); fireEvent.click(trigger);
  return screen.findByRole("dialog", { name: "Review and continue" });
}
async function confirmRecovery() {
  await openRecovery(); fireEvent.click(screen.getByRole("checkbox", { name: "I understand the previous request remains unresolved." }));
  fireEvent.click(screen.getByRole("button", { name: "Prepare a new request" }));
  await screen.findByText(/New request prepared/);
}
it("keeps normal recovery controls out of the healthy workspace", async () => {
  mockFetch(vi.fn().mockResolvedValue(json({}))); render(<ScanRewrite />); await fill();
  expect(screen.queryByRole('button', { name: 'Review an unresolved request' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Review and continue' })).toBeNull();
});
it("keeps recovery unchecked and cancel-first; Cancel and Escape preserve pause, inputs, attachment and identity", async () => {
  const send = await pausedScan(); const storage = { ...sessionStorage };
  await openRecovery(); expect(document.activeElement?.textContent).toBe("Cancel");
  expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
  expect((screen.getByRole("button", { name: "Prepare a new request" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Prepare a new request" })); expect(send).toHaveBeenCalledOnce();
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Cancel" })));
  expect(document.activeElement?.textContent).toBe("Review and continue");
  expect((screen.getByRole("button", { name: "Scan CV" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByLabelText("Your CV") as HTMLTextAreaElement).value).toBe(cv); expect((screen.getByLabelText("Target job") as HTMLTextAreaElement).value).toBe(jd);
  expect(screen.getByText("synthetic.pdf")).toBeTruthy(); expect({ ...sessionStorage }).toEqual(storage);
  await openRecovery(); fireEvent(screen.getByRole("dialog"), new Event("cancel", { bubbles: false, cancelable: true }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull()); expect(send).toHaveBeenCalledOnce();
});
it("prepares exactly one distinct ID without sending or reconciling; the next click starts one request", async () => {
  const send = await pausedScan(true); const oldId = JSON.parse(send.mock.calls[0][1].body).requestId;
  await openRecovery(); fireEvent.click(screen.getByRole("checkbox")); const prepare = screen.getByRole("button", { name: "Prepare a new request" });
  act(() => { fireEvent.click(prepare); fireEvent.click(prepare); });
  await screen.findByText(/New request prepared/); const prepared = Object.entries({ ...sessionStorage }).filter(([key]) => key.startsWith("ownpath-ai-operation:")).map(([, value]) => value);
  expect(prepared).toHaveLength(1); expect(prepared[0]).not.toBe(oldId); expect(send).toHaveBeenCalledOnce();
  expect(screen.queryByRole("button", { name: "Review and continue" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Scan CV" })); await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(JSON.parse(send.mock.calls[1][1].body).requestId).toBe(prepared[0]);
  expect(send.mock.calls.every(([url]) => url.endsWith("scan"))).toBe(true);
});
it.each(["reconcile", "busy", "quota", "plan_limit"])("shows the authoritative %s gate after local recovery without treating acknowledgement as reconciliation", async code => {
  const send = await pausedScan(); await confirmRecovery();
  send.mockResolvedValue(json({ error: { code, message: `Authoritative ${code} gate.` } }, 409));
  fireEvent.click(screen.getByRole("button", { name: "Scan CV" })); expect((await screen.findByRole("alert")).textContent).toBe(`Authoritative ${code} gate.`);
  expect(send).toHaveBeenCalledTimes(2); expect(screen.queryByRole("button", { name: "Review and continue" })).toBeNull();
});
it("shows the actual pre-dispatch reconciliation gate without creating a new uncertainty marker", async () => {
  const message = "Earlier AI requests have uncertain outcomes. The owner must reconcile usage before AI can resume. Your work is kept; editing and exports remain available.";
  const send = vi.fn().mockResolvedValue(json({ error: { code: "reconciliation_required", message } }, 429));
  mockFetch(send); render(<ScanRewrite />); await fill();
  fireEvent.click(screen.getByRole("button", { name: "Scan CV" }));
  expect((await screen.findByRole("alert")).textContent).toBe(message);
  expect(sessionStorage.getItem("ownpath-ai-uncertainty")).toBeNull();
  expect(screen.queryByRole("button", { name: "Review and continue" })).toBeNull();
  expect(send).toHaveBeenCalledOnce();
  expect((screen.getByLabelText("Your CV") as HTMLTextAreaElement).value).toBe(cv);
  expect((screen.getByLabelText("Target job") as HTMLTextAreaElement).value).toBe(jd);
});
it("preserves findings, instructions and manual edits through uncertain Rewrite recovery", async () => {
  const send = vi.fn().mockResolvedValueOnce(json(scan)).mockResolvedValueOnce(json(rewrite)).mockResolvedValueOnce(json({}, 502)); mockFetch(send);
  render(<ScanRewrite />); await fill(); await scanned(); fireEvent.click(screen.getByRole("button", { name: "Rewrite CV" })); await screen.findByRole("heading", { name: "Your rewritten CV is ready" });
  fireEvent.change(screen.getByLabelText("Complete CV text"), { target: { value: "My manual draft." } });
  fireEvent.click(screen.getByRole("button", { name: "Rewrite again" })); fireEvent.click(await screen.findByRole("button", { name: "Rewrite edited CV" })); await screen.findByRole("button", { name: "Review and continue" });
  await confirmRecovery(); expect(send).toHaveBeenCalledTimes(3);
  expect((screen.getByLabelText("Complete CV text") as HTMLTextAreaElement).value).toBe("My manual draft.");
  expect((screen.getByLabelText("How should we improve it?") as HTMLTextAreaElement).value).toBe("Keep it concise.");
  expect(document.querySelector("#rewrite-explanation-0")?.textContent).toBe(scan.findings[0].explanation);
});
it("ignores an older delayed Scan after recovery and dismisses review on session end", async () => {
  let finish!: (value: Response) => void;
  const send = vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; })).mockResolvedValue(json({}, 502)); mockFetch(send);
  render(<ScanRewrite />); await fill(); fireEvent.click(screen.getByRole("button", { name: "Scan CV" })); await waitFor(() => expect(send).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByRole("button", { name: "Stop waiting" })); await confirmRecovery(); fireEvent.click(screen.getByRole("button", { name: "Scan CV" })); await screen.findByRole("button", { name: "Review and continue" });
  await confirmRecovery(); await act(async () => finish(json(scan))); expect(screen.queryByRole("heading", { name: "Your scan" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Scan CV" })); await screen.findByRole("button", { name: "Review and continue" }); await openRecovery();
  act(() => window.dispatchEvent(new Event("ownpath:session-ended"))); await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(Object.keys(sessionStorage)).toHaveLength(0); expect(send).toHaveBeenCalledTimes(3);
});
it("renders a reachable known-unresolved recovery when all prior in-memory identity is absent", async () => {
  const send = vi.fn().mockResolvedValue(json(scan)); mockFetch(send, true); setUncertainAttempt(true); render(<ScanRewrite />); await fill();
  fireEvent.click(screen.getByRole("button", { name: "Review and continue" }));
  await screen.findByRole("dialog", { name: "Review and continue" });
  expect((screen.getByRole("button", { name: "Prepare a new request" }) as HTMLButtonElement).disabled).toBe(true);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Cancel" })));
  expect((screen.getByRole("button", { name: "Scan CV" }) as HTMLButtonElement).disabled).toBe(true); expect(send).not.toHaveBeenCalled();
  await confirmRecovery(); expect(send).not.toHaveBeenCalled();
  const prepared = sessionStorage.getItem("ownpath-ai-prepared-request"); expect(prepared).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Scan CV" }));
  await screen.findByRole("heading", { name: "Your scan" }); expect(JSON.parse(send.mock.calls[0][1].body).requestId).toBe(prepared);
});
it("retains the pause across navigation, example insertion and a component remount with no in-memory identity", async () => {
  const send = await pausedScan();
  fireEvent.click(screen.getByRole("button", { name: "Test Rewrite view" })); expect(screen.getByRole("button", { name: "Review and continue" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Test Scan view" }));
  fireEvent.click(screen.getByText("Try an example")); fireEvent.click(screen.getByRole("button", { name: "Sales" })); fireEvent.click(await screen.findByRole("button", { name: "Replace inputs" }));
  expect((screen.getByRole("button", { name: "Scan CV" }) as HTMLButtonElement).disabled).toBe(true); expect(screen.getByRole("button", { name: "Review and continue" })).toBeTruthy();
  cleanup(); render(<ScanRewrite />);
  expect((screen.getByRole("button", { name: "Scan CV" }) as HTMLButtonElement).disabled).toBe(true);
  await confirmRecovery(); expect(send).toHaveBeenCalledOnce(); expect(sessionStorage.getItem("ownpath-ai-prepared-request")).toBeTruthy();
});
it("inserting an example while a dispatched Scan is pending establishes a pause and ignores its late response", async () => {
  let finish!: (value: Response) => void;
  const send = vi.fn().mockImplementation(() => new Promise<Response>(resolve => { finish = resolve; })); mockFetch(send);
  render(<ScanRewrite />); await fill(); fireEvent.click(screen.getByRole("button", { name: "Scan CV" })); await waitFor(() => expect(send).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByText("Try an example")); fireEvent.click(screen.getByRole("button", { name: "Sales" })); fireEvent.click(await screen.findByRole("button", { name: "Replace inputs" }));
  await screen.findByRole("button", { name: "Review and continue" }); expect((screen.getByRole("button", { name: "Scan CV" }) as HTMLButtonElement).disabled).toBe(true);
  await act(async () => finish(json(scan))); expect(screen.queryByRole("heading", { name: "Your scan" })).toBeNull(); expect(send).toHaveBeenCalledOnce();
});
it("uncertain failure → acknowledgement → preparation retains valid CV/JD without sending until the next action click", async () => {
  const send = vi.fn().mockResolvedValue(json({ error: { code: "reconciliation_required", message: "Synthetic uncertain result" } }, 502)); mockFetch(send, true);
  render(<ScanRewrite initial={{ schemaVersion: 2, cv, jd, scan: { coverage: "Selected requirements.", findings: [] }, instructions: "Keep it concise.", language: "English", document: cv, changes: [], notes: [], title: "Synthetic" }} />);
  expect(screen.getByText("CV text retained")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Scan CV" }));
  await screen.findByRole("button", { name: "Review and continue" }); await confirmRecovery();
  const button = screen.getByRole("button", { name: "Scan CV" }) as HTMLButtonElement;
  expect(button.disabled).toBe(false); expect(button.getAttribute("data-blocked-by")).toBeNull();
  expect(sessionStorage.getItem("ownpath-ai-uncertainty")).toBeNull(); expect(sessionStorage.getItem("ownpath-ai-prepared-request")).toBeTruthy();
  expect((screen.getByLabelText("Your CV") as HTMLTextAreaElement).value).toBe(cv); expect((screen.getByLabelText("Target job") as HTMLTextAreaElement).value).toBe(jd);
  expect(send).toHaveBeenCalledOnce();
  fireEvent.click(button); await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("explains an active extraction beside Scan rather than silently disabling it", async () => {
  let extraction!: (value: Response) => void;
  vi.stubGlobal("fetch", (url: string) => url.endsWith("disclosure") ? Promise.resolve(json({ provider: "Anthropic", purpose: "synthetic", external: true })) : new Promise<Response>(resolve => { extraction = resolve; }));
  render(<ScanRewrite />);
  fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [new File(["synthetic"], "synthetic.pdf", { type: "application/pdf" })] } });
  const button = screen.getByRole("button", { name: "Scan CV" }) as HTMLButtonElement;
  expect(button.disabled).toBe(true); expect(button.getAttribute("data-blocked-by")).toBe("extraction"); expect(document.getElementById("scan-readiness")?.textContent).toContain("Cancel extraction");
  fireEvent.click(screen.getByRole("button", { name: "Cancel extraction" })); expect(button.disabled).toBe(false);
  await act(async () => extraction(json({ text: "Late text" }))); expect(screen.queryByLabelText("Your CV")).toBeNull();
});
it("delivers Scan → explain → instructions → complete editable Rewrite without profile or saving", async () => {
  const fetch = vi.fn((url: string) => Promise.resolve(json(url.endsWith("scan") ? scan : rewrite))); mockFetch(fetch);
  render(<ScanRewrite />); await fill(); await scanned(); expect(fetch).toHaveBeenCalledTimes(1); expect(screen.queryByLabelText("Formatted CV")).toBeNull();
  expect(document.querySelector('#scan-explanation-0')?.textContent).toBe("Your CV describes direct customer assistance."); fireEvent.click(screen.getByRole("button", { name: "Rewrite CV" }));
  await screen.findByRole("heading", { name: "Your rewritten CV is ready" }); expect(screen.getByLabelText("Complete CV text").textContent).toBe(cv.replace("Helped", "Assisted")); expect(fetch).toHaveBeenCalledTimes(2);
  fireEvent.change(screen.getByLabelText("Complete CV text"), { target: { value: "User edited complete CV." } }); expect(screen.getByLabelText("Formatted CV").textContent).toBe("User edited complete CV."); expect(fetch).toHaveBeenCalledTimes(2);
});
it("blocks duplicate scans and ignores late response after source changes", async () => {
  let finish!: (r: Response) => void; const fetch = vi.fn(() => new Promise<Response>(r => { finish = r; })); mockFetch(fetch);
  render(<ScanRewrite />); await fill(); const button = screen.getByRole("button", { name: "Scan CV" }); act(() => { fireEvent.click(button); fireEvent.click(button); }); await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  fireEvent.change(screen.getByLabelText("Your CV"), { target: { value: "A newer CV" } }); await act(async () => finish(json(scan))); expect(screen.queryByRole("heading", { name: "Your scan" })).toBeNull();
});
it("keeps manual edits and cancels an in-flight rewrite when instructions change", async () => {
  let finish!: (r: Response) => void; const fetch = vi.fn().mockResolvedValueOnce(json(scan)).mockResolvedValueOnce(json(rewrite)).mockImplementationOnce(() => new Promise<Response>(r => { finish = r; })); mockFetch(fetch);
  render(<ScanRewrite />); await fill(); await scanned(); fireEvent.click(screen.getByRole("button", { name: "Rewrite CV" })); await screen.findByRole("heading", { name: "Your rewritten CV is ready" });
  fireEvent.click(screen.getByRole("button", { name: "Rewrite again" })); await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3)); fireEvent.change(screen.getByLabelText("Complete CV text"), { target: { value: "My latest manual edit." } });
  fireEvent.change(screen.getByLabelText("How should we improve it?"), { target: { value: "New instructions" } }); await act(async () => finish(json(rewrite))); expect(screen.getByLabelText("Formatted CV").textContent).toBe("My latest manual edit.");
});
it.each([new Response("<html>private error</html>", { status: 502 }), json({ findings: [null], coverage: "bad" }), json({ error: { message: "OpenAI is not configured." } }, 503)])("preserves inputs on malformed/configuration errors", async response => {
  mockFetch(vi.fn().mockResolvedValue(response)); render(<ScanRewrite />); await fill(); fireEvent.click(screen.getByRole("button", { name: "Scan CV" })); await screen.findByRole("alert"); expect((screen.getByLabelText("Your CV") as HTMLTextAreaElement).value).toBe(cv); expect(screen.queryByRole("heading", { name: "Your scan" })).toBeNull();
});
it("cancels a pending operation at session end", async () => {
  let finish!: (r: Response) => void; const fetch = vi.fn(() => new Promise<Response>(r => { finish = r; })); mockFetch(fetch); render(<ScanRewrite />); await fill(); fireEvent.click(screen.getByRole("button", { name: "Scan CV" })); await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  act(() => window.dispatchEvent(new Event("ownpath:session-ended"))); await act(async () => finish(json(scan))); await waitFor(() => expect(screen.queryByRole("heading", { name: "Your scan" })).toBeNull());
});
it("keeps the last usable edited draft when regeneration fails", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(json(scan)).mockResolvedValueOnce(json(rewrite)).mockResolvedValueOnce(json({ error: "Provider unavailable. Retry." }, 502)); mockFetch(fetch);
  render(<ScanRewrite />); await fill(); await scanned(); fireEvent.click(screen.getByRole("button", { name: "Rewrite CV" })); await screen.findByRole("heading", { name: "Your rewritten CV is ready" });
  fireEvent.change(screen.getByLabelText("Complete CV text"), { target: { value: "My latest usable draft." } }); fireEvent.click(screen.getByRole("button", { name: "Rewrite again" })); fireEvent.click(await screen.findByRole("button", { name: "Rewrite edited CV" })); await screen.findByRole("alert");
  await waitFor(() => expect(document.getElementById("scan-error")?.textContent).toContain("may have incurred charges")); expect(screen.queryByText('Provider unavailable. Retry.')).toBeNull(); expect(screen.getByLabelText("Formatted CV").textContent).toBe("My latest usable draft."); expect(fetch).toHaveBeenCalledTimes(3);
});
it("requires a save acknowledgement, deduplicates an identical retry and marks subsequent edits unsaved", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(json(scan)).mockResolvedValueOnce(json(rewrite)).mockResolvedValueOnce(json({})).mockImplementationOnce((_url, options) => Promise.resolve(json({ saved: true, id: JSON.parse(options.body).id }))); mockFetch(fetch);
  render(<ScanRewrite />); await fill(); await scanned(); fireEvent.click(screen.getByRole("button", { name: "Rewrite CV" })); await screen.findByRole("heading", { name: "Your rewritten CV is ready" });
  fireEvent.click(screen.getByRole("button", { name: "Save this CV (optional)" }));
  fireEvent.click(screen.getByRole("button", { name: "Save CV" })); await screen.findByRole("alert"); expect(screen.queryByText("CV saved.")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Save CV" })); await screen.findByText("CV saved.");
  expect(JSON.parse(fetch.mock.calls[2][1].body).id).toBe(JSON.parse(fetch.mock.calls[3][1].body).id);
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "New title" } }); expect(screen.getByText("Current edits are not saved.")).toBeTruthy(); expect(fetch).toHaveBeenCalledTimes(4);
});
it("starts with upload only and one compact Scan action; validates the first missing input", async () => {
   mockFetch(vi.fn()); render(<ScanRewrite />); expect(screen.queryByRole("checkbox")).toBeNull(); expect(screen.queryByLabelText("Your CV")).toBeNull(); expect(screen.queryByRole("button", { name: "Paste text" })).toBeNull();
   expect(screen.getByRole("heading", { level: 1, name: "Scan your CV" })).toBeTruthy(); expect(screen.getByText("See how your experience matches the job.")).toBeTruthy(); expect(screen.queryByText("UNDERSTAND THE ROLE")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Scan CV" })); expect(document.activeElement?.id).toBe("cv-input-entry"); await screen.findByRole("alert");
});
it("one action click starts external Scan; mounting and navigation send nothing and session end invalidates pending work", async () => {
  const fetch = vi.fn().mockResolvedValue(json(scan)); mockFetch(fetch, true); render(<ScanRewrite />); await fill();
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Test elsewhere" })); fireEvent.click(screen.getByRole("button", { name: "Test Scan view" })); expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Scan CV" })); await screen.findByRole("heading", { name: "Your scan" }); expect(fetch).toHaveBeenCalledOnce();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ consent: true, consentPurpose: "test-v1" });
  act(() => window.dispatchEvent(new Event("ownpath:session-ended"))); expect(fetch).toHaveBeenCalledOnce();
});
it("binds each action click to fresh processing details without a provider modal or automatic retries", async () => {
  let recipient = { provider: "Anthropic (Claude)", purpose: "claude-purpose-v1", external: true };
  const send = vi.fn().mockResolvedValue(json(scan));
  vi.stubGlobal("fetch", (url: string, options?: RequestInit) => url.endsWith("disclosure") ? Promise.resolve(json(recipient)) : url.includes("extract?") ? Promise.resolve(json({ text: cv })) : send(url, options));
  render(<ScanRewrite />); await fill();
  fireEvent.click(screen.getByRole("button", { name: "Scan CV" }));
  await screen.findByRole("heading", { name: "Your scan" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(JSON.parse(send.mock.calls[0][1].body).consentPurpose).toBe("claude-purpose-v1");
  recipient = { provider: "OpenAI", purpose: "openai-purpose-v2", external: true };
  fireEvent.click(screen.getByRole("button", { name: "Scan CV" }));
  await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
  expect(JSON.parse(send.mock.calls[1][1].body).consentPurpose).toBe("openai-purpose-v2");
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("does not submit when fresh processing details cannot be verified", async () => {
  let available = true;
  const send = vi.fn();
  vi.stubGlobal("fetch", (url: string) => url.endsWith("disclosure") ? Promise.resolve(available ? json({ provider: "Anthropic (Claude)", purpose: "current", external: true }) : json({}, 503)) : url.includes("extract?") ? Promise.resolve(json({ text: cv })) : send(url));
  render(<ScanRewrite />); await fill(); available = false;
  fireEvent.click(screen.getByRole("button", { name: "Scan CV" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Sharing details could not be checked");
  expect(send).not.toHaveBeenCalled(); expect(sessionStorage.getItem("ownpath-ai-uncertainty")).toBeNull();
});
it("does not expose provider configuration names in ordinary errors", async () => {
  const send = vi.fn().mockResolvedValue(json({ error: { code: "not_configured", message: "OpenAI is not configured." } }, 503));
  mockFetch(send, true); render(<ScanRewrite />); await fill();
  fireEvent.click(screen.getByRole("button", { name: "Scan CV" }));
  const alert = await screen.findByRole("alert"); expect(alert.textContent).toContain("AI is not configured"); expect(alert.textContent).not.toContain("OpenAI");
  expect(send).toHaveBeenCalledOnce(); expect(sessionStorage.getItem("ownpath-ai-uncertainty")).toBeNull();
});
it.each([
  { error: { code: "provider_output", message: "The AI response could not be checked. Your work is kept." } },
  { replacements: [null], changes: [], notes: [] },
  { replacements: [], changes: [], notes: [null] },
  { replacements: [], changes: [], notes: [{ text: "Not a string." }] },
  { replacements: [], changes: [], notes: [""] },
  { replacements: [], changes: [], notes: ["x".repeat(701)] },
])("preserves manually edited CVs on Claude transport or nested-output failures", async failure => {
  const fetch = vi.fn().mockResolvedValueOnce(json(scan)).mockResolvedValueOnce(json(rewrite)).mockResolvedValueOnce(json(failure, "error" in failure ? 502 : 200)); mockFetch(fetch);
  render(<ScanRewrite />); await fill(); await scanned();
  fireEvent.click(screen.getByRole("button", { name: "Rewrite CV" }));
  await screen.findByRole("heading", { name: "Your rewritten CV is ready" });
  const manual = "My manual CV — retain this exactly.";
  fireEvent.change(screen.getByLabelText("Complete CV text"), { target: { value: manual } });
  fireEvent.click(screen.getByRole("button", { name: "Rewrite again" }));
  fireEvent.click(await screen.findByRole("button", { name: "Rewrite edited CV" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
  await waitFor(() => expect(document.getElementById("scan-error")?.textContent).toContain("could not be verified"));
  expect(screen.getByLabelText("Formatted CV").textContent).toBe(manual);
  expect((screen.getByLabelText("Complete CV text") as HTMLTextAreaElement).value).toBe(manual);
  expect((screen.getByLabelText("How should we improve it?") as HTMLTextAreaElement).value).toBe("Keep it concise.");
  expect(fetch).toHaveBeenCalledTimes(3);
});
it("waits for extraction instead of scanning a pending file", async () => {
  let finish!: (r: Response) => void;
  vi.stubGlobal("fetch", (url: string) => url.endsWith("disclosure") ? Promise.resolve(json({ provider: "OpenAI", purpose: "test", external: false })) : new Promise<Response>(resolve => { finish = resolve; })); render(<ScanRewrite />);
  fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [new File(["synthetic"], "synthetic.pdf", { type: "application/pdf" })] } }); expect((screen.getByRole("button", { name: "Scan CV" }) as HTMLButtonElement).disabled).toBe(true);
  await act(async () => finish(json({ text: cv }))); expect((screen.getByRole("button", { name: "Scan CV" }) as HTMLButtonElement).disabled).toBe(false);
});
it("approving a replacement file cancels older generation before new extraction finishes", async () => {
  let extractions = 0, finishScan!: (r: Response) => void, finishFile!: (r: Response) => void, signal: AbortSignal | undefined;
  vi.stubGlobal("fetch", (url: string, options?: RequestInit) => {
    if (url.endsWith("disclosure")) return Promise.resolve(json({ provider: "OpenAI", purpose: "test", external: false }));
    if (url.includes("extract?")) return ++extractions === 1 ? Promise.resolve(json({ text: cv })) : new Promise<Response>(resolve => { finishFile = resolve; });
    signal = options?.signal || undefined; return new Promise<Response>(resolve => { finishScan = resolve; });
  });
  render(<ScanRewrite />); await fill(); fireEvent.click(screen.getByRole("button", { name: "Scan CV" })); await waitFor(() => expect(signal).toBeDefined());
  fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [new File(["synthetic"], "replacement.pdf", { type: "application/pdf" })] } }); fireEvent.click(await screen.findByRole("button", { name: "Replace CV text" }));
  await screen.findByText("Extracting text…"); expect(signal?.aborted).toBe(true); await act(async () => finishScan(json(scan))); expect(screen.queryByRole("heading", { name: "Your scan" })).toBeNull();
  await act(async () => finishFile(json({ text: cv + "\nNew source" }))); expect((screen.getByLabelText("Your CV") as HTMLTextAreaElement).value).toContain("New source");
});
it("initial sharing information is not lost just because the user starts entering source text", async () => {
  let finish!: (r: Response) => void;
  vi.stubGlobal("fetch", (url: string) => url.endsWith("disclosure") ? new Promise<Response>(resolve => { finish = resolve; }) : Promise.resolve(json({ text: cv })));
  render(<ScanRewrite />); await fill(); await act(async () => finish(json({ provider: "Local simulated AI", purpose: "fixed-preview", external: false })));
  expect(screen.getByText("No external model is contacted.")).toBeTruthy();
});
it("keeps accurate processing information in Privacy details and starts external Rewrite with one click", async () => {
  const send = vi.fn((url: string) => Promise.resolve(json(url.endsWith("scan") ? scan : rewrite)));
  vi.stubGlobal("fetch", (url: string) => url.endsWith("disclosure") ? Promise.resolve(json({ provider: "Anthropic (Claude)", purpose: "synthetic-purpose", external: true })) : url.includes("extract?") ? Promise.resolve(json({ text: cv })) : send(url));
  render(<ScanRewrite />); await fill();
  const action = document.querySelector(".op-scan-action")!; expect(action.textContent).toContain("Your CV and job description are sent to AI."); expect(action.textContent).not.toContain("Rewrite"); expect(action.querySelector("details")?.open).toBe(false); expect(action.querySelector("summary")?.textContent).toBe("Privacy details"); expect(action.querySelectorAll("li")).toHaveLength(2);
  expect(action.querySelector("details")?.textContent).toContain("Processed by Anthropic (Claude).");
  fireEvent.click(screen.getByRole("button", { name: "Scan CV" })); await screen.findByRole("heading", { name: "Your scan" });
  fireEvent.click(screen.getByRole("button", { name: "Test Rewrite view" })); fireEvent.change(screen.getByLabelText("How should we improve it?"), { target: { value: "Keep facts." } });
  expect(document.querySelector(".op-composer .op-sharing")?.textContent).toContain("validated Scan, current draft and rewrite instructions are processed by Anthropic (Claude)");
  const button = screen.getByRole("button", { name: "Rewrite CV" });
  act(() => { fireEvent.click(button); fireEvent.click(button); });
  await screen.findByRole("heading", { name: "Your rewritten CV is ready" });
  expect(send).toHaveBeenCalledTimes(2); expect(screen.queryByRole("dialog")).toBeNull();
});
it("pauses uncertain inference without clearing inputs or allowing another send", async () => {
  const send = vi.fn().mockResolvedValue(json({ error: { code: "reconciliation_required", message: "PRIVATE_INTERNAL_ERROR" } }, 502)); mockFetch(send); render(<ScanRewrite />); await fill(); fireEvent.click(screen.getByRole("button", { name: "Scan CV" })); const alert = await screen.findByRole("alert"); expect(alert.textContent).toContain("may have incurred charges"); expect(alert.textContent).not.toContain("PRIVATE_INTERNAL_ERROR");
  await waitFor(() => expect((screen.getByRole("button", { name: "Scan CV" }) as HTMLButtonElement).disabled).toBe(true)); fireEvent.click(screen.getByRole("button", { name: "Scan CV" })); expect(send).toHaveBeenCalledOnce(); expect((screen.getByLabelText("Target job") as HTMLTextAreaElement).value).toBe(jd); expect((screen.getByLabelText("Your CV") as HTMLTextAreaElement).value).toBe(cv); expect(screen.queryByRole("button", { name: "Prepare a new request" })).toBeNull();
});
it("explains a received-but-rejected Rewrite while retaining manual edits and pausing further inference", async () => {
  const send = vi.fn().mockResolvedValueOnce(json(scan)).mockResolvedValueOnce(json(rewrite)).mockResolvedValueOnce(json({ error: { code: "result_rejected", message: "PRIVATE_REJECTED_OUTPUT" } }, 502));
  mockFetch(send, true); render(<ScanRewrite />); await fill(); await scanned();
  fireEvent.click(screen.getByRole("button", { name: "Rewrite CV" })); await screen.findByRole("heading", { name: "Your rewritten CV is ready" });
  const manual = "My manually edited complete CV — Diploma 2023.";
  fireEvent.change(screen.getByLabelText("Complete CV text"), { target: { value: manual } });
  fireEvent.click(screen.getByRole("button", { name: "Rewrite again" })); fireEvent.click(await screen.findByRole("button", { name: "Rewrite edited CV" }));
  const alert = await screen.findByText(/A result was received but failed safety or validity checks/); expect(alert.getAttribute("role")).toBe("alert"); expect(alert.textContent).toContain("No new CV result was applied"); expect(alert.textContent).toContain("usage is retained"); expect(alert.textContent).not.toContain("PRIVATE_REJECTED_OUTPUT");
  expect((screen.getByLabelText("Complete CV text") as HTMLTextAreaElement).value).toBe(manual);
  expect((screen.getByRole("button", { name: "Rewrite again" }) as HTMLButtonElement).disabled).toBe(true);
  expect(sessionStorage.getItem("ownpath-ai-uncertainty")).toBe("true"); expect(send).toHaveBeenCalledTimes(3);
});
it("keeps a verified preflight rejection actionable rather than treating it as a billed result", async () => {
  const send = vi.fn().mockResolvedValue(json({ error: { code: "not_configured", message: "AI is not configured. Ask the owner to check the connection." } }, 503)); mockFetch(send); render(<ScanRewrite />); await fill(); fireEvent.click(screen.getByRole("button", { name: "Scan CV" })); await screen.findByRole("alert"); await waitFor(() => expect((screen.getByRole("button", { name: "Scan CV" }) as HTMLButtonElement).disabled).toBe(false)); expect(screen.queryByText(/AI requests are paused/)).toBeNull(); expect(send).toHaveBeenCalledOnce();
});
it("does not treat an application authentication rejection as a sent AI result", async () => {
  const send = vi.fn().mockResolvedValue(json({ error: "Your session ended. Sign in again; your work is kept." }, 401)); mockFetch(send); render(<ScanRewrite />); await fill(); fireEvent.click(screen.getByRole("button", { name: "Scan CV" })); await screen.findByRole("alert"); await waitFor(() => expect((screen.getByRole("button", { name: "Scan CV" }) as HTMLButtonElement).disabled).toBe(false)); expect(screen.queryByText(/AI requests are paused/)).toBeNull(); expect(send).toHaveBeenCalledOnce();
});
it("folds sources without remounting upload/text state; reopening edits invalidates the Scan", async () => {
  const fetch = vi.fn().mockResolvedValue(json(scan)); mockFetch(fetch); render(<ScanRewrite />); await fill();
  const picker = document.querySelector('input[type="file"]'); const source = screen.getByLabelText("Your CV"); const target = screen.getByLabelText("Target job");
  await scanned(); const disclosure = document.querySelector<HTMLDetailsElement>(".op-source-summary")!;
  await waitFor(() => expect(disclosure.open).toBe(false)); expect(document.querySelector('input[type="file"]')).toBe(picker); expect(screen.getByLabelText("Your CV")).toBe(source);
  fireEvent.click(disclosure.querySelector("summary")!); await waitFor(() => expect(disclosure.open).toBe(true)); expect(screen.getByText("synthetic.pdf")).toBeTruthy(); expect((target as HTMLTextAreaElement).value).toBe(jd);
  fireEvent.change(target, { target: { value: jd + " Changed" } }); expect(screen.queryByRole("heading", { name: "Your scan" })).toBeNull(); expect(disclosure.open).toBe(true); expect(fetch).toHaveBeenCalledOnce();
});
it("orders only by returned categories, counts actual items, and never truncates an attribution warning", async () => {
  const warning = "A detailed explanation. ".repeat(12) + "The manager did the work, not the applicant.";
  const findings = [
    { ...scan.findings[0], title: "Strength one" },
    { ...scan.findings[0], title: "Missing evidence", excerpt: "", group: "not_found", explanation: warning },
    { ...scan.findings[0], title: "Clarify one", group: "unclear" },
    { ...scan.findings[0], title: "Strength two" },
    { ...scan.findings[0], title: "Clarify two", group: "unclear" },
  ];
  const fetch = vi.fn().mockResolvedValueOnce(json({ ...scan, findings })).mockResolvedValueOnce(json(rewrite)); mockFetch(fetch); render(<ScanRewrite />); await fill(); await scanned();
  expect(Array.from(document.querySelectorAll(".op-analysis .op-finding h4")).map(el => el.textContent)).toEqual(["Clarify one", "Clarify two", "Missing evidence", "Strength one", "Strength two"]);
  expect(document.querySelector('[aria-label="Finding categories"]')?.textContent).toBe("2 to clarify1 not shown in CV2 strengths"); expect(document.querySelector('#scan-explanation-1')?.textContent).toBe(warning);
  fireEvent.click(screen.getByRole("button", { name: "Rewrite CV" })); await screen.findByRole("heading", { name: "Your rewritten CV is ready" });
  expect(JSON.parse(fetch.mock.calls[1][1].body).scan.findings.map((f: { title: string }) => f.title)).toEqual(findings.map(f => f.title));
});
it("does not close a source disclosure or steal focus when the user moves into it before Scan completes", async () => {
  let finish!: (r: Response) => void; mockFetch(vi.fn(() => new Promise<Response>(r => { finish = r; }))); render(<ScanRewrite />); await fill();
  const button = screen.getByRole("button", { name: "Scan CV" }); button.focus(); fireEvent.click(button); await waitFor(() => expect(finish).toBeDefined()); const target = screen.getByLabelText("Target job"); target.focus();
  await act(async () => finish(json(scan))); await screen.findByRole("heading", { name: "Your scan" }); expect(document.activeElement).toBe(target); expect(document.querySelector<HTMLDetailsElement>(".op-source-summary")?.open).toBe(true);
});
it("keeps focused instruction fields open when Rewrite completes without stealing focus", async () => {
  let finish!: (r: Response) => void;
  mockFetch(vi.fn().mockResolvedValueOnce(json(scan)).mockImplementationOnce(() => new Promise<Response>(r => { finish = r; })));
  render(<ScanRewrite />); await fill(); await scanned();
  const button = screen.getByRole("button", { name: "Rewrite CV" }); button.focus(); fireEvent.click(button);
  await waitFor(() => expect(finish).toBeDefined()); const instructions = screen.getByLabelText("How should we improve it?"); instructions.focus();
  await act(async () => finish(json(rewrite))); await screen.findByRole("heading", { name: "Your rewritten CV is ready" });
  expect(document.activeElement).toBe(instructions);
});
it("makes success the focused result, and preserves mounted files/instructions/edits across view changes", async () => {
  mockFetch(vi.fn((url: string) => Promise.resolve(json(url.endsWith("scan") ? scan : rewrite)))); render(<ScanRewrite />); await fill(); await scanned();
  const instructions = screen.getByLabelText("How should we improve it?"); const button = screen.getByRole("button", { name: "Rewrite CV" }); button.focus(); fireEvent.click(button);
  const result = await screen.findByRole("heading", { name: "Your rewritten CV is ready" }); await waitFor(() => expect(document.activeElement).toBe(result));
  const picker = document.querySelector('input[type=file]');
  fireEvent.change(screen.getByLabelText("Complete CV text"), { target: { value: "User-owned edited CV" } });
  fireEvent.click(screen.getByRole("button", { name: "Test Scan view" })); expect(screen.queryByRole("heading", { name: "Your rewritten CV is ready" })).toBeNull(); expect(screen.getByRole("heading", { name: "Your scan" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Test Rewrite view" })); expect(screen.getByLabelText("How should we improve it?")).toBe(instructions); expect((instructions as HTMLTextAreaElement).value).toBe("Keep it concise.");
  expect(document.querySelector('input[type=file]')).toBe(picker); expect(screen.getByLabelText("Formatted CV").textContent).toBe("User-owned edited CV");
});
it("completes off-view without redirecting or stealing focus, and offers View result on return", async () => {
  let finish!: (r: Response) => void;
  const fetch = vi.fn().mockResolvedValueOnce(json(scan)).mockImplementationOnce(() => new Promise<Response>(r => { finish = r; })); mockFetch(fetch);
  render(<ScanRewrite />); await fill(); await scanned(); const submit = screen.getByRole("button", { name: "Rewrite CV" }); submit.focus(); fireEvent.click(submit);
  await waitFor(() => expect(finish).toBeDefined()); fireEvent.click(screen.getByRole("button", { name: "Test elsewhere" })); const elsewhere = screen.getByRole("button", { name: "Test elsewhere" }); elsewhere.focus();
  await act(async () => finish(json(rewrite))); expect(document.activeElement).toBe(elsewhere); expect(screen.queryByRole("heading", { name: "Your rewritten CV is ready" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Test Rewrite view" })); expect(screen.getByRole("heading", { name: "Your rewritten CV is ready" })).toBeTruthy(); fireEvent.click(screen.getByRole("button", { name: "View result" })); expect(document.activeElement?.id).toBe("draft-heading"); expect(fetch).toHaveBeenCalledTimes(2);
});
it("has an honest direct Rewrite empty state and no automatic AI calls", () => {
  const fetch = vi.fn(); mockFetch(fetch); render(<ScanRewrite />); fireEvent.click(screen.getByRole("button", { name: "Test Rewrite view" }));
  expect(screen.getByRole("heading", { name: "Start with a Scan" })).toBeTruthy(); expect(screen.queryByRole("button", { name: "Rewrite CV" })).toBeNull(); expect(fetch).not.toHaveBeenCalled();
});
it("switches one full-width Edit/Save panel without resetting edits, title or acknowledged save state", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(json(scan)).mockResolvedValueOnce(json(rewrite)).mockImplementation((_url, options) => Promise.resolve(json({ saved: true, id: JSON.parse(options.body).id })));
  mockFetch(fetch); render(<ScanRewrite />); await fill(); await scanned(); fireEvent.click(screen.getByRole("button", { name: "Rewrite CV" })); await screen.findByRole("heading", { name: "Your rewritten CV is ready" });
  const edit = screen.getByRole("button", { name: "Edit complete CV" }), save = screen.getByRole("button", { name: "Save this CV (optional)" });
  expect(edit.getAttribute("aria-expanded")).toBe("false"); expect(save.getAttribute("aria-expanded")).toBe("false");
  const editor = screen.getByLabelText("Complete CV text"), title = screen.getByLabelText("Title");
  edit.focus(); fireEvent.click(edit); expect(document.activeElement).toBe(edit); expect(edit.getAttribute("aria-expanded")).toBe("true"); expect(document.getElementById(edit.getAttribute("aria-controls")!)?.hidden).toBe(false);
  fireEvent.change(editor, { target: { value: "Owner manual CV edits — keep these." } });
  fireEvent.click(save); expect(edit.getAttribute("aria-expanded")).toBe("false"); expect(save.getAttribute("aria-expanded")).toBe("true"); expect(document.getElementById(save.getAttribute("aria-controls")!)?.hidden).toBe(false);
  fireEvent.change(title, { target: { value: "Owner save title" } }); fireEvent.click(screen.getByRole("button", { name: "Save CV" })); await screen.findByText("CV saved.");
  const calls = fetch.mock.calls.length; const scrolls = vi.mocked(HTMLElement.prototype.scrollIntoView).mock.calls.length;
  for (let i = 0; i < 3; i++) { fireEvent.click(edit); expect(document.getElementById("cv-save-panel")?.hidden).toBe(true); fireEvent.click(save); expect(document.getElementById("cv-edit-panel")?.hidden).toBe(true); }
  expect(screen.getByLabelText("Complete CV text")).toBe(editor); expect((editor as HTMLTextAreaElement).value).toBe("Owner manual CV edits — keep these."); expect(screen.getByLabelText("Title")).toBe(title); expect((title as HTMLInputElement).value).toBe("Owner save title"); expect(screen.getByText("CV saved.")).toBeTruthy(); expect(screen.getByLabelText("Formatted CV").textContent).toBe("Owner manual CV edits — keep these.");
  fireEvent.click(save); expect(save.getAttribute("aria-expanded")).toBe("false"); expect(document.querySelector<HTMLElement>(".op-result-panel")?.hidden).toBe(true); expect(fetch).toHaveBeenCalledTimes(calls); expect(vi.mocked(HTMLElement.prototype.scrollIntoView).mock.calls.length).toBe(scrolls);
});
it("reveals a current completed result after browser-disabled submit blur", async () => {
  let finish!: (r: Response) => void;
  mockFetch(vi.fn().mockResolvedValueOnce(json(scan)).mockImplementationOnce(() => new Promise<Response>(r => { finish = r; })));
  render(<ScanRewrite />); await fill(); await scanned();
  const button = screen.getByRole("button", { name: "Rewrite CV" }); button.focus(); fireEvent.click(button); await waitFor(() => expect(finish).toBeDefined());
  document.body.tabIndex = -1; document.body.focus(); expect(document.activeElement).toBe(document.body);
  await act(async () => finish(json(rewrite))); const result = await screen.findByRole("heading", { name: "Your rewritten CV is ready" }); await waitFor(() => expect(document.activeElement).toBe(result));
});
