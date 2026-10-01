import { describe, expect, it } from "vitest";
import { analyzeCvAgainstJob, extractRequirements } from "./analyzer";
import { SAMPLE_CV, SAMPLE_JD, SAMPLE_ROLE } from "./fixtures";

describe("CV-to-JD analyzer", () => {
  it("extracts unique known requirements from a job description", () => {
    expect(extractRequirements(SAMPLE_JD).map((requirement) => requirement.name)).toEqual([
      "JavaScript",
      "TypeScript",
      "Node.js",
      "React",
      "SQL / relational databases",
      "REST APIs",
      "Git / version control",
      "Unit testing",
      "Docker",
      "Communication",
      "Team collaboration",
    ]);
  });

  it("classifies all four evidence states and keeps exact excerpts", () => {
    const report = analyzeCvAgainstJob({ cvText: SAMPLE_CV, jobDescription: SAMPLE_JD, roleTitle: SAMPLE_ROLE });
    const finding = (name: string) => report.findings.find((item) => item.requirement === name);

    expect(finding("Node.js")).toMatchObject({ status: "supported" });
    expect(finding("Node.js")?.evidence).toMatch(/Built a Node\.js/i);
    expect(finding("Docker")).toMatchObject({ status: "partial" });
    expect(finding("Communication")).toMatchObject({ status: "unclear" });
    expect(finding("React")).toMatchObject({ status: "missing", evidence: null });
    expect(report.summary).toEqual({ supported: 7, partial: 1, unclear: 1, missing: 2, total: 11 });
  });

  it("selects stronger project evidence even when a skill list appears first", () => {
    const report = analyzeCvAgainstJob({
      cvText: "SKILLS\nTypeScript\n\nPROJECTS\nBuilt a TypeScript service that validates event registrations.",
      jobDescription: "We need TypeScript experience for a junior developer role.",
      roleTitle: "Junior Developer",
    });

    expect(report.findings[0]).toMatchObject({
      requirement: "TypeScript",
      status: "supported",
      evidence: "Built a TypeScript service that validates event registrations.",
    });
  });

  it("does not infer ability from text missing in the CV", () => {
    const report = analyzeCvAgainstJob({
      cvText: "Education: Information Technology student. Project: Built a portfolio website using HTML and CSS.",
      jobDescription: "Requirements: Experience with Python and SQL databases.",
      roleTitle: "Data Intern",
    });

    expect(report.findings.find((item) => item.requirement === "Python")?.status).toBe("missing");
    expect(report.findings.find((item) => item.requirement === "SQL / relational databases")?.status).toBe("missing");
    expect(report.actions.every((action) => action.includes("Chưa thấy"))).toBe(true);
  });

  it("rejects incomplete inputs and unsupported job-description wording", () => {
    expect(() => analyzeCvAgainstJob({ cvText: "Too short", jobDescription: SAMPLE_JD, roleTitle: "Intern" })).toThrow(
      /ít nhất 30 ký tự nội dung CV/,
    );
    expect(() =>
      analyzeCvAgainstJob({ cvText: SAMPLE_CV, jobDescription: "A friendly workplace with great benefits.", roleTitle: "Intern" }),
    ).toThrow(/chưa nhận diện được kỹ năng phổ biến/);
  });

  it("does not expose an opaque fit score or hiring prediction", () => {
    const report = analyzeCvAgainstJob({ cvText: SAMPLE_CV, jobDescription: SAMPLE_JD, roleTitle: SAMPLE_ROLE });
    expect(report).not.toHaveProperty("score");
    expect(report).not.toHaveProperty("matchPercentage");
    expect(report).not.toHaveProperty("hireProbability");
  });
});
