import { test } from "@playwright/test";

function check(value: unknown, code: string): asserts value { if (!value) throw new Error(code); }

test("FICTIONAL_ASSESSMENT_REPORT_SELECTORS_REFLOW", async ({ page, context, baseURL }) => {
  check(baseURL, "LOOPBACK_APP_REQUIRED");
  let forbidden = 0; let pageErrors = 0;
  page.on("pageerror", () => { pageErrors++; });
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== baseURL || (url.pathname.startsWith("/api/") && route.request().method() !== "GET")) {
      forbidden++; return route.abort();
    }
    if (url.pathname === "/api/intake/cv") return route.fulfill({ json: { cvs: [{ id: "11111111-1111-4111-8111-111111111111", originalFilename: "aria-vale-fictional-cv.docx", processingStatus: "ready" }] } });
    if (url.pathname === "/api/intake/jobs") return route.fulfill({ json: { jobs: [{ id: "22222222-2222-4222-8222-222222222222", roleTitle: "Junior Front-end Developer", companyName: "BrightPath Studio" }] } });
    if (url.pathname.startsWith("/api/")) { forbidden++; return route.abort(); }
    return route.continue();
  });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/assessment");
  await page.getByRole("button", { name: "Copy target job Junior Front-end Developer", exact: true }).waitFor();
  await test.step("DEMO_REPORT_SELECTORS_FIT_FIVE_VIEWPORTS", async () => {
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "ASSESSMENT_OVERFLOW_AT_" + width);
      for (const name of ["Saved CV for report", "Saved target job for report"]) {
        check(await page.getByLabel(name).evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const container = element.closest(".report-launcher")!.getBoundingClientRect();
          return bounds.left >= container.left && bounds.right <= container.right && bounds.right <= innerWidth;
        }), "ASSESSMENT_SELECTOR_OUT_OF_BOUNDS_AT_" + width);
      }
    }
  });
  check(forbidden === 0 && pageErrors === 0, "ASSESSMENT_FIXTURE_ERROR_OR_EXTERNAL_REQUEST");
});
