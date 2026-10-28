// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

const { auth, create, unsubscribe, continueAfterAuth } = vi.hoisted(() => ({
  auth: { getUser: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn(), resend: vi.fn(), resetPasswordForEmail: vi.fn(), updateUser: vi.fn(), signOut: vi.fn(), onAuthStateChange: vi.fn() },
  create: vi.fn(), unsubscribe: vi.fn(), continueAfterAuth: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: create }));
vi.mock("./auth-navigation", () => ({ continueAfterAuth }));
import AuthPanel from "./auth-panel";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  create.mockReturnValue({ auth });
  auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } });
});
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.unstubAllEnvs(); });
const email = "fictional@example.test";
const password = "fictional passphrase only";
async function ready() { await waitFor(() => expect(screen.queryByText("Checking authentication…")).toBeNull()); }
function fill(strong = true) {
  const field = screen.queryByLabelText("Email address");
  if (field) fireEvent.change(field, { target: { value: email } });
  const pass = screen.queryByLabelText("Password") || screen.queryByLabelText("New password");
  if (pass) fireEvent.change(pass, { target: { value: strong ? password : "old" } });
  const confirm = screen.queryByLabelText("Confirm password");
  if (confirm) fireEvent.change(confirm, { target: { value: password } });
}
function submit() { fireEvent.submit(document.querySelector("form")!); }

describe("dedicated account controls", () => {
  it.each(["signIn", "reset"] as const)("keeps %s icon controls keyboard-operable without submitting or changing native values", async mode => {
    const user = userEvent.setup();
    const owner = { id: "synthetic-owner", email };
    if (mode === "reset") auth.getUser.mockResolvedValue({ data: { user: owner }, error: null });
    render(<AuthPanel mode={mode} initialUser={mode === "reset" ? owner : undefined} resetAllowed={mode === "reset"} />); await ready();
    fill();
    const pass = screen.getByLabelText(mode === "reset" ? "New password" : "Password") as HTMLInputElement;
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle.textContent).toBe(""); expect(toggle.getAttribute("type")).toBe("button");
    expect(toggle.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
    const hiddenIcon = toggle.innerHTML;
    toggle.focus(); await user.keyboard(" ");
    expect(document.activeElement).toBe(toggle); expect(pass.type).toBe("text"); expect(pass.value).toBe(password);
    expect(toggle.getAttribute("aria-label")).toBe("Hide password"); expect(toggle.innerHTML).not.toBe(hiddenIcon);
    if (mode === "reset") {
      const confirm = screen.getByLabelText("Confirm password") as HTMLInputElement;
      expect(confirm.type).toBe("password");
      await user.click(screen.getByRole("button", { name: "Show confirmation password" }));
      expect(confirm.type).toBe("text"); expect(pass.type).toBe("text");
    }
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(pass.type).toBe("password"); expect(pass.value).toBe(password);
    expect(pass.autocomplete).toBe(mode === "signIn" ? "current-password" : "new-password");
    expect(auth.signInWithPassword).not.toHaveBeenCalled(); expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("accepts paste, keeps confirmation validation, and exposes independent keyboard-operable visibility controls", async () => {
    const user = userEvent.setup();
    render(<AuthPanel mode="signUp" />); await ready();
    const pass = screen.getByLabelText("Password") as HTMLInputElement;
    const confirm = screen.getByLabelText("Confirm password") as HTMLInputElement;
    expect(pass.type).toBe("password"); expect(confirm.type).toBe("password");
    await user.type(screen.getByLabelText("Email address"), email);
    await user.click(pass); await user.paste(password);
    await user.click(confirm); await user.paste("different synthetic passphrase");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(pass.type).toBe("text"); expect(confirm.type).toBe("password");
    expect(auth.signUp).not.toHaveBeenCalled();
    submit();
    expect(confirm.getAttribute("aria-invalid")).toBe("true");
    expect(auth.signUp).not.toHaveBeenCalled();
    await user.clear(confirm); await user.paste(password);
    const showConfirm = screen.getByRole("button", { name: "Show confirmation password" });
    showConfirm.focus(); await user.keyboard("{Enter}");
    expect(confirm.type).toBe("text");
    expect(document.activeElement).toBe(showConfirm);
    expect(showConfirm.getAttribute("type")).toBe("button");
    expect(showConfirm.textContent).toBe("");
    expect(showConfirm.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
    expect(showConfirm.getAttribute("aria-label")).toBe("Hide confirmation password");
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(pass.type).toBe("password");
    expect(pass.value === password && confirm.value === password).toBe(true);
    expect(pass.autocomplete).toBe("new-password"); expect(confirm.autocomplete).toBe("new-password");
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null }); submit();
    await screen.findByRole("heading", { name: "Check your email" });
    expect(auth.signUp).toHaveBeenCalledOnce();
    expect(auth.signUp.mock.calls[0][0].password === password).toBe(true);
  });

  it("reads manager-filled native values without change events and preserves them across another field edit", async () => {
    const user = userEvent.setup();
    render(<AuthPanel mode="signUp" />); await ready();
    // Contract simulation only; actual clipboard behavior is covered in Chromium.
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(screen.getByLabelText("Password"), password);
    setter.call(screen.getByLabelText("Confirm password"), password);
    await user.type(screen.getByLabelText("Email address"), email);
    expect((screen.getByLabelText("Password") as HTMLInputElement).value === password).toBe(true);
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null }); submit();
    await screen.findByRole("heading", { name: "Check your email" });
    expect(auth.signUp.mock.calls[0][0].password === password).toBe(true);
  });

  it("submits native autofill values even without any change event", async () => {
    render(<AuthPanel mode="signUp" />); await ready();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    for (const [label, value] of [["Email address", email], ["Password", password], ["Confirm password", password]]) {
      setter.call(screen.getByLabelText(label), value);
    }
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null }); submit();
    await screen.findByRole("heading", { name: "Check your email" });
    expect(auth.signUp).toHaveBeenCalledOnce();
    expect(auth.signUp.mock.calls[0][0].password === password).toBe(true);
  });

  it("truthfully reports missing configuration without simulated success", async () => {
    create.mockImplementation(() => { throw new Error("not configured"); });
    render(<AuthPanel mode="signUp" />); await ready();
    expect(screen.getByRole("alert").textContent).toBe("Authentication is not configured.");
    expect(screen.getByRole("button", { name: "Create your account" }).hasAttribute("disabled")).toBe(true);
    expect(auth.signUp).not.toHaveBeenCalled();
  });
  it("labels errors, focuses the first invalid field, and sends nothing invalid", async () => {
    render(<AuthPanel mode="signUp" />); await ready(); submit();
    expect(document.activeElement).toBe(screen.getByLabelText("Email address"));
    expect(screen.getByLabelText("Email address").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByLabelText("Email address").getAttribute("aria-describedby")).toBe("email-error");
    expect(auth.signUp).not.toHaveBeenCalled();
  });
  it("locks duplicate same-event submissions before React state updates", async () => {
    let resolve!: (value: unknown) => void;
    auth.signUp.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<AuthPanel mode="signUp" />); await ready(); fill();
    act(() => { submit(); submit(); });
    expect(auth.signUp).toHaveBeenCalledOnce();
    await act(async () => resolve({ data: { user: { id: "unverified" }, session: null }, error: null }));
    expect(screen.getByRole("heading", { name: "Check your email" })).toBeTruthy();
    expect(screen.queryByLabelText("Password")).toBeNull();
    expect(continueAfterAuth).not.toHaveBeenCalled();
  });
  it("keeps inputs and unlocks on rejected signup/network calls without leaking provider details", async () => {
    auth.signUp.mockRejectedValue(new Error("private synthetic provider detail"));
    render(<AuthPanel mode="signUp" />); await ready(); fill(); submit();
    await screen.findByRole("alert");
    expect(screen.getByRole("alert").textContent).toContain("Your inputs are kept");
    expect(document.body.textContent).not.toContain("private synthetic");
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe(password);
    expect(screen.getByRole("button", { name: "Create your account" }).hasAttribute("disabled")).toBe(false);
  });
  it("resends neutrally with email only and a configured callback", async () => {
    auth.resend.mockResolvedValue({ error: null });
    render(<AuthPanel mode="signIn" />); await ready(); fill(false);
    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation email" }));
    await screen.findByRole("status");
    expect(auth.resend).toHaveBeenCalledWith({ type: "signup", email, options: { emailRedirectTo: "http://localhost:3000/auth/callback?next=%2Fapp" } });
  });
  it("requests password recovery with a safe reset callback, no account-existence claim", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    render(<AuthPanel mode="forgot" />); await ready(); fill(); submit();
    await screen.findByRole("status");
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(email, { redirectTo: "http://localhost:3000/auth/callback?next=%2Freset-password" });
    expect(screen.getByRole("status").textContent).toContain("If this address can receive");
  });
  it("accepts existing shorter login passwords and sanitizes provider failures", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: new Error("provider detail") });
    render(<AuthPanel mode="signIn" next="//evil.test" />); await ready(); fill(false); submit();
    await screen.findByRole("alert");
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email, password: "old" });
    expect(screen.getByRole("alert").textContent).not.toContain("provider detail");
  });
  it("does not treat a signin user without a session as authenticated", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { user: { id: "untrusted" }, session: null }, error: null });
    render(<AuthPanel mode="signIn" />); await ready(); fill(); submit();
    await screen.findByRole("alert");
    expect(auth.getUser).toHaveBeenCalledOnce();
    expect(continueAfterAuth).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign in" }).hasAttribute("disabled")).toBe(false);
  });
  it("does not authorize reset from a client-only user/session flag", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: "fictional" } }, error: null });
    render(<AuthPanel mode="reset" resetAllowed={false} />); await ready();
    expect(screen.queryByRole("button", { name: "Update password" })).toBeNull();
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it("verifies identity again before updating a new confirmed password", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: "fictional" } }, error: null });
    auth.updateUser.mockResolvedValue({ error: null });
    render(<AuthPanel mode="reset" resetAllowed />); await ready(); fill(); submit();
    await screen.findByRole("status");
    expect(auth.getUser).toHaveBeenCalledTimes(2);
    expect(auth.updateUser).toHaveBeenCalledWith({ password });
    expect(screen.queryByLabelText("New password")).toBeNull();
  });
  it("shows recoverable expired-reset state without update", async () => {
    auth.getUser.mockResolvedValueOnce({ data: { user: { id: "fictional" } }, error: null }).mockResolvedValueOnce({ data: { user: null }, error: new Error("expired") });
    render(<AuthPanel mode="reset" resetAllowed />); await ready(); fill(); submit();
    await screen.findByRole("alert"); expect(auth.updateUser).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("expired");
  });
  it("does not change another account’s password if the identity switches before the update", async () => {
    auth.getUser.mockResolvedValueOnce({ data: { user: { id: "A", email } }, error: null }).mockResolvedValueOnce({ data: { user: { id: "B", email: "other@example.test" } }, error: null });
    render(<AuthPanel mode="reset" initialUser={{ id: "A", email }} resetAllowed />); await ready(); fill(); submit();
    await screen.findByRole("alert"); expect(auth.updateUser).not.toHaveBeenCalled(); expect(screen.getByRole("alert").textContent).toContain("session expired or changed"); expect(screen.queryByLabelText("New password")).toBeNull();
  });
  it("keeps active account visible if logout fails", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: "fictional", email } }, error: null });
    auth.signOut.mockResolvedValue({ error: new Error("failed") });
    render(<AuthPanel mode="account" />); await ready(); fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await screen.findByRole("alert"); expect(screen.getByText(email)).toBeTruthy();
    expect(screen.queryByText("Signed out on this browser.")).toBeNull();
  });
  it("signs out only this browser on provider success", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: "fictional", email } }, error: null });
    auth.signOut.mockResolvedValue({ error: null });
    render(<AuthPanel mode="account" />); await ready(); fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(screen.queryByText(email)).toBeNull());
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("unsubscribes and ignores a late session result after unmount", async () => {
    let resolve!: (value: unknown) => void;
    auth.getUser.mockReturnValue(new Promise((r) => { resolve = r; }));
    const view = render(<AuthPanel mode="account" />);
    await waitFor(() => expect(auth.getUser).toHaveBeenCalledOnce()); view.unmount();
    await act(async () => resolve({ data: { user: { id: "late" } }, error: null }));
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(document.body.textContent).not.toContain("late");
  });
  it("does not let a stale initial check restore a signed-out account", async () => {
    let resolve!: (value: unknown) => void;
    auth.getUser.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<AuthPanel mode="account" />);
    await waitFor(() => expect(auth.onAuthStateChange).toHaveBeenCalledOnce());
    act(() => auth.onAuthStateChange.mock.calls[0][0]("SIGNED_OUT", null));
    await act(async () => resolve({ data: { user: { id: "late", email } }, error: null }));
    expect(screen.queryByText(email)).toBeNull();
  });
  it("preserves an entered recovery email across SDK SIGNED_OUT while clearing password fields", async () => {
    render(<AuthPanel mode="forgot" />); await ready(); fill();
    act(() => auth.onAuthStateChange.mock.calls[0][0]("SIGNED_OUT", null));
    expect((screen.getByLabelText("Email address") as HTMLInputElement).value).toBe(email);
    auth.resetPasswordForEmail.mockResolvedValue({ error: null }); submit();
    await screen.findByRole("status"); expect(auth.resetPasswordForEmail).toHaveBeenCalledOnce();
  });
  it("models SDK local-session removal on provider logout error without falsely reporting success", async () => {
    auth.getUser.mockResolvedValueOnce({ data: { user: { id: "fictional", email } }, error: null }).mockResolvedValue({ data: { user: null }, error: new Error("missing session") });
    auth.signOut.mockImplementation(async () => {
      auth.onAuthStateChange.mock.calls[0][0]("SIGNED_OUT", null);
      return { error: new Error("remote logout failed") };
    });
    render(<AuthPanel mode="account" />); await ready();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await screen.findByRole("alert");
    expect(auth.getUser).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(email)).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("provider could not confirm sign-out");
    expect(screen.queryByText("Signed out on this browser.")).toBeNull();
  });

  it("shows a focused confirmation screen without inventing a verified signup session", async () => {
    auth.signUp.mockResolvedValue({ data: { user: { id: "obfuscated" }, session: null }, error: null });
    render(<AuthPanel mode="signUp" next="//evil.test" />); await ready(); fill(); submit();
    const heading = await screen.findByRole("heading", { name: "Check your email" });
    expect(document.activeElement).toBe(heading);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("No email delivery is confirmed");
    expect(screen.queryByLabelText("Password")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Change email" }));
    expect((screen.getByLabelText("Email address") as HTMLInputElement).value).toBe(email);
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("");
    expect(auth.getUser).toHaveBeenCalledOnce();
    expect(continueAfterAuth).not.toHaveBeenCalled();
  });

  it.each(["signUp", "signIn"] as const)("verifies a returned %s session before direct workspace navigation", async (mode) => {
    auth.signUp.mockResolvedValue({ data: { user: { id: "untrusted" }, session: { access_token: "fictional" } }, error: null });
    auth.signInWithPassword.mockResolvedValue({ data: { user: { id: "untrusted" }, session: { access_token: "fictional" } }, error: null });
    render(<AuthPanel mode={mode} next="/app/account" />); await ready(); fill();
    let verify!: (value: unknown) => void;
    auth.getUser.mockReturnValue(new Promise((resolve) => { verify = resolve; }));
    submit();
    await waitFor(() => expect(auth.getUser).toHaveBeenCalledTimes(2));
    expect(continueAfterAuth).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Verify your session" })).toBeNull();
    await act(async () => verify({ data: { user: { id: "verified" } }, error: null }));
    expect(continueAfterAuth).toHaveBeenCalledOnce();
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("");
    if (mode === "signUp") expect(auth.signUp.mock.calls[0][0].options.emailRedirectTo).toBe("http://localhost:3000/auth/callback?next=%2Fapp");
  });

  it.each(["signUp", "signIn"] as const)("keeps failed %s verification recoverable without repeating authentication", async (mode) => {
    auth.signUp.mockResolvedValue({ data: { session: { access_token: "fictional" } }, error: null });
    auth.signInWithPassword.mockResolvedValue({ data: { user: { id: "untrusted" }, session: { access_token: "fictional" } }, error: null });
    render(<AuthPanel mode={mode} />); await ready(); fill();
    auth.getUser.mockRejectedValueOnce(new Error("private detail")); submit();
    await screen.findByRole("alert");
    expect(screen.getByRole("alert").textContent).toContain("could not verify");
    expect(screen.queryByRole("heading", { name: "Check your email" })).toBeNull();
    expect(continueAfterAuth).not.toHaveBeenCalled();
    auth.getUser.mockResolvedValue({ data: { user: { id: "verified" } }, error: null });
    fireEvent.click(screen.getByRole("button", { name: "Retry verification" }));
    await waitFor(() => expect(continueAfterAuth).toHaveBeenCalledOnce());
    expect(mode === "signUp" ? auth.signUp : auth.signInWithPassword).toHaveBeenCalledOnce();
  });

  it.each(["signUp", "signIn"] as const)("does not redirect %s after identity verification rejects the session", async (mode) => {
    const result = { data: { user: { id: "untrusted" }, session: { access_token: "fictional" } }, error: null };
    auth.signUp.mockResolvedValue(result); auth.signInWithPassword.mockResolvedValue(result);
    render(<AuthPanel mode={mode} />); await ready(); fill();
    auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("private provider detail") });
    submit(); await screen.findByRole("alert");
    expect(continueAfterAuth).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("could not verify");
    expect(screen.getByRole("alert").textContent).not.toContain("private provider detail");
  });

  it.each(["signUp", "signIn"] as const)("ignores %s verification that resolves after signout", async (mode) => {
    const result = { data: { user: { id: "untrusted" }, session: { access_token: "fictional" } }, error: null };
    auth.signUp.mockResolvedValue(result); auth.signInWithPassword.mockResolvedValue(result);
    render(<AuthPanel mode={mode} />); await ready(); fill();
    let verify!: (value: unknown) => void;
    auth.getUser.mockReturnValue(new Promise(resolve => { verify = resolve; }));
    submit(); await waitFor(() => expect(auth.getUser).toHaveBeenCalledTimes(2));
    act(() => auth.onAuthStateChange.mock.calls[0][0]("SIGNED_OUT", null));
    await act(async () => verify({ data: { user: { id: "stale" } }, error: null }));
    expect(continueAfterAuth).not.toHaveBeenCalled();
  });
});
