import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";
const cv = "Nguyễn An\nExperience\nHelped customers.\nEducation\nDiploma 2023";
const jd = "Customer service required.";
const scan = { coverage: "Selected requirement; check the rest of the JD.", findings: [{ title: "Customer service", requirement: jd, excerpt: "Helped customers.", explanation: "Your CV describes customer assistance.", nextStep: "Clarify your direct responsibility.", priority: "important", expectation: "required", group: "supported" }] };
const rewrite = { replacements: [{ lineId: "b3", original: "Helped customers.", text: "Assisted customers." }], changes: ["Clearer wording"], notes: [] };
const snapshot = (title: string) => ({ schemaVersion: 2, cv, jd, scan, instructions: "Keep it concise.", language: "English", document: cv, changes: [], notes: [], title });
function gate() { let resolve!: () => void; return { promise: new Promise<void>(r => { resolve = r; }), release: () => resolve() }; }
async function login(page: Page) {
  await page.goto("/sign-in"); await page.getByLabel("Email address").fill("fictional@example.test"); await page.getByLabel("Password", { exact: true }).fill("Synthetic fixture only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(/\/app$/);
}
async function fill(page: Page) { await page.getByLabel("Your CV", { exact: true }).fill(cv); await page.getByLabel("Target job description").fill(jd); await page.getByRole("checkbox").check(); }
test.beforeEach(async ({ page, request, baseURL }) => {
  await request.post("http://127.0.0.1:4387/__fixture/reset");
  await page.route("**/*", route => [baseURL, "http://127.0.0.1:4387"].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
});
test("delayed scan acknowledges once, allows stopping, ignores late results and recovers without stealing focus", async ({ page }) => {
  await login(page); await fill(page);
  const delayed = gate(); let calls = 0;
  await page.route("**/api/cv-review/scan", async route => { if (++calls === 1) await delayed.promise; await route.fulfill({ json: scan }).catch(() => {}); });
  const button = page.getByRole("button", { name: "Scan CV", exact: true }); const width = (await button.boundingBox())!.width;
  await button.click(); const pending = page.getByRole("button", { name: "Scanning…", exact: true }); await expect(pending).toBeDisabled();
  expect(Math.abs((await pending.boundingBox())!.width - width)).toBeLessThan(2);
  await pending.dispatchEvent("click"); expect(calls).toBe(1);
  await page.getByRole("button", { name: "Stop waiting" }).click(); await expect(page.getByRole("status").filter({ hasText: "Stopped waiting" })).toBeVisible();
  delayed.release(); await expect(page.getByRole("heading", { name: "Your scan", exact: true })).toHaveCount(0);
  const second = gate(); await page.unroute("**/api/cv-review/scan"); await page.route("**/api/cv-review/scan", async route => { await second.promise; await route.fulfill({ json: scan }); });
  await button.click(); await page.getByLabel("Your CV", { exact: true }).focus(); second.release();
  await expect(page.getByRole("heading", { name: "Your scan", exact: true })).toBeVisible(); await expect(page.getByLabel("Your CV", { exact: true })).toBeFocused();
  await page.getByLabel("How should we improve it?").fill("My direction."); await page.getByRole("button", { name: "Make it concise" }).click();
  await expect(page.getByLabel("How should we improve it?")).toHaveValue(/My direction\.\nKeep it concise/); await expect(page.getByLabel("How should we improve it?")).toBeFocused();
});
test("rewrite failures preserve the last good draft; late generation cannot overwrite manual edits", async ({ page, context }) => {
  await login(page); const id = crypto.randomUUID(); await context.request.post("/api/cv-review/saved", { headers: { origin: "http://127.0.0.1:4386" }, data: { id, kind: "version", payload: snapshot("Manual draft") } });
  await page.goto(`/app/cvs/${id}`); await page.getByRole("checkbox").check();
  await page.route("**/api/cv-review/rewrite", route => route.fulfill({ status: 503, json: { error: "Synthetic provider unavailable. Retry." } }));
  await page.getByRole("button", { name: "Rewrite again" }).click(); await expect(page.getByRole("alert").filter({ hasText: "Synthetic provider unavailable" })).toBeVisible(); await expect(page.getByLabel("Formatted CV")).toContainText("Helped customers.");
  await page.unroute("**/api/cv-review/rewrite"); const delayed = gate(); await page.route("**/api/cv-review/rewrite", async route => { await delayed.promise; await route.fulfill({ json: rewrite }).catch(() => {}); });
  await page.getByRole("button", { name: "Rewrite again" }).click(); await page.locator(".op-editor-panel > summary").click(); await page.getByLabel("Complete CV text", { exact: true }).fill(cv + "\nManual edit retained."); delayed.release();
  await expect(page.getByLabel("Formatted CV")).toContainText("Manual edit retained."); await expect(page.getByLabel("Formatted CV")).not.toContainText("Assisted customers.");
  await page.unroute("**/api/cv-review/rewrite"); await page.route("**/api/cv-review/rewrite", route => route.fulfill({ json: rewrite }));
  await page.getByRole("button", { name: "Rewrite again" }).click(); await expect(page.getByLabel("Formatted CV")).toContainText("Assisted customers."); await expect(page.getByLabel("Formatted CV")).toContainText("Manual edit retained.");
});
test("example replacement uses a cancel-first keyboard modal even with only a JD", async ({ page }) => {
  await login(page); await page.getByLabel("Target job description").fill("My existing JD");
  await page.getByText("Try an example", { exact: true }).click(); const example = page.locator(".op-example-options button").first(); await example.click();
  const dialog = page.getByRole("dialog", { name: "Use a fictional example?" }); await expect(dialog).toBeVisible(); await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Shift+Tab"); await expect(dialog.getByRole("button", { name: "Replace inputs" })).toBeFocused(); await page.keyboard.press("Tab"); await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape"); await expect(example).toBeFocused(); await expect(page.getByLabel("Target job description")).toHaveValue("My existing JD");
  await example.click(); await dialog.getByRole("button", { name: "Replace inputs" }).click(); await expect(dialog).not.toBeVisible(); await expect(page.getByLabel("Your CV", { exact: true })).not.toHaveValue(""); await expect(page.getByLabel("Your CV", { exact: true })).toBeFocused();
});
test("saved rename acknowledges later edits; deletion preserves neighboring rows, focus and failure recovery", async ({ page, context }) => {
  await login(page); const ids = [crypto.randomUUID(), crypto.randomUUID()];
  for (const [index, id] of ids.entries()) await context.request.post("/api/cv-review/saved", { headers: { origin: "http://127.0.0.1:4386" }, data: { id, kind: "version", payload: snapshot(`Fictional CV ${index}`) } });
  await page.goto(`/app/cvs/${ids[0]}`); await page.getByText("Save this CV (optional)", { exact: true }).click(); await page.getByLabel("Title", { exact: true }).fill("Renamed CV");
  const saveGate = gate(); let saves = 0; await page.route("**/api/cv-review/saved", async route => { if (route.request().method() === "PATCH") { saves++; await saveGate.promise; } await route.continue(); });
  await page.getByRole("button", { name: "Save CV", exact: true }).click(); await expect(page.getByRole("button", { name: "Saving…", exact: true })).toBeDisabled();
  await page.getByLabel("Title", { exact: true }).fill("Later edit"); saveGate.release(); await expect(page.getByText("Current edits are not saved.", { exact: true })).toBeVisible(); expect(saves).toBe(1);
  page.on("dialog", dialog => dialog.accept()); await page.goto("/app/cvs"); await expect(page.getByRole("link", { name: "Renamed CV →", exact: true })).toBeVisible();
  const retained = page.locator(`[data-cv-id="${ids[1]}"]`); await retained.evaluate(el => el.setAttribute("data-stability-marker", "retained"));
  await page.getByRole("button", { name: "Delete Renamed CV", exact: true }).click(); await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click(); await expect(page.getByRole("button", { name: "Delete Renamed CV", exact: true })).toBeFocused();
  let deletes = 0; const deleteGate = gate(); await page.route("**/api/cv-review/saved", async route => { if (route.request().method() === "DELETE") { deletes++; if (deletes === 1) return route.fulfill({ status: 503, json: { error: "Synthetic failure" } }); await deleteGate.promise; } await route.continue(); });
  await page.getByRole("button", { name: "Delete Renamed CV", exact: true }).click(); await page.getByRole("dialog").getByRole("button", { name: "Delete CV", exact: true }).click(); await expect(page.getByRole("alert").filter({ hasText: "could not confirm deletion" })).toBeVisible(); await expect(page.getByRole("link", { name: "Renamed CV →", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Delete Renamed CV", exact: true }).click(); await page.getByRole("dialog").getByRole("button", { name: "Delete CV", exact: true }).click(); await expect(page.getByRole("button", { name: "Deleting Renamed CV", exact: true })).toBeDisabled();
  deleteGate.release(); await expect(page.getByRole("link", { name: "Renamed CV →", exact: true })).toHaveCount(0); await expect(retained).toHaveAttribute("data-stability-marker", "retained"); await expect(retained.getByRole("link", { name: "Fictional CV 1 →", exact: true })).toBeFocused();
  await page.evaluate(() => window.dispatchEvent(new Event("ownpath:session-ended"))); await expect(retained).toHaveCount(0); await expect(page.getByRole("alert").filter({ hasText: "Your session ended. Sign in again, then reload" })).toBeVisible();
  await page.getByRole("button", { name: "Reload", exact: true }).click(); await expect(page.getByRole("link", { name: "Fictional CV 1 →", exact: true })).toBeVisible();
});
test("copy waits for actual success, reports denial and keeps print content stable during unrelated edits", async ({ page, context }) => {
  await login(page); const id = crypto.randomUUID(); await context.request.post("/api/cv-review/saved", { headers: { origin: "http://127.0.0.1:4386" }, data: { id, kind: "version", payload: snapshot("Export draft") } }); await page.goto(`/app/cvs/${id}`);
  await page.locator('iframe[title="CV print document"]').contentFrame().locator("body").evaluate(el => el.dataset.stabilityMarker = "retained");
  await page.getByLabel("How should we improve it?").fill("Unrelated instruction edit"); await expect(page.frameLocator('iframe[title="CV print document"]').locator("body")).toHaveAttribute("data-stability-marker", "retained");
  await page.evaluate(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("Synthetic denial")) } }); });
  await page.getByRole("button", { name: "Copy text", exact: true }).click(); await expect(page.getByRole("alert").filter({ hasText: "Copy unavailable" })).toBeVisible(); await expect(page.getByRole("button", { name: "Copied", exact: true })).toHaveCount(0);
  await page.evaluate(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: (text: string) => new Promise<void>(resolve => { Object.assign(window, { finishCopy: () => { Object.assign(window, { copiedValue: text }); resolve(); } }); }) } }); });
  const button = page.getByRole("button", { name: "Copy text", exact: true }); const width = (await button.boundingBox())!.width; await button.click(); await expect(page.getByRole("button", { name: "Copying…", exact: true })).toBeDisabled();
  await page.evaluate(() => (window as unknown as { finishCopy: () => void }).finishCopy()); const copied = page.getByRole("button", { name: "Copied", exact: true }); await expect(copied).toBeVisible(); expect(Math.abs((await copied.boundingBox())!.width - width)).toBeLessThan(2); expect(await page.evaluate(() => (window as unknown as { copiedValue: string }).copiedValue)).toBe(cv);
});
test("320/390/1440 layouts, keyboard drawer, reduced motion, long inputs and landing disclosures", async ({ page }) => {
  const evidence = ".factory/evidence/OWNPATH-INTERACTION-20261020/after"; await fs.mkdir(evidence, { recursive: true });
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.setViewportSize({ width: 320, height: 850 }); await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).focus(); await page.keyboard.press("Enter"); await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true"); await page.keyboard.press("Escape"); await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  const faq = page.locator("details summary").first(); await faq.focus(); await page.keyboard.press("Enter"); await expect(faq.locator("..")).toHaveAttribute("open", ""); await page.screenshot({ path: `${evidence}/320-landing.png`, fullPage: true });
  await login(page); await fill(page); await page.getByLabel("Your CV", { exact: true }).fill(cv + "\n" + "Fictional long responsibility.\n".repeat(500)); await page.getByLabel("Target job description").fill(jd + "\n" + "Fictional requirement.\n".repeat(500));
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 950 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: `${evidence}/${width}-workbench.png`, fullPage: true });
    if (width > 760) continue;
    const trigger = page.getByRole("button", { name: "Open navigation" }); await trigger.focus(); await page.keyboard.press("Enter"); const drawer = page.getByRole("dialog", { name: "Workspace navigation" }); await expect(drawer).toBeVisible(); expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
    const first = drawer.getByRole("link", { name: "OwnPath home" }); await expect(first).toBeFocused(); await page.keyboard.press("Shift+Tab"); await expect(drawer.locator("a").last()).toBeFocused(); await page.keyboard.press("Tab"); await expect(first).toBeFocused();
    const motion = await drawer.evaluate(el => ({ transition: getComputedStyle(el).transitionDuration, animation: getComputedStyle(el).animationName })); expect(motion.transition).toBe("0s"); expect(motion.animation).toBe("none"); await page.screenshot({ path: `${evidence}/${width}-drawer.png` });
    await page.keyboard.press("Escape"); await expect(trigger).toBeFocused(); expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  }
  await page.getByRole("button", { name: "Open navigation" }).click(); await page.getByRole("dialog").getByRole("link", { name: "Saved CVs", exact: true }).click(); await expect(page).toHaveURL(/\/app\/cvs$/); await expect(page.locator(".op-backdrop")).toHaveCount(0); expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
});
test("auth pending preserves native password values and prevents duplicate submits", async ({ page }) => {
  const delayed = gate(); let calls = 0;
  await page.route("**/auth/v1/token?*", async route => { calls++; await delayed.promise; await route.continue(); });
  await page.setViewportSize({ width: 320, height: 850 }); await page.goto("/sign-in"); await page.getByLabel("Email address").fill("fictional@example.test"); await page.getByLabel("Password", { exact: true }).fill("Synthetic fixture only");
  await page.getByRole("button", { name: "Show password", exact: true }).click(); await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text"); await page.getByRole("button", { name: "Hide password", exact: true }).click();
  const submit = page.getByRole("button", { name: "Sign in", exact: true }); await expect(submit).toBeEnabled(); const width = (await submit.boundingBox())!.width; await submit.focus(); await page.keyboard.press("Enter");
  const pending = page.getByRole("button", { name: "Signing in…", exact: true }); await expect(pending).toBeDisabled(); await pending.dispatchEvent("click"); expect(calls).toBe(1); expect(Math.abs((await pending.boundingBox())!.width - width)).toBeLessThan(2);
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("Synthetic fixture only"); delayed.release(); await expect(page).toHaveURL(/\/app$/); expect(calls).toBe(1);
});
test("scan network failure retains input, validates on submit and recovers", async ({ page }) => {
  await login(page); await page.getByRole("checkbox").check(); await page.getByRole("button", { name: "Scan CV", exact: true }).click(); await expect(page.getByLabel("Your CV", { exact: true })).toBeFocused(); await expect(page.getByLabel("Your CV", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await fill(page); await page.route("**/api/cv-review/scan", route => route.abort("failed")); await page.getByRole("button", { name: "Scan CV", exact: true }).click(); await expect(page.locator("#scan-error")).toBeVisible(); await expect(page.getByLabel("Your CV", { exact: true })).toHaveValue(cv); await expect(page.getByLabel("Target job description")).toHaveValue(jd);
  await page.unroute("**/api/cv-review/scan"); await page.route("**/api/cv-review/scan", route => route.fulfill({ json: scan })); await page.getByRole("button", { name: "Scan CV", exact: true }).click(); await expect(page.getByRole("heading", { name: "Your scan", exact: true })).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
