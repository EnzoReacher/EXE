// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { auth } = vi.hoisted(() => ({ auth: { getUser: vi.fn(), updateUser: vi.fn(), onAuthStateChange: vi.fn(), signOut: vi.fn() } }));
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: () => ({ auth }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/app/account" }));
import AccountProfile from "./account-profile";
import { WorkspaceShell } from "./workspace-shell";
const user = { id: "A", email: "synthetic@example.test", user_metadata: { display_name: "Original Name", unrelated: "keep" } };
function result(name: string, id = "A") { return { data: { user: { ...user, id, user_metadata: { ...user.user_metadata, display_name: name } } }, error: null }; }
function mount() { return render(<WorkspaceShell owner="A" email={user.email} displayName="Original Name"><AccountProfile initialUser={user} /></WorkspaceShell>); }
const field = () => screen.getByLabelText(/Display name/) as HTMLInputElement;
const change = (name: string) => fireEvent.change(field(), { target: { value: name } });
const submit = () => fireEvent.submit(screen.getByRole("form", { name: "Personal details" }));
const sidebar = () => document.querySelector(".op-identity")!.textContent;
async function ready() { await screen.findByText("Up to date."); await waitFor(() => expect(screen.queryByText("Checking authentication…")).toBeNull()); }
function emit(event: string, session: unknown) { act(() => { for (const [callback] of auth.onAuthStateChange.mock.calls) callback(event, session); }); }
beforeEach(() => { auth.getUser.mockResolvedValue(result("Original Name")); auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }); });
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it("loads verified identity, keeps email read-only, cancels edits and saves merged optional metadata", async () => {
  mount(); await ready(); expect(field().value).toBe("Original Name"); expect(screen.getByLabelText(/Email address/).hasAttribute("readonly")).toBe(true);
  expect(screen.queryByRole("link", { name: "Create account" })).toBeNull(); expect(screen.getByRole("link", { name: /Change password/ }).getAttribute("href")).toBe("/reset-password");
  change("Unsaved"); expect(sidebar()).not.toContain("Unsaved"); fireEvent.click(screen.getByRole("button", { name: "Cancel" })); expect(field().value).toBe("Original Name"); expect(document.activeElement).toBe(field());
  auth.updateUser.mockResolvedValue(result("Nguyễn An")); change("  Nguyễn An  "); submit(); await screen.findByText("Changes saved.");
  expect(auth.updateUser).toHaveBeenCalledWith({ data: { display_name: "Nguyễn An", unrelated: "keep" } }); expect(sidebar()).toContain("Nguyễn An"); expect(field().value).toBe("Nguyễn An");
  expect(screen.getByRole("button", { name: "Save changes" }).hasAttribute("disabled")).toBe(true);
  auth.updateUser.mockResolvedValue(result("")); change(""); submit(); await waitFor(() => expect(sidebar()).not.toContain("Nguyễn An")); expect(sidebar()).toContain(user.email);
});
it("preserves later edits and binds Cancel and sidebar to the acknowledged snapshot, locking duplicate saves", async () => {
  let finish!: (value: unknown) => void; auth.updateUser.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  mount(); await ready(); change("Submitted"); act(() => { submit(); submit(); }); await waitFor(() => expect(auth.updateUser).toHaveBeenCalledOnce());
  expect(sidebar()).not.toContain("Submitted"); change("Later draft"); await act(async () => finish(result("Submitted")));
  expect(field().value).toBe("Later draft"); expect(screen.getByText("Unsaved changes.")).toBeTruthy(); expect(screen.queryByText("Changes saved.")).toBeNull(); expect(sidebar()).toContain("Submitted");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" })); expect(field().value).toBe("Submitted");
});
it("keeps the draft and old sidebar after failure and supports a confirmed retry", async () => {
  auth.updateUser.mockResolvedValue({ data: { user: null }, error: new Error("private-provider-detail") }); mount(); await ready(); change("Keep draft"); submit();
  await screen.findByRole("alert"); expect(field().value).toBe("Keep draft"); expect(sidebar()).toContain("Original Name"); expect(document.body.textContent).not.toContain("private-provider-detail");
  auth.updateUser.mockResolvedValue(result("Keep draft")); submit(); await screen.findByText("Changes saved."); expect(sidebar()).toContain("Keep draft");
});
it.each(["SIGNED_OUT", "SIGNED_IN"])("ignores late saves across %s and never repopulates old identity", async event => {
  let finish!: (value: unknown) => void; auth.updateUser.mockReturnValue(new Promise(resolve => { finish = resolve; })); mount(); await ready(); change("Late name"); submit();
  await waitFor(() => expect(auth.updateUser).toHaveBeenCalledOnce()); emit(event, event === "SIGNED_OUT" ? null : { user: { id: "B" } });
  await act(async () => finish(result("Late name"))); emit("USER_UPDATED", { user });
  expect(document.body.textContent).not.toContain("Late name"); expect(document.querySelector(".op-identity")).toBeNull(); expect(screen.queryByLabelText(/Display name/)).toBeNull();
});
it("rejects a changed verified owner before any update, and ignores checks after unmount", async () => {
  const view = mount(); await ready(); auth.getUser.mockResolvedValue(result("Other", "B")); change("No update"); submit();
  await waitFor(() => expect(screen.queryByLabelText(/Display name/)).toBeNull()); expect(auth.updateUser).not.toHaveBeenCalled(); expect(document.querySelector(".op-identity")).toBeNull(); view.unmount();
});
it("rejects unacknowledged name responses and validates multiline/oversized input", async () => {
  auth.updateUser.mockResolvedValue(result("Wrong snapshot")); mount(); await ready(); change("Wanted"); submit(); await screen.findByRole("alert"); expect(field().value).toBe("Wanted"); expect(sidebar()).toContain("Original Name");
  change("x".repeat(81)); submit(); expect(screen.getByRole("alert").textContent).toContain("80 characters"); expect(document.activeElement).toBe(field()); expect(auth.updateUser).toHaveBeenCalledOnce();
});
it("warns on unsaved link navigation, reload and signout, and removes warnings after Cancel", async () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false); mount(); await ready(); change("Draft");
  fireEvent.click(screen.getAllByRole("link", { name: /Saved CVs/ })[0]); expect(confirm).toHaveBeenCalled();
  const event = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(event); expect(event.defaultPrevented).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Sign out" })); expect(auth.signOut).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" })); const clean = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(clean); expect(clean.defaultPrevented).toBe(false); confirm.mockRestore();
});
it("does not let a scheduled token check supersede an in-flight save", async () => {
  let finish!: (value: unknown) => void; auth.updateUser.mockReturnValue(new Promise(resolve => { finish = resolve; })); mount(); await ready();
  emit("TOKEN_REFRESHED", { user }); change("Saved once"); submit(); await waitFor(() => expect(auth.updateUser).toHaveBeenCalledOnce());
  await act(async () => finish(result("Saved once"))); await screen.findByText("Changes saved."); expect(screen.getByRole("button", { name: "Cancel" }).hasAttribute("disabled")).toBe(true);
});
it("clears account identity when update returns an expired-session error without an SDK event", async () => {
  auth.updateUser.mockResolvedValue({ data: { user: null }, error: { status: 401, code: "session_not_found" } }); mount(); await ready(); change("Expired draft"); submit();
  await screen.findByText("Your session is no longer available."); expect(screen.queryByLabelText(/Display name/)).toBeNull(); expect(document.querySelector(".op-identity")).toBeNull();
  emit("USER_UPDATED", { user }); await act(async () => {}); expect(screen.queryByRole("link", { name: /Change password/ })).toBeNull();
});
it("ignores late account checks after expiry and unmount and sanitizes unexpected SDK exceptions", async () => {
  auth.updateUser.mockRejectedValue(new Error("secret-provider-detail")); const view = mount(); await ready(); change("Draft"); submit(); await screen.findByRole("alert");
  expect(field().value).toBe("Draft"); expect(document.body.textContent).not.toContain("secret-provider-detail");
  let finish!: (value: unknown) => void; auth.getUser.mockReturnValue(new Promise(resolve => { finish = resolve; })); submit(); emit("SIGNED_OUT", null); view.unmount(); await act(async () => finish(result("Stale"))); expect(auth.updateUser).toHaveBeenCalledOnce();
});
