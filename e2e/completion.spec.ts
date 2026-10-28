import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import { classicFixtures } from "../src/lib/cv-templates/fixtures";
const evidence = ".factory/evidence/OWNPATH-COMPLETION-20261020";
test.beforeEach(async ({ page, request, baseURL }) => {
  await fs.mkdir(`${evidence}/screenshots`, { recursive: true });
  await request.post("http://127.0.0.1:4387/__fixture/reset");
  await page.route("**/*", route => [baseURL, "http://127.0.0.1:4387"].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
});
for (const [name, text] of Object.entries(classicFixtures)) test(`Classic ${name}: edit/save/reopen/export and responsive content fidelity`, async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/sign-in"); await page.getByLabel("Email address").fill("fictional@example.test"); await page.getByLabel("Password", { exact: true }).fill("Synthetic local fixture"); await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(/\/app$/);
  const id = crypto.randomUUID();
  const payload = { schemaVersion: 2, cv: text, jd: "Accurate records.", scan: { coverage: "Controlled fixture.", findings: [] }, instructions: "Keep supplied facts.", language: "English", document: text, changes: ["MODEL-NOTES-NOT-FOR-EXPORT"], notes: [], title: `Synthetic ${name}` };
  expect((await context.request.post("/api/cv-review/saved", { headers: { origin: "http://127.0.0.1:4386" }, data: { id, kind: "version", payload } })).status()).toBe(200);
  await page.goto(`/app/cvs/${id}`); await expect(page.getByText("Classic template", { exact: false })).toBeVisible();
  const preview = page.getByLabel("Formatted CV");
  expect(await preview.locator(":scope > *").allTextContents()).toEqual(text.split("\n"));
  await preview.screenshot({ path: `${evidence}/screenshots/classic-${name}-desktop.png` });
  await page.locator(".op-editor-panel > summary").click(); const edited = text + "\nManual edit retained — chỉnh sửa." + (name === "long" ? "\n".repeat(100) : "");
  await page.getByLabel("Complete CV text", { exact: true }).fill(edited);
  await page.getByText("Save this CV (optional)", { exact: true }).click(); await page.getByRole("button", { name: "Save CV", exact: true }).click(); await expect(page.getByText("CV saved.", { exact: true })).toBeVisible();
  const saved = (await (await context.request.get(`/api/cv-review/saved?id=${id}`)).json()).version;
  expect(saved.payload.templateId).toBe("classic"); expect(saved.payload.document).toBe(edited);
  page.on("dialog", d => d.accept()); await page.reload(); await expect(preview).toContainText("Manual edit retained");
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Download TXT", exact: true }).click(); expect(await fs.readFile((await (await download).path())!, "utf8")).toBe(edited);
  const print = await context.newPage(); await print.setContent((await page.locator('iframe[title="CV print document"]').getAttribute("srcdoc"))!); await print.evaluate(() => document.fonts.ready);
  expect((await print.locator("main > *").allTextContents()).map(line => line === "\u00a0" ? "" : line)).toEqual(edited.split("\n"));
  await expect(print.locator("body")).not.toContainText("MODEL-NOTES-NOT-FOR-EXPORT");
  expect(await print.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await print.pdf({ path: `${evidence}/classic-${name}.pdf`, preferCSSPageSize: true, printBackground: true }); await print.close();
  await fs.writeFile(`${evidence}/classic-${name}.txt`, edited);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await preview.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(15);
    expect((await preview.locator(":scope > *").allTextContents()).map(line => line === "\u00a0" ? "" : line)).toEqual(edited.split("\n"));
    if (["vietnamese", "sales", "minimal"].includes(name)) await preview.screenshot({ path: `${evidence}/screenshots/classic-${name}-${width}.png` });
  }
});
test("landing entrance settles without hiding CTA or shifting layout; keyboard destinations", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto("/");
  const cta = page.getByRole("link", { name: "Get started ↗", exact: true }).first(); await expect(cta).toBeInViewport();
  const before = await cta.boundingBox(); await page.screenshot({ path: `${evidence}/screenshots/landing-entrance.png`, fullPage: true });
  await page.waitForFunction(() => document.querySelector('[aria-label="Fictional CV example"]')!.getAnimations({ subtree: true }).every(a => a.playState === "finished"));
  expect(await cta.boundingBox()).toEqual(before);
  expect(await page.getByLabel("Fictional CV example").evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === "running").length)).toBe(0);
  // Chromium full-page capture can restart a finished SVG transform animation;
  // assert the real-time resting state before taking the evidence screenshot.
  await page.screenshot({ path: `${evidence}/screenshots/landing-desktop.png`, fullPage: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.screenshot({ path: `${evidence}/screenshots/landing-static-desktop.png`, fullPage: true });
  await cta.focus(); await expect(cta).toBeFocused(); await page.keyboard.press("Enter"); await expect(page).toHaveURL(/\/sign-up$/);
});
for (const width of [390, 320]) for (const reducedMotion of ["reduce", "no-preference"] as const) test(`landing ${reducedMotion} mobile ${width}: composition and menu focus`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion }); await page.setViewportSize({ width, height: 844 }); await page.goto("/");
  await expect(page.getByRole("link", { name: "Get started ↗", exact: true }).first()).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.waitForFunction(() => document.querySelector('[aria-label="Fictional CV example"]')!.getAnimations({ subtree: true }).every(a => a.playState === "finished"));
  expect(await page.getByLabel("Fictional CV example").evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === "running").length)).toBe(0);
  await page.screenshot({ path: `${evidence}/screenshots/landing-${reducedMotion === "reduce" ? "static" : "mobile"}-${width}.png`, fullPage: true });
  await page.getByRole("button", { name: "Open menu" }).click(); await page.getByRole("link", { name: "How it works", exact: true }).focus(); await page.keyboard.press("Escape"); await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
});
