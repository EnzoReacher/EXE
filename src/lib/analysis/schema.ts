import type { AnalysisFinding, EvidenceKind, FindingStatus } from "./types";

const statuses = new Set<FindingStatus>(["supported", "partly_supported", "unclear", "missing"]);
const evidenceKinds = new Set<EvidenceKind>(["cv_claim", "cv_example"]);
const exampleContext = /\b(?:project|internship|work experience|volunteer(?:ing)?|coursework|capstone|built|developed|implemented|created|designed|analy[sz]ed|managed|delivered|automated|deployed|led)\b/i;
const negativeClaim = /\b(?:not\s+(?:experienced|familiar|proficient|skilled|knowledgeable|able|used|worked|built|mentioned|demonstrated|shown|listed)|no\s+(?:[a-z0-9+#-]+\s+){0,4}(?:experience|knowledge|exposure|mention|evidence)|without\s+(?:experience|knowledge)|never\s+(?:used|worked|built)|(?:haven't|hasn't|hadn't)\s+(?:used|worked|built)|lack(?:s|ed|ing)?\s+[^.!?]{0,40}\b(?:experience|knowledge|skill)\b)\b/i;
const ignoredTerms = new Set(["a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "have", "in", "is", "of", "on", "or", "the", "their", "to", "with", "you", "your", "ability", "experience", "knowledge", "required", "requirements", "skill", "skills", "strong", "good", "excellent", "preferred", "proficient", "proficiency", "familiar", "familiarity"]);

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function evidenceCoverage(requirement: string, excerpt: string) {
  const terms = requirement.toLowerCase().match(/[a-z0-9]+(?:\+\+|#)?/g) ?? [];
  const relevantTerms = [...new Set(terms.filter((term) => term.length > 1 && !ignoredTerms.has(term)))];
  const selectedTerms = relevantTerms.length ? relevantTerms : [...new Set(terms.filter((term) => term.length > 1))];
  const found = selectedTerms.filter((term) => new RegExp("(^|[^a-z0-9])" + escapeRegex(term) + "(?=$|[^a-z0-9])", "i").test(excerpt));
  const phrasePattern = requirement.trim().split(/\s+/).map(escapeRegex).join("\\s+");
  const direct = new RegExp("(^|[^a-z0-9])(" + phrasePattern + ")(?=$|[^a-z0-9])", "i").test(excerpt);
  return { direct, matched: found.length, total: selectedTerms.length, ratio: selectedTerms.length ? found.length / selectedTerms.length : 0 };
}

export class AnalysisOutputError extends Error {
  constructor() {
    super("The analysis result could not be validated. Try again.");
    this.name = "AnalysisOutputError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, max: number) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

/** Validate provider output and refuse to render unsupported evidence claims. */
export function validateAnalysisOutput(output: unknown, requirements: string[], cvText: string): AnalysisFinding[] {
  if (!isRecord(output) || !Array.isArray(output.findings) || output.findings.length !== requirements.length) throw new AnalysisOutputError();

  return output.findings.map((rawFinding, index) => {
    if (!isRecord(rawFinding)) throw new AnalysisOutputError();
    const expectedRequirement = requirements[index];
    if (rawFinding.requirement !== expectedRequirement || !statuses.has(rawFinding.status as FindingStatus)) throw new AnalysisOutputError();
    if (!boundedString(rawFinding.rationale, 500) || !boundedString(rawFinding.caveat, 500)) throw new AnalysisOutputError();

    const rawExcerpt = rawFinding.evidenceExcerpt;
    const rawEvidenceKind = rawFinding.evidenceKind;
    const rawStart = rawFinding.sourceStart;
    const rawEnd = rawFinding.sourceEnd;
    const hasNoEvidence = rawExcerpt === null && rawStart === null && rawEnd === null && rawEvidenceKind === null;
    const validEvidence = typeof rawExcerpt === "string"
      && evidenceKinds.has(rawEvidenceKind as EvidenceKind)
      && rawExcerpt.length > 0
      && rawExcerpt.length <= 220
      && Number.isInteger(rawStart)
      && Number.isInteger(rawEnd)
      && (rawStart as number) >= 0
      && (rawEnd as number) > (rawStart as number)
      && (rawEnd as number) <= cvText.length
      && cvText.slice(rawStart as number, rawEnd as number) === rawExcerpt
      && evidenceCoverage(expectedRequirement, rawExcerpt).matched > 0;

    if (!hasNoEvidence && !validEvidence) {
      return {
        requirement: expectedRequirement,
        status: "unclear",
        evidenceKind: null,
        evidenceExcerpt: null,
        sourceStart: null,
        sourceEnd: null,
        rationale: "The analysis did not return a verifiable CV excerpt, so this finding is marked unclear.",
        caveat: "No claim is made without an excerpt that matches the saved CV text.",
      };
    }

    if (rawFinding.status === "missing" && validEvidence) {
      return {
        requirement: expectedRequirement,
        status: "unclear",
        evidenceKind: rawEvidenceKind as EvidenceKind,
        evidenceExcerpt: rawExcerpt as string,
        sourceStart: rawStart as number,
        sourceEnd: rawEnd as number,
        rationale: "The analysis returned both evidence and a missing label. Review this conflicting result.",
        caveat: "The inconsistent label was downgraded for your review.",
      };
    }

    if (rawFinding.status !== "missing" && !validEvidence) {
      return {
        requirement: expectedRequirement,
        status: "unclear",
        evidenceKind: null,
        evidenceExcerpt: null,
        sourceStart: null,
        sourceEnd: null,
        rationale: "No verifiable CV excerpt was returned, so this finding is marked unclear.",
        caveat: "The result has no traceable evidence and should not be treated as support.",
      };
    }

    let status = rawFinding.status as FindingStatus;
    let rationale = rawFinding.rationale as string;
    const coverage = validEvidence ? evidenceCoverage(expectedRequirement, rawExcerpt as string) : null;
    if (validEvidence && negativeClaim.test(rawExcerpt as string) && status !== "missing") {
      status = "unclear";
      rationale = "The quoted wording may contradict or limit this requirement. Review the excerpt before drawing a conclusion.";
    } else if (coverage && !coverage.direct && status === "supported" && coverage.ratio < 1) {
      status = coverage.ratio >= 0.5 ? "partly_supported" : "unclear";
      rationale = status === "partly_supported"
        ? "Some requirement terms appear in the excerpt, but it does not support the full wording."
        : "The excerpt mentions a related term but does not support the full requirement.";
    } else if (coverage && !coverage.direct && status === "partly_supported" && coverage.ratio < 0.5) {
      status = "unclear";
      rationale = "The excerpt mentions a related term but does not clearly support the requirement.";
    }

    return {
      requirement: expectedRequirement,
      status,
      evidenceKind: rawEvidenceKind === "cv_example" && !exampleContext.test(rawExcerpt as string) ? "cv_claim" : rawEvidenceKind as EvidenceKind | null,
      evidenceExcerpt: validEvidence ? rawExcerpt as string : null,
      sourceStart: validEvidence ? rawStart as number : null,
      sourceEnd: validEvidence ? rawEnd as number : null,
      rationale,
      caveat: rawFinding.caveat as string,
    };
  });
}
