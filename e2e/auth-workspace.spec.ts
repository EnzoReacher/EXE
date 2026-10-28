import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
const fixture = "http://127.0.0.1:4407";
const source = "An Nguyen\nExperience\nChecked invoices.\nUpdated schedules.\nEducation\nDiploma 2023";
async function login(page: Page, next = "/app") {
  await page.goto(`/sign-in?next=${next}`); await page.getByLabel("Email address").fill("fictional@example.test"); await page.getByLabel("Password", { exact: true }).fill("synthetic password only");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled(); await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(new RegExp(`${next}$`)); await expect(page.locator(".op-workspace")).toBeVisible();
}
test.beforeEach(async ({ request }) => { await request.post(`${fixture}/__fixture/reset`); });
test("public landing and all workspace/API gates require verified authentication", async ({ page }) => {
  let modelCalls = 0; page.on("request", r => { if (/\/api\/cv-review\/(review|organize|saved)/.test(r.url())) modelCalls++; });
  await page.goto("/"); await expect(page.getByRole("heading", { name: "Your experience. Your next CV." })).toBeVisible();
  await expect(page.getByText("Fictional example · Not a live AI result").first()).toBeVisible(); expect(modelCalls).toBe(0);
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/sign-up");
  for (const route of ["/app", "/app/profile", "/app/tailor", "/app/cvs", "/app/account", "/cv-review", "/experience-translator"]) { await page.goto(route); await expect(page).toHaveURL(/\/sign-in\?next=/); }
  for (const route of ["review", "organize", "saved"]) { const response = await page.request.post(`/api/cv-review/${route}`, { data: {} }); expect(response.status()).toBe(401); }
  expect((await page.request.get("/api/cv-review/session")).status()).toBe(401);
});
test("signup without a verified session shows confirmation; recovery keeps its reset destination", async ({ page }) => {
  await page.goto("/sign-up"); await page.getByLabel("Email address").fill("synthetic@example.test"); await page.getByLabel("Password", { exact: true }).fill("synthetic password only"); await page.getByLabel("Confirm password").fill("synthetic password only");
  await expect(page.getByRole("button", { name: "Create your account" })).toBeEnabled(); await page.getByRole("button", { name: "Create your account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeFocused(); await expect(page).toHaveURL(/\/sign-up$/); await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
  await page.goto("/forgot-password"); await page.getByLabel("Email address").fill("synthetic@example.test"); const recovery = page.waitForRequest(r => new URL(r.url()).pathname === "/auth/v1/recover"); await expect(page.getByRole("button", { name: "Send reset link" })).toBeEnabled(); await page.getByRole("button", { name: "Send reset link" }).click(); expect(new URL((await recovery).url()).searchParams.get("redirect_to")).toContain("next=%2Freset-password");
});
test("landing → authentication → overview → profile → tailor → save → reopen/rename/export", async ({ page }) => {
  await login(page); await expect(page.getByRole("link", { name: "Add your first CV" })).toBeVisible();
  await page.screenshot({ path: "/tmp/opencode/auth-workspace-browser-results/overview-desktop.png", fullPage: true });
  await page.getByRole("link", { name: "Add your first CV" }).click(); await page.getByLabel("Original CV or experience").fill(source); await page.getByRole("button", { name: "Review text myself" }).click(); await page.getByRole("button", { name: "Use this profile" }).click(); await page.getByRole("button", { name: "Save profile", exact: true }).click(); await expect(page.getByText("Profile snapshot saved. Save again after further edits.")).toBeVisible();
  await page.getByRole("link", { name: "Continue to Tailor my CV" }).click(); await page.getByLabel("Job description (optional)").fill("Check invoices. SQL certification preferred.");
  await page.route("**/api/cv-review/review", async route => { const b = route.request().postDataJSON(); await route.fulfill({ json: { summary: ["Make wording consistent; keep the original facts."], suggestions: [{ blockId: "b3", original: "Checked invoices.", proposed: "Checked invoices!", reason: "Punctuation only", sourceIds: ["b3"], kind: "wording", question: "" }], mapping: [{ requirement: "SQL certification", experience: "", sourceIds: [], status: "not found" }], profileRevision: b.profile.revision, jd: b.jd, language: b.language } }); });
  await page.getByLabel("I agree to send this experience and optional job description to OpenAI.").check(); await page.getByRole("button", { name: "Propose improvements" }).click(); await page.getByRole("button", { name: "Accept", exact: true }).click();
  const expected = source.replace("Checked invoices.", "Checked invoices!"); await expect(page.getByTestId("final-cv")).toHaveText(expected); await expect(page.getByText("“Not found” means not found in the information supplied, not that you lack the skill.")).toBeVisible();
  await page.getByLabel("Version name", { exact: true }).fill("Accounts — Cedar"); await page.getByLabel("Target role (optional)").fill("Accounts assistant"); await page.getByLabel("Company (optional)").fill("Cedar"); await page.getByRole("button", { name: "Save named version" }).click(); await expect(page.getByText("CV version saved. Open it in My CVs.")).toBeVisible();
  await page.screenshot({ path: "/tmp/opencode/auth-workspace-browser-results/review-desktop.png", fullPage: true });
  await page.getByRole("link", { name: "My CVs", exact: true }).click(); await expect(page.getByText("Accounts assistant · Cedar")).toBeVisible(); await page.getByRole("link", { name: "Accounts — Cedar →" }).click();
  await expect(page.getByTestId("final-cv")).toHaveText(expected); await page.getByLabel("Version name", { exact: true }).fill("Renamed accounts CV"); await page.getByRole("button", { name: "Save changes" }).click(); await expect(page.getByText("Changes saved.")).toBeVisible();
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Download TXT (plain text)" }).click(); expect(await readFile((await (await download).path())!, "utf8")).toBe(expected);
  await page.getByRole("link", { name: "Start a new tailoring session" }).click(); await expect(page.getByLabel("Job description (optional)")).toHaveValue("");
  await page.goto("/"); await expect(page).toHaveURL(/\/$/); await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Go to workspace" })).toBeVisible();
});
test("mobile drawer keeps active navigation, keyboard focus and a JD without a profile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await login(page, "/app/tailor"); await page.getByLabel("Job description (optional)").fill("Synthetic operations JD");
  await page.getByRole("button", { name: "Open navigation" }).click(); const drawer = page.getByRole("dialog", { name: "Workspace navigation" }); await expect(drawer).toBeVisible(); await expect(drawer.getByRole("link", { name: "Tailor my CV" })).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Shift+Tab"); await expect(drawer.getByRole("button", { name: /Account menu for/ })).toBeFocused(); await page.keyboard.press("Tab"); await expect(drawer.getByRole("link", { name: "OwnPath home" })).toBeFocused();
  await page.screenshot({ path: "/tmp/opencode/auth-workspace-browser-results/drawer-mobile.png", fullPage: true });
  await page.keyboard.press("Escape"); await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused(); await page.getByRole("link", { name: "Add your experience" }).click(); await page.getByLabel("Original CV or experience").fill(source); await page.getByRole("button", { name: "Review text myself" }).click(); await page.getByRole("button", { name: "Use this profile" }).click(); await page.getByRole("link", { name: "Continue to Tailor my CV" }).click(); await expect(page.getByLabel("Job description (optional)")).toHaveValue("Synthetic operations JD");
  await page.getByRole("button", { name: "Keep original CV" }).click(); await expect(page.getByTestId("final-cv")).toHaveText(source); await page.screenshot({ path: "/tmp/opencode/auth-workspace-browser-results/tailor-mobile.png", fullPage: true }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({width:320,height:800}); await page.screenshot({path:"/tmp/opencode/auth-workspace-browser-results/tailor-320.png",fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test("database failure is not represented as an empty account", async ({ page }) => {
  await page.route("**/api/cv-review/saved", route => route.fulfill({ status: 503, json: { error: "Synthetic database unavailable" } })); await login(page); await expect(page.locator(".op-error[role=alert]")).toContainText("Synthetic database unavailable"); await expect(page.getByRole("link", { name: "Add your first CV" })).toHaveCount(0); await expect(page.getByText("No saved versions yet. Start with your experience profile.")).toHaveCount(0);
});
test("logout followed by another login does not reveal the first account's CVs or draft", async ({ page, request }) => {
  await login(page, "/app/profile"); await page.getByLabel("Original CV or experience").fill(source); await page.getByRole("button", { name: "Review text myself" }).click(); await page.getByRole("button", { name: "Use this profile" }).click(); await page.getByRole("link", { name: "Continue to Tailor my CV" }).click(); await page.getByRole("button", { name: "Keep original CV" }).click(); await page.getByLabel("Version name", { exact: true }).fill("Owner A private synthetic CV"); await page.getByRole("button", { name: "Save named version" }).click(); await expect(page.getByText("CV version saved. Open it in My CVs.")).toBeVisible();
  const saved = await (await page.request.get("/api/cv-review/saved")).json(); const id = saved.versions[0].id;
  await page.getByRole("button", { name: /Account menu for/ }).click(); await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeEnabled(); await page.getByRole("button", { name: "Sign out", exact: true }).click(); await expect(page).toHaveURL(/\/$/);
  await request.post(`${fixture}/__fixture/account`, { data: { id: "00000000-0000-4000-8000-000000000002", email: "other@example.test" } });
  await login(page); await expect(page.getByRole("link", { name: "Add your first CV" })).toBeVisible(); await expect(page.getByText("Owner A private synthetic CV")).toHaveCount(0); expect((await page.request.get(`/api/cv-review/saved?id=${id}`)).status()).toBe(404);
  await page.getByRole("link", { name: "Add your first CV" }).click(); await expect(page.getByLabel("Original CV or experience")).toHaveValue("");
});
test("an expired experience draft stays hidden until the same account is verified on the server", async ({ page, request }) => {
  await login(page, "/app/profile"); await page.getByLabel("Original CV or experience").fill(source); await page.getByRole("button", { name: "Review text myself" }).click(); await page.getByRole("button", { name: "Use this profile" }).click();
  await request.post(`${fixture}/__fixture/account`, { data: { expired: true } }); await page.getByRole("button", { name: "Save profile", exact: true }).click(); await expect(page.getByText(/Private content is hidden/)).toBeVisible(); await expect(page.getByLabel("Original CV or experience")).toHaveCount(0);
  await page.context().clearCookies(); await request.post(`${fixture}/__fixture/account`, { data: { expired: false } }); const authTab = await page.context().newPage(); await login(authTab);
  await page.getByRole("button", { name: "Verify account and resume" }).click(); await expect(page.getByLabel("Original CV or experience")).toHaveValue(source); await authTab.close();
});
