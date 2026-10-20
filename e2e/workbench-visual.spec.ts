import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";

const evidence = ".factory/evidence/OWNPATH-VISUAL-20261020/screenshots";
const cv = "Nguyễn An\nExperience\nSales assistant, Riverside Shop | 2023–2025\nHelped customers choose products.\nMaintained accurate stock records.\nMy manager negotiated supplier contracts, not me.\nEducation\nBusiness diploma, 2023\nSkills\nVietnamese, English";
const jd = "Help customers select products. Maintain accurate records. Supplier negotiation preferred.";
const scan = { coverage: "Focus on your customer-service experience and make your record-keeping responsibilities more specific. Supplier negotiation is preferred, but not demonstrated here.", findings: [
  { title: "Customer service grounded in your own experience", requirement: "Help customers select products.", excerpt: "Helped customers choose products.", explanation: "Your CV describes direct assistance with product selection. That is relevant to the supplied role because it involves helping customers make choices. It does not demonstrate negotiation or any measured sales outcomes; those would need your own evidence.", nextStep: "Keep this example and emphasize the service you provided.", group: "supported", priority: "important", expectation: "unspecified" },
  { title: "Make the scope of your record-keeping responsibilities clear, including the records you maintained and how you used them in your day-to-day work", requirement: "Maintain accurate records.", excerpt: "Maintained accurate stock records.", explanation: "The responsibility is present, but the detail is limited.", nextStep: "Describe the records and your own process if you can substantiate them.", group: "unclear", priority: "important", expectation: "unspecified" },
  { title: "Supplier negotiation is not shown as your responsibility", requirement: "Supplier negotiation preferred.", excerpt: "", explanation: "Your manager’s responsibility is not evidence of your own negotiation experience.", nextStep: "Keep the ownership clear. Add a personal example only if accurate.", group: "not_found", priority: "secondary", expectation: "preferred" },
] };
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator("main").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
}

for (const width of [1440, 1024, 390, 320]) test(`workbench states, keyboard and responsive surfaces at ${width}px`, async ({ page, request, context }) => {
  test.setTimeout(90000);
  await fs.mkdir(evidence, { recursive: true });
  await request.post("http://127.0.0.1:4387/__fixture/reset");
  await context.route("**/*", route => ["http://127.0.0.1:4386", "http://127.0.0.1:4387"].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
  await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/sign-in"); await page.getByLabel("Email address").fill("fictional@example.test"); await page.getByLabel("Password", { exact: true }).fill(crypto.randomUUID()); await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(/\/app$/);
  const capture = async (name: string, selector?: string) => {
    await noOverflow(page);
    // Keep an already off-screen, unfocused fixed skip link out of tall element captures.
    if (selector) await page.locator(selector).first().screenshot({ path: `${evidence}/${width}-${name}.png`, style: ".skip-link:not(:focus) { opacity: 0; }" });
    else { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: `${evidence}/${width}-${name}.png` }); }
  };
  await expect(page.getByLabel("Your CV", { exact: true })).toBeEnabled(); await capture("input-empty");
  if (width >= 1024) { const box = await page.getByRole("button", { name: "Scan CV", exact: true }).boundingBox(); expect(box!.y + box!.height).toBeLessThan(900); }
  await page.getByLabel("Your CV", { exact: true }).focus(); await page.keyboard.press("Tab"); await expect(page.getByLabel("Target job description", { exact: true })).toBeFocused();
  await page.getByLabel("Your CV", { exact: true }).fill(cv); await page.getByLabel("Target job description", { exact: true }).fill(jd); await page.getByRole("checkbox").check(); await capture("input-filled");
  await page.getByRole("button", { name: "Scan CV", exact: true }).click(); await expect(page.getByRole("alert").filter({ hasText: "AI is not configured" })).toBeVisible(); await capture("configuration-error", ".op-scan-tool");
  await page.route("**/api/cv-review/scan", route => route.fulfill({ status: 502, json: { error: "Connection interrupted. Your work is kept; retry." } })); await page.getByRole("button", { name: "Scan CV", exact: true }).click(); await expect(page.getByRole("alert").filter({ hasText: "Connection interrupted" })).toBeVisible(); await capture("recoverable-error", ".op-scan-action + .op-error");
  await page.unroute("**/api/cv-review/scan"); let finishScan!: () => void; const scanGate = new Promise<void>(resolve => { finishScan = resolve; });
  await page.route("**/api/cv-review/scan", async route => { await scanGate; await route.fulfill({ json: scan }); });
  await page.getByRole("button", { name: "Scan CV", exact: true }).click(); await expect(page.getByRole("button", { name: "Scanning…", exact: true })).toBeDisabled(); await capture("scan-loading", ".op-scan-action"); finishScan();
  await expect(page.getByRole("heading", { name: "Your scan", exact: true })).toBeVisible(); await capture("findings", ".op-analysis");
  await page.getByText("View source & detail", { exact: true }).first().click(); await expect(page.getByText("FROM YOUR CV", { exact: true }).first()).toBeVisible(); await expect(page.getByText(scan.findings[0].explanation, { exact: true })).toBeVisible(); await capture("source-detail", ".op-finding");
  await page.getByRole("button", { name: "Make it concise", exact: false }).click(); await expect(page.getByLabel("How should we improve it?")).toHaveValue("Keep it concise without removing important information.");
  await page.getByLabel("How should we improve it?").fill("Viết rõ ràng, giữ nguyên sự thật. Keep it concise and preserve the ownership of my manager’s work."); await capture("composer", ".op-composer");
  let finishRewrite!: () => void; const rewriteGate = new Promise<void>(resolve => { finishRewrite = resolve; }); let calls = 0;
  await page.route("**/api/cv-review/rewrite", async route => { calls++; await rewriteGate; await route.fulfill({ json: { replacements: [{ lineId: "b4", original: "Helped customers choose products.", text: "Assisted customers with product selection." }], changes: ["Clearer customer-service wording."], notes: ["Your manager’s responsibility was retained verbatim."] } }); });
  await page.getByRole("button", { name: "Rewrite CV", exact: true }).click(); await expect(page.getByRole("button", { name: "Rewriting…", exact: true })).toBeDisabled(); await capture("rewrite-loading", ".op-composer"); finishRewrite();
  await expect(page.getByRole("heading", { name: "Your CV draft", exact: true })).toBeVisible(); await capture("complete-cv", ".op-result");
  await page.locator(".op-editor-panel > summary").click(); const edited = cv.replace("Helped customers choose products.", "Hỗ trợ khách hàng lựa chọn sản phẩm."); await page.getByLabel("Complete CV text", { exact: true }).fill(edited); await expect(page.getByLabel("Formatted CV")).toContainText("Hỗ trợ khách hàng lựa chọn sản phẩm."); await capture("unsaved-edits", ".op-result"); expect(calls).toBe(1);
  await page.getByText("Save this CV (optional)", { exact: true }).click(); await page.getByLabel("Title", { exact: true }).fill("Dịch vụ khách hàng · Riverside — fictional application"); await page.getByRole("button", { name: "Save CV", exact: true }).click(); await expect(page.getByText("CV saved.", { exact: true })).toBeVisible(); await capture("saved-edits", ".op-save-panel");
  if (width < 761) {
    await page.getByRole("button", { name: "Open navigation" }).click(); const drawer = page.getByRole("dialog", { name: "Workspace navigation" }); await expect(drawer.getByRole("link", { name: "OwnPath home" })).toBeFocused(); await page.keyboard.press("Shift+Tab"); await expect(drawer.locator("a").last()).toBeFocused(); await page.keyboard.press("Tab"); await expect(drawer.getByRole("link", { name: "OwnPath home" })).toBeFocused(); await capture("navigation", ".op-sidebar"); await page.keyboard.press("Escape"); await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  }
  page.on("dialog", d => d.accept()); await page.goto("/app/cvs"); await expect(page.getByRole("link", { name: /Dịch vụ khách hàng.*→/ })).toBeVisible(); await capture("saved-list");
  // Supplied legacy metadata is displayed, never inferred from a JD or invented.
  await page.route("**/api/cv-review/saved", async route => { if (route.request().method() !== "GET") return route.continue(); await route.fulfill({ json: { profiles: [], versions: [{ id: "fictional-visual-row", name: "A long but real supplied title for a Vietnamese customer-service application", payload: { role: "Customer service assistant", company: "Fictional Riverside Shop" }, revision: 1, created_at: "2026-10-20T02:30:00Z", updated_at: "2026-10-20T03:40:00Z" }] } }); });
  await page.reload(); await expect(page.getByText("Customer service assistant · Fictional Riverside Shop")).toBeVisible(); await capture("saved-metadata");
  await page.unroute("**/api/cv-review/saved"); let finishList!: () => void; const listGate = new Promise<void>(resolve => { finishList = resolve; }); await page.route("**/api/cv-review/saved", async route => { await listGate; await route.fulfill({ json: { profiles: [], versions: [] } }); }); await page.reload(); await expect(page.getByText("Loading saved CVs…", { exact: true })).toBeVisible(); await capture("saved-loading"); finishList(); await expect(page.getByText("No saved CVs yet. Saving is optional.")).toBeVisible(); await capture("saved-empty");
  await page.unroute("**/api/cv-review/saved"); await page.route("**/api/cv-review/saved", route => route.fulfill({ status: 503, json: { error: "Saved work is unavailable. Your draft is kept; retry." } })); await page.reload(); await expect(page.getByRole("alert").filter({ hasText: "Saved work is unavailable" })).toBeVisible(); await capture("saved-error");
  await page.goto("/app/account"); await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeEnabled(); await capture("account");
  await page.goto("/app"); const longCV = cv + "\n" + Array.from({ length: 65 }, (_, i) => `Fictional record ${i}: Hỗ trợ khách hàng và duy trì hồ sơ chính xác, không tự nhận công việc của người quản lý.`).join("\n"); const longJD = jd + "\n" + "Detailed fictional job requirements. ".repeat(300); await page.getByLabel("Your CV", { exact: true }).fill(longCV); await page.getByLabel("Target job description", { exact: true }).fill(longJD); await expect(page.getByLabel("Your CV", { exact: true })).toHaveValue(longCV); await capture("long-inputs");
});
