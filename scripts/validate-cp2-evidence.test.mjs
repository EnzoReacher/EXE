import { describe, expect, it } from "vitest";
import { validateEvidenceMarkdown } from "./validate-cp2-evidence.mjs";

const headers = "| Evidence ID | Evidence type | Date collected | Participant/source category | Anonymized summary | Related hypothesis | Signal | Confidence notes / limitations | Action or decision triggered | Owner review status | Source URL | Source date |\n|---|---|---|---|---|---|---|---|---|---|---|---|";
const exampleRow = "| Example only — not collected evidence (`TU-000`) | Example target-user interview placeholder | Not collected | Example category only | Example placeholder. | Example hypothesis | Not classified | No evidence; template example only. | None. | Not reviewed |  |  |";
const validRow = "| TU-001 | Target-user interview | 2026-10-02 | Active job seeker, broad stage withheld | Participant described uncertainty comparing a fictional CV with a fictional job description. | Users understand their match and gaps | neutral | One anonymized interview; not representative. | Review with team. | Owner reviewed 2026-10-02 |  |  |";
const register = (...rows) => `# CP2 Evidence Register\n\n${headers}\n${rows.join("\n")}`;

describe("CP2 evidence validator", () => {
  it("accepts a blank template", () => {
    const result = validateEvidenceMarkdown(register(), "template");
    expect(result.code).toBe(0);
    expect(result.messages.join(" ")).toContain("CP2 evidence pending");
  });

  it("accepts explicitly labelled example-only rows in template mode", () => {
    expect(validateEvidenceMarkdown(register(exampleRow), "template").code).toBe(0);
  });

  it("rejects collected mode when it has no actual evidence", () => {
    expect(validateEvidenceMarkdown(register(exampleRow), "collected").code).toBe(1);
  });

  it("accepts structurally complete anonymized collected evidence without treating it as market proof", () => {
    const result = validateEvidenceMarkdown(register(exampleRow, validRow), "collected");
    expect(result.code).toBe(0);
    expect(result.messages.join(" ")).toContain("does not establish research quality");
  });

  it("rejects missing required fields", () => {
    expect(validateEvidenceMarkdown(register(validRow.replace("Target-user interview", "")), "collected").code).toBe(1);
  });

  it("rejects missing dates", () => {
    expect(validateEvidenceMarkdown(register(validRow.replace("2026-10-02", "Not collected")), "collected").code).toBe(1);
  });

  it("rejects a missing owner review status", () => {
    expect(validateEvidenceMarkdown(register(validRow.replace("Owner reviewed 2026-10-02", "")), "collected").code).toBe(1);
  });

  it("rejects unsupported product claims", () => {
    expect(validateEvidenceMarkdown(register(validRow.replace("uncertainty", "validated demand")), "collected").code).toBe(1);
  });

  it("fails safely for email or phone patterns", () => {
    const email = validateEvidenceMarkdown(register(validRow.replace("broad stage withheld", "name@example.test")), "collected");
    const phone = validateEvidenceMarkdown(register(validRow.replace("broad stage withheld", "+1 555 123 4567")), "collected");
    expect(email.code).toBe(2);
    expect(phone.code).toBe(2);
  });

  it("rejects invalid signal values", () => {
    expect(validateEvidenceMarkdown(register(validRow.replace("| neutral |", "| promising |")), "collected").code).toBe(1);
  });

  it("requires source metadata for competitor or pricing evidence", () => {
    const competitor = validRow.replace("TU-001", "CM-001").replace("Target-user interview", "Competitor pricing source");
    expect(validateEvidenceMarkdown(register(competitor), "collected").code).toBe(1);
  });
});
