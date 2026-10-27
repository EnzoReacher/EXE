import { expect, test } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import { jd, instruction, scan } from "./owner-preview/scenario.mjs";
const evidence = ".factory/evidence/OWNPATH-PREVIEW-20261021";
let unexpected: string[] = [];
test.beforeEach(async ({ page, context }) => {
  unexpected = [];
  await context.route("**/*", route => { const origin = new URL(route.request().url()).origin; if (["http://127.0.0.2:4327", "http://127.0.0.2:4328", "http://127.0.0.1:4329"].includes(origin)) return route.continue(); unexpected.push(origin); return route.abort(); });
  await page.goto("/"); await expect(page.frameLocator('iframe[title="OwnPath preview workspace"]').getByRole("heading", { name: "Make your CV fit the role.", exact: true })).toBeVisible();
  await mkdir(`${evidence}/screenshots`, { recursive: true });
});
test.afterEach(() => expect(unexpected).toEqual([]));
for (const [width, format] of [[1440, "pdf"], [390, "docx"], [320, "pdf"]] as const) test(`real ${format} intake and compact full journey at ${width}px`, async ({ page, context }) => {
  await page.setViewportSize({ width, height: 1000 }); await page.emulateMedia({ reducedMotion: "reduce" });
  const app = page.frameLocator('iframe[title="OwnPath preview workspace"]'); let calls = 0;
  page.on("request", request => { if (/\/api\/cv-review\/(scan|rewrite)$/.test(request.url())) calls++; });
  await expect(app.getByLabel('Local preview notice')).toContainText('Fictional services · No real payment');
  expect(await app.locator('.op-cv-upload textarea').count()).toBe(0); await expect(app.getByRole("button", { name: "Select file", exact: true })).toBeVisible(); expect(await app.getByRole("checkbox").count()).toBe(0); expect(await app.getByRole("button", { name: "Paste text", exact: true }).count()).toBe(0);
  await page.screenshot({ path: `${evidence}/screenshots/empty-${width}.png` });
  await app.locator('input[type="file"]').setInputFiles(`${evidence}/samples/sales-cv.${format}`); await expect(app.getByText("Extraction complete.", { exact: true })).toBeVisible();
  await expect(app.locator('.op-extracted-review')).not.toHaveAttribute("open"); expect(calls).toBe(0);
  await app.getByLabel("Target job", { exact: true }).fill(jd); await page.screenshot({ path: `${evidence}/screenshots/uploaded-${width}.png` });
  if (width < 500) { await app.getByRole("button", { name: "Scan CV", exact: true }).scrollIntoViewIfNeeded(); await page.screenshot({ path: `${evidence}/screenshots/action-${width}.png` }); }
  await app.getByRole("button", { name: "Scan CV", exact: true }).click(); await expect(app.getByRole("heading", { name: "Your scan", exact: true })).toBeVisible(); expect(await app.getByRole("dialog").count()).toBe(0);
  const finding = app.locator(".op-finding").filter({ hasText: "Customer assistance is demonstrated" }); await finding.getByText("View source & detail", { exact: true }).click(); await expect(finding.locator("blockquote").first()).toHaveText("Helped customers choose products."); await expect(app.getByText("Supplier negotiation belongs to someone else", { exact: true })).toBeVisible();
  await app.getByLabel("How should we improve it?").fill(instruction); await app.getByRole("button", { name: "Rewrite CV", exact: true }).click(); await expect(app.getByLabel("Formatted CV")).toContainText("Assisted customers with product selection."); await expect(app.getByLabel("Formatted CV")).toContainText("My manager negotiated supplier contracts, not me."); await expect(app.getByLabel("Formatted CV")).toContainText("2023–2025"); expect(calls).toBe(2);
  await app.locator(".op-editor-panel > summary").click(); const editor = app.getByLabel("Complete CV text", { exact: true }); const edited = (await editor.inputValue()) + "\nLanguages\nVietnamese — fictional manual edit"; await editor.fill(edited);
  await app.getByRole("button", { name: "Copy text", exact: true }).click(); await expect(app.getByRole("button", { name: "Copied", exact: true })).toBeVisible(); expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(edited);
  const download = page.waitForEvent("download"); await app.getByRole("button", { name: "Download TXT", exact: true }).click(); expect(await readFile((await (await download).path())!, "utf8")).toBe(edited);
  await app.getByRole("heading", { name: "Your CV draft", exact: true }).scrollIntoViewIfNeeded(); await page.screenshot({ path: `${evidence}/screenshots/result-${width}.png` });
  expect(await app.locator("html").evaluate(el => el.scrollWidth <= innerWidth)).toBe(true); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (width === 1440) {
    const print = app.frameLocator('iframe[title="CV print document"]'); await print.locator("body").evaluate(() => { window.print = () => { document.body.dataset.printed = "true"; }; }); await app.getByRole("button", { name: "Print / Save as PDF", exact: true }).click(); await expect(print.locator("body")).toHaveAttribute("data-printed", "true");
    const printPage = await context.newPage(); await printPage.setContent((await app.locator('iframe[title="CV print document"]').getAttribute("srcdoc"))!); await printPage.pdf({ path: `${evidence}/preview-classic.pdf`, preferCSSPageSize: true, printBackground: true }); await writeFile(`${evidence}/preview-classic.txt`, edited); await printPage.close();
    await app.getByText("Save this CV (optional)", { exact: true }).click(); const response = page.waitForResponse(r => r.url().endsWith("/api/cv-review/saved") && r.request().method() === "POST"); await app.getByRole("button", { name: "Save CV", exact: true }).click(); const id = (await (await response).json()).id; await expect(app.getByText("CV saved.", { exact: true })).toBeVisible();
    const frame = page.frames().find(f => f.url().includes("/app"))!; page.on("dialog", dialog => dialog.accept()); await frame.goto(`http://127.0.0.2:4327/app/cvs/${id}`); await expect(app.getByLabel("Formatted CV")).toContainText("Vietnamese — fictional manual edit"); expect(calls).toBe(2);
  }
});
test("replace/cancel/remove retain text; clear is separate; extraction error permits explicit correction", async ({ page }) => {
  const app = page.frameLocator('iframe[title="OwnPath preview workspace"]');
  await app.locator('input[type="file"]').setInputFiles(`${evidence}/samples/sales-cv.docx`); await expect(app.getByText("Extraction complete.", { exact: true })).toBeVisible(); await app.getByLabel("Target job", { exact: true }).fill(jd);
  await app.getByText("Review extracted text", { exact: true }).click(); const source = app.locator("#scan-cv"); await source.fill("My current edited CV");
  await app.locator('input[type="file"]').setInputFiles(`${evidence}/samples/sales-cv.pdf`); await expect(app.getByRole("button", { name: "Cancel", exact: true })).toBeFocused(); await page.keyboard.press("Escape"); await expect(source).toHaveValue("My current edited CV");
  await app.getByRole("button", { name: "Remove attachment" }).click(); await expect(app.getByText("CV text retained", { exact: true })).toBeVisible(); await expect(source).toHaveValue("My current edited CV"); await expect(app.getByLabel("Target job", { exact: true })).toHaveValue(jd);
  await app.getByRole("button", { name: "Clear CV content", exact: true }).click(); await app.getByRole("button", { name: "Cancel", exact: true }).click(); await expect(source).toHaveValue("My current edited CV");
  await app.getByRole("button", { name: "Clear CV content", exact: true }).click(); await app.getByRole("dialog").getByRole("button", { name: "Clear CV content", exact: true }).click(); await expect(app.locator("#scan-cv")).toHaveCount(0);
  await app.locator('input[type="file"]').setInputFiles({ name: "unreadable.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7 invalid synthetic") }); await expect(app.getByRole("alert").filter({ hasText: "Could not extract" })).toBeVisible(); await page.screenshot({ path: `${evidence}/screenshots/extraction-error.png` });
  await app.getByRole("button", { name: "Enter or correct text manually" }).click(); await expect(app.locator("#scan-cv")).toBeFocused(); await app.locator("#scan-cv").fill("Explicit manual correction"); await expect(app.getByLabel("Target job", { exact: true })).toHaveValue(jd);
});
test("unsupported JD/instructions/base return honest fixed-scenario errors", async ({ page }) => {
  const app = page.frameLocator('iframe[title="OwnPath preview workspace"]'); await app.locator('input[type="file"]').setInputFiles(`${evidence}/samples/sales-cv.pdf`); await expect(app.getByText("Extraction complete.", { exact: true })).toBeVisible();
  await app.getByLabel("Target job", { exact: true }).fill("Arbitrary unsupported JD"); await app.getByRole("button", { name: "Scan CV", exact: true }).click(); await expect(app.getByRole("alert").filter({ hasText: "fixed fictional scenario" })).toBeVisible(); expect(await app.getByRole("heading", { name: "Your scan", exact: true }).count()).toBe(0);
  await app.getByLabel("Target job", { exact: true }).fill(jd); await app.getByRole("button", { name: "Scan CV", exact: true }).click(); await expect(app.getByRole("heading", { name: "Your scan", exact: true })).toBeVisible(); await app.getByLabel("How should we improve it?").fill("Invent seniority"); await app.getByRole("button", { name: "Rewrite CV", exact: true }).click(); await expect(app.getByRole("alert").filter({ hasText: "fixed fictional scenario" })).toBeVisible();
  await app.getByLabel("How should we improve it?").fill(instruction); await app.getByRole("button", { name: "Rewrite CV", exact: true }).click(); await expect(app.getByLabel("Formatted CV")).toBeVisible();
  await app.locator(".op-editor-panel > summary").click(); await app.getByLabel("Complete CV text", { exact: true }).fill("My manual edited draft"); await app.getByRole("button", { name: "Rewrite again", exact: true }).click(); await expect(app.getByRole("alert").filter({ hasText: "fixed fictional scenario" })).toBeVisible(); await expect(app.getByLabel("Formatted CV")).toHaveText("My manual edited draft");
  await app.getByLabel("Target job", { exact: true }).fill(jd + "\nChanged input"); expect(await app.getByRole("heading", { name: "Your scan", exact: true }).count()).toBe(0); await expect(app.getByText("Previous draft retained.", { exact: false })).toBeVisible();
});
test("delayed/failed/malformed replies recover without lost inputs or stolen focus", async ({ page }) => {
  const app = page.frameLocator('iframe[title="OwnPath preview workspace"]'); await app.locator('input[type="file"]').setInputFiles(`${evidence}/samples/sales-cv.pdf`); await expect(app.getByText("Extraction complete.", { exact: true })).toBeVisible(); await app.getByLabel("Target job", { exact: true }).fill(jd);
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/cv-review/scan", async route => { const response = await route.fetch(); await gate; await route.fulfill({ response }).catch(() => {}); });
  await app.getByRole("button", { name: "Scan CV", exact: true }).click(); await expect(app.getByRole("button", { name: "Scanning…", exact: true })).toBeDisabled(); await page.screenshot({ path: `${evidence}/screenshots/scanning.png` }); await app.getByLabel("Target job", { exact: true }).fill("New JD while waiting"); release(); await expect(app.getByLabel("Target job", { exact: true })).toBeFocused(); expect(await app.getByRole("heading", { name: "Your scan", exact: true }).count()).toBe(0);
  await page.unroute("**/api/cv-review/scan"); await app.getByLabel("Target job", { exact: true }).fill(jd);
  for (const result of [{ status: 503, contentType: "text/html", body: "<html>Synthetic failure</html>" }, { status: 200, json: { coverage: null, findings: [null] } }]) {
    await page.route("**/api/cv-review/scan", route => route.fulfill(result)); await app.getByRole("button", { name: "Scan CV", exact: true }).click(); await expect(app.locator("#scan-error")).toBeVisible(); await expect(app.getByLabel("Target job", { exact: true })).toHaveValue(jd); await page.unroute("**/api/cv-review/scan");
  }
  let complete!: () => void; const completion = new Promise<void>(resolve => { complete = resolve; });
  await page.route("**/api/cv-review/scan", async route => { const response = await route.fetch(); await completion; await route.fulfill({ response }); });
  await app.getByRole("button", { name: "Scan CV", exact: true }).click(); await expect(app.getByRole("button", { name: "Scanning…", exact: true })).toBeDisabled(); await app.getByLabel("Target job", { exact: true }).focus(); complete(); await expect(app.getByRole("heading", { name: "Your scan", exact: true })).toBeVisible(); await expect(app.getByLabel("Target job", { exact: true })).toBeFocused();
});
test("pending extraction disables Scan; removing the pending attachment cannot insert late text", async ({ page }) => {
  const app = page.frameLocator('iframe[title="OwnPath preview workspace"]'); let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  let parsed!: (ok: boolean) => void; const actualExtraction = new Promise<boolean>(resolve => { parsed = resolve; });
  await page.route("**/api/cv-review/extract?*", async route => { try { const response = await route.fetch(); parsed(response.ok()); await gate; await route.fulfill({ response }).catch(() => {}); } catch { parsed(false); } });
  await app.locator('input[type="file"]').setInputFiles(`${evidence}/samples/sales-cv.pdf`); await expect(app.getByText("Extracting text…", { exact: true })).toBeVisible(); await expect(app.getByRole("button", { name: "Scan CV", exact: true })).toBeDisabled();
  expect(await actualExtraction).toBe(true); await app.getByRole("button", { name: "Remove attachment" }).click(); release(); await expect(app.locator("#scan-cv")).toHaveCount(0); await expect(app.getByRole("button", { name: "Scan CV", exact: true })).toBeEnabled(); await page.unrouteAll({ behavior: "wait" });
});
test("a delayed Rewrite cannot overwrite manual edits or apply after session end", async ({ page }) => {
  const app = page.frameLocator('iframe[title="OwnPath preview workspace"]'); await app.locator('input[type="file"]').setInputFiles(`${evidence}/samples/sales-cv.pdf`); await expect(app.getByText("Extraction complete.", { exact: true })).toBeVisible(); await app.getByLabel("Target job", { exact: true }).fill(jd); await app.getByRole("button", { name: "Scan CV", exact: true }).click(); await expect(app.getByRole("heading", { name: "Your scan", exact: true })).toBeVisible(); await app.getByLabel("How should we improve it?").fill(instruction); await app.getByRole("button", { name: "Rewrite CV", exact: true }).click(); await expect(app.getByLabel("Formatted CV")).toBeVisible(); await app.locator(".op-editor-panel > summary").click();
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; }); let calls = 0;
  await page.route("**/api/cv-review/rewrite", async route => { calls++; await gate; await route.fulfill({ json: { replacements: [], changes: [], notes: ["Controlled delayed retry."] } }).catch(() => {}); });
  await app.getByRole("button", { name: "Rewrite again", exact: true }).click(); await expect.poll(() => calls).toBe(1); await app.getByRole("button", { name: "Rewriting…", exact: true }).dispatchEvent("click"); expect(calls).toBe(1); await app.getByLabel("Complete CV text", { exact: true }).fill("Latest manual edit kept"); release(); await expect(app.getByLabel("Formatted CV")).toHaveText("Latest manual edit kept"); await expect(app.getByLabel("Complete CV text", { exact: true })).toBeFocused();
  await page.unroute("**/api/cv-review/rewrite"); let releaseSession!: () => void; let sessionCalls = 0; const sessionGate = new Promise<void>(resolve => { releaseSession = resolve; });
  await page.route("**/api/cv-review/rewrite", async route => { sessionCalls++; await sessionGate; await route.fulfill({ json: { replacements: [], changes: [], notes: ["Late reply after session end must not apply."] } }).catch(() => {}); });
  await app.getByRole("button", { name: "Rewrite again", exact: true }).click(); await expect.poll(() => sessionCalls).toBe(1); await expect(app.getByRole("button", { name: "Rewriting…", exact: true })).toBeDisabled();
  const frame = page.frames().find(f => f.url().includes("/app"))!; await frame.evaluate(() => window.dispatchEvent(new Event("ownpath:session-ended"))); releaseSession(); await expect(app.getByLabel("Formatted CV")).toHaveText("Latest manual edit kept"); await expect(app.locator(".op-change-notes")).not.toContainText("Late reply after session end");
});
test("live confirmation is cancel-first and sharing changes require renewed acknowledgement", async ({ page }) => {
  const app = page.frameLocator('iframe[title="OwnPath preview workspace"]'); let purpose = "live-test-v1", calls = 0;
  await page.route("**/api/cv-review/disclosure", route => route.fulfill({ json: { provider: "OpenAI", purpose, external: true } })); page.on("request", request => { if (request.url().endsWith("/api/cv-review/scan")) calls++; });
  await app.locator('input[type="file"]').setInputFiles(`${evidence}/samples/sales-cv.pdf`); await expect(app.getByText("Extraction complete.", { exact: true })).toBeVisible(); await app.getByLabel("Target job", { exact: true }).fill(jd); await app.getByRole("button", { name: "Scan CV", exact: true }).click();
  await expect(app.getByRole("dialog")).toBeVisible(); await expect(app.getByRole("button", { name: "Cancel", exact: true })).toBeFocused(); await page.keyboard.press("Escape"); expect(calls).toBe(0);
  await app.getByRole("button", { name: "Scan CV", exact: true }).click(); await app.getByRole("button", { name: "Send", exact: true }).click(); await expect(app.getByRole("heading", { name: "Your scan", exact: true })).toBeVisible(); expect(calls).toBe(1);
  purpose = "live-test-v2"; await app.getByRole("button", { name: "Scan CV", exact: true }).click(); await expect(app.getByRole("dialog")).toBeVisible(); await app.getByRole("button", { name: "Cancel", exact: true }).click(); expect(calls).toBe(1);
});
test("normal app cannot enable fixtures with URL/header flags and still reports missing OpenAI", async ({ context, page }) => {
  const external: string[] = []; page.on("request", r => { const origin = new URL(r.url()).origin; if (!["http://127.0.0.2:4327", "http://127.0.0.2:4328", "http://127.0.0.1:4329"].includes(origin)) external.push(origin); });
  const metadata = await context.request.get("http://127.0.0.1:4329/api/cv-review/disclosure?preview=1", { headers: { "x-ownpath-preview": "true" } }); expect(await metadata.json()).toEqual({ provider: "OpenAI", purpose: "scan-rewrite-v1", external: true });
  const cookie = (await context.cookies("http://127.0.0.2:4327")).filter(c => c.name.startsWith("ownpath-local-preview-auth")).map(c => `${c.name}=${c.value}`).join("; ");
  const response = await context.request.post("http://127.0.0.1:4329/api/cv-review/scan?preview=1", { headers: { origin: "http://127.0.0.1:4329", "x-ownpath-preview": "true", cookie }, data: { consent: true, cv: "Synthetic", jd, requestId: crypto.randomUUID() } }); expect(response.status()).toBe(503); expect((await response.json()).error.message).toBe("OpenAI is not configured."); expect((await context.request.get("http://127.0.0.1:4329/__preview/samples/sales-cv.pdf")).status()).toBe(404);
  await page.getByText("Samples & instructions", { exact: true }).click(); await page.getByRole("button", { name: "Copy JD", exact: true }).click(); await expect(page.getByText("Copied.", { exact: true })).toBeVisible(); expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(jd); expect(external).toEqual([]);
});
test("gateway cannot forward absolute URLs, and owner-origin cookies remain isolated", async ({ context, page }) => {
  let calls = 0; const canary = http.createServer((_req, res) => { calls++; res.end("Unexpected proxy request"); });
  await new Promise<void>(resolve => canary.listen(0, "127.0.0.2", resolve));
  try {
    const address = canary.address(); if (!address || typeof address === "string") throw new Error("Local test listener unavailable.");
    const status = await new Promise<number>(resolve => { const request = http.request({ hostname: "127.0.0.2", port: 4327, path: `http://127.0.0.2:${address.port}/not-a-preview-path`, headers: { host: "127.0.0.2:4327" } }, response => { response.resume(); response.on("end", () => resolve(response.statusCode || 0)); }); request.on("error", () => resolve(0)); request.setTimeout(2000, () => request.destroy()); request.end(); });
    expect(status).toBe(403); expect(calls).toBe(0);
    await context.addCookies([{ name: "fictional-owner-cookie-sentinel", value: "never-use-this", domain: "127.0.0.1", path: "/" }]);
    await page.reload(); const previewCookies = await context.cookies("http://127.0.0.2:4327"); expect(previewCookies.some(c => c.name === "fictional-owner-cookie-sentinel")).toBe(false); expect(previewCookies.some(c => c.name.startsWith("ownpath-local-preview-auth"))).toBe(true); expect((await context.cookies("http://127.0.0.1:4317")).find(c => c.name === "fictional-owner-cookie-sentinel")?.value).toBe("never-use-this");
  } finally { await new Promise<void>(resolve => canary.close(() => resolve())); }
});
test("isolated saving preserves Unicode across multi-chunk fixture requests", async ({ page, context }) => {
  const app = page.frameLocator('iframe[title="OwnPath preview workspace"]'); await app.locator('input[type="file"]').setInputFiles(`${evidence}/samples/sales-cv.docx`); await expect(app.getByText("Extraction complete.", { exact: true })).toBeVisible(); const cv = await app.locator("#scan-cv").inputValue();
  const document = "Fictional Unicode boundary fixture\n" + "ế".repeat(22000); const id = crypto.randomUUID();
  const response = await context.request.post("/api/cv-review/saved", { headers: { origin: "http://127.0.0.2:4327" }, data: { id, kind: "version", payload: { schemaVersion: 2, templateId: "classic", cv, jd, scan, instructions: instruction, language: "English", document, changes: [], notes: [], title: "Synthetic Unicode boundary" } } }); expect(response.status()).toBe(200);
  const reopened = await context.request.get(`/api/cv-review/saved?id=${id}`); expect((await reopened.json()).version.payload.document).toBe(document);
});
