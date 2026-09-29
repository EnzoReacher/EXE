import test from "node:test";
import assert from "node:assert/strict";
import { analyzeCvAgainstJob, extractRequirements, SAMPLE_CV, SAMPLE_JD } from "./analyzer.js";

test("extracts unique known requirements from a job description", () => {
  const requirements = extractRequirements(SAMPLE_JD).map((item) => item.name);
  assert.deepEqual(requirements, [
    "JavaScript",
    "TypeScript",
    "Node.js",
    "SQL / relational databases",
    "REST APIs",
    "Git / version control",
    "Unit testing",
    "Docker",
    "Communication",
    "Team collaboration",
  ]);
});

test("links a requirement to the CV text and distinguishes a listed skill", () => {
  const report = analyzeCvAgainstJob({ cvText: SAMPLE_CV, jobDescription: SAMPLE_JD, roleTitle: "Backend Intern" });
  const node = report.findings.find((item) => item.requirement === "Node.js");
  const docker = report.findings.find((item) => item.requirement === "Docker");
  const communication = report.findings.find((item) => item.requirement === "Communication");

  assert.equal(node.status, "evidence");
  assert.match(node.evidence, /Built a Node\.js/i);
  assert.equal(docker.status, "not-stated");
  assert.equal(communication.status, "listed");
});

test("does not infer ability from a requirement missing in the CV", () => {
  const report = analyzeCvAgainstJob({
    cvText: "Education: Information Technology student. Project: Built a portfolio website using HTML and CSS.",
    jobDescription: "Requirements: Experience with Python and SQL databases.",
    roleTitle: "Data Intern",
  });

  assert.equal(report.findings.find((item) => item.requirement === "Python").status, "not-stated");
  assert.equal(report.findings.find((item) => item.requirement === "SQL / relational databases").status, "not-stated");
  assert.ok(report.actions.every((action) => action.includes("Nếu")));
});

test("rejects short input and job descriptions without recognized skills", () => {
  assert.throws(
    () => analyzeCvAgainstJob({ cvText: "Too short", jobDescription: SAMPLE_JD, roleTitle: "Intern" }),
    /ít nhất 30 ký tự nội dung CV/,
  );
  assert.throws(
    () => analyzeCvAgainstJob({ cvText: SAMPLE_CV, jobDescription: "A friendly workplace with great benefits.", roleTitle: "Intern" }),
    /chưa nhận diện được kỹ năng phổ biến/,
  );
});

test("report contains no opaque fit score or hiring prediction", () => {
  const report = analyzeCvAgainstJob({ cvText: SAMPLE_CV, jobDescription: SAMPLE_JD, roleTitle: "Backend Intern" });
  assert.equal("score" in report, false);
  assert.equal("matchPercentage" in report, false);
  assert.equal("hireProbability" in report, false);
});
