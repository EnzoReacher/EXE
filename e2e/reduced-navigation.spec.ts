import { test, expect, type Page } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { jd, instruction, scan } from "./owner-preview/scenario.mjs";
import { scanSources } from "../src/lib/scan-rewrite/domain";

const summary = { plan: { plan: "Free", period_key: "fictional", starts_at: "2026-10-01T00:00:00Z", ends_at: "2026-11-01T00:00:00Z", scans: 3, rewrites: 1, saves: 3, scan_used: 0, rewrite_used: 0, saved_count: 0, next_start: null, next_end: null }, orders: [], enabled: false, mode: "OFF", price: null, version: "fictional", support: null, reason: "Offline only" };
test.beforeEach(async ({ page, context, baseURL, request }) => {
  await request.post("http://127.0.0.1:4399/__fixture/reset");
  await page.route("**/*", route => [baseURL, "http://127.0.0.1:4399"].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
  await page.route("**/api/billing/summary", route => route.fulfill({ json: summary }));
  await page.route("**/api/cv-review/saved", route => route.fulfill({ json: { versions: [], profiles: [] } }));
  await page.route("**/api/cv-review/disclosure", route => route.fulfill({ json: { provider: "Synthetic test only", purpose: "reduced-navigation-test", external: true } }));
  const auth = createServerClient("http://127.0.0.1:4399", "fictional-visual-key", { cookies: { getAll: () => [], setAll: async cookies => context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: baseURL! }))) } });
  expect((await auth.auth.signInWithPassword({ email: "fictional@example.test", password: "Synthetic only" })).error).toBeNull();
});
async function navigation(page: Page, label: string) {
  if ((page.viewportSize()?.width || 1440) < 761) await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await page.getByRole("navigation", { name: "CV workspaces", exact: true }).getByRole("link", { name: label, exact: true }).click();
}
for (const [width, format] of [[1440, "pdf"], [390, "docx"], [320, "pdf"]] as const) test(`${width}px app alias, reduced navigation, real ${format} intake and retained Scan/Rewrite work`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 950 });
  let scans = 0, rewrites = 0; let accepted: unknown;
  await page.route("**/api/cv-review/scan", route => {
    scans++; const b = route.request().postDataJSON(); const sources = scanSources(b);
    accepted = { ...scan, findings: scan.findings.map(f => ({ ...f, requirementSourceId: "jd", excerptSourceId: f.excerpt ? sources.cv.find(line => line.text.includes(f.excerpt))!.id : "" })) };
    return route.fulfill({ json: accepted });
  });
  await page.route("**/api/cv-review/rewrite", route => { rewrites++; expect(route.request().postDataJSON().scan).toEqual(accepted); return route.fulfill({ json: { replacements: [], changes: [], notes: [] } }); });
  await page.goto("/app"); await expect(page).toHaveURL(/\/app$/); await expect(page.getByRole("heading", { name: "Scan your CV", exact: true })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "CV workspaces", exact: true });
  if (width < 761) await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await expect(nav.getByRole("link")).toHaveCount(3); await expect(nav.locator('.op-nav-label')).toHaveText(["Scan CV", "Rewrite CV", "Saved CVs"]);for(const [label,href] of [['Scan CV','/app/scan'],['Rewrite CV','/app/rewrite'],['Saved CVs','/app/cvs']])await expect(nav.getByRole('link',{name:label,exact:true})).toHaveAttribute('href',href);await expect(nav.getByRole("link", { name: "Scan CV", exact: true })).toHaveAttribute("aria-current", "page");
  for (const label of ["Overview", "My experience profile", "Tailor my CV", "My CVs", "Account and security"]) await expect(nav.getByRole("link", { name: label, exact: true })).toHaveCount(0);
  if (width < 761) await page.keyboard.press("Escape");
  await page.locator('input[type="file"]').setInputFiles(`/tmp/opencode/ownpath-nav-samples/sales-cv.${format}`); await expect(page.getByText("Extraction complete.", { exact: true })).toBeVisible();
  const source = await page.locator("#scan-cv").inputValue(); expect(source).toContain("My manager negotiated supplier contracts, not me.");
  await page.getByLabel("Target job", { exact: true }).fill(jd);
  await page.getByLabel("Target job", { exact: true }).evaluate(element => { element.setAttribute("data-retained-node", "navigation-test"); });
  expect([scans, rewrites]).toEqual([0, 0]);
  await page.getByRole("button", { name: "Scan CV", exact: true }).click(); await page.getByRole("dialog").getByRole("button", { name: "Send", exact: true }).click(); await expect(page.getByRole("heading", { name: "Your scan", exact: true })).toBeVisible(); expect([scans, rewrites]).toEqual([1, 0]);
  await navigation(page, "Rewrite CV"); await expect(page).toHaveURL(/\/app\/rewrite$/); await page.getByLabel("How should we improve it?").fill(instruction); await page.getByRole("button", { name: "Rewrite CV", exact: true }).click(); await page.getByRole("dialog").getByRole("button", { name: "Send", exact: true }).click(); await expect(page.getByRole("heading", { name: "Your rewritten CV is ready", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit complete CV", exact: true }).click(); const edited = (await page.getByLabel("Complete CV text").inputValue()) + "\nManual edit survives navigation"; await page.getByLabel("Complete CV text").fill(edited);
  await navigation(page, "Saved CVs"); await expect(page.getByRole("heading", { name: "Saved CVs", exact: true })).toBeVisible(); await expect(page.getByRole("link", { name: "Tailor my CV", exact: true })).toHaveCount(0);
  // Account/settings must remain available even off the AI tool routes.
  if (width < 761) await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await page.getByRole("button", { name: /Account menu for/ }).click(); await page.getByRole("dialog", { name: "Account management" }).getByRole("link", { name: "Usage", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings", exact: true }); await expect(settings).toBeVisible();
  for (const label of ["Profile", "Usage", "Plan & billing", "Security"]) { await settings.getByRole("button", { name: label, exact: true }).click(); await expect(settings.getByRole("button", { name: label, exact: true })).toHaveAttribute("aria-current", "page"); }
  await page.keyboard.press("Escape"); await navigation(page, "Rewrite CV"); await expect(page.getByLabel("Complete CV text")).toHaveValue(edited); await expect(page.getByLabel("How should we improve it?")).toHaveValue(instruction);
  await navigation(page, "Scan CV"); await expect(page.getByRole("heading", { name: "Your scan", exact: true })).toBeVisible(); await expect(page.getByLabel("Target job")).toHaveValue(jd); await expect(page.getByLabel("Target job")).toHaveAttribute("data-retained-node", "navigation-test"); await expect(page.locator("#scan-cv")).toHaveValue(source);
  await page.getByText("View/edit CV and JD", { exact: true }).click(); await expect(page.getByLabel("Target job")).toBeVisible();
  expect([scans, rewrites]).toEqual([1, 1]); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath(`recovered-${width}.png`), fullPage: true });
});
test("anonymous app routes remain protected without inference or fixture credentials", async ({ browser, baseURL }) => {
  const context = await browser.newContext(); const page = await context.newPage();
  try {
    await page.route("**/*", route => [baseURL, "http://127.0.0.1:4399"].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
    // Both unchanged checks can redirect: the layout returns to /app, while a
    // page guard returns to that exact page. Parallel RSC rendering can select either.
    for (const path of ["/app", "/app/scan", "/app/rewrite", "/app/cvs", "/app/account"]) { await page.goto(path);await expect.poll(()=>new URL(page.url()).pathname).toBe('/sign-in');expect(['/app',path]).toContain(new URL(page.url()).searchParams.get('next'));await expect(page.getByRole('navigation',{name:'CV workspaces'})).toHaveCount(0); }
    for (const operation of ["scan", "rewrite"]) expect((await context.request.post(`${baseURL}/api/cv-review/${operation}`, { data: {} })).status()).toBe(401);
  } finally { await context.close(); }
});
