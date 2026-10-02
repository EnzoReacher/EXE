import { describe, expect, it } from "vitest";
import { validateOpportunityCreate, validateOpportunityUpdate, validateOpportunityUrl } from "./validation";

describe("private opportunity validation", () => {
  it("accepts a user-provided HTTPS URL without fetching it", () => expect(validateOpportunityUrl("https://careers.example.test/jobs/fictional")).toBe("https://careers.example.test/jobs/fictional"));
  it.each(["http://example.test/job", "https://user:pass@example.test/job", "not a url", "ftp://example.test/job"])("rejects unsafe or malformed links", (url) => expect(() => validateOpportunityUrl(url)).toThrow());
  it("validates status and bounded optional text on create", () => expect(validateOpportunityCreate({ targetJobId: "fictional-job", sourceUrl: "https://example.test/job", companyName: "Fictional Co.", note: "Fictional note", status: "saved" })).toMatchObject({ status: "saved" }));
  it("rejects invalid statuses for creates and updates", () => { expect(() => validateOpportunityCreate({ targetJobId: "fictional-job", sourceUrl: "https://example.test/job", status: "recommended" })).toThrow(); expect(() => validateOpportunityUpdate({ status: "recommended" })).toThrow(); });
});
