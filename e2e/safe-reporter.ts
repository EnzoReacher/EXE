import type { Reporter, TestCase, TestResult, TestStep, FullResult } from "@playwright/test/reporter";
export default class SafeReporter implements Reporter {
  private phase = "browser startup";
  onStepBegin(_test: TestCase, _result: TestResult, step: TestStep) {
    if (step.category === "test.step" && /^[A-Z0-9_]+$/.test(step.title)) this.phase = step.title;
  }
  onStepEnd(_test: TestCase, _result: TestResult, step: TestStep) {
    if (step.category === "test.step" && /^[A-Z0-9_]+$/.test(step.title)) console.log(`Browser step ${step.title}: ${step.error ? "FAIL" : "PASS"}.`);
  }
  onTestEnd(_test: TestCase, result: TestResult) {
    for (const error of result.errors ?? []) {
      const safe = error.message?.match(/^(?:Error: )?([A-Z0-9_]+)(?:\n|$)/)?.[1];
      if (safe) console.log(`Browser assertion code: ${safe}.`);
    }
    const code = result.error?.message?.match(/^(?:Error: )?([A-Z0-9_]+)(?:\n|$)/)?.[1]
      ?? (result.error?.message?.includes("Test timeout") ? "TEST_TIMEOUT"
        : result.error?.message?.includes("strict mode violation") ? "LOCATOR_MATCHES_MULTIPLE_ELEMENTS"
        : result.error?.message?.includes("apiRequestContext.get") ? "API_REQUEST_FAILURE"
        : result.error?.message?.includes("locator.waitFor") ? "ELEMENT_WAIT_FAILURE"
        : result.error?.message?.includes("page.goto") ? "NAVIGATION_FAILURE" : "ASSERTION_OR_TIMEOUT");
    const locations = [...(result.error?.stack ?? "").matchAll(/(?:credential-flow|proof-preview|workspace-ui|auth-flow|core-flow)\.spec\.ts:(\d+):(\d+)/g)];
    const lines = [...new Set(locations.map((item) => item[1]))].slice(0, 4).join(", ");
    console.log(result.status === "passed" ? "Synthetic browser checks: PASS." : `Synthetic browser failure during ${this.phase}: ${code}${lines ? ` (spec lines ${lines})` : ""}.`);
  }
  onError(error: { message?: string; stack?: string }) {
    const message = error.message ?? "";
    const categories = ["Cannot find module", "Cannot find package", "No tests found", "SyntaxError", "ReferenceError", "TypeError", "Unexpected token", "is not defined", "is not a function", "Named export", "RUN_ONLY_THROUGH", "LOOPBACK", "JSON", "test()", "import", "require"].filter((word) => message.includes(word)).map((word) => word.replace(/[^A-Za-z0-9]/g, "_").toUpperCase());
    const location = error.stack?.match(/(credential-flow|proof-preview|workspace-ui|auth-flow|core-flow)\.spec\.ts:(\d+):(\d+)/);
    const packages = ["docx", "mammoth", "@playwright/test", "supabase", "server-only"].filter((name) => message.includes(name)).map((name) => name.replace(/[^A-Za-z0-9]/g, "_").toUpperCase());
    console.log(`Browser runner/configuration error: ${categories.join("_") || "UNCLASSIFIED"}${packages.length ? "_PACKAGE_" + packages.join("_") : ""}${location ? "_" + location[1].replaceAll("-", "_").toUpperCase() + "_LINE_" + location[2] : ""}; no private details emitted.`);
  }
  onEnd(result: FullResult) { console.log(`Browser suite result: ${result.status}. Screenshots/traces/videos disabled.`); }
  printsToStdio() { return true; }
}
