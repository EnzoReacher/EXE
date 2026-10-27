// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: () => ({ auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) } }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/app/cvs", useRouter: () => ({ push: vi.fn() }) }));
import Pricing from "./pricing";
import BillingPanel from "./billing-panel";
import WorkspaceActivity, { WorkspaceUsage } from "./workspace-activity";
import UpgradeBanner from "./upgrade-banner";
import { SavedCVs } from "./saved-cvs";
import { WorkspaceShell } from "./workspace-shell";
import { catalog } from "@/lib/billing/catalog";
const id = "11111111-1111-4111-8111-111111111111";
function summary(pro = false) { return { plan: { plan: pro ? "Pro" : "Free", ...catalog[pro ? "pro" : "free"], period_key: "synthetic-period", starts_at: "2026-10-01T00:00:00Z", ends_at: "2026-11-01T00:00:00Z", scan_used: 1, rewrite_used: 0, saved_count: 2, next_start: pro ? "2026-11-01T00:00:00Z" : null, next_end: pro ? "2026-12-01T00:00:00Z" : null }, orders: pro ? [{ id, order_code: 123456, amount: 79000, state: "pending", created_at: "2026-10-01T00:00:00Z" }] : [], mode: "LOCAL_FAKE", enabled: true, price: 79000, version: catalog.version, support: null, reason: "Local fixture only" }; }
const response = (data: unknown, status = 200) => Promise.resolve(Response.json(data, { status }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("signed-out pricing shows only the catalog, no guessed current plan or unavailable real-pay action", () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch); render(<Pricing signedIn={false} enabled={false} price={null} mode="OFF" />);
  expect(fetch).not.toHaveBeenCalled(); expect(screen.queryByText("Current plan")).toBeNull();
  expect(screen.getByText("3 Scans and 1 Rewrite per month")).toBeTruthy(); expect(screen.getByText("30 Scans and 15 Rewrites per period")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Checkout unavailable" }).hasAttribute("disabled")).toBe(true);
  expect(screen.queryByRole("link", { name: /Buy 30 days/ })).toBeNull();
});
it.each([false, true])("acknowledged %s plan renders the correct current chip and separate checkout CTA", async pro => {
  vi.stubGlobal("fetch", vi.fn(() => response(summary(pro)))); render(<Pricing signedIn enabled price={79000} mode="LOCAL_FAKE" />);
  const card = screen.getByRole("region", { name: pro ? "Pro" : "Free" }); await within(card).findByText("Current plan");
  const cta = screen.getByRole("link", { name: pro ? /Renew for 30 days/ : /Buy 30 days/ }); expect(cta.getAttribute("href")).toBe("/checkout"); expect(cta.getAttribute("target")).toBe("_blank");
  expect(screen.getByText("Preview-only illustrative price")).toBeTruthy();
});
it("billing failure stays unavailable, with a locked retry and readable pending transaction on recovery", async () => {
  const fetch = vi.fn().mockImplementationOnce(() => response({}, 503)).mockImplementation(() => response(summary(true))); vi.stubGlobal("fetch", fetch);
  render(<BillingPanel />); expect(screen.getByRole("button", { name: "Checking…" }).hasAttribute("disabled")).toBe(true);
  await screen.findByRole("alert"); expect(screen.queryByRole("heading", { name: "Free" })).toBeNull(); fireEvent.click(screen.getByRole("button", { name: "Refresh plan" }));
  await screen.findByRole("heading", { name: "Pro" }); expect(screen.getByText("Purchased next period")).toBeTruthy(); expect(screen.getByText("Pending verification")).toBeTruthy();
  expect(screen.getByRole("link", { name: /Order 123456/ }).getAttribute("href")).toBe(`/checkout?order=${id}`);
  expect(screen.getByRole("link", { name: /Renew for 30 days/ }).getAttribute("href")).toBe("/pricing"); expect(fetch).toHaveBeenCalledTimes(2);
});
it("late private plan responses cannot resurrect a plan after session end", async () => {
  let resolve!: (value: Response) => void; vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(r => { resolve = r; })));
  render(<BillingPanel />); act(() => window.dispatchEvent(new Event("ownpath:session-ended")));
  await act(async () => resolve(Response.json(summary(true)))); expect(screen.queryByRole("heading", { name: "Pro" })).toBeNull(); expect(screen.getByRole("alert").textContent).toContain("Sign in again");expect(screen.getByRole("link",{name:"Sign in ↗"}).getAttribute("target")).toBe("_blank");
});
it("recent/usage failures never become fake zeros, and empty intake remains one explicit action", async () => {
  vi.stubGlobal("fetch", vi.fn(() => response({}, 503))); const first = render(<><WorkspaceUsage /><WorkspaceActivity /></>); await screen.findByRole("alert");
  expect(screen.queryByLabelText("Current plan usage")).toBeNull(); expect(screen.getByRole("button", { name: "Retry recent CVs" })).toBeTruthy(); first.unmount();
  vi.stubGlobal("fetch", vi.fn(url => String(url).includes("billing") ? response(summary()) : response({ versions: [], profiles: [] })));
  render(<><button id="cv-input-entry">Select file</button><WorkspaceUsage /><WorkspaceActivity /></>); const cta = await screen.findByRole("link", { name: /Add your first CV/ }); fireEvent.click(cta); expect(document.activeElement?.id).toBe("cv-input-entry");
  expect(screen.getByText("No saved CVs yet.")).toBeTruthy(); expect(screen.getByText("Saving is optional.")).toBeTruthy(); expect(screen.queryByText("A little space for your next chapter.")).toBeNull();
  const usage = within(screen.getByLabelText("Current plan usage")); expect(usage.getByText("Scans left").nextElementSibling?.textContent).toBe("2 / 3"); expect(usage.getByText("Rewrites left").nextElementSibling?.textContent).toBe("1 / 1");
  expect(screen.getByRole("link", { name: /View all saved CVs/ }).getAttribute("target")).toBe("_blank");
});
it("renders account-specific effective allowances without clamping them to the Free catalog", async () => {
  const data = summary(); Object.assign(data.plan, { scans: 6, rewrites: 4, scan_used: 2, rewrite_used: 1 });
  const fetch = vi.fn(() => response(data)); vi.stubGlobal("fetch", fetch); render(<WorkspaceUsage />);
  const usage = within(await screen.findByLabelText("Current plan usage"));
  expect(usage.getByText("Scans left").nextElementSibling?.textContent).toBe("4 / 6");
  expect(usage.getByText("Rewrites left").nextElementSibling?.textContent).toBe("3 / 4");
  expect(data.plan.plan).toBe("Free"); expect(fetch).toHaveBeenCalledOnce();
});
it("real recent metadata opens separately, and a Pro banner never claims a Free upgrade", async () => {
  vi.stubGlobal("fetch", vi.fn(url => String(url).includes("billing") ? response(summary(true)) : response({ versions: [{ id, name: "Synthetic sales CV", updated_at: "2026-10-21T00:00:00Z" }], profiles: [] })));
  render(<><WorkspaceActivity /><UpgradeBanner /></>); const recent = await screen.findByRole("link", { name: "Synthetic sales CV ↗" }); expect(recent.getAttribute("target")).toBe("_blank");
  await screen.findByRole("link", { name: /Manage Pro/ }); expect(screen.queryByRole("link", { name: /View Pro plans/ })).toBeNull();
});
it("Saved CV empty state has one intake CTA; shell keeps verified greeting and real navigation", async () => {
  vi.stubGlobal("fetch", vi.fn(url => String(url).includes("billing") ? response(summary()) : response({ versions: [], profiles: [] })));
  render(<WorkspaceShell owner="synthetic" displayName="Alex"><SavedCVs /></WorkspaceShell>); await screen.findByText("No saved CVs yet. Saving is optional.");
  expect(screen.getByRole("link", { name: "Rewrite CV" })).toBeTruthy(); expect(screen.getByRole("link", { name: "Saved CVs" })).toBeTruthy();
  expect(screen.queryByRole("link", { name: /New CV/ })).toBeNull(); expect(screen.queryByRole("navigation", { name: "Workspace shortcuts" })).toBeNull(); expect(screen.getByRole("button", { name: /Account menu for Alex/ })).toBeTruthy();
  expect(screen.queryByRole("link", { name: /View Pro plans/ })).toBeNull(); expect(screen.getAllByRole("link", { name: "Scan CV" })).toHaveLength(2);for(const label of ['Overview','My experience profile','Tailor my CV','My CVs','Account and security'])expect(screen.queryByRole('link',{name:label})).toBeNull();
});
