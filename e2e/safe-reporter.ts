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
        : result.error?.message?.includes("apiRequestContext.get") ? "API_REQUEST_FAILURE"
        : result.error?.message?.includes("locator.waitFor") ? "ELEMENT_WAIT_FAILURE"
        : result.error?.message?.includes("page.goto") ? "NAVIGATION_FAILURE" : "ASSERTION_OR_TIMEOUT");
    const locations = [...(result.error?.stack ?? "").matchAll(/(?:credential-flow|proof-preview|workspace-ui|auth-flow)\.spec\.ts:(\d+):(\d+)/g)];
    const line = locations.at(-1)?.[1];
    console.log(result.status === "passed" ? "Synthetic browser checks: PASS." : `Synthetic browser failure during ${this.phase}: ${code}${line ? ` (spec line ${line})` : ""}.`);
  }
  onError() { console.log("Browser runner/configuration error; no private details emitted."); }
  onEnd(result: FullResult) { console.log(`Browser suite result: ${result.status}. Screenshots/traces/videos disabled.`); }
  printsToStdio() { return true; }
}
