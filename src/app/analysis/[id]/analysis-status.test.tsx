// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { refresh, router } = vi.hoisted(() => { const refresh = vi.fn(); return { refresh, router: { refresh } }; });
vi.mock("next/navigation", () => ({ useRouter: () => router }));
import { AnalysisStatus, RetryAnalysis } from "./analysis-status";
const status = (state: string, code = 200) => new Response(JSON.stringify({ details: { run: { id: "run", status: state } } }), { status: code });
beforeEach(() => vi.useFakeTimers()); afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); refresh.mockReset(); });
it("exhausts a bounded polling cycle and restarts after refresh without unmount", async () => {
  const fetch = vi.fn().mockImplementation(async () => status("processing")); vi.stubGlobal("fetch", fetch); render(<AnalysisStatus id="run" />);
  await act(async () => { await vi.advanceTimersByTimeAsync(30000); }); expect(fetch).toHaveBeenCalledTimes(20); expect(screen.getByText(/Automatic checks paused/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Refresh report" })); await act(async () => { await vi.advanceTimersByTimeAsync(1500); }); expect(fetch).toHaveBeenCalledTimes(21);
  fetch.mockImplementation(async () => status("completed")); await act(async () => { await vi.advanceTimersByTimeAsync(1500); }); expect(screen.getByText("Your report completed")).toBeTruthy(); expect(refresh).toHaveBeenCalledTimes(2);
  await act(async () => { await vi.advanceTimersByTimeAsync(10000); }); expect(fetch).toHaveBeenCalledTimes(22);
});
it("follows an acknowledged 202 retry until terminal and prevents duplicate retry", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(status("processing",202)).mockResolvedValueOnce(status("failed")); vi.stubGlobal("fetch",fetch); render(<RetryAnalysis id="run" />);
  const button = screen.getByRole("button", { name: "Retry report" }); act(() => { fireEvent.click(button); fireEvent.click(button); });
  await act(async () => {}); expect(fetch).toHaveBeenCalledTimes(1); await act(async () => { await vi.advanceTimersByTimeAsync(1500); }); expect(screen.getByText("Your report could not be completed")).toBeTruthy(); expect(refresh).toHaveBeenCalledTimes(2);
});
it("does not overlap polls and ignores terminal results after unmount or session end", async () => {
  let finish!: (value: Response) => void; const fetch=vi.fn().mockReturnValue(new Promise<Response>(r=>{finish=r;})); vi.stubGlobal("fetch",fetch); const view=render(<AnalysisStatus id="run" />);
  await act(async () => { await vi.advanceTimersByTimeAsync(10000); }); expect(fetch).toHaveBeenCalledTimes(1);
  act(()=>window.dispatchEvent(new Event("ownpath:session-ended"))); await act(async()=>finish(status("completed"))); expect(refresh).not.toHaveBeenCalled(); expect(screen.getByText("Your session ended")).toBeTruthy(); view.unmount(); expect(vi.getTimerCount()).toBe(0);
});
it("rejects a fake successful retry with no operation acknowledgement", async () => {
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response("{}")));render(<RetryAnalysis id="run" />);fireEvent.click(screen.getByRole("button",{name:"Retry report"}));await act(async()=>{});expect(screen.getByRole("alert").textContent).toContain("could not confirm");expect(refresh).not.toHaveBeenCalled();
});
