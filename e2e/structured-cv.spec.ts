import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import type { Page } from "@playwright/test";
import { structuredText, type StructuredCV } from "../src/lib/scan-rewrite/structured-cv";
const origin = "http://127.0.0.1:4396", dir = ".local-demo/evidence/structured-cv";
async function captureUI(page: Page, state: string) {
  const original = page.viewportSize();
  await fs.mkdir('.local-demo/evidence/ui-polish', { recursive: true });
  for (const [device, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]] as const) {
    await page.setViewportSize({ width, height }); await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `.local-demo/evidence/ui-polish/${state}-${device}.png`, fullPage: true });
  }
  if (original) await page.setViewportSize(original);
}
test.beforeEach(async ({ page, request }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); await request.post("http://127.0.0.1:4397/__fixture/reset");
  await page.route("**/*", route => [origin, "http://127.0.0.1:4397"].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
  await page.route("**/api/cv-review/disclosure", route => route.fulfill({ json: { provider: "Controlled transport fixture", purpose: "offline-structured-workflow", external: false } }));
  await page.goto("/sign-in"); await page.getByLabel("Email address").fill("fictional@example.test"); await page.getByLabel("Password", { exact: true }).fill("Loopback fixture only"); await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(/\/app$/);
});
for (const name of ["sanitized", ...(existsSync(`${dir}/owner-local-pdf-scenario.json`) ? ["owner-local-pdf"] : [])]) test(`${name}: upload preview → Scan → complete structured Rewrite → edit → save → reopen → export`, async ({ page, context }) => {
  const scenario = JSON.parse(await fs.readFile(`${dir}/${name}-scenario.json`, "utf8"));
  let scans = 0, rewrites = 0;
  let releaseRewrite!: () => void;
  const rewriteHeld = name === 'sanitized' ? new Promise<void>(resolve => { releaseRewrite = resolve; }) : Promise.resolve();
  await page.route("**/api/cv-review/scan", async route => { scans++; expect(route.request().postDataJSON().cv).toBe(scenario.text); expect(route.request().postDataJSON().jd).toBe(scenario.jd); await route.fulfill({ json: scenario.scan }); });
  await page.route("**/api/cv-review/rewrite", async route => { rewrites++; const body = route.request().postDataJSON(); expect(body.cv).toBe(scenario.text); expect(body.base).toBe(scenario.text); expect(body.scan).toEqual(scenario.scan); await rewriteHeld; await route.fulfill({ json: scenario.rewrite }); });
  await expect(page.getByLabel("Target job", { exact: true })).toBeEnabled();
  if (name === 'sanitized') { await expect(page.getByRole('button', { name: 'Review an unresolved request' })).toHaveCount(0); await captureUI(page, 'scan-empty'); }
  await page.locator('input[type="file"]').setInputFiles(scenario.pdfPath);
  await expect(page.getByText("Extraction complete.", { exact: true })).toBeVisible();
  await expect(page.locator("#scan-cv")).toBeVisible(); await expect(page.locator("#scan-cv")).toHaveValue(scenario.text);
  await page.screenshot({ path: `${dir}/${name}-upload-preview.png`, fullPage: true });
  await page.getByLabel("Target job", { exact: true }).fill(scenario.jd); await page.getByRole("button", { name: "Scan CV", exact: true }).click();
  await expect(page.getByText(scenario.scan.findings[0].explanation).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Rewrite this CV' })).toHaveCount(1);
  if (name === 'sanitized') await captureUI(page, 'scan-findings');
  await page.getByRole("link", { name: "Rewrite this CV" }).first().click();
  await page.getByLabel("How should we improve it?").fill("Preserve source facts and organize a complete CV.");
  if (name === 'sanitized') await captureUI(page, 'rewrite-instructions');
  await page.getByRole("button", { name: "Rewrite CV", exact: true }).click();
  if (name === 'sanitized') { await expect(page.getByRole('heading', { name: 'Rewriting your CV…' })).toBeVisible(); await captureUI(page, 'rewrite-loading'); releaseRewrite(); }
  const preview = page.getByLabel("Formatted CV"); await expect(preview).toBeVisible();
  if (name === 'sanitized') { await expect(page.getByLabel('How should we improve it?')).toBeHidden(); await captureUI(page, 'rewrite-ready'); }
  await expect(preview.locator("h1")).toHaveText(scenario.rewrite.cv.header.name);
  expect(await page.getByText("Legacy CV structure correction (optional)", { exact: true }).count()).toBe(0);
  await page.getByRole("button", { name: "Edit complete CV", exact: true }).click();
  const editor = page.getByRole("region", { name: "Edit structured CV" }); await expect(editor).toBeVisible();
  const cv: StructuredCV = structuredClone(scenario.rewrite.cv); const first = cv.sections[0].entries[0];
  const edited = first.paragraphs[0].replace(/\.$/u, "!"); expect(edited).not.toBe(first.paragraphs[0]); first.paragraphs[0] = edited;
  await editor.getByRole("textbox", { name: "Section 1 entry 1 paragraphs (one per line)", exact: true }).fill(edited); await editor.getByRole("textbox", { name: "Candidate name", exact: true }).focus();
  const text = structuredText(cv); expect((await preview.locator(":scope > *").allTextContents()).join("\n")).toBe(text);
  await page.getByRole("button", { name: "Save this CV (optional)", exact: true }).click(); await page.getByLabel("Title", { exact: true }).fill("Controlled structured CV");
  const saving = page.waitForResponse(r => r.url().endsWith("/api/cv-review/saved") && r.request().method() === "POST"); await page.getByRole("button", { name: "Save CV", exact: true }).click();
  const savedResponse = await saving; expect(savedResponse.status()).toBe(200); const { id } = await savedResponse.json(); await expect(page.getByText("CV saved.", { exact: true })).toBeVisible();
  const record = (await (await context.request.get(`/api/cv-review/saved?id=${id}`)).json()).version;
  if (name === 'sanitized') await captureUI(page, 'rewrite-saved');
  expect(record.payload.cv).toBe(scenario.text); expect(record.payload.scan).toEqual(scenario.scan); expect(record.payload.structuredCV).toEqual(cv); expect(record.payload.document).toBe(text); expect(record.payload.finalDocument).toBe(text); expect(record.payload.structure).toBeUndefined();
  await page.goto(`/app/cvs/${id}`); await expect(preview.locator("h1")).toHaveText(cv.header.name); expect((await preview.locator(":scope > *").allTextContents()).join("\n")).toBe(text);
  if (name === 'sanitized') await captureUI(page, 'saved-preview');
  await page.getByRole("button", { name: "Copy text", exact: true }).click(); expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(text);
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Download TXT", exact: true }).click(); expect(await fs.readFile((await (await download).path())!, "utf8")).toBe(text);
  const print = await context.newPage(); await print.setContent((await page.locator('iframe[title="CV print document"]').getAttribute("srcdoc"))!); await print.evaluate(() => document.fonts.ready);
  expect((await print.locator("main > *").allTextContents()).join("\n")).toBe(text); await print.pdf({ path: `${dir}/${name}.pdf`, preferCSSPageSize: true }); await print.close();
  await fs.writeFile(`${dir}/${name}.txt`, text); await page.screenshot({ path: `${dir}/${name}-reopened.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: `${dir}/${name}-mobile.png`, fullPage: true });
  expect(scans).toBe(1); expect(rewrites).toBe(1);
});
test("old local TXT saved CV stays readable/editable; correction is an optional collapsed fallback", async ({ page, context }) => {
  const payload = existsSync(`${dir}/legacy-txt-scenario.json`) ? JSON.parse(await fs.readFile(`${dir}/legacy-txt-scenario.json`, "utf8")) : { schemaVersion: 2, cv: "CONTACT\nEmail: old@example.test\nSKILLS\nRecords", jd: "Records.", scan: { coverage: "Legacy fixture.", findings: [] }, document: "CONTACT\nEmail: old@example.test\nSKILLS\nRecords", instructions: "Keep edits.", language: "English", changes: [], notes: [], title: "Old saved CV" };
  const id = crypto.randomUUID(); expect((await context.request.post("/api/cv-review/saved", { headers: { origin }, data: { id, kind: "version", payload } })).status()).toBe(200);
  await page.route("**/api/cv-review/scan", () => { throw new Error("Legacy reads must not Scan"); }); await page.route("**/api/cv-review/rewrite", () => { throw new Error("Legacy reads must not Rewrite"); });
  await page.goto(`/app/cvs/${id}`); await expect(page.getByLabel("Formatted CV")).toBeVisible(); await page.getByRole("button", { name: "Open saved CV editor" }).click();
  await page.getByRole("button", { name: "Edit complete CV", exact: true }).click(); await expect(page.getByLabel("Complete CV text", { exact: true })).toHaveValue(payload.document);
  await expect(page.getByRole("button", { name: "Correct structure without AI", exact: true })).toBeHidden();
  await page.getByText("Legacy CV structure correction (optional)", { exact: true }).click(); await expect(page.getByRole("button", { name: "Correct structure without AI", exact: true })).toBeVisible();
  const record = (await (await context.request.get(`/api/cv-review/saved?id=${id}`)).json()).version; expect(record.revision).toBe(1); expect(record.payload.document).toBe(payload.document);
});
test("long structured CV exports across pages with accents, long name and missing header fields intact", async ({ page, context }) => {
  const cv: StructuredCV = { version: 1, header: { name: "NGUYỄN THỊ MINH ANH HOÀNG ".repeat(6).trim(), title: "", contacts: [] }, sections: [{ heading: "Experience / Activities", entries: Array.from({ length: 2 }, (_, k) => ({ title: `Fictional coordinator ${k + 1}, Records Group`, context: "Volunteer project", date: "2024", paragraphs: [], bullets: Array.from({ length: 75 }, (_, i) => `Synthetic record ${k * 75 + i + 1}: Hỗ trợ cộng đồng và duy trì hồ sơ chính xác. Maintained community records.`) })) }] };
  const text = structuredText(cv), id = crypto.randomUUID();
  const payload = { schemaVersion: 2, cv: text, jd: "Records.", scan: { findings: [], coverage: "Controlled long document." }, document: text, structuredCV: cv, instructions: "Keep facts.", language: "English", changes: [], notes: [], title: "Long structured CV" };
  expect((await context.request.post("/api/cv-review/saved", { headers: { origin }, data: { id, kind: "version", payload } })).status()).toBe(200);
  await page.goto(`/app/cvs/${id}`); const preview = page.getByLabel("Formatted CV"); await expect(preview).toBeVisible();
  expect((await preview.locator(":scope > *").allTextContents()).join("\n")).toBe(text); await expect(preview.locator(".cv-role,.cv-contact")).toHaveCount(0);
  const print = await context.newPage(); await print.setContent((await page.locator('iframe[title="CV print document"]').getAttribute("srcdoc"))!); await print.evaluate(() => document.fonts.ready); await print.pdf({ path: `${dir}/long-structured.pdf`, preferCSSPageSize: true }); await print.close(); await fs.writeFile(`${dir}/long-structured.txt`, text);
  await page.setViewportSize({ width: 320, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("controlled Free allowances, explicit update, logout/login persistence and other-owner denial", async ({ page, context, request }) => {
  const scenario = JSON.parse(await fs.readFile(`${dir}/sanitized-scenario.json`, "utf8"));
  const id = crypto.randomUUID(), payload = { schemaVersion: 2, cv: scenario.text, jd: scenario.jd, scan: scenario.scan, document: scenario.rewrite.document, structuredCV: scenario.rewrite.cv, instructions: "Keep source facts.", language: "English", changes: [], notes: [], title: "Persistence acceptance" };
  const summary = await (await context.request.get("/api/billing/summary")).json();
  expect(summary.plan).toMatchObject({ plan: "Free", scans: 3, rewrites: 1, saves: 3, scan_used: 0, rewrite_used: 0 });
  const save = () => context.request.post("/api/cv-review/saved", { headers: { origin }, data: { id, kind: "version", payload } });
  expect((await save()).status()).toBe(200); expect((await save()).status()).toBe(200);
  expect((await (await context.request.get("/api/cv-review/saved")).json()).versions).toHaveLength(1);
  payload.title = "Explicitly updated CV";
  const update = () => context.request.patch("/api/cv-review/saved", { headers: { origin }, data: { id, kind: "version", payload, revision: 1 } });
  expect((await update()).status()).toBe(200); expect((await update()).status()).toBe(409);
  await page.goto("/app/cvs"); await expect(page.getByRole("link", { name: payload.title + " →", exact: true })).toBeVisible();
  await page.locator(".op-account-trigger").click(); await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect.poll(async () => (await context.request.get("/api/cv-review/saved")).status()).toBe(401);
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("fictional@example.test"); await page.getByLabel("Password", { exact: true }).fill("Loopback fixture only"); await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(/\/app/);
  const reopened = (await (await context.request.get(`/api/cv-review/saved?id=${id}`)).json()).version;
  expect(reopened.revision).toBe(2); expect(reopened.payload.structuredCV).toEqual(payload.structuredCV); expect(reopened.name).toBe(payload.title);
  await context.clearCookies();
  await request.post("http://127.0.0.1:4397/__fixture/account", { data: { id: "00000000-0000-4000-8000-000000000002", email: "second@example.test" } });
  await page.goto("/sign-in"); await page.getByLabel("Email address").fill("second@example.test"); await page.getByLabel("Password", { exact: true }).fill("Loopback fixture only"); await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(/\/app/);
  expect((await context.request.get(`/api/cv-review/saved?id=${id}`)).status()).toBe(404);
  expect((await update()).status()).toBe(409);
  expect((await (await context.request.get("/api/cv-review/saved")).json()).versions).toHaveLength(0);
});
test("pending Scan blocks duplicate clicks and a rejected result preserves source and pauses retries", async ({ page }) => {
  const scenario = JSON.parse(await fs.readFile(`${dir}/sanitized-scenario.json`, "utf8"));
  await expect(page.getByLabel("Target job", { exact: true })).toBeEnabled();
  await page.locator('input[type="file"]').setInputFiles(scenario.pdfPath);
  await expect(page.getByText("Extraction complete.", { exact: true })).toBeVisible();
  await page.getByLabel("Target job", { exact: true }).fill(scenario.jd);
  let calls = 0, release!: () => void; const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/cv-review/scan", async route => { calls++; await held; await route.fulfill({ status: 502, json: { error: { code: "result_rejected", message: "Controlled rejected output." } } }); });
  const scanButton = page.getByRole("button", { name: "Scan CV", exact: true });
  await scanButton.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect.poll(() => calls).toBe(1); await expect(page.locator('.op-scan-button')).toBeDisabled();
  await captureUI(page, 'scan-loading');
  release(); await expect(page.getByText(/Requests are paused\. Use Review and continue/)).toBeVisible();
  await captureUI(page, 'scan-error');
  await expect(page.locator("#scan-cv")).toHaveValue(scenario.text);
  expect(calls).toBe(1);
});
test('Saved CVs loading, retry, empty state and safe delete confirmation remain accessible', async ({ page, context }) => {
  let release!: () => void; const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/cv-review/saved', async route => { await held; await route.fulfill({ status: 503, json: { error: 'Saved CVs are temporarily unavailable. Retry.' } }); });
  await page.goto('/app/cvs'); await expect(page.getByText('Loading saved CVs…')).toBeVisible(); await captureUI(page, 'library-loading');
  release(); await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible(); await captureUI(page, 'library-error');
  await page.unroute('**/api/cv-review/saved'); await page.getByRole('button', { name: 'Retry', exact: true }).click(); await expect(page.getByRole('heading', { name: 'No saved CVs yet', exact: true })).toBeVisible(); await captureUI(page, 'library-empty');
  const scenario = JSON.parse(await fs.readFile(`${dir}/sanitized-scenario.json`, 'utf8')), id = crypto.randomUUID();
  const payload = { schemaVersion: 2, cv: scenario.text, jd: scenario.jd, scan: scenario.scan, document: scenario.rewrite.document, structuredCV: scenario.rewrite.cv, instructions: 'Keep facts.', language: 'English', changes: [], notes: [], title: 'Community support — tailored CV' };
  expect((await context.request.post('/api/cv-review/saved', { headers: { origin }, data: { id, kind: 'version', payload } })).status()).toBe(200);
  await page.goto('/app/cvs'); await expect(page.getByRole('link', { name: 'Open & edit', exact: true })).toBeVisible(); await captureUI(page, 'library-saved');
  await page.getByRole('button', { name: `Delete ${payload.title}`, exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible(); await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused(); await captureUI(page, 'library-delete');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click(); expect((await context.request.get(`/api/cv-review/saved?id=${id}`)).status()).toBe(200);
});
