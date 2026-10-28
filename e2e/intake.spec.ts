import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { editSource } from "./intake-helpers";
const fixtures = ".factory/evidence/OWNPATH-INTAKE-20261021/fixtures";
test.beforeEach(async ({ page, request, baseURL }) => {
  await request.post("http://127.0.0.1:4387/__fixture/reset");
  await page.route("**/*", route => [baseURL, "http://127.0.0.1:4387"].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
  await page.goto("/sign-in"); await page.getByLabel("Email address").fill("fictional@example.test"); await page.getByLabel("Password", { exact: true }).fill(crypto.randomUUID()); await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(/\/app$/);
});
for (const width of [1440, 390, 320]) test(`real DOCX intake, editable text and no AI at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 950 }); await page.emulateMedia({ reducedMotion: "reduce" });
  let ai = 0; page.on("request", request => { if (/\/api\/cv-review\/(scan|rewrite)$/.test(request.url())) ai++; });
  await page.getByLabel("Target job", { exact: true }).fill("Synthetic teaching requirements.");
  await page.locator('input[type="file"]').setInputFiles(`${fixtures}/unicode.docx`);
  await expect(page.getByLabel("Your CV", { exact: true })).toHaveValue(/Nguyễn An/);
  await expect(page.getByText("Extraction complete.", { exact: false })).toBeVisible();
  await page.getByText("Review extracted text", { exact: true }).click(); await expect(page.getByLabel("Your CV", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await mkdir(".factory/evidence/OWNPATH-INTAKE-20261021/screenshots", { recursive: true });
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; window.scrollTo(0, 0); });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: `.factory/evidence/OWNPATH-INTAKE-20261021/screenshots/intake-${width}.png`, fullPage: true });
  await page.getByRole("button", { name: "Remove attachment" }).click();
  await expect(page.getByLabel("Your CV", { exact: true })).toHaveValue(/Nguyễn An/); await expect(page.getByLabel("Target job", { exact: true })).toHaveValue("Synthetic teaching requirements."); expect(ai).toBe(0);
});
test("real PDF replacement is cancel-first and leaves the JD unchanged", async ({ page }) => {
  await editSource(page, "Keep this manually edited CV."); await page.getByLabel("Target job", { exact: true }).fill("Keep this JD.");
  await page.locator('input[type="file"]').setInputFiles(`${fixtures}/english.pdf`);
  await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeFocused(); await page.keyboard.press("Escape");
  await expect(page.getByLabel("Your CV", { exact: true })).toHaveValue("Keep this manually edited CV.");
  await page.locator('input[type="file"]').setInputFiles(`${fixtures}/english.pdf`); await page.getByRole("button", { name: "Replace CV text", exact: true }).click();
  await expect(page.getByLabel("Your CV", { exact: true })).toHaveValue(/Fictional Alex Example/); await expect(page.getByLabel("Target job", { exact: true })).toHaveValue("Keep this JD.");
});
test("late extraction never overwrites typing or a cancelled selection", async ({ page }) => {
  await editSource(page, "Existing editable CV");
  let reply!: () => void; const gate = new Promise<void>(r => { reply = r; });
  await page.route("**/api/cv-review/extract?*", async route => { await gate; await route.fulfill({ json: { text: "Stale extracted text" } }).catch(() => {}); });
  await page.locator('input[type="file"]').setInputFiles(`${fixtures}/english.pdf`); await page.getByRole("button", { name: "Replace CV text", exact: true }).click(); await expect(page.getByRole("button", { name: "Cancel extraction" })).toBeVisible();
  await page.getByLabel("Your CV", { exact: true }).fill("New manually typed CV"); reply();
  await expect(page.getByLabel("Your CV", { exact: true })).toHaveValue("New manually typed CV"); await expect(page.getByRole("button", { name: "Cancel extraction" })).toHaveCount(0);
});
test("real invalid files recover without losing source text", async ({ page, context }) => {
  await editSource(page, "Retained manual CV");
  await page.locator('input[type="file"]').setInputFiles(`${fixtures}/image.pdf`); await page.getByRole("button", { name: "Replace CV text", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "No usable text" })).toBeVisible(); await expect(page.getByLabel("Your CV", { exact: true })).toHaveValue("Retained manual CV");
  const send = (body: Buffer, type = "docx", mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document") => context.request.post(`/api/cv-review/extract?type=${type}`, { headers: { origin: "http://127.0.0.1:4386", "content-type": mime }, data: body });
  expect((await send(Buffer.from("PK fake"))).status()).toBe(422);
  expect((await send(Buffer.from("unsupported"), "doc", "application/msword")).status()).toBe(415);
  expect((await send(Buffer.alloc(5 * 1024 * 1024 + 1), "pdf", "application/pdf")).status()).toBe(422);
  for (const operation of ["organize", "review"]) expect((await context.request.post(`/api/cv-review/${operation}`, { data: {} })).status()).toBe(410);
});
