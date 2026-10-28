// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { auth, create, unsubscribe } = vi.hoisted(() => ({ auth: { getUser: vi.fn(), onAuthStateChange: vi.fn() }, create: vi.fn(), unsubscribe: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: create }));
import { PublicFooter, PublicHeader } from "./public-shell";
beforeEach(() => {
  create.mockReturnValue({ auth });
  auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } });
  auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it("uses the supplied logo only for landing branding, without duplicate text", async () => {
  const view = render(<><PublicHeader landing /><PublicFooter landing /></>);
  await waitFor(() => expect(screen.queryByText("Checking account…")).toBeNull());
  const logos = screen.getAllByRole("img", { name: "OwnPath" });
  expect(logos).toHaveLength(2);
  for (const logo of logos) {
    expect(logo.getAttribute("src")).toContain("ownpath-logo.png");
    expect(logo.getAttribute("width")).toBe("1945");
    expect(logo.getAttribute("height")).toBe("808");
    expect(logo.closest("a")?.getAttribute("href")).toBe("/");
    expect(logo.closest("a")?.textContent).toBe("");
  }
  view.rerender(<><PublicHeader /><PublicFooter /></>);
  expect(screen.queryByRole("img", { name: "OwnPath" })).toBeNull();
  expect(screen.getByRole("link", { name: "OwnPath home" }).textContent).toBe("↗OwnPath.");
});
it("simplifies only the landing footer, preserving useful navigation and the Auth footer", () => {
  const view = render(<PublicFooter landing />);
  expect(screen.getAllByRole("link").map(link => link.getAttribute("href"))).toEqual(["/", "/app", "/sign-in", "/sign-up"]);
  expect(screen.queryByText("Clearer words. The same honest experience.")).toBeNull();
  expect(screen.queryByText("OwnPath · Your experience, your next step")).toBeNull();
  view.rerender(<PublicFooter />);
  expect(screen.getByText("Clearer words. The same honest experience.")).toBeTruthy();
  expect(screen.getByText("OwnPath · Your experience, your next step")).toBeTruthy();
});
describe("verified account navigation", () => {
  it("shows loading without asserting signed-in identity, then anonymous actions", async () => {
    render(<PublicHeader />);
    expect(screen.getByText("Checking account…")).toBeTruthy();
    expect(screen.queryByText("Your account")).toBeNull();
    await screen.findByRole("link", { name: "Get started" });
    expect(screen.queryByText("Checking account…")).toBeNull();
  });
  it("shows only account navigation after provider verification without identity disclosure", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: "fictional", email: "private@example.test" } }, error: null });
    render(<PublicHeader />);
    expect((await screen.findByRole("link", { name: "Go to workspace" })).getAttribute("href")).toBe("/app");
    expect(screen.queryByText("Sign in")).toBeNull();
    expect(document.body.textContent).not.toContain("private@example.test");
  });
  it("defers event verification, rejects payload identity and clears on expiry/error", async () => {
    render(<PublicHeader />); await screen.findByText("Get started");
    const callback = auth.onAuthStateChange.mock.calls[0][0];
    auth.getUser.mockResolvedValue({ data: { user: { id: "verified" } }, error: null });
    act(() => callback("SIGNED_IN", { user: { id: "untrusted" } }));
    expect(auth.getUser).toHaveBeenCalledOnce();
    await screen.findByText("Go to workspace");
    auth.getUser.mockRejectedValue(new Error("private detail"));
    act(() => callback("TOKEN_REFRESHED", {}));
    await screen.findByText("Get started");
    expect(screen.queryByText("Your account")).toBeNull();
    expect(document.body.textContent).not.toContain("private detail");
  });
  it("ignores stale verification after signout and unsubscribes on unmount", async () => {
    let resolve!: (value: unknown) => void;
    auth.getUser.mockReturnValue(new Promise((r) => { resolve = r; }));
    const view = render(<PublicHeader />);
    await waitFor(() => expect(auth.getUser).toHaveBeenCalledOnce());
    act(() => auth.onAuthStateChange.mock.calls[0][0]("SIGNED_OUT", null));
    await act(async () => resolve({ data: { user: { id: "stale" } }, error: null }));
    expect(screen.queryByText("Your account")).toBeNull();
    view.unmount(); expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
