import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
const evidence = ".factory/evidence/OWNPATH-VERIFY-20261020/screenshots";
const source = "Nguyễn Minh (fictional)\nExperience\nAccounts assistant, Cedar Co | 2024–2025\nChecked invoices and matched receipts to the monthly ledger.\nI did not approve payments.\nThe manager negotiated supplier contracts, not me.\nEducation\nAccounting diploma, 2023\nSkills\nExcel\n";
const pass = crypto.randomUUID() + crypto.randomUUID();
async function credentials(page: Page, signup = false) {
  await page.getByLabel("Email address").fill("fictional@example.test");
  await page.getByLabel("Password", { exact: true }).fill(pass);
  if (signup) await page.getByLabel("Confirm password", { exact: true }).fill(pass);
}
async function signin(page: Page) {
  await page.goto("/sign-in?next=/app/account"); await credentials(page);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
}
async function logout(page: Page) {
  await page.goto("/app/account");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:4386/");
}
test.beforeEach(async ({ page, request, baseURL }) => {
  await request.post("http://127.0.0.1:4387/__fixture/reset");
  await page.route("**/*", route => {
    const origin = new URL(route.request().url()).origin;
    return origin === baseURL || origin === "http://127.0.0.1:4387" ? route.continue() : route.abort();
  });
});

test("verified signup/signin use document navigation with cookies directly to workspace", async ({ page, request }) => {
  await request.post("http://127.0.0.1:4387/__fixture/signup-session", { data: { enabled: true } });
  await page.goto("/"); await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto("/sign-up"); await credentials(page, true);
  const signupDocument = page.waitForRequest(r => r.isNavigationRequest() && r.resourceType() === "document" && new URL(r.url()).pathname === "/app");
  await page.getByRole("button", { name: "Create your account", exact: true }).click();
  expect(Boolean((await signupDocument).headers().cookie)).toBe(true);
  await expect(page).toHaveURL(/\/app$/); await expect(page.getByRole("heading", { name: "Your next CV starts here." })).toBeVisible();
  await logout(page);
  const signinDocument = page.waitForRequest(r => r.isNavigationRequest() && r.resourceType() === "document" && new URL(r.url()).pathname === "/app");
  await signin(page); expect(Boolean((await signinDocument).headers().cookie)).toBe(true);
});

test("failed identity verification cannot redirect a signup session into workspace", async ({ page, request }) => {
  await request.post("http://127.0.0.1:4387/__fixture/signup-session", { data: { enabled: true } });
  await page.route("**/auth/v1/user", route => route.fulfill({ status: 503, json: { message: "Synthetic unavailable identity check" } }));
  await page.goto("/sign-up"); await credentials(page, true);
  await page.getByRole("button", { name: "Create your account", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "could not verify your session" })).toBeVisible();
  await expect(page).toHaveURL(/\/sign-up$/); await expect(page.getByRole("button", { name: "Retry verification" })).toBeEnabled();
});

test("manual profile storage, missing AI recovery, immutable history and named version CRUD without AI", async ({ page, context }) => {
  await fs.mkdir(evidence, { recursive: true }); await page.setViewportSize({ width: 1440, height: 1000 }); await signin(page);
  await page.getByRole("link", { name: "My profile", exact: true }).click();
  await page.getByLabel("Original CV or experience").fill(source);
  await expect(page.getByRole("button", { name: "Organize with AI" })).toBeDisabled();
  await page.getByLabel("I agree to send this experience text to OpenAI.").check();
  await page.getByRole("button", { name: "Organize with AI" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "OpenAI is not configured." })).toBeVisible();
  await expect(page.getByLabel("Original CV or experience")).toHaveValue(source);
  await page.getByLabel("I agree to send this experience text to OpenAI.").uncheck();
  await page.getByRole("button", { name: "Review text myself" }).click();
  await expect(page.getByRole("textbox", { name: "Line 5", exact: true })).toHaveValue("I did not approve payments.");
  await page.getByRole("button", { name: "Use this profile" }).click();
  let failSave = true;
  await page.route("**/api/cv-review/saved", route => {
    if (route.request().method() === "POST" && failSave) { failSave = false; return route.fulfill({ status: 503, json: { error: "Synthetic storage failure; retry." } }); }
    return route.continue();
  });
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Synthetic storage failure; retry.")).toBeVisible();
  await expect(page.getByLabel("Original CV or experience")).toHaveValue(source);
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile snapshot saved. Save again after further edits.")).toBeVisible();
  await page.screenshot({ path: `${evidence}/manual-profile-desktop.png`, fullPage: true });
  page.on("dialog", d => d.accept()); await page.reload();
  await page.getByText("Open a saved profile", { exact: true }).click(); await page.getByRole("button", { name: "Open profile", exact: true }).click();
  await expect(page.getByLabel("Original CV or experience")).toHaveValue(source);
  await logout(page); await signin(page); await page.getByRole("link", { name: "My profile", exact: true }).click();
  await page.getByText("Open a saved profile", { exact: true }).click(); await page.getByRole("button", { name: "Open profile", exact: true }).click();
  await expect(page.getByLabel("Original CV or experience")).toHaveValue(source);
  await page.getByRole("link", { name: "Continue to Tailor my CV →" }).click();
  await page.getByRole("button", { name: "Keep original CV" }).click(); await expect(page.getByTestId("final-cv")).toHaveText(source);
  await page.getByLabel("Version name").fill("Accounting · Original"); await page.getByRole("button", { name: "Save named version" }).click();
  await expect(page.getByText("CV version saved. Open it in My CVs.")).toBeVisible();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.evaluate(() => navigator.clipboard.writeText("")); await page.getByRole("button", { name: "Copy CV", exact: true }).click();
  expect(await page.evaluate(expected => navigator.clipboard.readText().then(text => text === expected), source)).toBe(true);
  await page.evaluate(() => navigator.clipboard.writeText(""));
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Download TXT (plain text)" }).click();
  const file = await download; expect(await fs.readFile((await file.path())!, "utf8")).toBe(source);
  await page.getByRole("link", { name: "My profile", exact: true }).click();
  await page.getByRole("textbox", { name: "Line 4", exact: true }).fill("Checked original invoices and receipts.");
  await page.getByRole("button", { name: "Use this profile" }).click(); await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile snapshot saved. Save again after further edits.")).toBeVisible();
  await page.getByRole("link", { name: "My CVs", exact: true }).click(); await page.getByRole("link", { name: "Accounting · Original →", exact: true }).click();
  await expect(page.getByTestId("final-cv")).toHaveText(source);
  await page.getByLabel("Version name").fill("Accounting · Revised");
  await page.getByText("Edit CV wording", { exact: true }).click(); await page.getByRole("textbox", { name: "CV line 4", exact: true }).fill("Đối chiếu hóa đơn và biên nhận.");
  await page.route("**/api/cv-review/saved", route => route.request().method() === "PATCH" ? route.fulfill({ status: 409, json: { error: "This version changed. Reopen it before saving again. Your edits remain here." } }) : route.continue(), { times: 1 });
  await page.getByRole("button", { name: "Save changes" }).click(); await expect(page.getByRole("alert").filter({ hasText: "This version changed" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "CV line 4", exact: true })).toHaveValue("Đối chiếu hóa đơn và biên nhận.");
  await page.getByRole("button", { name: "Save changes" }).click(); await expect(page.getByText("Changes saved.")).toBeVisible();
  await page.reload(); await expect(page.getByTestId("final-cv")).toHaveText(source.replace("Checked invoices and matched receipts to the monthly ledger.", "Đối chiếu hóa đơn và biên nhận."));
  await page.screenshot({ path: `${evidence}/saved-version-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click(); await expect(page.getByRole("dialog", { name: "Workspace navigation" })).toBeVisible();
  await page.keyboard.press("Escape"); await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  await page.getByRole("button", { name: "Open navigation" }).click(); await page.screenshot({ path: `${evidence}/workspace-mobile-drawer.png`, fullPage: true });
  await page.getByRole("link", { name: "My CVs", exact: true }).click();
  await expect(page.getByRole("link", { name: "Accounting · Revised →", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${evidence}/versions-mobile.png`, fullPage: true });
  await page.getByRole("button", { name: "Delete", exact: true }).click(); await expect(page.getByText("No CV versions saved yet.")).toBeVisible();
});
