// Existing hard runtime limits. Provider output now contains only proposed line
// edits. Source originals and presentation metadata are supplied by the server.
export const rewriteLimits = {
  replacements: 500, lineId: 20, original: 24000, text: 6000,
  changes: 8, change: 500, notes: 8, note: 700, document: 24000,
} as const;
export const rewriteStringSchema = (max: number) => ({ type: "string", description: `Non-blank string, at most ${max} UTF-16 code units. Never an object, array or null.` });
export const rewriteArraySchema = (items: Record<string, unknown>, max: number) => ({ type: "array", items, description: `Required array of 0 to ${max} items. Use [] when there is nothing to report.` });
export const rewriteReviewNotes = {
  general: "Review every factual claim against your source CV before using it.",
  protected: "Existing negation, uncertainty and third-party attribution were retained.",
  unchanged: "No source lines were changed.",
} as const;
export const rewriteOutputInstructions = `Return exactly one object with the required replacements array. Each entry has exactly lineId and text. NEVER return original, changes, notes or document. Select lineId from the supplied CURRENT base IDs; the server looks up the untouched original itself. Do not echo, paraphrase or reconstruct source text as an original field. Return 0 to ${rewriteLimits.replacements} edits, at most one per ID. text must be a non-blank string at most ${rewriteLimits.text} UTF-16 code units. Emit only safe genuinely changed lines; omit unchanged/protected lines. All other source lines are retained automatically. Preserve all original numbers, dates, employers, roles, qualifications, skills, negation and attribution; never add missing Excel, market-research or import/export experience from the JD. If a request needs unsupported facts or clarification, leave the affected line unchanged rather than inventing an answer. The server supplies a factual-review caution; do not generate prose metadata to justify a risky edit. The COMPLETE reconstructed document including unchanged lines and newline separators must remain at most ${rewriteLimits.document} UTF-16 code units. Avoid expansion near that limit, but never remove source facts to fit. Valid no-safe-edit output: {"replacements":[]}. This is not a request to skip safe improvements.`;
