// Offline fixture helper only. Not imported by application code.
type FixtureFinding = { title: string; explanation: string; nextStep: string; priority: string; expectation: string; group: string; excerptSourceId?: string };
export function selectedScan(scan: { coverage: string; findings: FixtureFinding[] }) {
  return { coverage: scan.coverage, findings: scan.findings.map(({ title, explanation, nextStep, priority, expectation, group, excerptSourceId }) => ({ title, explanation, nextStep, priority, expectation, group, excerptSourceId, requirementSourceId: "jd:r1" })) };
}
