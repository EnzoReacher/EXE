import { describe, expect, it } from "vitest";
import { extractRequirements } from "./requirements";

describe("local requirement extraction", () => {
  it("extracts a short list from labeled job sections and skips the next section", () => {
    const jobDescription = [
      "Data Analyst Intern",
      "Requirements: SQL, Python, and Excel",
      "- Clear communication",
      "Responsibilities:",
      "- Build weekly dashboards",
    ].join("\n");
    expect(extractRequirements(jobDescription)).toEqual(["SQL", "Python", "Excel", "Clear communication"]);
  });

  it("does not invent requirements from general prose without a clear cue", () => {
    expect(extractRequirements("Join our friendly team and help us grow. We offer mentorship and flexible hours.")).toEqual([]);
  });

  it("does not mistake responsibilities above a requirements heading for requirements", () => {
    const description = "Responsibilities:\n- Build dashboards\nRequirements:\n- SQL";
    expect(extractRequirements(description)).toEqual(["SQL"]);
  });
});
