import { test, expect, chromium, type Page, type BrowserContext, type APIRequestContext } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { mkdtemp, writeFile } from "node:fs/promises";
const email = "long-fictional-account-identity-for-single-line-truncation@example.test";
const name = "A genuinely supplied long fictional display name for compact account controls";
const summary = { plan: { plan: "Free", period_key: "fictional", starts_at: "2026-10-01T00:00:00Z", ends_at: "2026-11-01T00:00:00Z", scans: 3, rewrites: 1, saves: 3, scan_used: 0, rewrite_used: 0, saved_count: 0, next_start: null, next_end: null }, orders: [], enabled: false, mode: "OFF", price: null, version: "fictional", support: null, reason: "Offline only" };
async function setup(context: BrowserContext, request: APIRequestContext, displayName = "") {
  await request.post("http://127.0.0.1:4399/__fixture/reset");
  await request.post("http://127.0.0.1:4399/__fixture/account", { data: { email, metadata: { display_name: displayName } } });
  await context.route("**/*", route => ["http://127.0.0.1:4398", "http://127.0.0.1:4399"].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
  await context.route("**/api/billing/summary", route => route.fulfill({ json: summary }));
  await context.route("**/api/cv-review/saved", route => route.fulfill({ json: { versions: [], profiles: [] } }));
  await context.route("**/api/cv-review/disclosure", route => route.fulfill({ json: { provider: "Synthetic", purpose: "popover-only", external: false } }));
  const auth = createServerClient("http://127.0.0.1:4399", "fictional-visual-key", { cookies: { getAll: () => [], setAll: async cookies => context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: "http://127.0.0.1:4398" }))) } });
  expect((await auth.auth.signInWithPassword({ email, password: "Synthetic only" })).error).toBeNull();
}
async function openAccount(page: Page) {
  const drawer = page.getByRole("button", { name: "Open navigation" }); if (await drawer.isVisible()) await drawer.click();
  await page.getByRole("button", { name: /Account menu for/ }).click();
}
async function bounds(page: Page, knownPlan = true) {
  const panel = page.getByRole("dialog", { name: "Account management" }); await expect(panel).toBeVisible();
  const side = (await page.locator(".op-sidebar").boundingBox())!, box = (await panel.boundingBox())!, trigger = (await page.locator(".op-account-trigger").boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(side.x + 11.5); expect(box.x + box.width).toBeLessThanOrEqual(side.x + side.width - 11.5);
  expect(Math.abs(box.width - (side.width - 24))).toBeLessThan(1); expect(Math.abs(trigger.y - box.y - box.height - 8)).toBeLessThan(1);
  expect(box.y).toBeGreaterThanOrEqual(11); expect(box.y + box.height).toBeLessThanOrEqual((await page.evaluate(() => innerHeight)) - 11);
  const overflow = await panel.evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth, elements: [...el.querySelectorAll("*")].filter(child => child.getBoundingClientRect().right > el.getBoundingClientRect().right + 1).map(child => ({ tag: child.tagName, class: child.className, width: child.getBoundingClientRect().width })) }));
  expect(overflow.scroll <= overflow.client, JSON.stringify(overflow)).toBe(true);
  for (const label of [...(knownPlan ? ["Upgrade to Pro"] : []), "Profile", "Usage", "Plan & billing", "Security"]) { const action = panel.getByRole("link", { name: label, exact: true }); await action.scrollIntoViewIfNeeded(); await expect(action).toBeInViewport(); const height = (await action.boundingBox())!.height; expect(height).toBeGreaterThanOrEqual(40); expect(height).toBeLessThanOrEqual(44); }
  await panel.getByRole("button", { name: "Sign out", exact: true }).scrollIntoViewIfNeeded(); await expect(panel.getByRole("button", { name: "Sign out", exact: true })).toBeInViewport(); await expect(panel.getByRole("button", { name: "Sign out", exact: true })).toBeEnabled();
  await expect(panel.locator(".op-account-signout .op-button-live")).toHaveCSS("justify-content", "flex-start");
  return panel;
}
for (const width of [1440, 390, 320]) for (const identity of ["absent", "same-email", "real-name"]) test(`${width}px ${identity}: contained panel and accessible single-line identity`, async ({ page, context, request }, info) => {
  await setup(context, request, identity === "real-name" ? name : identity === "same-email" ? email : ""); await page.setViewportSize({ width, height: 900 }); await page.goto("/app/scan");
  expect(await page.evaluate(() => visualViewport?.scale)).toBe(1); await openAccount(page); const panel = await bounds(page);
  expect(await panel.locator("header").count()).toBe(0); await expect(panel.locator(".op-account-identity").getByText(email, { exact: true })).toHaveCount(1);
  await expect(panel.locator(".op-account-identity")).toHaveAttribute("aria-label", new RegExp(email.replaceAll(".", "\\.")));
  for (const text of [panel.locator(".op-account-identity small").first(), page.locator(".op-account-label strong")]) { await expect(text).toHaveCSS("white-space", "nowrap"); await expect(text).toHaveCSS("text-overflow", "ellipsis"); }
  if (identity === "real-name") await expect(panel.locator(".op-account-identity strong")).toHaveText(name); else await expect(panel.locator(".op-account-identity strong")).toHaveText("Free plan");
  await page.screenshot({ path: info.outputPath(`${width}-${identity}.png`) });
  await page.keyboard.press("Home"); await expect(panel.locator(".op-account-identity")).toBeFocused(); await page.keyboard.press("End"); await expect(panel.getByRole("button", { name: "Sign out", exact: true })).toBeFocused(); await page.keyboard.press("Escape"); await expect(page.locator(".op-account-trigger")).toBeFocused();
});
test("rail activation expands once temporarily, then restores preference on Escape, outside dismissal and Settings", async ({ page, context, request }) => {
  await setup(context, request, name); await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/app/scan"); await page.getByLabel("Target job").fill("Unsent fictional work"); await page.getByRole("button", { name: "Collapse sidebar" }).click();
  for (const close of ["escape", "outside", "trigger", "settings"]) {
    await page.locator(".op-account-trigger").click(); await bounds(page); await expect(page.locator(".op-sidebar")).toHaveCSS("width", "264px"); expect(await page.evaluate(() => localStorage.getItem("ownpath:sidebar-collapsed"))).toBe("true");
    if (close === "settings") { await page.getByRole("link", { name: "Usage", exact: true }).click(); const modal = page.getByRole("dialog", { name: "Settings", exact: true }); await expect(modal.getByRole("button", { name: "Usage", exact: true })).toHaveAttribute("aria-current", "page"); await expect(page.locator(".op-sidebar")).toHaveCSS("width", "72px"); await page.keyboard.press("Escape"); await expect(page.locator(".op-account-trigger")).toBeFocused(); }
    else if (close === "escape") await page.keyboard.press("Escape"); else if (close === "trigger") await page.locator(".op-account-trigger").click(); else await page.getByRole("heading", { name: "Scan your CV", exact: true }).click();
    await expect(page.locator(".op-sidebar")).toHaveCSS("width", "72px"); expect(await page.evaluate(() => localStorage.getItem("ownpath:sidebar-collapsed"))).toBe("true"); await expect(page.getByLabel("Target job")).toHaveValue("Unsent fictional work");
  }
});
test("unknown plan remains unknown without invented identity or an upgrade destination", async ({ page, context, request }) => {
  await setup(context, request, email); await context.route("**/api/billing/summary", route => route.fulfill({ status: 503, json: {} })); await page.goto("/app/scan"); await expect(page.locator(".op-account-trigger")).toContainText("Plan unavailable"); await openAccount(page);
  const panel = await bounds(page, false); await expect(panel.getByRole("link", { name: /Upgrade to Pro|Manage plan/ })).toHaveCount(0); await expect(panel.locator(".op-account-identity strong")).toHaveText("Plan unavailable"); await expect(panel.locator(".op-account-identity").getByText(email, { exact: true })).toHaveCount(1);
});
test("temporary account expansion preserves controlled pending Scan and Rewrite without duplicate or cancelled requests", async ({ page, context, request }) => {
  await setup(context, request, name);
  const cv = "Fictional Candidate\nExperience\nHelped customers.\nEducation\nDiploma 2023", jd = "Customer service required.";
  const scan = { coverage: "Fictional requirement only.", findings: [{ title: "Customer service", requirement: jd, excerpt: "Helped customers.", explanation: "A direct example is supplied.", nextStep: "Clarify your work.", group: "supported", priority: "important", expectation: "required" }] };
  let finishScan!: () => void, finishRewrite!: () => void, scans = 0, rewrites = 0; const cancelled: string[] = [];
  const scanGate = new Promise<void>(resolve => { finishScan = resolve; }), rewriteGate = new Promise<void>(resolve => { finishRewrite = resolve; });
  page.on("requestfailed", request => { if (/\/api\/cv-review\/(scan|rewrite)$/.test(request.url())) cancelled.push(request.url()); });
  await context.route("**/api/cv-review/extract?*", route => route.fulfill({ json: { text: cv } }));
  await context.route("**/api/cv-review/scan", async route => { scans++; await scanGate; await route.fulfill({ json: scan }); });
  await context.route("**/api/cv-review/rewrite", async route => { rewrites++; await rewriteGate; await route.fulfill({ json: { replacements: [], changes: [], notes: [] } }); });
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/app/scan"); await page.locator('input[type="file"]').setInputFiles({ name: "synthetic.pdf", mimeType: "application/pdf", buffer: Buffer.from("Synthetic extraction fixture") }); await page.getByLabel("Target job").fill(jd); await page.getByRole("button", { name: "Scan CV", exact: true }).click(); await expect.poll(() => scans).toBe(1);
  await page.getByRole("button", { name: "Collapse sidebar" }).click(); await page.locator(".op-account-trigger").click(); await bounds(page); await page.keyboard.press("Escape"); await expect(page.locator(".op-sidebar")).toHaveCSS("width", "72px"); expect(scans).toBe(1); finishScan(); await expect(page.getByRole("heading", { name: "Your scan", exact: true })).toBeVisible();
  await page.locator(".op-sidebar").getByRole("link", { name: "Rewrite CV", exact: true }).click(); await page.getByLabel("How should we improve it?").fill("Keep the facts."); await page.getByRole("button", { name: "Rewrite CV", exact: true }).click(); await expect.poll(() => rewrites).toBe(1);
  await page.locator(".op-account-trigger").click(); await bounds(page); await page.getByRole("link", { name: "Usage", exact: true }).click(); await expect(page.getByRole("dialog", { name: "Settings", exact: true })).toBeVisible(); await expect(page.locator(".op-sidebar")).toHaveCSS("width", "72px"); finishRewrite(); await page.keyboard.press("Escape"); await expect(page.getByRole("heading", { name: "Your rewritten CV is ready" })).toBeVisible(); await expect(page.getByLabel("How should we improve it?")).toHaveValue("Keep the facts."); expect(scans).toBe(1); expect(rewrites).toBe(1); expect(cancelled).toEqual([]);
});
for (const width of [1440, 320]) test(`${width}px short viewport scrolls all actions above the trigger`, async ({ page, context, request }, info) => {
  await setup(context, request, name); await page.setViewportSize({ width, height: 360 }); await page.goto("/app/scan"); await openAccount(page); const panel = await bounds(page); expect(await panel.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true); await page.screenshot({ path: info.outputPath(`${width}-short.png`) });
});
test("actual Chromium 200% browser zoom keeps the account panel within navigation", async ({ request }, info) => {
  const extension = await mkdtemp("/tmp/opencode/account-zoom-extension-"); const profile = await mkdtemp("/tmp/opencode/account-zoom-profile-");
  await writeFile(`${extension}/manifest.json`, JSON.stringify({ manifest_version: 3, name: "Isolated zoom check", version: "1.0", permissions: ["tabs"], background: { service_worker: "worker.js" } })); await writeFile(`${extension}/worker.js`, "chrome.runtime.onInstalled.addListener(() => {});");
  const context = await chromium.launchPersistentContext(profile, { channel: "chromium", headless: true, viewport: { width: 1440, height: 900 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const worker = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker"); await setup(context, request, name); const page = await context.newPage(); await page.goto("http://127.0.0.1:4398/app/scan");
    const zoom = await worker.evaluate(async () => {
      const api = (globalThis as unknown as { chrome: { tabs: { query: (query: object) => Promise<{ id: number; url: string }[]>; setZoom: (id: number, zoom: number) => Promise<void>; getZoom: (id: number) => Promise<number> } } }).chrome;
      const tab = (await api.tabs.query({})).find(tab => tab.url.includes("4398/app/scan"))!; await api.tabs.setZoom(tab.id, 2); return api.tabs.getZoom(tab.id);
    });
    expect(zoom).toBe(2); await expect.poll(() => page.evaluate(() => devicePixelRatio)).toBe(2); expect(await page.evaluate(() => visualViewport?.scale)).toBe(1);
    await openAccount(page); const panel = await bounds(page); await page.screenshot({ path: info.outputPath("browser-zoom-200-end.png") }); await panel.locator(".op-account-identity").scrollIntoViewIfNeeded(); await page.screenshot({ path: info.outputPath("browser-zoom-200.png") });
    await info.attach("zoom-metrics", { body: JSON.stringify(await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio, pinchScale: visualViewport?.scale }))), contentType: "application/json" });
  } finally { await context.close(); }
});
