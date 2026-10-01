const requirementHeadings = /^(requirements?|qualifications?|what you(?:'|’)ll bring|what you(?:'|’)ll need|what we(?:'|’)re looking for|skills(?: and experience)?|you have|your background)(?:\s*[:：])?$/i;
const endHeadings = /^(responsibilities|what you(?:'|’)ll do|about (?:the )?(?:role|company|team)|benefits|nice to have|preferred qualifications?)(?:\s*[:：])?$/i;
const requirementCues = /\b(?:required|must have|must be|need(?:ed)?|experience with|proficien(?:t|cy) in|knowledge of|familiar(?:ity)? with|ability to|skills? in|qualifications?)\b/i;

function cleanCandidate(value: string) {
  return value
    .replace(/^\s*(?:[-*•‣▪◦]+|\d+[.)])\s*/, "")
    .replace(/^\s*(?:requirements?|qualifications?|skills?)\s*[:：]\s*/i, "")
    .replace(/^\s*(?:and|or)\s+/i, "")
    .replace(/^[\s,;:–—-]+|[\s,;:–—-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitCandidate(value: string) {
  const segments = value.split(/[;\n•‣▪◦]+/).flatMap((segment) => segment.split(/\s*,\s*/));
  return segments.flatMap((segment) => segment.split(/\s+(?:and|or)\s+/i)).map(cleanCandidate);
}

function canonicalize(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9+#]+/g, " ").trim().replace(/\s+/g, " ");
}

/**
 * A conservative, local-only extractor for the M2 prototype. It prioritizes
 * explicitly labeled requirement sections and bullet lists. It does not infer
 * requirements from arbitrary prose when no requirement cue is present.
 */
export function extractRequirements(jobDescription: string, limit = 12) {
  const lines = jobDescription.replace(/\r\n?/g, "\n").split("\n");
  const normalizedLines = lines.map((rawLine) => ({ rawLine, line: rawLine.trim().replace(/^\*\*(.*?)\*\*:?$/, "$1").trim() }));
  const hasRequirementsSection = normalizedLines.some(({ line }) => {
    const heading = line.match(/^([^:：]{2,50})\s*[:：]\s*(.+)$/)?.[1]?.trim() ?? line;
    return requirementHeadings.test(heading);
  });
  let inRequirementSection = false;
  const candidates: string[] = [];

  for (const { rawLine, line } of normalizedLines) {
    if (!line) continue;

    const headingAndContent = line.match(/^([^:：]{2,50})\s*[:：]\s*(.+)$/);
    const heading = headingAndContent?.[1]?.trim() ?? line;
    const contentAfterHeading = headingAndContent?.[2];

    if (requirementHeadings.test(heading)) {
      inRequirementSection = true;
      if (contentAfterHeading) candidates.push(...splitCandidate(contentAfterHeading));
      continue;
    }
    if (endHeadings.test(heading)) {
      inRequirementSection = false;
      continue;
    }

    const isBullet = /^\s*(?:[-*•‣▪◦]+|\d+[.)])\s+/.test(rawLine);
    if (inRequirementSection || (!hasRequirementsSection && isBullet)) {
      candidates.push(...splitCandidate(line));
      continue;
    }

    if (!hasRequirementsSection && requirementCues.test(line)) {
      const cueMatch = line.match(/(?:required|must have|must be|need(?:ed)?|experience with|proficien(?:t|cy) in|knowledge of|familiar(?:ity)? with|ability to|skills? in|qualifications?)\s*[:：]?\s+(.+)/i);
      if (cueMatch?.[1]) candidates.push(...splitCandidate(cueMatch[1]));
    }
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const candidate of candidates) {
    if (candidate.length < 2 || candidate.length > 220) continue;
    const key = canonicalize(candidate);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
    if (result.length >= limit) break;
  }
  return result;
}
