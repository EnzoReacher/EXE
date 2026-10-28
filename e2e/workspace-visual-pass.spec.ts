import { test, expect, type Locator } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { readFile } from "node:fs/promises";

const cv = "Jamie Reed\nExperience\nHelped customers choose products.\nEducation\nBusiness diploma, 2023";
const jd = "Help customers select products and maintain stock records.";
const scan = { coverage: "Fictional browser response only.", findings: [{ title: "Customer service", requirement: jd, excerpt: "Helped customers choose products.", explanation: "Customer support is shown in this excerpt.", nextStep: "Clarify any relevant stock-record responsibilities.", priority: "important", expectation: "required", group: "supported" }] };
const summary = { plan: { plan: "Free", period_key: "fictional-visual-period", starts_at: "2026-10-01T00:00:00Z", ends_at: "2026-11-01T00:00:00Z", scans: 3, rewrites: 1, saves: 3, scan_used: 1, rewrite_used: 0, saved_count: 0, next_start: null, next_end: null }, orders: [], enabled: false, mode: "OFF", price: null, version: "fictional-visual", support: null, reason: "Fictional browser response only" };

async function contrast(element: Locator, background: string) {
  return element.evaluate((el, background) => {
    const luminance = (color: string) => {
      const rgb = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => { const c = value / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
      return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    };
    const a = luminance(getComputedStyle(el).color), b = luminance(background);
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  }, background);
}

test.beforeEach(async ({ page, context, baseURL }) => {
  await page.route("**/*", route => [baseURL, "http://127.0.0.1:4399"].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
  // Browser-only read models; no database, payment or paid AI request is made.
  await page.route("**/api/billing/summary", route => route.fulfill({ json: summary }));
  await page.route("**/api/cv-review/saved", route => route.fulfill({ json: { versions: [], profiles: [] } }));
  await page.route("**/api/cv-review/disclosure", route => route.fulfill({ json: { provider: "Fictional test provider", purpose: "visual-test-v1", external: true } }));
  const auth = createServerClient("http://127.0.0.1:4399", "fictional-visual-key", { cookies: {
    getAll: () => [],
    setAll: async cookies => { await context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: baseURL! }))); },
  } });
  expect((await auth.auth.signInWithPassword({ email: "fictional@example.test", password: "Synthetic fixture only" })).error).toBeNull();
});

for (const width of [1440, 390, 320]) {
  test(`${width}px sidebar branding at 100% zoom`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const maskResponse = page.waitForResponse(response => new URL(response.url()).pathname === "/brand/ownpath-symbol.png" && response.ok());
    await page.goto("/app/scan");
    expect(await page.evaluate(() => ({ scale: visualViewport?.scale, pixelRatio: devicePixelRatio, zoom: getComputedStyle(document.documentElement).zoom }))).toEqual({ scale: 1, pixelRatio: 1, zoom: "1" });
    if (width < 760) {
      const trigger = page.getByRole("button", { name: "Open navigation" });
      await trigger.focus(); await page.keyboard.press("Enter");
    }
    const navigation = page.locator(".op-sidebar");
    const home = navigation.getByRole("link", { name: "OwnPath home" });
    const symbol = home.locator(".op-workspace-symbol");
    expect(await (await maskResponse).body()).toEqual(await readFile(new URL("../public/brand/ownpath-symbol.png", import.meta.url)));
    await expect(home).toHaveText("OwnPath");
    await expect(home).toHaveAttribute("href", "/");
    await expect(home).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(home).toHaveCSS("color", "rgb(245, 243, 234)");
    await expect(home).toHaveCSS("font-size", "26px");
    await expect(home).toHaveCSS("font-weight", "650");
    await expect(home).toHaveCSS("column-gap", "10px");
    await expect(home).toHaveCSS("padding-left", "6px");
    await expect(home).toHaveCSS("padding-right", "6px");
    expect((await symbol.boundingBox())!.x).toBe(24);
    await expect(navigation).toHaveCSS("background-color", "rgb(22, 62, 57)");
    await expect(home.locator("img, .op-symbol-badge")).toHaveCount(0);
    await expect(symbol).toHaveAttribute("aria-hidden", "true");
    await expect(symbol).toHaveCSS("background-color", "rgb(189, 232, 213)");
    await expect(symbol).toHaveCSS("background-image", "none");
    await expect(symbol).toHaveCSS("mask-image", /ownpath-symbol\.png/);
    await expect(symbol).toHaveCSS("mask-mode", "alpha");
    await expect(symbol).toHaveCSS("mask-size", "contain");
    await expect(symbol).toHaveCSS("mask-repeat", "no-repeat");
    await expect(symbol).toHaveCSS("padding", "0px");
    await expect(symbol).toHaveCSS("border-width", "0px");
    await expect(symbol).toHaveCSS("box-shadow", "none");
    await expect(symbol).toHaveCSS("filter", "none");
    const inner = (await symbol.boundingBox())!;
    const text = (await home.locator(":scope > span").last().boundingBox())!;
    expect(inner.width).toBe(40);
    expect(Math.abs(inner.height - inner.width * 690 / 740)).toBeLessThan(.1);
    expect(Math.abs(inner.y + inner.height / 2 - text.y - text.height / 2)).toBeLessThan(.5);
    expect((await home.boundingBox())!.height).toBeLessThan(92);
    expect(await contrast(home, "rgb(22, 62, 57)")).toBeGreaterThanOrEqual(4.5);
    await home.evaluate(el => (el as HTMLElement).blur());
    await page.screenshot({ path: testInfo.outputPath(`${width}-sidebar-mask.png`) });
    await home.focus();
    await expect(home).toBeFocused();
    await expect(home).toHaveCSS("outline-color", "rgb(180, 223, 208)");
    await expect(home).toHaveCSS("outline-width", "3px");
    await expect(home).toHaveCSS("outline-style", "solid");
    await home.screenshot({ path: testInfo.outputPath(`${width}-brand-focus.png`) });
    if (width < 760) {
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
    }
  });

  test(`${width}px forest shell and Scan composition, focus and route preservation`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const writes: string[] = [];
    page.on("request", request => { if (request.method() !== "GET" && request.url().includes("/api/")) writes.push(request.url()); });
    await page.goto("/app/scan");
    await expect(page.getByRole("heading", { level: 1, name: "Scan your CV", exact: true })).toBeVisible();
    await expect(page.getByText("See how your experience matches the job.", { exact: true })).toBeVisible();
    await expect(page.getByText("UNDERSTAND THE ROLE", { exact: true })).toHaveCount(0);
    await expect(page.getByText("No saved CVs yet.", { exact: true })).toBeVisible();
    await expect(page.getByText("A little space for your next chapter.")).toHaveCount(0);
    await expect(page.locator(".op-workspace")).toHaveCSS("background-color", "rgb(250, 249, 245)");
    const cards = page.locator(".op-input-card");
    for (const card of await cards.all()) await expect(card).toHaveCSS("background-color", "rgb(255, 255, 255)");
    const a = (await cards.nth(0).boundingBox())!, b = (await cards.nth(1).boundingBox())!;
    if (width > 760) { expect(a.y).toBe(b.y); expect(a.height).toBe(b.height); }
    else expect(a.y + a.height).toBeLessThan(b.y);
    expect((await page.locator(".op-upload-symbol").boundingBox())!.width).toBe(56);
    await expect(page.getByRole("region", { name: "Plan and remaining usage" })).toHaveCount(0);
    await expect(page.locator(".op-scan-workspace .op-contextual-usage")).not.toContainText("scans remaining");
    await expect(page.getByRole("button", { name: "View usage" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${width}-scan.png`), fullPage: true });

    if (width < 760) {
      const trigger = page.getByRole("button", { name: "Open navigation" });
      await trigger.focus(); await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog", { name: "Workspace navigation" })).toBeVisible();
    }
    const navigation = page.locator(".op-sidebar");
    await expect(navigation).toHaveCSS("background-color", "rgb(22, 62, 57)");
    const home = navigation.getByRole("link", { name: "OwnPath home" });
    const symbol = home.locator(".op-workspace-symbol");
    await expect(symbol).toBeVisible();
    await expect(symbol).toHaveAttribute("aria-hidden", "true");
    await expect(symbol).toHaveCSS("mask-image", /ownpath-symbol\.png/);
    const size = (await symbol.boundingBox())!;
    expect(size.width).toBe(40);
    expect(Math.abs(size.height - size.width * 690 / 740)).toBeLessThan(.1);
    await expect(symbol).toHaveCSS("mask-size", "contain");
    await expect(home).toHaveText("OwnPath");
    await expect(home).toHaveAttribute("href", "/");
    await expect(home).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(home).toHaveCSS("padding-left", "6px");
    await expect(home).toHaveCSS("padding-right", "6px");
    expect((await symbol.boundingBox())!.x).toBe(24);
    expect((await home.boundingBox())!.height).toBeLessThanOrEqual(96);
    expect(await contrast(home, "rgb(22, 62, 57)")).toBeGreaterThanOrEqual(4.5);
    await expect(symbol).toHaveCSS("filter", "none");
    for (const link of await navigation.locator("nav a").all()) {
      const selected = await link.getAttribute("aria-current");
      expect(await contrast(link, selected ? "rgb(220, 239, 229)" : "rgb(22, 62, 57)")).toBeGreaterThanOrEqual(4.5);
    }
    expect(await contrast(navigation.locator(".op-account-label strong"), "rgb(22, 62, 57)")).toBeGreaterThanOrEqual(4.5);
    await home.focus();
    await expect(home).toHaveCSS("outline-color", "rgb(180, 223, 208)");
    await expect(home).toHaveCSS("outline-width", "3px");
    await expect(home).toHaveCSS("outline-style", "solid");
    await home.screenshot({ path: testInfo.outputPath(`${width}-sidebar-brand-focus.png`) });
    const account = navigation.getByRole("button", { name: /Account menu for/ });
    await account.click();
    const accountPanel = page.getByRole("dialog", { name: "Account management" });
    await expect(accountPanel).toBeVisible();
    await expect(accountPanel.getByRole("link", { name: "Profile", exact: true })).toHaveAttribute("href", "/app/account#personal-details-heading");
    await page.screenshot({ path: testInfo.outputPath(`${width}-account-menu.png`) });
    await page.keyboard.press("Escape");
    await expect(account).toBeFocused();
    if (width < 760) {
      await page.screenshot({ path: testInfo.outputPath(`${width}-navigation.png`) });
      const last = navigation.getByRole("button", { name: /Account menu for/ });
      await last.focus(); await page.keyboard.press("Tab"); await expect(navigation.getByRole("link", { name: "OwnPath home" })).toBeFocused();
      await page.keyboard.press("Escape"); await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
      await expect(page.getByRole("button", { name: "Open navigation" })).toHaveAttribute("aria-expanded", "false");
    }
    await page.getByRole("link", { name: "Add your first CV ↑" }).click();
    await expect(page.getByRole("button", { name: "Select file" })).toBeFocused();
    await page.getByLabel("Target job", { exact: true }).fill("Private in-memory job text");
    if (width < 760) await page.getByRole("button", { name: "Open navigation" }).click();
    await navigation.getByRole("link", { name: "Rewrite CV", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Start with a Scan" })).toBeVisible();
    await page.getByRole("link", { name: "Go to Scan CV →" }).click();
    await expect(page.getByLabel("Target job", { exact: true })).toHaveValue("Private in-memory job text");
    expect(writes).toEqual([]);
    expect(await navigation.evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  });
}

test("upload, source editing and cancel-first consent retain the existing Scan contract", async ({ page }) => {
  let scans = 0, extracts = 0;
  await page.route("**/api/cv-review/extract?*", route => { extracts++; return route.fulfill({ json: { text: cv } }); });
  await page.route("**/api/cv-review/scan", route => {
    scans++;
    expect(route.request().postDataJSON()).toMatchObject({ cv, jd, consent: true });
    return route.fulfill({ json: scan });
  });
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Scan your CV", exact: true })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({ name: "fictional.pdf", mimeType: "application/pdf", buffer: Buffer.from("Synthetic parser response fixture") });
  await expect(page.getByText("Extraction complete.", { exact: true })).toBeVisible();
  await page.getByLabel("Target job", { exact: true }).fill(jd);
  await page.getByRole("button", { name: "Scan CV", exact: true }).click();
  const consent = page.getByRole("dialog", { name: "Send to Fictional test provider?" });
  await expect(consent.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
  await consent.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(scans).toBe(0); expect(extracts).toBe(1);
  await page.getByRole("button", { name: "Scan CV", exact: true }).click();
  await consent.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your scan", exact: true })).toBeVisible();
  await expect(page.locator(".op-source-summary")).not.toHaveAttribute("open");
  await page.getByRole("link", { name: "Rewrite this CV", exact: true }).first().click();
  await expect(page.getByLabel("How should we improve it?")).toBeVisible();
  expect(scans).toBe(1); expect(extracts).toBe(1);
});
