// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ReviewLinks from "./review-links";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const share = { id: "share", state: "active", createdAt: "2026-01-01", expiresAt: "2026-02-01", expiryHours: 168, includesAcceptedDraft: false, feedback: [] };
const failures = [() => new Response("<html>upstream-secret</html>", { status: 502 }), () => new Response("<html>upstream-secret</html>", { status: 504 }), () => new Response("{invalid-secret"), () => json(null), () => json({}), () => json({ error: "database-private-secret" }, 500), () => Promise.reject(new Error("network-private-secret"))];
it.each(failures.map((failure, i) => [i, failure] as const))("sanitizes failed creation %s without losing selected options or claiming success", async (_, failure) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({ shares: [] })).mockImplementationOnce(failure)); render(<ReviewLinks analysisId="analysis" />); await screen.findByText(/No review links yet/);
  fireEvent.change(screen.getByLabelText("Link expiry"), { target: { value: "24h" } }); fireEvent.click(screen.getByLabelText("Include my accepted CV draft")); fireEvent.click(screen.getByRole("button", { name: "Create private review link" }));
  const alert = await screen.findByRole("alert"); expect(alert.textContent).toMatch(/could not|not confirm/i); expect(alert.textContent).not.toMatch(/secret|JSON|Unexpected|SyntaxError/); expect(screen.queryByRole("textbox")).toBeNull(); expect((screen.getByLabelText("Link expiry") as HTMLSelectElement).value).toBe("24h"); expect((screen.getByLabelText("Include my accepted CV draft") as HTMLInputElement).checked).toBe(true);
});
it("does not announce revocation without an operation-specific acknowledgement", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({ shares: [share] })).mockResolvedValueOnce(json({}))); render(<ReviewLinks analysisId="analysis" />); fireEvent.click(await screen.findByRole("button", { name: /Revoke link/ })); await screen.findByRole("alert"); expect(screen.getByText("Active link")).toBeTruthy(); expect(screen.queryByText("Revoked link")).toBeNull();
});
it("does not show a private URL after session end or an older analysis response", async () => {
  let resolve!: (value: Response) => void; vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({ shares: [] })).mockReturnValueOnce(new Promise<Response>(r => { resolve = r; })));
  render(<ReviewLinks analysisId="analysis" />); await screen.findByText(/No review links yet/); fireEvent.click(screen.getByRole("button", { name: "Create private review link" })); window.dispatchEvent(new Event("ownpath:session-ended")); await act(async () => resolve(json({ token: "a".repeat(43), share })));
  expect(screen.queryByRole("textbox")).toBeNull(); expect(screen.queryByText(/Your private review link is ready/)).toBeNull();
});
