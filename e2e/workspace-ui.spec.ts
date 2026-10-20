import { test } from "@playwright/test";

// Fixture-backed UI only. Intercepted responses do not establish a session,
// backend acceptance or expert authority.
function check(value: unknown, code: string): asserts value { if (!value) throw new Error(code); }
const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
const cvName = "fictional-source-" + "long".repeat(15) + ".pdf";
function fixture(state = "candidate") {
  return { cvs: [{ id: a, filename: cvName }, { id: b, filename: "other-fictional.pdf" }], portfolios: [], credentials: [], experts: [],
    claims: [{ id: a, sourceCvId: a, sourceName: cvName, skill: "Fictional SQL", wording: "Fictional SQL coursework", state: "submitted", createdAt: "2026-10-04", credentialId: a, portfolioId: null, note: null, canWithdraw: true }],
    versions: [{ id: a, sourceCvId: a, sourceName: cvName, number: 1, state, createdAt: "2026-10-04", acceptedAt: null, changes: ["Fictional SQL"] }, { id: b, sourceCvId: b, sourceName: "other-fictional.pdf", number: 1, state: "rejected", createdAt: "2026-10-04", acceptedAt: null, changes: ["Other fictional skill"] }] };
}
test("OWNER_WORKSPACE_FIXTURE_UI", async ({ page, context, baseURL }) => {
  check(baseURL, "LOOPBACK_APP_REQUIRED");
  let state = "candidate"; let requests = 0; let mutations = 0; let pageErrors = 0; let forbidden = 0;
  page.on("pageerror", () => { pageErrors++; });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== baseURL) { forbidden++; return route.abort(); }
    if (url.pathname === "/api/credential-versions") {
      requests++;
      if (route.request().method() !== "GET") { mutations++; return route.fulfill({ status: 403, json: { code: "unavailable" } }); }
      return route.fulfill({ json: url.searchParams.has("version") ? { id: a, before: "Original fictional CV", content: "Original fictional CV\nFictional SQL", state } : fixture(state) });
    }
    if (url.pathname.startsWith("/api/")) { forbidden++; return route.abort(); }
    return route.continue();
  });
  await test.step("KEYBOARD_VALIDATION_AND_SOURCE_FILTERS", async () => {
    await page.goto("/credential-versions");
    await page.getByRole("heading", { name: "Your next steps" }).waitFor();
    const save = page.getByRole("button", { name: "Save draft claim" });
    await save.focus(); await save.press("Enter");
    await page.getByRole("alert").filter({ hasText: "Select a source CV" }).waitFor();
    check(await page.getByLabel("Source CV (required)").evaluate((node) => document.activeElement === node), "INVALID_SOURCE_FOCUS_REQUIRED");
    check(mutations === 0, "INVALID_FORM_MUST_NOT_SUBMIT");
    await page.getByLabel("Filter by source CV").selectOption(a);
    check(await page.getByRole("heading", { name: "Version 1", exact: true }).count() === 1, "SOURCE_HISTORY_MUST_BE_DISTINCT");
    await page.getByLabel("Filter by next step").selectOption("waiting");
    check(await page.getByRole("heading", { name: "Version 1", exact: true }).count() === 0, "WAITING_FILTER_MUST_HIDE_VERSIONS");
    const clear = page.getByRole("button", { name: "Clear filters" }); await clear.focus(); await clear.press("Enter");
    check(await page.getByRole("heading", { name: "Version 1", exact: true }).count() === 2, "CLEAR_FILTERS_MUST_RESTORE_HISTORY");
    check(requests === 1, "FILTERS_MUST_NOT_MUTATE_OR_REFETCH");
  });
  await test.step("NARROW_LAYOUT_AND_CANDIDATE_REFRESH", async () => {
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "WORKSPACE_HORIZONTAL_OVERFLOW");
      check(await page.locator("button:visible, a.text-link:visible, select:visible").evaluateAll((nodes) => nodes.every((node) => { const bounds = node.getBoundingClientRect(); return bounds.left >= 0 && bounds.right <= innerWidth + 1; })), "WORKSPACE_ACTION_OUT_OF_BOUNDS");
    }
    await page.getByRole("button", { name: "Review version 1", exact: true }).first().click();
    await page.getByRole("button", { name: "Accept candidate after review" }).waitFor();
    check(await page.getByRole("heading", { name: "Immutable CV snapshot" }).evaluate((node) => document.activeElement === node), "CANDIDATE_REVIEW_FOCUS_REQUIRED");
    state = "evidence_withdrawn";
    const refresh = page.getByRole("button", { name: "Refresh private workspace" }); await refresh.focus(); await refresh.press("Enter");
    await page.getByText("Export is unavailable because supporting evidence was withdrawn.").waitFor();
    check(await page.getByRole("button", { name: "Accept candidate after review" }).count() === 0, "REFRESH_MUST_CLOSE_STALE_CANDIDATE");
    check(pageErrors === 0, "WORKSPACE_UNCAUGHT_PAGE_ERROR"); check(forbidden === 0, "WORKSPACE_UNEXPECTED_NETWORK"); check(mutations === 0, "FIXTURE_UI_MUST_NOT_MUTATE_BACKEND");
  });
});
