import { test, type BrowserContext, type Page, type Locator } from "@playwright/test";
import { Document, Packer, Paragraph } from "docx";
import { extractRawText } from "mammoth";
import { randomUUID } from "node:crypto";
import { inflateRawSync } from "node:zlib";

function packageText(bytes: Buffer) {
  const end = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let offset = bytes.readUInt32LE(end + 16); const parts = [];
  while (bytes.readUInt32LE(offset) === 0x02014b50) {
    const method = bytes.readUInt16LE(offset + 10); const size = bytes.readUInt32LE(offset + 20);
    const name = bytes.readUInt16LE(offset + 28); const extra = bytes.readUInt16LE(offset + 30); const comment = bytes.readUInt16LE(offset + 32);
    const local = bytes.readUInt32LE(offset + 42); const start = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28);
    const raw = bytes.subarray(start, start + size); parts.push((method === 8 ? inflateRawSync(raw) : raw).toString());
    offset += 46 + name + extra + comment;
  }
  return parts.join("\n");
}

type Actor = { label: string; id: string; email: string; password: string; profile?: string; name?: string };
const fixtures = JSON.parse(process.env.E2E_FIXTURES!) as { run: string; actors: Actor[] };
const app = process.env.E2E_APP_URL!; const supabase = process.env.E2E_SUPABASE_URL!;
function check(condition: unknown, code: string): asserts condition { if (!condition) throw new Error(code); }
async function keyClick(locator: Locator) { await locator.focus(); await locator.press("Enter"); }
async function type(locator: Locator, value: string) { await locator.focus(); await locator.press("ControlOrMeta+A"); await locator.pressSequentially(value); }
async function select(locator: Locator, value: string) {
  const index = await locator.evaluate((element, wanted) => [...(element as HTMLSelectElement).options].findIndex((option) => option.value === wanted), value);
  check(index >= 0, "NAMED_SELECT_OPTION_REQUIRED");
  await locator.focus(); await locator.press("Home");
  for (let count = 0; count < index; count++) await locator.press("ArrowDown");
  await locator.press("Enter"); check(await locator.inputValue() === value, "KEYBOARD_SELECT_REQUIRED");
}
async function signedIn(page: Page, actor: Actor) {
  await page.goto("/sign-in");
  await type(page.getByLabel("Email (required)"), actor.email);
  await type(page.getByLabel("Password (required)"), actor.password);
  const authenticated = page.waitForResponse((response) => response.url().startsWith(supabase + "/auth/v1/token") && response.request().method() === "POST");
  await keyClick(page.getByRole("button", { name: "Sign in", exact: true }));
  check((await authenticated).ok(), "CREDENTIAL_AUTH_REJECTED");
  await page.waitForURL((url) => url.pathname === "/assessment");
  await page.getByRole("heading", { name: "Save a CV and target job privately." }).waitFor();
  check(await page.getByRole("form", { name: "Sign in", exact: true }).count() === 0, "CREDENTIAL_SIGNIN_UI_REMAINED");
  check((await page.context().request.get("/api/intake/cv", { maxRedirects: 0 })).ok(), "CREDENTIAL_COOKIE_HANDOFF_FAILED");
}
async function json(page: Page, path: string) {
  const response = await page.context().request.get(path, { maxRedirects: 0 });
  check(response.ok(), "PRIVATE_WORKSPACE_READ_FAILED"); return response.json();
}
async function noOverflow(page: Page) {
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `OVERFLOW_AT_${width}`);
    for (const button of await page.getByRole("button").all()) {
      if (!await button.isVisible()) continue;
      const bounds = await button.boundingBox();
      check(bounds && bounds.width > 0 && bounds.x >= 0 && bounds.x + bounds.width <= width + 1, `ACTION_BOUNDS_AT_${width}`);
    }
  }
}
async function focused(locator: Locator) {
  await locator.focus();
  check(await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return element === document.activeElement && ((style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== "none");
  }), "PRIMARY_ACTION_VISIBLE_FOCUS_REQUIRED");
}
async function downloaded(page: Page, button: Locator) {
  const pending = page.waitForEvent("download"); await keyClick(button);
  const download = await pending; const stream = await download.createReadStream(); check(stream, "DOWNLOAD_STREAM_REQUIRED");
  check(/^[a-zA-Z0-9._-]+$/.test(download.suggestedFilename()), "SAFE_ATTACHMENT_FILENAME_REQUIRED");
  const buffers = []; for await (const chunk of stream) buffers.push(Buffer.from(chunk));
  const bytes = Buffer.concat(buffers); await download.delete(); return bytes;
}
test("synthetic local credential approval, acceptance, exports and denial boundaries", async ({ browser }) => {
  const contexts: BrowserContext[] = []; let pageErrors = 0; let forbiddenNetwork = 0; let pageErrorCode = "UNKNOWN";
  async function pageFor(actor?: Actor) {
    const context = await browser.newContext({ baseURL: app, acceptDownloads: true, serviceWorkers: "block", viewport: { width: 1440, height: 900 } });
    context.setDefaultTimeout(20000); context.setDefaultNavigationTimeout(60000);
    contexts.push(context);
    context.on("page", (page) => page.on("pageerror", (error) => {
      pageErrors++;
      const name = /^[A-Za-z][A-Za-z0-9]*Error$/.test(error.name) && error.name.length < 60 ? error.name.toUpperCase() : "UNKNOWN";
      const location = error.stack?.match(/(workspace|assessment-form|auth-controls|export-controls)\.tsx:(\d+)/);
      const categories = ["lock", "abort", "chunk", "timeout", "signal", "websocket", "fetch", "module", "invariant", "hydration", "localstorage", "sessionstorage", "sandbox", "origin", "frame", "opener", "history"].filter((word) => error.message.toLowerCase().includes(word)).map((word) => word.toUpperCase()).join("_");
      const pathname = new URL(page.url()).pathname;
      const scope = pathname.endsWith("/print") ? "PRINT" : pathname.includes("/evidence/") ? "PROOF" : pathname.startsWith("/assessment") ? "ASSESSMENT" : "WORKSPACE";
      pageErrorCode = `${scope}_${name}_${categories || "UNCLASSIFIED"}${location ? `_${location[1].replaceAll("-", "_").toUpperCase()}_${location[2]}` : ""}`;
    }));
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if ([app, supabase].includes(url.origin)) return route.continue();
      forbiddenNetwork++; return route.abort();
    });
    await context.routeWebSocket("**/*", (socket) => {
      const url = new URL(socket.url());
      if (url.origin.replace(/^ws/, "http") === app) socket.connectToServer(); else { forbiddenNetwork++; socket.close(); }
    });
    const page = await context.newPage();
    if (actor) await signedIn(page, actor);
    return page;
  }
  const owner = fixtures.actors.find((actor) => actor.label === "owner")!;
  const expert = fixtures.actors.find((actor) => actor.label === "expert")!;
  const ordinary = fixtures.actors.find((actor) => actor.label === "ordinary")!;
  const unassigned = fixtures.actors.find((actor) => actor.label === "unassigned")!;
  const skill = `Synthetic SQL ${"s".repeat(60)}`;
  const wording = `Synthetic SQL coursework with ${"w".repeat(180)} from submitted synthetic proof.`;
  const proofName = `synthetic-proof-${"p".repeat(70)}.png`;
  let ownerPage!: Page; let claimId = ""; let versionId = "";
  try {
    await test.step("OWNER_SIGN_IN_AND_SYNTHETIC_UPLOADS", async () => {
      ownerPage = await test.step("OWNER_REAL_SIGN_IN", () => pageFor(owner));
      await test.step("OWNER_WORKSPACE_OPEN", async () => {
        const navigation = await ownerPage.goto("/credential-versions");
        check(navigation?.ok(), `OWNER_PAGE_HTTP_${navigation?.status() ?? 0}`);
        const status = await ownerPage.context().request.get("/api/credential-versions", { maxRedirects: 0 });
        check(status.ok(), `OWNER_WORKSPACE_HTTP_${status.status()}`);
        check(pageErrors === 0, `OWNER_OPEN_PAGE_ERROR_${pageErrorCode}`);
        try { await ownerPage.getByRole("button", { name: "Save draft claim" }).waitFor(); }
        catch {
          const text = await ownerPage.evaluate(() => document.body?.innerText ?? "");
          const state = text.includes("Sign in from the assessment") ? "SIGN_IN_REQUIRED" : text.includes("Loading private workspace") ? "STILL_LOADING" : text.includes("could not be loaded") ? "INVALID_WORKSPACE" : text.includes("private action is unavailable") ? "ACTION_UNAVAILABLE" : "OTHER";
          throw new Error(`OWNER_RENDER_${state}_PAGE_ERRORS_${pageErrors}`);
        }
      });
      await test.step("OWNER_FORM_VALIDATION", async () => {
        await focused(ownerPage.getByRole("button", { name: "Save draft claim" }));
        await keyClick(ownerPage.getByRole("button", { name: "Save draft claim" }));
        await ownerPage.locator("#claim-error[role=alert]").waitFor();
        check(await ownerPage.getByLabel("Source CV (required)").evaluate((element) => element === document.activeElement), "FIRST_INVALID_FIELD_FOCUS_REQUIRED");
        check(!(await json(ownerPage, "/api/credential-versions")).claims.length, "INVALID_FORM_MUST_NOT_SAVE");
      });
      await test.step("OWNER_CV_UPLOAD", async () => {
        const cv = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph("Synthetic local browser CV. Existing coursework only.")] }] }));
        await ownerPage.getByLabel("CV file (required)").setInputFiles({ name: `synthetic-cv-${"c".repeat(70)}.docx`, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: cv });
        const uploaded = ownerPage.waitForResponse((response) => response.url() === `${app}/api/intake/cv` && response.request().method() === "POST");
        await keyClick(ownerPage.getByRole("button", { name: "Upload CV privately", exact: true }));
        const uploadResponse = await uploaded;
        check(uploadResponse.ok(), `CV_UPLOAD_HTTP_${uploadResponse.status()}`);
        const uploadedData = await uploadResponse.json();
        check(uploadedData.cv?.processingStatus === "ready", "CV_PARSING_NOT_READY");
        await ownerPage.getByText("Private document saved.", { exact: false }).waitFor();
      });
      await test.step("OWNER_PROOF_UPLOAD", async () => {
        const proof = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lJ8AAAAASUVORK5CYII=", "base64");
        await ownerPage.getByLabel("credential file (required)").setInputFiles({ name: proofName, mimeType: "image/png", buffer: proof });
        await keyClick(ownerPage.getByRole("button", { name: "Upload credential privately" }));
        await ownerPage.getByRole("button", { name: `Withdraw and delete ${proofName}` }).waitFor();
      });
      await test.step("OWNER_CLAIM_DRAFT_CREATION", async () => {
        const data = await json(ownerPage, "/api/credential-versions");
        check(data.cvs.length === 1 && data.credentials.length === 1, "SYNTHETIC_UPLOADS_REQUIRED");
        await select(ownerPage.getByLabel("Source CV (required)"), data.cvs[0].id);
        await select(ownerPage.getByLabel("Certificate or degree (required)"), data.credentials[0].id);
        await select(ownerPage.getByLabel("Team-approved expert (required)"), expert.profile!);
        await type(ownerPage.getByLabel("Skill label (2–80 characters)"), skill);
        await type(ownerPage.getByLabel("Exact proposed CV wording (2–300 characters)"), wording);
        await keyClick(ownerPage.getByRole("button", { name: "Save draft claim" }));
        await ownerPage.getByRole("button", { name: `Submit ${skill} for expert review` }).waitFor();
      });
      await test.step("OWNER_CLAIM_SUBMIT_REQUEST", async () => {
        const submittedResponse = ownerPage.waitForResponse((response) => response.url() === `${app}/api/credential-versions` && response.request().method() === "POST");
        await keyClick(ownerPage.getByRole("button", { name: `Submit ${skill} for expert review` }));
        const response = await submittedResponse;
        check(response.ok(), `CLAIM_SUBMIT_HTTP_${response.status()}`);
      });
      await test.step("OWNER_CLAIM_SUBMITTED_STATE", async () => {
        const claimCard = ownerPage.locator("article.opportunity-card").filter({ has: ownerPage.getByRole("heading", { name: skill, exact: true }) });
        try { await claimCard.locator("p").filter({ hasText: /^Waiting for expert$/ }).waitFor(); }
        catch {
          const response = await ownerPage.context().request.get("/api/credential-versions", { maxRedirects: 0 });
          if (!response.ok()) throw new Error(`CLAIM_REFRESH_HTTP_${response.status()}`);
          const data = await response.json();
          const claim = data.claims?.find((item: { skill?: string }) => item.skill === skill);
          const state = typeof claim?.state === "string" && /^[a-z_]+$/.test(claim.state) ? claim.state.toUpperCase() : "MISSING";
          throw new Error(`CLAIM_REFRESH_STATE_${state}_UI_LABEL_MISSING`);
        }
      });
      await test.step("OWNER_CLAIM_SERVER_STATE", async () => {
        const submitted = await json(ownerPage, "/api/credential-versions"); claimId = submitted.claims[0].id;
        check(submitted.claims[0].state === "submitted" && submitted.versions.length === 0, "SUBMISSION_MUST_NOT_ADD_VERSION");
        check(await ownerPage.getByRole("button", { name: /Download editable DOCX/ }).count() === 0, "PENDING_MUST_NOT_EXPORT");
      });
      await test.step("OWNER_WORKSPACE_RESPONSIVE_LAYOUT", () => noOverflow(ownerPage));
    });
    await test.step("NONEXPERT_UNASSIGNED_AND_ANONYMOUS_DENIALS", async () => {
      const ordinaryPage = await pageFor(ordinary); await ordinaryPage.goto("/expert/credential-reviews");
      await ordinaryPage.getByText("This private review workspace is unavailable.").waitFor();
      const outsider = await pageFor(unassigned); await outsider.goto("/expert/credential-reviews");
      await outsider.getByText("No submitted claims assigned to you.").waitFor();
      for (const page of [ordinaryPage, outsider]) {
        check((await page.context().request.get(`/api/expert/credential-reviews?claim=${claimId}`, { maxRedirects: 0 })).status() === 403, "UNASSIGNED_CLAIM_DENIED");
        check((await page.context().request.get(`/api/credential-versions/evidence/${claimId}?kind=credential`, { maxRedirects: 0 })).status() === 403, "UNASSIGNED_PROOF_DENIED");
        check((await page.context().request.get(`/api/credential-versions/evidence/${claimId}?kind=credential&preview=1`, { maxRedirects: 0 })).status() === 403, "UNASSIGNED_PROOF_VIEW_DENIED");
        check((await page.context().request.post("/api/expert/credential-reviews", { data: { id: claimId, decision: "approved", note: "Synthetic forbidden decision", proofReviewed: true }, maxRedirects: 0 })).status() === 403, "NONASSIGNED_DECISION_DENIED");
      }
      const anonymous = await pageFor();
      for (const path of ["/api/credential-versions", "/api/expert/credential-reviews", `/api/credential-versions/evidence/${claimId}`]) {
        check((await anonymous.context().request.get(path, { maxRedirects: 0 })).status() === 401, "ANONYMOUS_PRIVATE_ROUTE_DENIED");
      }
    });
    await test.step("ASSIGNED_SYNTHETIC_EXPERT_REVIEW", async () => {
      const page = await pageFor(expert); await page.goto("/expert/credential-reviews");
      await page.getByRole("button", { name: `Review ${skill}` }).waitFor();
      check((await json(page, "/api/expert/credential-reviews")).length === 1, "ASSIGNED_QUEUE_ONLY");
      await keyClick(page.getByRole("button", { name: `Review ${skill}` }));
      await page.getByRole("button", { name: "Save expert decision" }).waitFor();
      await noOverflow(page);
      const proofLink = page.getByRole("link", { name: "View assigned private proof (opens a new tab)" });
      check(await proofLink.getAttribute("target") === "_blank", "PRIVATE_PROOF_NEW_TAB_LINK_REQUIRED");
      // Script-free proof document in a script-disabled context. App contexts
      // still block service workers; their injected blocking shim is not
      // compatible with opaque sandbox origins. Reuse genuine fixture cookies.
      const proofContext = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: "allow" }); contexts.push(proofContext);
      await proofContext.addCookies(await page.context().cookies());
      await proofContext.route("**/*", (route) => { if (new URL(route.request().url()).origin === app) return route.continue(); forbiddenNetwork++; return route.abort(); });
      const proofView = await proofContext.newPage(); proofView.on("pageerror", () => { pageErrors++; });
      const proofResponse = await proofView.goto(new URL((await proofLink.getAttribute("href"))!, app).href);
      check(proofResponse?.headers()["content-security-policy"]?.startsWith("sandbox;"), "PRIVATE_PROOF_SANDBOX_REQUIRED");
      await proofView.getByRole("heading", { name: "Private proof view", exact: true }).waitFor();
      await proofView.waitForFunction(() => { const image = document.querySelector("img"); return image?.complete && image.naturalWidth > 0; });
      await noOverflow(proofView); await proofView.close();
      const proofBytes = await downloaded(page, page.getByRole("link", { name: "Download assigned private proof", exact: true }));
      check(proofBytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "SYNTHETIC_PROOF_BYTES_REQUIRED");
      const evidence = await page.context().request.get(`/api/credential-versions/evidence/${claimId}?kind=credential`, { maxRedirects: 0 });
      check(evidence.ok() && evidence.headers()["content-type"] === "image/png", "ASSIGNED_PRIVATE_PROOF_ACCESS_REQUIRED");
      await type(page.getByLabel("Explanation (2–1,000 characters)"), "Automated synthetic fixture decision only; no human expert approval.");
      await select(page.getByLabel("Expert decision", { exact: true }), "approved");
      const checkbox = page.getByRole("checkbox"); await checkbox.focus(); await checkbox.press("Space");
      await focused(page.getByRole("button", { name: "Save expert decision" })); await keyClick(page.getByRole("button", { name: "Save expert decision" }));
      await page.getByText("Expert decision saved.", { exact: false }).waitFor();
      await noOverflow(page);
      await ownerPage.reload(); await ownerPage.getByRole("button", { name: `Create candidate for ${skill}` }).waitFor();
      check((await json(ownerPage, "/api/credential-versions")).versions.length === 0, "EXPERT_APPROVAL_NOT_OWNER_ACCEPTANCE");
    });
    await test.step("CANDIDATE_EXPORT_DENIAL_AND_OWNER_ACCEPTANCE", async () => {
      await keyClick(ownerPage.getByRole("button", { name: `Create candidate for ${skill}` }));
      await ownerPage.getByText("Accept this candidate before downloading or printing it.").waitFor();
      const data = await json(ownerPage, "/api/credential-versions"); versionId = data.versions[0].id;
      check(data.versions[0].state === "candidate" && !data.versions[0].acceptedAt, "CANDIDATE_NOT_ACCEPTED");
      for (const path of [`/api/credential-versions/${versionId}/export`, `/credential-versions/${versionId}/print`]) {
        check((await ownerPage.context().request.get(path, { maxRedirects: 0 })).status() === 404, "CANDIDATE_EXPORT_DENIED");
      }
      await keyClick(ownerPage.getByRole("button", { name: "Review version 1" }));
      await ownerPage.getByRole("button", { name: "Accept candidate after review" }).waitFor();
      await keyClick(ownerPage.getByRole("button", { name: "Accept candidate after review" }));
      await keyClick(ownerPage.getByRole("button", { name: "Confirm action" }));
      await ownerPage.getByRole("button", { name: "Download editable DOCX — version 1" }).waitFor();
      await noOverflow(ownerPage);
    });
    await test.step("DOCX_TXT_PRINT_AND_PRIVATE_METADATA_EXCLUSION", async () => {
      const saved = await json(ownerPage, `/api/credential-versions?version=${versionId}`);
      check(saved.content.endsWith(wording), "EXACT_APPROVED_WORDING_REQUIRED");
      const docx = await downloaded(ownerPage, ownerPage.getByRole("button", { name: "Download editable DOCX — version 1" }));
      const text = (await extractRawText({ buffer: docx })).value;
      const metadata = packageText(docx);
      check(text.replace(/\s+/g, " ").trim() === saved.content.replace(/\s+/g, " ").trim(), "DOCX_SNAPSHOT_CLAIMS_MUST_MATCH");
      const txt = (await downloaded(ownerPage, ownerPage.getByRole("button", { name: "Download TXT — version 1" }))).toString("utf8");
      check(txt === saved.content, "TXT_EXACT_SNAPSHOT_REQUIRED");
      for (const value of [owner.id, expert.id, expert.name!, proofName, "storage_path", "credential-private", "Automated synthetic fixture decision", ...fixtures.actors.map((actor) => actor.password), ...(await ownerPage.context().cookies()).map((cookie) => cookie.value)]) {
        check(!metadata.includes(value) && !text.includes(value) && !txt.includes(value), "PRIVATE_METADATA_MUST_NOT_EXPORT");
      }
      const popupPromise = ownerPage.waitForEvent("popup");
      await keyClick(ownerPage.getByRole("link", { name: "Print / Save as PDF — version 1 (opens a new tab)" }));
      const print = await popupPromise;
      await print.getByRole("button", { name: "Print / Save as PDF", exact: true }).waitFor();
      check(await print.locator("main pre").textContent() === saved.content, "PRINT_EXACT_SNAPSHOT_REQUIRED");
      await focused(print.getByRole("button", { name: "Print / Save as PDF", exact: true }));
      await noOverflow(print);
      const other = await pageFor(ordinary);
      const missing = await other.context().request.get(`/api/credential-versions/${randomUUID()}/export`, { maxRedirects: 0 });
      const cross = await other.context().request.get(`/api/credential-versions/${versionId}/export`, { maxRedirects: 0 });
      check(cross.status() === 404 && await cross.text() === await missing.text(), "CROSS_OWNER_NEUTRAL_EXPORT_REQUIRED");
      const missingPrint = await other.context().request.get(`/credential-versions/${randomUUID()}/print`, { maxRedirects: 0 });
      const crossPrint = await other.context().request.get(`/credential-versions/${versionId}/print`, { maxRedirects: 0 });
      check(crossPrint.status() === 404 && await crossPrint.text() === await missingPrint.text(), "CROSS_OWNER_NEUTRAL_PRINT_REQUIRED");
      const anonymous = await pageFor();
      for (const path of [`/api/credential-versions/${versionId}/export`, `/credential-versions/${versionId}/print`]) check((await anonymous.context().request.get(path, { maxRedirects: 0 })).status() === 401, "ANONYMOUS_EXPORT_PRINT_DENIED");
    });
    await test.step("WITHDRAWAL_AND_STALE_EXPORT_DENIAL", async () => {
      const stale = await ownerPage.context().newPage(); await stale.goto("/credential-versions");
      await stale.getByRole("button", { name: "Download editable DOCX — version 1" }).waitFor();
      await keyClick(ownerPage.getByRole("button", { name: `Withdraw and delete ${proofName}` }));
      await keyClick(ownerPage.getByRole("button", { name: "Confirm action" }));
      await ownerPage.getByText("Export is unavailable because supporting evidence was withdrawn.").waitFor();
      check((await ownerPage.context().request.get(`/api/credential-versions/evidence/${claimId}?kind=credential&preview=1`, { maxRedirects: 0 })).status() === 403, "WITHDRAWN_PROOF_VIEW_DENIED");
      for (const path of [`/api/credential-versions/${versionId}/export`, `/credential-versions/${versionId}/print`]) check((await ownerPage.context().request.get(path, { maxRedirects: 0 })).status() === 404, "WITHDRAWN_EXPORT_DENIED");
      await keyClick(stale.getByRole("button", { name: "Download editable DOCX — version 1" }));
      await stale.getByRole("alert").filter({ hasText: "This accepted CV export is unavailable." }).waitFor();
      await noOverflow(ownerPage);
      check(pageErrors === 0, `UNCAUGHT_BROWSER_PAGE_ERROR_${pageErrorCode}`); check(forbiddenNetwork === 0, "NONLOCAL_BROWSER_REQUEST_ATTEMPT");
    });
  } finally { for (const context of contexts) await context.close(); }
});
