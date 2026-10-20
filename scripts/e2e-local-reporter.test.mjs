import { describe, expect, it, vi } from "vitest";
import SafeReporter from "../e2e/safe-reporter.ts";
describe("content-free browser reporting", () => {
  it("reports failure code/location without exposing error text, fixture data or paths", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const reporter = new SafeReporter();
      reporter.onStepBegin({}, {}, { category: "test.step", title: "OWNER_UPLOAD" });
      reporter.onTestEnd({}, { status: "failed", error: { message: "fictional-password-sentinel/private-proof-sentinel", stack: "private-path-sentinel\n at credential-flow.spec.ts:90:12" } });
      reporter.onError({ message: "private-token-sentinel" });
      const result = log.mock.calls.flat().join("\n");
      expect(result).toContain("OWNER_UPLOAD"); expect(result).toContain("spec line 90");
      for (const marker of ["fictional-password-sentinel", "private-proof-sentinel", "private-path-sentinel", "private-token-sentinel"]) expect(result).not.toContain(marker);
    } finally { log.mockRestore(); }
  });
  it("does not echo dynamic step titles and emits only fixed outcomes", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const reporter = new SafeReporter();
      reporter.onStepBegin({}, {}, { category: "test.step", title: "fictional CV text sentinel" });
      reporter.onTestEnd({}, { status: "failed", error: { message: "Error: CLEANUP_REQUIRED" } });
      reporter.onEnd({ status: "failed" });
      const result = log.mock.calls.flat().join("\n");
      expect(result).not.toContain("fictional CV text sentinel"); expect(result).toContain("CLEANUP_REQUIRED");
      expect(result).toContain("Screenshots/traces/videos disabled");
    } finally { log.mockRestore(); }
  });
  it("locates Translator failures and width steps without exposing assertion values", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const reporter = new SafeReporter();
      reporter.onStepBegin({}, {}, { category: "test.step", title: "ACCEPTED_TXT_375" });
      reporter.onTestEnd({}, { status: "failed", error: { message: "private-input-sentinel", stack: "/private/path/translator.spec.ts:74:9" } });
      const result = log.mock.calls.flat().join("\n");
      expect(result).toContain("ACCEPTED_TXT_375"); expect(result).toContain("spec line 74");
      expect(result).not.toContain("private-input-sentinel"); expect(result).not.toContain("/private/path/");
    } finally { log.mockRestore(); }
  });
});
