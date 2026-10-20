// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { auth, create, unsubscribe } = vi.hoisted(() => ({ auth: { getUser: vi.fn(), onAuthStateChange: vi.fn() }, create: vi.fn(), unsubscribe: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: create }));
import { PublicHeader } from "./public-shell";
beforeEach(() => {
  create.mockReturnValue({ auth });
  auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } });
  auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });
describe("verified account navigation", () => {
  it("shows loading without asserting signed-in identity, then anonymous actions", async () => {
    render(<PublicHeader />);
    expect(screen.getByText("Checking account…")).toBeTruthy();
    expect(screen.queryByText("Your account")).toBeNull();
    await screen.findByRole("link", { name: "Create account" });
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
    render(<PublicHeader />); await screen.findByText("Create account");
    const callback = auth.onAuthStateChange.mock.calls[0][0];
    auth.getUser.mockResolvedValue({ data: { user: { id: "verified" } }, error: null });
    act(() => callback("SIGNED_IN", { user: { id: "untrusted" } }));
    expect(auth.getUser).toHaveBeenCalledOnce();
    await screen.findByText("Go to workspace");
    auth.getUser.mockRejectedValue(new Error("private detail"));
    act(() => callback("TOKEN_REFRESHED", {}));
    await screen.findByText("Create account");
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
