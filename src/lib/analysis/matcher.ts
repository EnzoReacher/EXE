import type { AnalysisFinding, FindingStatus } from "./types";

const stopWords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "good", "have", "in", "is", "it", "of", "on", "or", "our", "the", "their", "to", "with", "you", "your",
  "ability", "able", "applicant", "candidate", "demonstrated", "experience", "familiar", "familiarity", "good", "knowledge", "preferred", "proficient", "proficiency", "qualification", "qualifications", "required", "requirements", "skill", "skills", "strong", "years",
]);

const termPattern = /[a-z0-9]+(?:\+\+|#)?/gi;
const negativeClaim = /\b(?:not\s+(?:experienced|familiar|proficient|skilled|knowledgeable|able|used|worked|built|mentioned|demonstrated|shown|listed)|no\s+(?:[a-z0-9+#-]+\s+){0,4}(?:experience|knowledge|exposure|mention|evidence)|without\s+(?:experience|knowledge)|never\s+(?:used|worked|built)|(?:haven't|hasn't|hadn't)\s+(?:used|worked|built)|lack(?:s|ed|ing)?\s+[^.!?]{0,40}\b(?:experience|knowledge|skill)\b)\b/i;
const exampleContext = /\b(?:project|internship|work experience|volunteer(?:ing)?|coursework|capstone|built|developed|implemented|created|designed|analy[sz]ed|managed|delivered|automated|deployed|led)\b/i;

function contentTerms(value: string) {
  const tokens = value.toLowerCase().match(termPattern) ?? [];
  const filtered = [...new Set(tokens.filter((token) => token.length > 1 && !stopWords.has(token)))];
  return filtered.length ? filtered : [...new Set(tokens.filter((token) => token.length > 1))];
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findTermOccurrences(text: string, term: string) {
  const regex = new RegExp("(^|[^a-z0-9])" + escapeRegex(term) + "(?=$|[^a-z0-9])", "gi");
  const positions: number[] = [];
  for (const match of text.matchAll(regex)) positions.push((match.index ?? 0) + match[1].length);
  return positions;
}

function findDirectPhrase(text: string, phrase: string) {
  const expression = phrase.trim().split(/\s+/).map(escapeRegex).join("\\s+");
  const match = new RegExp("(^|[^a-z0-9])(" + expression + ")(?=$|[^a-z0-9])", "i").exec(text);
  if (!match) return null;
  return { index: (match.index ?? 0) + match[1].length, length: match[2].length };
}

function makeExcerpt(text: string, center: number, length = 220, requiredRange?: { start: number; end: number }) {
  let start = Math.max(0, center - Math.floor(length * 0.35));
  if (requiredRange && requiredRange.end - requiredRange.start <= length) {
    start = Math.max(0, Math.min(requiredRange.start, requiredRange.end - length));
  }
  let end = Math.min(text.length, start + length);
  if (end === text.length) start = Math.max(0, end - length);
  if (start > 0) {
    const nextSpace = text.indexOf(" ", start);
    if (nextSpace >= 0 && nextSpace < center) start = nextSpace + 1;
  }
  if (end < text.length) {
    const previousSpace = text.lastIndexOf(" ", end);
    if (previousSpace > center) end = previousSpace;
  }
  return { start, end, excerpt: text.slice(start, end) };
}

function sentenceAt(text: string, index: number) {
  let start = 0;
  let end = text.length;
  for (const separator of text.matchAll(/[.!?\n]+/g)) {
    const separatorStart = separator.index ?? 0;
    const separatorEnd = separatorStart + separator[0].length;
    if (separatorEnd <= index) start = separatorEnd;
    else if (separatorStart > index) { end = separatorStart; break; }
  }
  while (start < end && /\s/.test(text[start])) start += 1;
  while (end > start && /\s/.test(text[end - 1])) end -= 1;
  return { start, end, text: text.slice(start, end) };
}

function makeFinding(requirement: string, cvText: string): AnalysisFinding {
  const tokens = contentTerms(requirement);
  const directMatch = findDirectPhrase(cvText, requirement);
  const tokenPositions = tokens.flatMap((token) => findTermOccurrences(cvText, token).map((position) => ({ token, position })));

  if (!directMatch && tokenPositions.length === 0) {
    return {
      requirement,
      status: "missing",
      evidenceKind: null,
      evidenceExcerpt: null,
      sourceStart: null,
      sourceEnd: null,
      rationale: "No direct wording for this requirement was found in the extracted CV text.",
      caveat: "This is missing evidence in the CV, not proof that you lack the skill or experience.",
    };
  }

  const center = directMatch ? directMatch.index + Math.floor(directMatch.length / 2) : tokenPositions[0].position;
  const candidateSentences = (directMatch ? [directMatch.index] : tokenPositions.map(({ position }) => position))
    .map((position) => ({ position, sentence: sentenceAt(cvText, position) }));
  const bestSentence = candidateSentences.sort((a, b) => {
    const aCount = tokens.filter((token) => findTermOccurrences(a.sentence.text, token).length > 0).length;
    const bCount = tokens.filter((token) => findTermOccurrences(b.sentence.text, token).length > 0).length;
    return bCount - aCount || a.position - b.position;
  })[0].sentence;
  const excerpt = bestSentence.text.length <= 220
    ? { start: bestSentence.start, end: bestSentence.end, excerpt: bestSentence.text }
    : makeExcerpt(cvText, center, 220, directMatch ? { start: directMatch.index, end: directMatch.index + directMatch.length } : undefined);
  const coveredTokens = tokens.filter((token) => findTermOccurrences(excerpt.excerpt, token).length > 0);
  const coverage = tokens.length ? coveredTokens.length / tokens.length : 0;
  let status: FindingStatus;
  let rationale: string;

  if (negativeClaim.test(bestSentence.text)) {
    status = "unclear";
    rationale = "The nearby CV wording may contradict or limit this requirement. Review the quoted text before deciding what it means.";
  } else if (directMatch || (tokens.length > 0 && coveredTokens.length === tokens.length)) {
    status = "supported";
    rationale = directMatch ? "The requirement wording appears directly in the CV text." : "The key requirement terms appear together in this part of the CV.";
  } else if (coverage >= 0.5) {
    status = "partly_supported";
    rationale = "Some key terms appear in the CV text, but the full requirement is not clearly shown here.";
  } else {
    status = "unclear";
    rationale = "A related term appears, but the CV text does not clearly show the full requirement.";
  }

  return {
    requirement,
    status,
    evidenceKind: exampleContext.test(excerpt.excerpt) ? "cv_example" : "cv_claim",
    evidenceExcerpt: excerpt.excerpt,
    sourceStart: excerpt.start,
    sourceEnd: excerpt.end,
    rationale,
    caveat: "CV text is self-reported and is not independently verified. This local prototype checks wording, not proficiency.",
  };
}

export function matchRequirements(requirements: string[], cvText: string) {
  return requirements.map((requirement) => makeFinding(requirement, cvText));
}
