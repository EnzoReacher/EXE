// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { auth } = vi.hoisted(() => ({ auth: { getUser: vi.fn(), updateUser: vi.fn(), onAuthStateChange: vi.fn() } }));
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: () => ({ auth }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/app/scan", useRouter: () => ({ push: vi.fn() }) }));
import { WorkspaceShell } from "./workspace-shell";
import { catalog } from "@/lib/billing/catalog";
const user = { id: "A", email: "fictional@example.test", user_metadata: { display_name: "Fictional name" } };
const summary = { plan: { plan: "Free", ...catalog.free, period_key: "fictional", starts_at: "2026-10-01T00:00:00Z", ends_at: "2026-11-01T00:00:00Z", next_start: null, next_end: null, scan_used: catalog.free.scans, rewrite_used: 0, saved_count: 1 }, orders: [], mode: "OFF", enabled: false, price: null, version: catalog.version, support: null, reason: "Offline" };
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  auth.getUser.mockResolvedValue({ data: { user }, error: null }); auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve(Response.json(url.includes("billing") ? summary : url.includes("disclosure") ? { provider: "Fictional", purpose: "test", external: false } : { versions: [] }))));
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  HTMLElement.prototype.showPopover = function () { this.style.display = "block"; };
  HTMLElement.prototype.hidePopover = function () { this.style.display = "none"; };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const shell = () => render(<WorkspaceShell owner="A" email={user.email} displayName="Fictional name"><p>Underlying page</p></WorkspaceShell>);
it("persists only a desktop boolean and keeps source nodes, values, selections and active links", () => {
  const { container, unmount } = shell(); const jd = screen.getByLabelText("Target job") as HTMLTextAreaElement;
  fireEvent.change(jd, { target: { value: "Unsent fictional job" } }); jd.setSelectionRange(3, 8);
  fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  expect(container.querySelector(".is-sidebar-collapsed")).not.toBeNull(); expect(screen.getByLabelText("Target job")).toBe(jd); expect(jd.value).toBe("Unsent fictional job"); expect(jd.selectionStart).toBe(3);
  expect(screen.getByRole("link", { name: "Scan CV" }).getAttribute("href")).toBe("/app/scan"); expect(screen.getByRole("link", { name: "Scan CV" }).getAttribute("aria-current")).toBe("page"); expect(screen.getByRole("link", { name: "Rewrite CV" }).getAttribute("aria-current")).toBeNull(); expect(localStorage.getItem("ownpath:sidebar-collapsed")).toBe("true"); expect(localStorage.length).toBe(1);
  unmount(); shell(); expect(screen.getByRole("button", { name: "Expand sidebar" }).getAttribute("aria-expanded")).toBe("false");
});
it("works when preference storage is unavailable", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); }); vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  shell(); fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" })); expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeTruthy(); fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" })); expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeTruthy();
});
it("temporarily expands a saved rail preference for account access without writing it or remounting inputs", () => {
  localStorage.setItem("ownpath:sidebar-collapsed", "true"); const write = vi.spyOn(Storage.prototype, "setItem"); const { container } = shell(); const input = screen.getByLabelText("Target job"); fireEvent.change(input, { target: { value: "Retained private draft" } });
  fireEvent.click(screen.getByRole("button", { name: /Account menu for/ })); expect(container.querySelector(".is-sidebar-collapsed")).toBeNull(); expect(write).not.toHaveBeenCalled(); expect(localStorage.getItem("ownpath:sidebar-collapsed")).toBe("true"); expect(screen.getByLabelText("Target job")).toBe(input);
  fireEvent.keyDown(screen.getByRole("dialog", { name: "Account management" }), { key: "Escape" }); expect(container.querySelector(".is-sidebar-collapsed")).not.toBeNull(); expect(write).not.toHaveBeenCalled(); expect((input as HTMLTextAreaElement).value).toBe("Retained private draft");
});
it("opens Usage without a top strip, shares data, and preserves stale verified allowance on failure", async () => {
  shell(); expect(screen.queryByRole("region", { name: "Plan and remaining usage" })).toBeNull();
  await waitFor(() => expect(screen.getByText(/0 \/ .* scans remaining/)).toBeTruthy()); fireEvent.click(screen.getByRole("button", { name: "View usage" }));
  const modal = screen.getByRole("dialog", { name: "Settings" }); expect(within(modal).getByRole("button", { name: "Usage" }).getAttribute("aria-current")).toBe("page");
  expect(within(modal).getByText(/storage capacity, not AI/)).toBeTruthy(); expect(within(modal).getByText(/UTC\+07:00/)).toBeTruthy();
  const fetch = vi.mocked(globalThis.fetch); expect(fetch.mock.calls.filter(([url]) => String(url).includes("billing/summary"))).toHaveLength(1);
  fetch.mockImplementationOnce(() => Promise.resolve(new Response("{}", { status: 503 }))); fireEvent.click(within(modal).getByRole("button", { name: "Refresh usage" })); await waitFor(() => expect(within(modal).getAllByRole("alert")[0].textContent).toContain("Last checked")); expect(within(modal).getByText("Free plan")).toBeTruthy();
});
it("opens each account section, preserves settings edits across sections and uses cancel-first close confirmation", async () => {
  shell(); fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" })); fireEvent.click(screen.getByRole("button", { name: /Account menu for/ }));
  fireEvent.click(screen.getByRole("link", { name: "Profile" })); const modal = screen.getByRole("dialog", { name: "Settings" });
  const field = within(modal).getByLabelText(/Display name/) as HTMLInputElement; await waitFor(() => expect(field.value).toBe("Fictional name")); fireEvent.change(field, { target: { value: "Unsaved name" } });
  for (const label of ["Usage", "Plan & billing", "Security", "Profile"]) fireEvent.click(within(modal).getByRole("button", { name: label })); expect(field.value).toBe("Unsaved name");
  fireEvent.click(within(modal).getByRole("button", { name: "Close settings" })); const confirm = await screen.findByRole("dialog", { name: "Discard settings changes?" }); fireEvent.click(within(confirm).getByRole("button", { name: "Cancel" })); expect(field.value).toBe("Unsaved name"); expect(document.body.style.overflow).toBe("hidden");
  fireEvent.click(within(modal).getByRole("button", { name: "Close settings" })); fireEvent.click(within(await screen.findByRole("dialog", { name: "Discard settings changes?" })).getByRole("button", { name: "Discard settings changes" })); await waitFor(() => { expect(screen.queryByRole("dialog", { name: "Settings" })).toBeNull(); expect(document.body.style.overflow).toBe(""); });
});
it("cleans drawer locks and focus across mobile/desktop breakpoints without changing preference", () => {
  let change!: () => void; const media = { matches: false, addEventListener: (_: string, callback: () => void) => { change = callback; }, removeEventListener: vi.fn() }; vi.stubGlobal("matchMedia", () => media);
  shell(); fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" })); act(() => { media.matches = true; change(); }); fireEvent.click(screen.getByRole("button", { name: "Open navigation" })); expect(document.body.style.overflow).toBe("hidden"); act(() => { media.matches = false; change(); }); expect(document.body.style.overflow).toBe(""); expect(localStorage.getItem("ownpath:sidebar-collapsed")).toBe("true");
});
it("shows loading and unavailable usage honestly without invented Free status or zero counts", async () => {
  let finish!: (response: Response) => void;
  vi.mocked(fetch).mockImplementation((url) => String(url).includes("billing") ? new Promise<Response>(resolve => { finish = resolve; }) : Promise.resolve(Response.json({ versions: [] })));
  shell(); fireEvent.click(screen.getByRole("button", { name: "View usage" })); const modal = screen.getByRole("dialog", { name: "Settings" });
  expect(within(modal).getByText("Checking usage…")).toBeTruthy(); expect(within(modal).queryByText("Free plan")).toBeNull(); expect(within(modal).queryByRole("definition")).toBeNull();
  await act(async () => finish(new Response("{}", { status: 503 })));
  expect(within(modal).getByRole("alert").textContent).toContain("No verified allowance"); expect(within(modal).queryByText("Free plan")).toBeNull(); expect(within(modal).getByRole("button", { name: "Refresh usage" }).hasAttribute("disabled")).toBe(false);
});
it("does not dismiss or repeat an unacknowledged profile save", async () => {
  let finish!: (result: unknown) => void; auth.updateUser.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  shell(); fireEvent.click(screen.getByRole("button", { name: /Account menu for/ })); fireEvent.click(screen.getByRole("link", { name: "Profile" })); const modal = screen.getByRole("dialog", { name: "Settings" });
  fireEvent.change(within(modal).getByLabelText(/Display name/), { target: { value: "Acknowledged name" } }); const save = within(modal).getByRole("button", { name: "Save changes" }); await waitFor(() => expect(save.hasAttribute("disabled")).toBe(false)); fireEvent.click(save);
  await waitFor(() => expect(auth.updateUser).toHaveBeenCalledOnce()); expect(within(modal).getByRole("button", { name: "Close settings" }).hasAttribute("disabled")).toBe(true); fireEvent(modal, new Event("cancel", { cancelable: true })); expect(screen.getByRole("dialog", { name: "Settings" })).toBe(modal);
  await act(async () => finish({ data: { user: { ...user, user_metadata: { display_name: "Acknowledged name" } } }, error: null })); await waitFor(() => expect(within(modal).getByRole("button", { name: "Close settings" }).hasAttribute("disabled")).toBe(false)); fireEvent.click(within(modal).getByRole("button", { name: "Close settings" })); expect(screen.queryByRole("dialog", { name: "Settings" })).toBeNull(); expect(auth.updateUser).toHaveBeenCalledOnce();
});
