import { test, type BrowserContext, type Page } from "@playwright/test";
import { Document, Packer, Paragraph } from "docx";
import { loopbackOrigin } from "../scripts/e2e-local-support.mjs";

const fixtures = JSON.parse(process.env.E2E_FIXTURES!) as { actors: Array<{ label: string; email: string; password: string }> };
const app = loopbackOrigin(process.env.E2E_APP_URL!);
const supabase = loopbackOrigin(process.env.E2E_SUPABASE_URL!);
function check(value: unknown, code: string): asserts value { if (!value) throw new Error(code); }
async function json(page: Page, path: string) { const result = await page.context().request.get(path); check(result.ok(), "CORE_API_READ_FAILED"); return result.json(); }

test("complete private CV job report roadmap review and opportunity journey", async ({ browser }) => {
  const contexts: BrowserContext[] = [];
  let blocked = 0; let pageErrors = 0;
  async function pageFor(label?: string) {
    const context = await browser.newContext({ serviceWorkers: "block" }); contexts.push(context);
    await context.route("**/*", (route) => { if ([app, supabase].includes(new URL(route.request().url()).origin)) return route.continue(); blocked++; return route.abort(); });
    await context.routeWebSocket("**/*", (socket) => { if (new URL(socket.url()).origin.replace(/^ws/, "http") === app) socket.connectToServer(); else { blocked++; socket.close(); } });
    const page = await context.newPage(); page.on("pageerror", () => { pageErrors++; });
    page.setDefaultTimeout(30000); page.setDefaultNavigationTimeout(60000);
    if (label) {
      const actor = fixtures.actors.find((item) => item.label === label)!;
      await page.goto("/sign-in"); await page.getByLabel("Email (required)").fill(actor.email); await page.getByLabel("Password (required)").fill(actor.password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click(); await page.waitForURL("**/assessment");
      await page.getByRole("button", { name: "Reload workspace" }).waitFor({ state: "visible" });
    }
    return page;
  }
  try {
    const page = await pageFor("unassigned"); let runId = ""; let jobId = ""; let cvId = "";
    await test.step("CORE_PRIVATE_INTAKE_AND_ANALYSIS", async () => {
      const buffer = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph("Fictional student. Completed a SQL coursework project using SQL queries. Built a dashboard for fictional coursework.")] }] }));
      await page.getByLabel("CV file (required)").setInputFiles({ name: "m15-fictional-core.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer });
      await page.getByLabel("Target role (required)").fill("M15 fictional analyst");
      await page.getByLabel("Job description (required)").fill("Requirements:\n- SQL queries\n- Python programming\n- Dashboard development");
      await page.getByRole("button", { name: "Save CV and target job", exact: true }).click();
      await page.getByText("Your target job was saved. Choose a processed CV below to create a report.").waitFor();
      cvId = await page.getByLabel("Saved CV for report").inputValue(); jobId = await page.getByLabel("Saved target job for report").inputValue(); check(cvId && jobId, "CORE_SAVED_SELECTIONS_REQUIRED");
      await page.getByRole("button", { name: "Create evidence report" }).click();
      await page.waitForURL(/\/analysis\/[a-f0-9-]+$/); runId = new URL(page.url()).pathname.split("/").pop()!;
      await page.getByRole("heading", { name: "Requirements and CV evidence" }).waitFor();
      const { details } = await json(page, `/api/analysis/${runId}`); check(details.run.status === "completed" && details.findings.length > 0, "CORE_ANALYSIS_COMPLETED");
      check(details.findings.some((item: { status: string }) => item.status === "missing"), "CORE_DOCUMENT_GAP_REQUIRED");
    });
    await test.step("CORE_ATOMIC_ROADMAP_DRAFT_AND_ACCEPTANCE", async () => {
      await page.getByRole("link", { name: "Open next steps" }).click();
      await page.getByRole("button", { name: "Create my roadmap and draft" }).click();
      await page.getByRole("heading", { name: "Review your source-grounded draft" }).waitFor();
      const before = (await json(page, `/api/analysis/${runId}/next-steps`)).details;
      check(before.roadmapItems.length > 0 && before.draft.claims.length > 0, "CORE_ROADMAP_AND_PROVENANCE_REQUIRED");
      const repeat = await page.context().request.post(`/api/analysis/${runId}/next-steps`); check(repeat.ok(), "CORE_RETRY_SUCCEEDS");
      check((await repeat.json()).details.draft.id === before.draft.id, "CORE_RETRY_SAME_DRAFT");
      await page.getByLabel(`Progress for ${before.roadmapItems[0].requirement}`).selectOption("completed");
      await page.getByRole("button", { name: "Accept after review" }).click();
      await page.getByText("You accepted this draft. It remains private and editable.").waitFor();
      check((await json(page, `/api/analysis/${runId}/next-steps`)).details.draft.acceptedAt, "CORE_ACCEPTANCE_PERSISTED");
    });
    await test.step("CORE_REVIEW_FEEDBACK_AND_REVOCATION", async () => {
      await page.goto(`/analysis/${runId}`);
      await page.getByLabel("Include my accepted CV draft").check();
      await page.getByRole("button", { name: "Create private review link", exact: true }).click();
      const field = page.getByLabel("Copy your new private review URL"); await field.waitFor(); const url = await field.inputValue();
      check(new URL(url).origin === app, "CORE_REVIEW_LOCAL_URL_REQUIRED");
      const reviewer = await pageFor(); await reviewer.goto(url);
      await reviewer.getByLabel(/Feedback \(required\)/).fill("Fictional feedback: the source excerpts are clear.");
      await reviewer.getByRole("button", { name: "Submit feedback", exact: true }).click();
      await reviewer.getByText("Thank you. Your feedback was shared with the report owner.").waitFor();
      await page.reload(); await page.getByText("Fictional feedback: the source excerpts are clear.").waitFor();
      await page.getByRole("button", { name: /Revoke link created/ }).click();
      await page.getByText("Revoked link", { exact: true }).waitFor(); await reviewer.reload();
      check((await reviewer.context().request.get(`/api/review/${new URL(url).pathname.split("/").pop()}`)).status() === 404, "CORE_REVOKED_REVIEW_DENIED");
    });
    await test.step("CORE_OPPORTUNITY_TRACKER_AND_PRIVATE_ISOLATION", async () => {
      await page.getByRole("link", { name: "Opportunities", exact: true }).click();
      await page.getByLabel("Saved target job (required)").selectOption(jobId);
      await page.getByLabel("HTTPS job link (required)").fill("https://careers.example.invalid/fictional-opportunity");
      await page.getByRole("button", { name: "Save privately", exact: true }).click();
      await page.getByText("Your private opportunity was saved.").waitFor();
      const other = await pageFor("ordinary");
      for (const path of [`/api/analysis/${runId}`, `/api/intake/jobs/${jobId}`]) check((await other.context().request.get(path)).status() === 404, "CORE_CROSS_OWNER_DENIED");
      const stranger = await pageFor(); check((await stranger.context().request.delete(`/api/intake/jobs/${jobId}`)).status() === 401, "CORE_ANONYMOUS_DELETE_DENIED");
    });
    await test.step("CORE_JOB_COPY_CASCADE_DELETE_RESPONSIVE_AND_SIGNOUT", async () => {
      await page.goto("/assessment"); await page.getByRole("button", { name: "Copy target job M15 fictional analyst" }).click();
      await page.getByText("Edit these details and save a new target job. Existing reports keep their original job.").waitFor();
      check((await page.getByLabel("Job description (required)").inputValue()).includes("Python"), "CORE_JOB_COPY_DETAILS_REQUIRED");
      await page.waitForFunction(() => document.activeElement === document.getElementById("role-title"));
      for (const width of [320, 375, 768, 1024, 1440]) { await page.setViewportSize({ width, height: 900 }); check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "CORE_WORKSPACE_OVERFLOW"); }
      page.once("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: "Delete target job M15 fictional analyst" }).click();
      await page.getByText(/The target job and its related reports/).waitFor();
      check((await page.context().request.get(`/api/analysis/${runId}`)).status() === 404, "CORE_JOB_DELETE_CASCADES_REPORT");
      check((await json(page, "/api/intake/cv")).cvs.some((item: { id: string }) => item.id === cvId), "CORE_JOB_DELETE_RETAINS_CV");
      check(!(await json(page, "/api/opportunities")).items.some((item: { targetJobId: string }) => item.targetJobId === jobId), "CORE_JOB_DELETE_CASCADES_OPPORTUNITIES");
      check((await page.context().request.delete(`/api/intake/cv/${cvId}`)).status() === 204, "CORE_FIXTURE_CV_CLEANUP");
      await page.getByRole("button", { name: "Sign out", exact: true }).click(); await page.waitForURL("**/sign-in");
      check((await page.context().request.get("/api/intake/cv")).status() === 401, "CORE_SIGNOUT_SESSION_DENIED");
      check(blocked === 0 && pageErrors === 0, "CORE_BROWSER_ERROR_OR_EXTERNAL_REQUEST");
    });
  } finally { for (const context of contexts) await context.close(); }
});
