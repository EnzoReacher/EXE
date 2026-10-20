import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";

const fixture = "http://127.0.0.1:4387";
const evidence = ".factory/evidence/OWNPATH-ACCOUNT-20261020/screenshots";
const name = "Nguyễn An · Synthetic";
async function signIn(page: Page) {
  await page.goto("/sign-in"); await page.getByLabel("Email address").fill("fictional@example.test"); await page.getByLabel("Password", { exact: true }).fill("synthetic password for local fixture"); await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(/\/app$/);
}
async function account(page: Page) { await page.goto("/app/account"); await expect(page.getByText("Up to date.", { exact: true })).toBeVisible(); await expect(page.getByText("Checking authentication…")).toHaveCount(0); }
async function shot(page: Page, filename: string) { await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; window.scrollTo(0, 0); }); await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0); await page.screenshot({ path: `${evidence}/${filename}.png`, fullPage: !filename.endsWith("-drawer"), style: ".skip-link:not(:focus) { opacity: 0; }" }); }
test.beforeEach(async ({ page, request, baseURL }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await fs.mkdir(evidence, { recursive: true }); await request.post(`${fixture}/__fixture/reset`);
  await request.post(`${fixture}/__fixture/account`, { data: { metadata: { display_name: name, unrelated: "preserve-metadata" } } });
  await page.route("**/*", route => [baseURL, fixture].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
});

for (const width of [1440, 390, 320]) test(`profile identity and responsive controls at ${width}px`, async ({ page, request }) => {
  await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 }); await signIn(page); await account(page);
  await expect(page.getByRole("heading", { name: "Your account", exact: true })).toBeVisible(); await expect(page.getByRole("region", { name: "Profile summary" })).toContainText(name);
  await expect(page.getByLabel(/Email address/)).toHaveAttribute("readonly", ""); await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveCount(0); await expect(page.getByRole("link", { name: "Create account", exact: true })).toHaveCount(0);
  const input = page.getByLabel(/Display name/); await shot(page, `${width}-initial`); await input.focus(); await page.keyboard.press("Tab"); await expect(page.getByLabel(/Email address/)).toBeFocused(); await page.getByLabel(/Email address/).blur();
  await input.fill("Unsaved edit"); await page.getByRole("button", { name: "Cancel", exact: true }).click(); await expect(input).toHaveValue(name); await expect(input).toBeFocused();
  await input.fill("Changed · Synthetic"); await page.getByRole("button", { name: "Save changes", exact: true }).click(); await expect(page.getByText("Changes saved.", { exact: true })).toBeVisible();
  if (width === 1440) await expect(page.locator(".op-identity")).toContainText("Changed · Synthetic");
  await shot(page, `${width}-saved`); await page.reload(); await expect(input).toHaveValue("Changed · Synthetic");
  expect((await (await request.get(`${fixture}/__fixture/account`)).json()).user.user_metadata).toEqual({ display_name: "Changed · Synthetic", unrelated: "preserve-metadata" });
  await request.post(`${fixture}/__fixture/account`, { data: { failUpdates: true } }); await input.fill("Keep after failure"); await page.getByRole("button", { name: "Save changes", exact: true }).click(); await expect(page.getByRole("alert").filter({ hasText: "Your edits are kept" })).toBeVisible(); await expect(input).toHaveValue("Keep after failure"); await shot(page, `${width}-error`);
  let warned = false; page.once("dialog", async dialog => { warned = dialog.message().includes("Leave without saving"); await dialog.dismiss(); }); await page.locator(".op-profile-library").click(); expect(warned).toBe(true); await expect(page).toHaveURL(/\/app\/account$/); await expect(input).toHaveValue("Keep after failure"); await page.getByRole("button", { name: "Cancel", exact: true }).click();
  const longName = "Nguyễn-An ".repeat(8).trim(); const email = `${"very-long-synthetic-".repeat(8)}address@example.test`;
  await request.post(`${fixture}/__fixture/account`, { data: { failUpdates: false, metadata: { display_name: longName }, email } }); await page.reload(); await expect(input).toHaveValue(longName);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await shot(page, `${width}-long-identity`);
  if (width < 760) {
    await page.getByRole("button", { name: "Open navigation" }).click(); await expect(page.locator(".op-identity")).toContainText(longName); await shot(page, `${width}-drawer`); await page.keyboard.press("Escape"); await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  }
});

test("in-flight snapshots, duplicate saves, retry, optional name and signin persistence", async ({ page, request }) => {
  await signIn(page); await account(page); const input = page.getByLabel(/Display name/);
  let finish!: () => void; const gate = new Promise<void>(resolve => { finish = resolve; }); let puts = 0;
  await page.route("**/auth/v1/user", async route => { if (route.request().method() === "PUT") { puts++; await gate; } await route.continue(); });
  await input.fill("Acknowledged snapshot"); await page.getByRole("button", { name: "Save changes", exact: true }).click(); await expect(page.getByRole("button", { name: "Saving…", exact: true })).toBeDisabled();
  await page.getByRole("form", { name: "Personal details" }).evaluate(form => { form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); }); await input.fill("Later unsaved draft"); await shot(page, "1440-saving"); finish();
  await expect(page.locator(".op-identity")).toContainText("Acknowledged snapshot"); await expect(input).toHaveValue("Later unsaved draft"); await expect(page.getByText("Unsaved changes.", { exact: true })).toBeVisible(); expect(puts).toBe(1);
  await page.getByRole("button", { name: "Cancel", exact: true }).click(); await expect(input).toHaveValue("Acknowledged snapshot");
  await page.getByRole("button", { name: "Sign out", exact: true }).click(); await expect(page).toHaveURL(/4386\/$/); await signIn(page); await account(page); await expect(input).toHaveValue("Acknowledged snapshot");
  await input.fill(""); await page.getByRole("button", { name: "Save changes", exact: true }).click(); await expect(page.getByText("Changes saved.", { exact: true })).toBeVisible(); await expect(page.locator(".op-identity")).toContainText("fictional@example.test"); await shot(page, "1440-no-name");
  const state = (await (await request.get(`${fixture}/__fixture/account`)).json()).account; expect(state.metadataUpdates).toBe(2); expect(state.logoutScopes).toEqual(["local"]); expect(state.recoveryRequests).toBe(0);
});

test("secure password route and truthful local logout failure", async ({ page, request }) => {
  await signIn(page); await account(page); await page.getByRole("link", { name: /Change password/ }).click(); await expect(page).toHaveURL(/\/reset-password$/);
  const password = page.getByLabel("New password", { exact: true }); const confirmation = page.getByLabel("Confirm password", { exact: true }); const secret = "synthetic new password fixture only";
  await password.fill(secret); await confirmation.fill(secret); await page.getByRole("button", { name: "Show password", exact: true }).click(); await expect(password).toHaveAttribute("type", "text"); await expect(confirmation).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show confirmation password", exact: true }).click(); await expect(confirmation).toHaveAttribute("type", "text"); await page.getByRole("button", { name: "Hide password", exact: true }).click(); await page.getByRole("button", { name: "Hide confirmation password", exact: true }).click();
  await page.getByRole("button", { name: "Update password", exact: true }).click(); await expect(page.getByRole("status")).toContainText("Your password has been updated"); await expect(password).toHaveCount(0);
  expect((await (await request.get(`${fixture}/__fixture/account`)).json()).account.passwordUpdates).toBe(1);
  await account(page); await request.post(`${fixture}/__fixture/account`, { data: { failLogout: true } }); await page.getByRole("button", { name: "Sign out", exact: true }).click(); await expect(page.locator(".op-signout-card [role=alert]")).toContainText(/Could not sign out|could not confirm sign-out/); await shot(page, "1440-logout-error");
  expect((await (await request.get(`${fixture}/__fixture/account`)).json()).account.logoutScopes).toEqual(["local"]);
});

test("expiry during an in-flight update clears identity and ignores the late response", async ({ page, request }) => {
  await signIn(page); await account(page); let finish!: () => void; const gate = new Promise<void>(resolve => { finish = resolve; }); let started = false;
  await page.route("**/auth/v1/user", async route => { if (route.request().method() === "PUT") { started = true; await gate; await route.fulfill({ status: 401, json: { code: "session_not_found", message: "Synthetic expired session" } }); } else await route.continue(); });
  await page.getByLabel(/Display name/).fill("Late synthetic name"); await page.getByRole("button", { name: "Save changes", exact: true }).click(); await expect.poll(() => started).toBe(true);
  await request.post(`${fixture}/__fixture/account`, { data: { expired: true } }); finish(); await expect(page.locator(".op-identity")).toHaveCount(0); await expect(page.getByLabel(/Display name/)).toHaveCount(0); await expect(page.getByText("Late synthetic name", { exact: true })).toHaveCount(0); await shot(page, "1440-session-ended");
});

test("unsaved Back navigation can be cancelled and password recovery remains explicit", async ({ page, request }) => {
  await page.goto("/account"); await expect(page).toHaveURL(/\/sign-in/); await signIn(page); await page.goto("/app/cvs"); await page.getByRole("link", { name: "Account & security", exact: true }).click(); await expect(page.getByText("Up to date.", { exact: true })).toBeVisible();
  await page.getByLabel(/Display name/).fill("Unsaved Back navigation"); let warned = false; page.once("dialog", async dialog => { warned = dialog.message().includes("Leave without saving"); await dialog.dismiss(); }); await page.evaluate(() => history.back()); await expect.poll(() => warned).toBe(true); await expect(page).toHaveURL(/\/app\/account$/); await expect(page.getByLabel(/Display name/)).toHaveValue("Unsaved Back navigation");
  await page.getByRole("button", { name: "Cancel", exact: true }).click(); await page.getByRole("button", { name: "Sign out", exact: true }).click(); await expect(page).toHaveURL(/4386\/$/);
  await page.goto("/reset-password"); await expect(page.getByRole("button", { name: "Update password", exact: true })).toHaveCount(0); expect((await (await request.get(`${fixture}/__fixture/account`)).json()).account.recoveryRequests).toBe(0);
  await page.goto("/forgot-password"); await page.getByLabel("Email address").fill("fictional@example.test"); await page.getByRole("button", { name: "Send reset link", exact: true }).click(); await expect(page.getByRole("status")).toContainText("If this address can receive"); expect((await (await request.get(`${fixture}/__fixture/account`)).json()).account.recoveryRequests).toBe(1);
});
