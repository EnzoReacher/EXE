import { expect, test, type Locator, type Page } from "@playwright/test";
import fs from "node:fs/promises";

// Fresh headless Chromium contexts have their own clipboard. Seed before any
// copy/read; never use the desktop browser or capture values in test evidence.
const synthetic = "Fictional clipboard passphrase 42!";
async function matches(field: Locator, value: string) {
  expect(await field.evaluate((input, expected) => (input as HTMLInputElement).value === expected, value)).toBe(true);
}
async function seed(page: Page, value: string) {
  await page.evaluate((text) => navigator.clipboard.writeText(text), value);
}
async function paste(page: Page, field: Locator) {
  await field.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Control+v");
}

test.beforeEach(async ({ page, baseURL }) => {
  // No real credentials, account creation, or external service traffic.
  await page.route("**/*", (route) => new URL(route.request().url()).origin === baseURL ? route.continue() : route.abort());
  await page.goto("/sign-up");
  await expect(page.getByText("Checking authentication…")).toHaveCount(0);
  await seed(page, "");
});

test.afterEach(async ({ page }) => { await seed(page, ""); });

test("visibility icons stay inset, padded and keyboard-focused at desktop and mobile sizes", async ({ page }) => {
  const evidence = ".factory/evidence/OWNPATH-PASSWORD-ICONS-20261020/screenshots";
  await fs.mkdir(evidence, { recursive: true });
  for (const width of [1440, 390, 320]) for (const route of ["sign-up", "sign-in"]) {
    await page.setViewportSize({ width, height: 950 }); await page.goto(`/${route}`);
    await expect(page.getByText("Checking authentication…")).toHaveCount(0);
    const toggle = page.locator('button[aria-controls="auth-password"]');
    await expect(toggle).toHaveAccessibleName("Show password");
    const input = page.getByLabel("Password", { exact: true });
    const buttonBox = (await toggle.boundingBox())!, inputBox = (await input.boundingBox())!;
    expect(buttonBox.width).toBeGreaterThanOrEqual(44); expect(buttonBox.height).toBeGreaterThanOrEqual(44);
    expect(buttonBox.x).toBeGreaterThan(inputBox.x); expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(inputBox.x + inputBox.width);
    expect(buttonBox.y).toBeGreaterThanOrEqual(inputBox.y); expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(inputBox.y + inputBox.height);
    expect(await input.evaluate(el => parseFloat(getComputedStyle(el).paddingRight))).toBeGreaterThanOrEqual(52);
    await expect(toggle).toHaveAttribute("type", "button"); await expect(toggle.locator("svg")).toHaveAttribute("aria-hidden", "true"); await expect(toggle).toHaveText("");
    await toggle.focus(); await page.keyboard.press("Enter"); await expect(toggle).toBeFocused(); await expect(toggle).toHaveAccessibleName("Hide password"); await expect(input).toHaveAttribute("type", "text");
    expect(await toggle.evaluate(el => getComputedStyle(el).outlineStyle)).toBe("solid");
    expect(await toggle.evaluate(el => getComputedStyle(el).outlineOffset)).toBe("-3px");
    if (route === "sign-up") await expect(page.getByLabel("Confirm password", { exact: true })).toHaveAttribute("type", "password");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${evidence}/${width}-${route}-eye-off.png`, fullPage: true, style: ".skip-link:not(:focus) { opacity: 0; }" });
  }
});

test("masked copy leaves clipboard empty; native paste works in both destinations", async ({ page }) => {
  const password = page.getByLabel("Password", { exact: true });
  const confirm = page.getByLabel("Confirm password", { exact: true });
  await password.click();
  await page.keyboard.type(synthetic);
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Control+c");
  expect(await page.evaluate(() => navigator.clipboard.readText().then(text => text.length === 0))).toBe(true);
  await paste(page, confirm);
  await matches(confirm, "");

  await seed(page, synthetic);
  await paste(page, password);
  await paste(page, confirm);
  await matches(password, synthetic);
  await matches(confirm, synthetic);
  // A separate controlled-field render must not discard the pasted entries.
  await page.getByLabel("Email address").pressSequentially("fictional@example.test");
  await matches(password, synthetic);
  await matches(confirm, synthetic);
});

test("keyboard Show/Hide permits native copy and paste without losing values or skipping matching", async ({ page }) => {
  const password = page.getByLabel("Password", { exact: true });
  const confirm = page.getByLabel("Confirm password", { exact: true });
  await page.getByLabel("Email address").pressSequentially("fictional@example.test");
  await password.click(); await page.keyboard.type(synthetic);
  const show = page.getByRole("button", { name: "Show password", exact: true });
  await show.focus(); await page.keyboard.press("Enter");
  await expect(password).toHaveAttribute("type", "text");
  await expect(confirm).toHaveAttribute("type", "password");
  await password.click(); await page.keyboard.press("Control+a"); await page.keyboard.press("Control+c");
  expect(await page.evaluate((expected) => navigator.clipboard.readText().then(text => text === expected), synthetic)).toBe(true);
  await paste(page, confirm);
  await matches(confirm, synthetic);
  await page.getByRole("button", { name: "Hide password", exact: true }).click();
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show confirmation password" }).click();
  await expect(confirm).toHaveAttribute("type", "text");
  await matches(password, synthetic); await matches(confirm, synthetic);
  await page.getByRole("button", { name: "Hide confirmation password" }).click();

  // Native paste into the destination still works after toggling; reject a
  // mismatch locally, then accept matching values through the Auth boundary.
  await seed(page, "Different fictional passphrase 84!"); await paste(page, confirm);
  await page.getByRole("button", { name: "Create your account", exact: true }).click();
  await expect(confirm).toHaveAttribute("aria-invalid", "true");
  await seed(page, synthetic); await paste(page, confirm);
  let submitted = false;
  await page.route("**/auth/v1/signup**", async route => {
    const body = route.request().postDataJSON();
    submitted = body.password === synthetic && body.email === "fictional@example.test";
    await route.fulfill({ json: { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated", email: "fictional@example.test", identities: [] } });
  });
  await page.getByRole("button", { name: "Create your account", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "did not return a signup session" })).toBeVisible();
  expect(submitted).toBe(true);
});
