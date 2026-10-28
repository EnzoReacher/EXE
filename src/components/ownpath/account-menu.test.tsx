// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { catalog } from "@/lib/billing/catalog";
const { auth } = vi.hoisted(() => ({ auth: { getUser: vi.fn(), signOut: vi.fn(), onAuthStateChange: vi.fn() } }));
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: () => ({ auth }) }));
import AccountMenu from "./account-menu";
import { PlanSummaryProvider } from "./use-plan-summary";
import { WorkspaceUsage } from "./workspace-activity";
import BillingPanel from "./billing-panel";
// jsdom has popover UA styles but no top-layer methods; compiled checks cover native behavior.
HTMLElement.prototype.showPopover = function () { this.style.display = "block"; };
HTMLElement.prototype.hidePopover = function () { this.style.display = "none"; };
const user = { id: "A", email: "fictional@example.test", user_metadata: { plan: "Pro" } };
function summary(pro = false) { return { plan: { plan: pro ? "Pro" : "Free", ...catalog[pro ? "pro" : "free"], period_key: "synthetic-current", starts_at: "2026-10-01T00:00:00Z", ends_at: "2026-11-01T00:00:00Z", next_start: "2026-11-01T00:00:00Z", next_end: "2026-12-01T00:00:00Z", scan_used: 0, rewrite_used: 0, saved_count: 0 }, orders: [], mode: "LOCAL_FAKE", enabled: true, price: 79000, version: catalog.version, support: null, reason: "Fictional" }; }
const entry = () => screen.getByRole("button", { name: /Account menu for/ });
beforeEach(() => { auth.getUser.mockResolvedValue({ data: { user }, error: null }); auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }); });
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.unstubAllGlobals(); });
function menu() { return <AccountMenu owner="A" name="Verified name" email={user.email} expired={false} onDestination={vi.fn()} />; }
it("opens with keyboard, moves focus, restores Escape, dismisses outside and never fetches on menu clicks", async () => {
 const fetch = vi.fn(() => Promise.resolve(Response.json(summary()))); vi.stubGlobal("fetch", fetch); render(menu()); await waitFor(() => expect(entry().textContent).toContain("Free plan"));
 entry().focus(); fireEvent.keyDown(entry(), { key: "ArrowDown" }); const panel = screen.getByRole("dialog", { name: "Account management" }); const identity = within(panel).getByRole("link", { name: /Verified name/ }); expect(document.activeElement).toBe(identity); expect(entry().getAttribute("aria-expanded")).toBe("true"); expect(entry().getAttribute("aria-controls")).toBe(panel.id);
 fireEvent.keyDown(identity, { key: "ArrowDown" }); expect(document.activeElement).toBe(within(panel).getByRole("link", { name: "Upgrade to Pro" })); await waitFor(() => expect(within(panel).getByRole("button", { name: "Sign out" }).hasAttribute("disabled")).toBe(false));
 fireEvent.keyDown(document.activeElement!, { key: "End" }); expect(document.activeElement?.textContent).toContain("Sign out"); fireEvent.keyDown(document.activeElement!, { key: "Escape" }); expect(entry().getAttribute("aria-expanded")).toBe("false"); expect(document.activeElement).toBe(entry());
 for (let i = 0; i < 3; i++) { fireEvent.click(entry()); fireEvent.pointerDown(document.body); } expect(entry().getAttribute("aria-expanded")).toBe("false"); expect(fetch).toHaveBeenCalledOnce(); expect(auth.getUser).toHaveBeenCalledOnce(); expect(auth.signOut).not.toHaveBeenCalled();
});
it("shares one plan read and refresh across menu, usage and billing; scheduled periods and metadata are not current Pro", async () => {
 let finish!: (r: Response) => void; const fetch = vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; })).mockImplementationOnce(() => Promise.resolve(Response.json(summary(true)))).mockImplementationOnce(() => Promise.resolve(new Response("{}", { status: 503 }))); vi.stubGlobal("fetch", fetch);
 render(<PlanSummaryProvider>{menu()}<WorkspaceUsage /><BillingPanel /></PlanSummaryProvider>); expect(entry().textContent).toContain("Checking plan…"); fireEvent.click(entry()); expect(screen.queryByRole("link", { name: /Upgrade to Pro|Manage plan/ })).toBeNull();
 await act(async () => finish(Response.json(summary()))); expect(entry().textContent).toContain("Free plan"); expect(screen.getByRole("link", { name: "Upgrade to Pro" }).getAttribute("target")).toBe("_blank"); expect(fetch).toHaveBeenCalledOnce(); expect(screen.queryByRole("link", { name: /Help & support/ })).toBeNull();
 fireEvent.click(screen.getByRole("button", { name: "Refresh plan" })); await waitFor(() => expect(entry().textContent).toContain("Pro plan")); expect(screen.getByRole("link", { name: "Manage plan" }).getAttribute("href")).toBe("/pricing"); expect(fetch).toHaveBeenCalledTimes(2);
 fireEvent.click(screen.getByRole("button", { name: "Refresh usage" })); await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Last checked")); expect(entry().textContent).toContain("Pro plan"); expect(screen.queryByRole("link", { name: "Upgrade to Pro" })).toBeNull(); expect(screen.getByRole("link", { name: "Profile" }).getAttribute("href")).toBe("/app/account#personal-details-heading"); expect(screen.getByRole("link", { name: "Security" }).getAttribute("href")).toBe("/app/account#account-security-heading"); expect(screen.getByRole("button", { name: "Sign out" }).hasAttribute("disabled")).toBe(false); expect(fetch).toHaveBeenCalledTimes(3);
});
it("keeps the compact menu free of unrelated destinations and reuses logout failure verification", async () => {
 vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(Response.json({ ...summary(), support: "mailto:fictional@example.test" })))); auth.signOut.mockResolvedValue({ error: new Error("private failure") }); render(menu()); await waitFor(() => expect(entry().textContent).toContain("Free plan")); fireEvent.click(entry()); expect(screen.queryByRole("link", { name: /Help & support/ })).toBeNull();
 const signout = screen.getByRole("button", { name: "Sign out" }); await waitFor(() => expect(signout.hasAttribute("disabled")).toBe(false)); fireEvent.click(signout); await screen.findByRole("alert"); expect(screen.getByRole("alert").textContent).toContain("verified session is still active"); expect(screen.getByRole("alert").textContent).not.toContain("private failure"); expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" }); expect(auth.getUser).toHaveBeenCalledTimes(2); expect(screen.queryByText("Signed out on this browser.")).toBeNull();
});
it("does not resurrect a stale identity after the SDK removes its session during failed logout", async () => {
 vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(Response.json(summary())))); auth.getUser.mockResolvedValueOnce({ data: { user }, error: null }).mockResolvedValue({ data: { user: null }, error: new Error("session missing") }); auth.signOut.mockImplementation(async () => { for (const [callback] of auth.onAuthStateChange.mock.calls) callback("SIGNED_OUT", null); return { error: new Error("remote logout failed") }; }); render(menu()); await waitFor(() => expect(entry().textContent).toContain("Free plan")); fireEvent.click(entry()); const signout = screen.getByRole("button", { name: "Sign out" }); await waitFor(() => expect(signout.hasAttribute("disabled")).toBe(false)); fireEvent.click(signout); await screen.findByRole("alert"); expect(screen.getByRole("alert").textContent).toContain("provider could not confirm sign-out"); expect(screen.getByRole("button", { name: "Sign out" }).hasAttribute("disabled")).toBe(true); expect(screen.getByRole("link", { name: "Sign in again ↗" })).toBeTruthy();
});
it.each(["", user.email, user.email.toUpperCase()])("shows the email once when display name is absent or is the email: %s", async name => {
 vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(Response.json(summary())))); render(<AccountMenu owner="A" name={name} email={user.email} expired={false} onDestination={vi.fn()} />); await waitFor(() => expect(entry().textContent).toContain("Free plan")); fireEvent.click(entry());
 const panel = screen.getByRole("dialog", { name: "Account management" }); const identity = panel.querySelector(".op-account-identity")!; expect(identity.textContent?.split(user.email)).toHaveLength(2); expect(identity.querySelector("strong")?.textContent).toBe("Free plan"); expect(entry().getAttribute("aria-label")).toContain(user.email); expect(panel.querySelector("header")).toBeNull();
});
it("notifies temporary expansion for a single keyboard activation and restores it on dismissal", async () => {
 const changed = vi.fn(); vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(Response.json(summary())))); render(<AccountMenu owner="A" name="Actual name" email={user.email} expired={false} onDestination={vi.fn()} onOpenChange={changed} />); await waitFor(() => expect(entry().textContent).toContain("Free plan"));
 fireEvent.keyDown(entry(), { key: "ArrowDown" }); expect(changed).toHaveBeenLastCalledWith(true); const panel = screen.getByRole("dialog", { name: "Account management" }); expect(document.activeElement).toBe(panel.querySelector("a")); fireEvent.keyDown(panel, { key: "Escape" }); expect(changed).toHaveBeenLastCalledWith(false); expect(document.activeElement).toBe(entry());
});
