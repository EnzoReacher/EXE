import { expect, it } from "vitest";
import { applicantNextStep } from "./applicant-guidance";
it("keeps applicant actions and safely replaces legacy recruiter instructions", () => {
  expect(applicantNextStep({ group: "supported", nextStep: "Keep your example concise." })).toBe("Keep your example concise.");
  expect(applicantNextStep({ group: "unclear", nextStep: "Ask the candidate about their project." })).toContain("if you have one");
  expect(applicantNextStep({ group: "supported", nextStep: "Probe whether the applicant did this." })).toContain("your own contribution");
});
