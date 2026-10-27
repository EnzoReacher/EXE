import { test, expect, type Page } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
const cv = "Jamie Reed\nExperience\nHelped customers choose products.\nEducation\nBusiness diploma, 2023";
const jd = "Help customers select products and maintain stock records.";
const scan = { coverage: "Fictional response only.", findings: [{ title: "Customer service", requirement: jd, excerpt: "Helped customers choose products.", explanation: "Customer support is shown.", nextStep: "Clarify relevant stock-record responsibilities.", priority: "important", expectation: "required", group: "supported" }] };
const summary = { plan: { plan: "Free", period_key: "fictional", starts_at: "2026-10-01T00:00:00Z", ends_at: "2026-11-01T00:00:00Z", scans: 3, rewrites: 1, saves: 3, scan_used: 1, rewrite_used: 0, saved_count: 2, next_start: null, next_end: null }, orders: [], enabled: false, mode: "OFF", price: null, version: "fictional", support: null, reason: "Offline only" };
test.beforeEach(async ({ page, context, baseURL, request }) => {
  await request.post("http://127.0.0.1:4399/__fixture/reset");
  await request.post("http://127.0.0.1:4399/__fixture/account", { data: { email: "a-very-long-fictional-identity-for-responsive-testing@example.test", metadata: { display_name: "A long fictional display name for responsive OwnPath account controls" } } });
  await page.route("**/*", route => [baseURL, "http://127.0.0.1:4399"].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
  await page.route("**/api/billing/summary", route => route.fulfill({ json: summary }));
  await page.route("**/api/cv-review/saved", route => route.fulfill({ json: { versions: [], profiles: [] } }));
  await page.route("**/api/cv-review/disclosure", route => route.fulfill({ json: { provider: "Fictional test provider", purpose: "navigation-test", external: true } }));
  const auth = createServerClient("http://127.0.0.1:4399", "fictional-visual-key", { cookies: { getAll: () => [], setAll: async cookies => context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: baseURL! }))) } });
  expect((await auth.auth.signInWithPassword({ email: "fictional@example.test", password: "Synthetic only" })).error).toBeNull();
});
async function account(page: Page, section: string) {
  if ((page.viewportSize()?.width || 1440) < 761) await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: /Account menu for/ }).click();
  await page.getByRole("link", { name: section, exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Settings", exact: true })).toBeVisible();
}
for (const width of [1440, 390, 320]) test(`${width}px account, populated settings, keyboard containment and unsaved settings`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 }); await page.goto("/app/scan");
  await page.getByLabel("Target job").fill("Unsent fictional target job");
  if (width === 1440) { await page.screenshot({ path: info.outputPath("expanded.png") }); await page.getByRole("button", { name: "Collapse sidebar" }).click(); await expect(page.locator(".op-sidebar")).toHaveCSS("width", "72px"); await page.keyboard.press("Tab"); await expect(page.getByRole("link", { name: "Scan CV", exact: true })).toBeFocused(); expect(await page.getByRole("link", { name: "Scan CV", exact: true }).evaluate(el => getComputedStyle(el, "::after").content)).toContain("Scan CV"); await page.screenshot({ path: info.outputPath("collapsed-tooltip.png") }); }
  if (width < 761) await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: /Account menu for/ }).click(); const popover = page.getByRole("dialog", { name: "Account management" }); const box = (await popover.boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width); expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y + box.height).toBeLessThanOrEqual(900); await page.screenshot({ path: info.outputPath(`${width}-account.png`) });
  await popover.getByRole("link", { name: "Profile", exact: true }).click(); const modal = page.getByRole("dialog", { name: "Settings", exact: true });
  await expect(modal.getByLabel(/Display name/)).not.toHaveValue(""); await modal.getByLabel(/Display name/).fill("Unsaved fictional display name");
  await page.screenshot({ path: info.outputPath(`${width}-profile.png`) });
  await modal.getByRole("button", { name: "Usage", exact: true }).click(); await expect(modal.getByRole("region", { name: "Usage", exact: true }).getByText("2 / 3", { exact: true })).toHaveCount(2); await expect(modal.getByText(/UTC\+07:00/)).toBeVisible();
  await page.screenshot({ path: info.outputPath(`${width}-usage.png`) });
  await modal.getByRole("button", { name: "Plan & billing", exact: true }).click(); await expect(modal.getByText("No purchases yet.", { exact: false })).toBeVisible(); await page.screenshot({ path: info.outputPath(`${width}-billing.png`) });
  await modal.getByRole("button", { name: "Security", exact: true }).click(); await expect(modal.getByRole("link", { name: /Change password/ })).toBeVisible();
  for (let i = 0; i < 16; i++) { await page.keyboard.press("Tab"); expect(await modal.evaluate(el => el.contains(document.activeElement))).toBe(true); }
  await page.keyboard.press("Escape"); const confirmation = page.getByRole("dialog", { name: "Discard settings changes?" }); await expect(confirmation.getByRole("button", { name: "Cancel" })).toBeFocused(); await page.keyboard.press("Escape"); await expect(confirmation).not.toBeVisible(); expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await modal.getByRole("button", { name: "Profile", exact: true }).click(); await expect(modal.getByLabel(/Display name/)).toHaveValue("Unsaved fictional display name");
  await modal.getByRole("button", { name: "Close settings" }).click(); await confirmation.getByRole("button", { name: "Discard settings changes" }).click(); await expect(modal).not.toBeVisible(); await expect(page.getByLabel("Target job")).toHaveValue("Unsent fictional target job");
  expect(await page.evaluate(() => document.body.style.overflow)).toBe(""); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("pending Scan survives collapse and Settings; instructions and manual edits survive navigation and overlays", async ({ page }) => {
  let finish!: () => void; const gate = new Promise<void>(resolve => { finish = resolve; }); let scans = 0, rewrites = 0;
  await page.route("**/api/cv-review/scan", async route => { scans++; await gate; await route.fulfill({ json: scan }); });
  await page.route("**/api/cv-review/extract?*", route => route.fulfill({ json: { text: cv } }));
  await page.route("**/api/cv-review/rewrite", route => { rewrites++; return route.fulfill({ json: { replacements: [], changes: [], notes: [] } }); });
  await page.goto("/app/scan"); await page.locator('input[type="file"]').setInputFiles({ name: "fictional.pdf", mimeType: "application/pdf", buffer: Buffer.from("Synthetic browser upload") }); await expect(page.getByLabel("Your CV", { exact: true })).toHaveValue(cv); await page.getByLabel("Target job").fill(jd);
  await page.getByRole("button", { name: "Scan CV", exact: true }).click(); await page.getByRole("dialog").getByRole("button", { name: "Send", exact: true }).click(); await expect.poll(() => scans).toBe(1);
  await page.getByRole("button", { name: "Collapse sidebar" }).click(); await page.getByRole("button", { name: "View usage" }).click(); finish(); await page.getByRole("button", { name: "Close settings" }).click(); await expect(page.getByRole("heading", { name: "Your scan", exact: true })).toBeVisible(); expect(scans).toBe(1);
  await page.locator(".op-sidebar").getByRole("link", { name: "Rewrite CV", exact: true }).click(); await page.getByLabel("How should we improve it?").fill("Keep facts and make wording concise."); await page.getByRole("button", { name: "Rewrite CV", exact: true }).click(); await page.getByRole("dialog", { name: "Send to Fictional test provider?" }).getByRole("button", { name: "Send", exact: true }).click(); await expect(page.getByRole("heading", { name: "Your rewritten CV is ready" })).toBeVisible();
  await page.getByRole("button", { name: "Edit complete CV" }).click(); await page.getByLabel("Complete CV text").fill(cv + "\nManual wording edit");
  await account(page, "Security"); await page.keyboard.press("Escape"); await page.getByRole("button", { name: "Expand sidebar" }).click(); await expect(page.getByLabel("Complete CV text")).toHaveValue(cv + "\nManual wording edit"); await expect(page.getByLabel("How should we improve it?")).toHaveValue("Keep facts and make wording concise.");
  await page.getByRole("button", { name: "Save this CV (optional)" }).click(); await expect(page.locator(".op-result-controls .op-contextual-usage")).toContainText("2 / 3 saved CVs · storage capacity"); await page.locator(".op-result-controls").getByRole("button", { name: "View usage" }).click(); await expect(page.getByRole("dialog", { name: "Settings", exact: true }).getByRole("button", { name: "Usage", exact: true })).toHaveAttribute("aria-current", "page"); await page.keyboard.press("Escape"); await expect(page).toHaveURL(/\/app\/rewrite$/); expect(scans).toBe(1); expect(rewrites).toBe(1); await expect(page.getByText("fictional.pdf", { exact: true })).toHaveCount(1);
});
test("preference survives routes/reload and mobile transitions; direct account anchors and unique IDs work", async ({ page }) => {
  await page.goto("/app/scan"); await page.getByRole("button", { name: "Collapse sidebar" }).click(); await page.locator(".op-sidebar").getByRole("link", { name: "Saved CVs", exact: true }).click(); await page.reload(); await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 }); await account(page, "Usage"); await page.getByRole("button", { name: "Close settings" }).click(); await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  await page.getByRole("button", { name: "Open navigation" }).click(); await page.setViewportSize({ width: 1440, height: 900 }); await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe(""); await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
  await page.goto("/app/account#personal-details-heading"); await expect(page.getByRole("heading", { name: "Personal details" })).toBeVisible(); await account(page, "Usage");
  expect(await page.evaluate(() => { const ids = [...document.querySelectorAll("[id]")].map(el => el.id); return ids.length === new Set(ids).size; })).toBe(true);
});
test("unavailable summary is unknown; failed refresh keeps last verified values and recovers", async ({ page }, info) => {
  let state = "unavailable"; let reads = 0;
  await page.route("**/api/billing/summary", route => { reads++; return state === "ok" ? route.fulfill({ json: summary }) : route.fulfill({ status: 503, json: {} }); });
  await page.goto("/app/scan"); await expect(page.locator(".op-scan-workspace").getByText("Allowance unavailable; your work is kept.")).toBeVisible(); await page.getByRole("button", { name: "View usage" }).click(); const modal = page.getByRole("dialog", { name: "Settings", exact: true }); await expect(modal.getByRole("alert")).toContainText("No verified allowance"); expect(reads).toBe(1);
  state = "ok"; await modal.getByRole("button", { name: "Refresh usage" }).click(); await expect(modal.getByText("Free plan", { exact: true })).toBeVisible(); state = "unavailable"; await modal.getByRole("button", { name: "Refresh usage" }).click(); await expect(modal.getByRole("alert")).toContainText("Last checked"); await expect(modal.getByText("Free plan", { exact: true })).toBeVisible(); await page.screenshot({ path: info.outputPath("stale-usage.png") });
});
test("failed profile saving keeps edits; populated Pro billing scrolls with close/navigation available and no billing writes", async ({ page, request }, info) => {
  const writes: string[] = []; page.on("request", request => { if (request.method() !== "GET" && request.url().includes("/api/billing/")) writes.push(request.url()); });
  await page.route("**/api/billing/summary", route => route.fulfill({ json: { ...summary, plan: { ...summary.plan, plan: "Pro", next_start: "2026-11-01T00:00:00Z", next_end: "2026-12-01T00:00:00Z" }, orders: Array.from({ length: 12 }, (_, index) => ({ id: `fictional-order-${index}`, order_code: 1000 + index, amount: 79000, state: "confirmed", created_at: "2026-10-23T00:00:00Z" })) } }));
  await page.goto("/app/scan"); await account(page, "Profile"); const modal = page.getByRole("dialog", { name: "Settings", exact: true }); await modal.getByLabel(/Display name/).fill("Retain after failure");
  await request.post("http://127.0.0.1:4399/__fixture/account", { data: { failUpdates: true } }); await modal.getByRole("button", { name: "Save changes", exact: true }).click(); await expect(modal.getByRole("alert")).toContainText("Your edits are kept"); await expect(modal.getByLabel(/Display name/)).toHaveValue("Retain after failure");
  await modal.getByRole("button", { name: "Plan & billing", exact: true }).click(); await expect(modal.getByText("Purchased next period", { exact: true })).toBeVisible(); await page.screenshot({ path: info.outputPath("populated-pro-billing.png") });
  await modal.getByRole("link", { name: /Order 1011/ }).scrollIntoViewIfNeeded(); await expect(modal.getByRole("button", { name: "Close settings" })).toBeInViewport(); await expect(modal.getByRole("button", { name: "Profile", exact: true })).toBeInViewport(); expect(writes).toEqual([]);
});
test("normal motion toggles smoothly, honors hover tooltips and preserves control focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" }); await page.goto("/app/scan"); const toggle = page.getByRole("button", { name: "Collapse sidebar" }); await toggle.click(); const expand = page.getByRole("button", { name: "Expand sidebar" }); await expect(expand).toBeFocused(); await expect(page.locator(".op-sidebar")).toHaveCSS("width", "72px"); await expand.hover(); expect(await expand.evaluate(el => getComputedStyle(el, "::after").content)).toContain("Expand sidebar"); await expand.click(); await expect(page.locator(".op-sidebar")).toHaveCSS("width", "264px"); await expect(toggle).toBeFocused();
});
