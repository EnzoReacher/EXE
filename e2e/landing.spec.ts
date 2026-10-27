import { test, expect } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", route => ["http://127.0.0.1:4396", "http://127.0.0.1:4397"].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
});

test("signed-out and signed-in header, hero and final CTA destinations", async ({ page, context, baseURL }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/sign-up");
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
  const guest = page.getByRole("link", { name: "Get started ↗", exact: true });
  await expect(guest).toHaveCount(2);
  for (const link of await guest.all()) await expect(link).toHaveAttribute("href", "/sign-up");

  // Use the existing fictional Auth boundary, without opening a workspace or live service.
  const auth = createServerClient("http://127.0.0.1:4397", "fictional-landing-key", {
    cookies: {
      getAll: () => [],
      setAll: async cookies => { await context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: baseURL! }))); },
    },
  });
  const { error } = await auth.auth.signInWithPassword({ email: "fictional@example.test", password: "Synthetic fixture only" });
  expect(error).toBeNull();
  await page.reload();
  const member = page.getByRole("link", { name: /Go to workspace/ });
  await expect(member).toHaveCount(3);
  for (const link of await member.all()) await expect(link).toHaveAttribute("href", "/app");
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Sign in" })).toHaveCount(0);
});

for (const width of [1440, 390, 320]) {
  test(`${width}px: layout, anchors, keyboard FAQs, focus and reduced motion`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const logos = page.getByRole("img", { name: "OwnPath", exact: true });
    await expect(logos).toHaveCount(2);
    for (const logo of await logos.all()) {
      await logo.scrollIntoViewIfNeeded();
      await expect(logo).toBeVisible();
      await expect(logo).toHaveJSProperty("complete", true);
      expect(await logo.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      const bounds = (await logo.boundingBox())!;
      expect(bounds.width).toBe(width > 700 ? 180 : 160);
      // Image optimization rounds the source height to whole pixels.
      expect(Math.abs(bounds.height - bounds.width * 808 / 1945)).toBeLessThan(0.5);
      expect(await logo.evaluate(el => {
        const style = getComputedStyle(el);
        return { background: style.backgroundColor, filter: style.filter, transform: style.transform, text: el.closest("a")!.textContent, href: el.closest("a")!.getAttribute("href") };
      })).toEqual({ background: "rgba(0, 0, 0, 0)", filter: "none", transform: "none", text: "", href: "/" });
    }
    expect((await page.locator("header").boundingBox())!.height).toBe(width > 700 ? 106 : 85);
    await page.evaluate(() => scrollTo(0, 0));
    const heroCTA = page.getByRole("link", { name: "Get started ↗", exact: true }).first();
    await expect(heroCTA).toBeInViewport();
    await expect(page.locator("#hero-illustration").getByText("Fictional example · Not a live AI result", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const heading = await page.getByRole("heading", { level: 1 }).boundingBox();
    const illustration = await page.getByRole("complementary", { name: "Fictional CV example" }).boundingBox();
    const cta = await heroCTA.boundingBox();
    if (width < 700) {
      expect(heading!.y).toBeLessThan(illustration!.y);
      expect(cta!.y + cta!.height).toBeLessThan(illustration!.y);
    }
    const steps = await page.locator("#how-it-works li").all();
    const positions = await Promise.all(steps.map(step => step.boundingBox()));
    if (width > 700) expect(new Set(positions.map(p => p!.y)).size).toBe(1);
    else expect(positions[0]!.y).toBeLessThan(positions[1]!.y);
    const exampleSection = page.getByRole("region", { name: "See the difference." });
    const panels = await exampleSection.getByRole("article").all();
    const panelPositions = await Promise.all(panels.map(panel => panel.boundingBox()));
    expect(panelPositions).toHaveLength(2);
    expect(panelPositions[0]!.width).toBeCloseTo(panelPositions[1]!.width, 1);
    if (width > 700) {
      expect(panelPositions[0]!.y).toBe(panelPositions[1]!.y);
      expect(panelPositions[0]!.height).toBe(panelPositions[1]!.height);
    } else {
      expect(panelPositions[0]!.x).toBe(panelPositions[1]!.x);
      expect(panelPositions[0]!.y + panelPositions[0]!.height).toBeLessThan(panelPositions[1]!.y);
    }
    expect((await exampleSection.boundingBox())!.y).toBeGreaterThan(illustration!.y + illustration!.height);
    expect((await exampleSection.boundingBox())!.y + (await exampleSection.boundingBox())!.height).toBeLessThan(positions[0]!.y);
    await expect(exampleSection.getByText("Fictional example · Not a live AI result", { exact: true })).toBeVisible();
    await expect(exampleSection.locator("form, input, textarea, button, a")).toHaveCount(0);
    const faqHeading = await page.getByRole("heading", { name: "FAQs", exact: true }).boundingBox();
    const faqFirst = await page.locator("#faq summary").first().boundingBox();
    const faqBounds = await page.locator("#faq > div").boundingBox();
    expect(faqBounds!.width).toBeLessThanOrEqual(800);
    expect(faqBounds!.x + faqBounds!.width / 2).toBeCloseTo(width / 2, 1);
    expect(faqHeading!.x).toBe(faqFirst!.x);
    expect(faqHeading!.y + faqHeading!.height).toBeLessThan(faqFirst!.y);

    // Capture the default collapsed state before exercising interactions.
    await page.screenshot({ path: testInfo.outputPath(`${width}-landing.png`), fullPage: true });
    const example = page.getByRole("link", { name: "See an example", exact: true });
    await example.click();
    await expect(page).toHaveURL(/#example$/);
    await expect(exampleSection).toBeInViewport();
    await expect(exampleSection.getByRole("heading", { name: "See the difference." })).toBeInViewport();
    for (const [name, target] of [["How it works", "how-it-works"], ["FAQ", "faq"]]) {
      if (width < 700) {
        const menu = page.getByRole("button", { name: "Open menu" });
        await menu.focus(); await page.keyboard.press("Enter");
      }
      await page.getByRole("link", { name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`#${target}$`));
      await expect(page.locator(`#${target}`)).toBeInViewport();
    }
    const summaries = page.locator("#faq summary");
    await expect(summaries).toHaveCount(3);
    await expect(page.locator("#faq details[open]")).toHaveCount(0);
    for (const [index, summary] of (await summaries.all()).entries()) {
      expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(76);
      await summary.focus();
      await page.keyboard.press("Enter");
      await expect(summary.locator("..")).toHaveAttribute("open", "");
      const answer = summary.locator("..").locator("p");
      await expect(answer).toBeVisible();
      const questionBounds = (await summary.boundingBox())!;
      expect((await answer.boundingBox())!.y).toBeGreaterThanOrEqual(questionBounds.y + questionBounds.height + 8);
      expect(await summary.evaluate(el => getComputedStyle(el, "::after").content)).toBe('"−"');
      const focus = await summary.evaluate(el => ({ visible: el.matches(":focus-visible"), style: getComputedStyle(el).outlineStyle, width: getComputedStyle(el).outlineWidth }));
      expect(focus).toEqual({ visible: true, style: "solid", width: "3px" });
      if (index === 0) await page.locator("#faq").screenshot({ path: testInfo.outputPath(`${width}-faq-expanded.png`) });
      await page.keyboard.press("Space");
      await expect(summary.locator("..")).not.toHaveAttribute("open");
      expect(await summary.evaluate(el => getComputedStyle(el, "::after").content)).toBe('"+"');
    }
    await summaries.first().focus(); await page.keyboard.press("Tab"); await expect(summaries.nth(1)).toBeFocused();
    expect(await page.locator("#hero-illustration").evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
    expect(await exampleSection.evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("paper-and-pen animation remains finite and settles", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const timings = await page.locator("#hero-illustration").evaluate(el => {
    const animations = el.getAnimations({ subtree: true });
    return animations.map(animation => {
      const { duration, iterations } = animation.effect!.getTiming();
      animation.finish();
      return { duration, iterations, state: animation.playState };
    });
  });
  expect(timings).toHaveLength(4);
  for (const timing of timings) expect(timing).toEqual({ duration: 5200, iterations: 1, state: "finished" });
  await expect(page.getByRole("img", { name: /Paper CV for fictional sales assistant Jamie Reed/ })).toBeVisible();
});
