import { test, type BrowserContext, type Page } from "@playwright/test";
import { loopbackOrigin } from "../scripts/e2e-local-support.mjs";

type Fixtures = {
  run: string;
  actors: Array<{ id: string; email: string; password: string; label: string }>;
  authCandidate: { email: string; password: string };
};
const fixtures = JSON.parse(process.env.E2E_FIXTURES!) as Fixtures;
const app = loopbackOrigin(process.env.E2E_APP_URL!);
const supabase = loopbackOrigin(process.env.E2E_SUPABASE_URL!);
const GENERIC_AUTH_FAILURE = "We could not complete sign-in or account creation. Check your details and connection, then try again.";

function check(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}
async function noHorizontalOverflow(page: Page, prefix: string) {
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), prefix + "_OVERFLOW_AT_" + width);
  }
}
async function submitAndWait(page: Page, buttonName: string, expectedStatus: number) {
  const responsePromise = page.waitForResponse((response) =>
    response.url().startsWith(supabase + "/auth/v1/token")
      && response.request().method() === "POST",
  { timeout: 30000 });
  await page.getByRole("button", { name: buttonName, exact: true }).press("Enter");
  const response = await responsePromise;
  check(response.status() === expectedStatus, "AUTH_BACKEND_STATUS_" + response.status());
  return response;
}
async function privateWorkspace(page: Page, prefix: string) {
  const cv = await page.context().request.get(app + "/api/intake/cv", { maxRedirects: 0 });
  check(cv.status() === 200, prefix + "_CV_SESSION_NOT_AUTHORIZED");
  const cvs = await cv.json();
  check(Array.isArray(cvs.cvs) && cvs.cvs.length === 0, prefix + "_CV_WORKSPACE_NOT_EMPTY");
  const jobs = await page.context().request.get(app + "/api/intake/jobs", { maxRedirects: 0 });
  check(jobs.status() === 200, prefix + "_JOB_SESSION_NOT_AUTHORIZED");
  const savedJobs = await jobs.json();
  check(Array.isArray(savedJobs.jobs) && savedJobs.jobs.length === 0, prefix + "_JOB_WORKSPACE_NOT_EMPTY");
}
test("local landing and Supabase email/password account flow", async ({ browser }) => {
  check(fixtures.authCandidate?.email.endsWith("@example.invalid") && fixtures.authCandidate.password.length >= 8, "SYNTHETIC_AUTH_ACCOUNT_REQUIRED");
  const contexts: BrowserContext[] = [];
  let blockedRequests = 0;
  let pageErrors = 0;
  async function pageFor() {
    const context = await browser.newContext({ serviceWorkers: "block" });
    contexts.push(context);
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if ([app, supabase].includes(url.origin)) return route.continue();
      blockedRequests += 1;
      return route.abort();
    });
    await context.routeWebSocket("**/*", (socket) => {
      const url = new URL(socket.url());
      const origin = (url.protocol === "ws:" ? "http:" : "https:") + "//" + url.host;
      if ([app, supabase].includes(origin)) {
        socket.connectToServer();
        return;
      }
      blockedRequests += 1;
      socket.close();
    });
    const page = await context.newPage();
    page.on("pageerror", () => { pageErrors += 1; });
    return page;
  }
  try {
    const landing = await pageFor();
    await test.step("LANDING_NAVIGATION_AND_FICTIONAL_EXAMPLE", async () => {
      const response = await landing.goto("/");
      check(response?.ok(), "LANDING_PAGE_UNAVAILABLE");
      check(await landing.getByRole("heading", { name: "See how your CV connects to a target role." }).count() === 1, "LANDING_PRIMARY_HEADING_MISSING");
      check(await landing.getByText("FICTIONAL EXAMPLE", { exact: true }).isVisible(), "FICTIONAL_EXAMPLE_LABEL_MISSING");
      check(await landing.getByRole("link", { name: "Sign in", exact: true }).getAttribute("href") === "/sign-in", "SIGN_IN_LINK_MISSING");
      check(await landing.getByRole("link", { name: "Create account", exact: true }).first().getAttribute("href") === "/sign-up", "SIGN_UP_LINK_MISSING");
      await noHorizontalOverflow(landing, "LANDING");
      await landing.getByRole("link", { name: "Sign in", exact: true }).click();
      await landing.waitForURL((url) => url.pathname === "/sign-in");
      check(await landing.getByRole("heading", { name: "Welcome back", exact: true }).isVisible(), "SIGNIN_ROUTE_UNAVAILABLE");
      await noHorizontalOverflow(landing, "SIGNIN");
      await landing.goto("/");
      await landing.getByRole("link", { name: "Create account", exact: true }).first().click();
      await landing.waitForURL((url) => url.pathname === "/sign-up");
    });
    await test.step("SIGNUP_FORM_VALIDATION_AND_RESPONSIVE_LAYOUT", async () => {
      check(await landing.getByRole("heading", { name: "Create your account", exact: true }).isVisible(), "SIGNUP_HEADING_MISSING");
      await noHorizontalOverflow(landing, "SIGNUP");
      await landing.getByLabel("Email (required)").fill(fixtures.authCandidate.email);
      await landing.getByLabel("Password (required)").fill(fixtures.authCandidate.password);
      await landing.getByLabel("Confirm password (required)").fill(fixtures.authCandidate.password + "-different");
      await landing.getByRole("button", { name: "Create account", exact: true }).press("Enter");
      const mismatch = landing.getByRole("alert").filter({ hasText: "Enter the same password in both fields." });
      await mismatch.waitFor();
      check(await landing.getByLabel("Confirm password (required)").evaluate((element) => element === document.activeElement), "SIGNUP_MISMATCH_FOCUS_REQUIRED");
      check(await landing.getByLabel("Confirm password (required)").getAttribute("aria-invalid") === "true", "SIGNUP_MISMATCH_FIELD_NOT_MARKED");
    });
    await test.step("LOCAL_SUPABASE_SIGNUP_AND_PERSISTENT_SESSION", async () => {
      await landing.getByLabel("Confirm password (required)").fill(fixtures.authCandidate.password);
      const signupResponsePromise = landing.waitForResponse((response) =>
        response.url() === supabase + "/auth/v1/signup"
          && response.request().method() === "POST",
      { timeout: 30000 });
      await landing.getByRole("button", { name: "Create account", exact: true }).press("Enter");
      const signupResponse = await signupResponsePromise;
      check(signupResponse.ok(), "AUTH_SIGNUP_BACKEND_REJECTED");
      await landing.waitForURL((url) => url.pathname === "/assessment", { timeout: 30000 });
      await privateWorkspace(landing, "SIGNUP");
      await landing.reload();
      await privateWorkspace(landing, "SIGNUP_REFRESHED");
    });
    await test.step("GENERIC_INVALID_AUTH_ERRORS_AND_FRESH_SIGNIN", async () => {
      const signIn = await pageFor();
      await signIn.goto("/sign-in");
      await signIn.getByLabel("Email (required)").fill(fixtures.authCandidate.email);
      await signIn.getByLabel("Password (required)").fill(fixtures.authCandidate.password + "-wrong");
      await submitAndWait(signIn, "Sign in", 400);
      const knownFailure = signIn.getByRole("alert");
      await knownFailure.waitFor();
      check((await knownFailure.textContent())?.trim() === GENERIC_AUTH_FAILURE, "KNOWN_ACCOUNT_FAILURE_NOT_GENERIC");
      await signIn.getByLabel("Email (required)").fill(fixtures.run + "-missing@example.invalid");
      await signIn.getByLabel("Password (required)").fill(fixtures.authCandidate.password + "-wrong");
      await submitAndWait(signIn, "Sign in", 400);
      const unknownFailure = signIn.getByRole("alert");
      await unknownFailure.waitFor();
      check((await unknownFailure.textContent())?.trim() === GENERIC_AUTH_FAILURE, "UNKNOWN_ACCOUNT_FAILURE_NOT_GENERIC");
      await signIn.getByLabel("Email (required)").fill(fixtures.authCandidate.email);
      await signIn.getByLabel("Password (required)").fill(fixtures.authCandidate.password);
      await submitAndWait(signIn, "Sign in", 200);
      await signIn.waitForURL((url) => url.pathname === "/assessment", { timeout: 30000 });
      await privateWorkspace(signIn, "SIGNIN");
      await signIn.reload();
      await privateWorkspace(signIn, "SIGNIN_REFRESHED");
    });
    await test.step("ANONYMOUS_PRIVATE_WORKSPACE_DENIAL", async () => {
      const anonymous = await pageFor();
      await anonymous.goto("/sign-in");
      const response = await anonymous.context().request.get(app + "/api/intake/cv", { maxRedirects: 0 });
      check(response.status() === 401, "ANONYMOUS_CV_ACCESS_NOT_DENIED");
      const jobs = await anonymous.context().request.get(app + "/api/intake/jobs", { maxRedirects: 0 });
      check(jobs.status() === 401, "ANONYMOUS_JOB_ACCESS_NOT_DENIED");
    });
    await test.step("AUTH_NO_EXTERNAL_REQUESTS_OR_PAGE_ERRORS", async () => {
      check(blockedRequests === 0, "NONLOCAL_BROWSER_REQUEST_BLOCKED");
      check(pageErrors === 0, "AUTH_PAGE_ERROR");
    });
  } finally {
    for (const context of contexts) await context.close();
  }
});
