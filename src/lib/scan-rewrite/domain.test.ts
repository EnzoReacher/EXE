import { describe, expect, it } from "vitest";
import { completeCV, input, parseRewrite, parseScan } from "./domain";
import { examples } from "@/lib/cv-review/examples";
const jd = "Clear communication required. Supplier negotiation preferred.";
describe("Scan and Rewrite contracts", () => {
  it.each(Object.entries(examples))("preserves complete %s content with controlled wording only", (_, cv) => {
    const original = cv.split("\n")[3];
    const response = { replacements: [{ lineId: "b4", original, text: original + " " }], changes: ["Spacing"], notes: [] };
    expect(completeCV(cv, parseRewrite(response, cv))).toBe(cv.replace(original, original + " "));
    expect(parseScan({ coverage: "Selected requirements only.", findings: [{ title: "Negotiation", requirement: "Supplier negotiation preferred.", excerpt: "", explanation: "Not demonstrated here; this is not a proven skill gap.", nextStep: "Add an example only if it reflects your own work.", priority: "secondary", expectation: "preferred", group: "not_found" }] }, { cv, jd }).findings[0].group).toBe("not_found");
  });
  it("rejects blank and oversized inputs without truncating", () => {
    expect(() => input({ cv: "", jd })).toThrow(); expect(() => input({ cv: "a".repeat(24001), jd })).toThrow(); expect(() => input({ cv: "CV", jd: "x".repeat(18001) })).toThrow();
  });
  it("rejects forged excerpts, JD references and malformed nested fields", () => {
    const f = { title: "Communication", requirement: "Clear communication required.", excerpt: "Helped customers.", explanation: "The source describes helping customers.", nextStep: "Keep this example.", priority: "important", expectation: "required", group: "supported" };
    for (const finding of [null, { ...f, excerpt: "Invented source" }, { ...f, requirement: "Not in JD" }, { ...f, group: "not_found" }]) expect(() => parseScan({ coverage: "Partial", findings: [finding] }, { cv: "Name\nHelped customers.", jd })).toThrow();
  });
  it("rejects duplicated lines, changed numbers, private lines and placeholders", () => {
    const base = "Nguyễn An\na@example.test\nChecked 12 invoices.";
    const r = { lineId: "b3", original: "Checked 12 invoices.", text: "Reviewed 12 invoices." };
    for (const replacements of [[r, r], [{ ...r, text: "Reviewed 20 invoices." }], [{ ...r, lineId: "b2", original: "a@example.test" }], [{ ...r, text: "Checked 12 invoices for [insert company]." }], [null]]) expect(() => parseRewrite({ replacements, changes: [], notes: [] }, base)).toThrow();
  });
  it.each(["My manager negotiated supplier contracts, not me.", "I did not approve payments.", "Alex built the reminders.", "Dates of volunteering: unsure"])("retains explicit attribution, negation and uncertainty: %s", original => {
    const base = `Nguyễn An\n${original}`;
    expect(() => parseRewrite({ replacements: [{ lineId: "b2", original, text: "I led the work." }], changes: [], notes: [] }, base)).toThrow();
    expect(() => parseScan({ coverage: "One requirement", findings: [{ title: "Leadership", requirement: "Leadership", excerpt: original, explanation: "Claim", nextStep: "Use", priority: "important", expectation: "required", group: "supported" }] }, { cv: base, jd: "Leadership" })).toThrow();
  });
});
