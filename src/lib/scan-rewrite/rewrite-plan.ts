import "server-only";
import { shape } from "./provider";
import { OutputValidationError, parseRewrite, protectedMeaning, responseList, responseObject, responseText, sharedLines } from "./domain";
import { rewriteArraySchema, rewriteLimits, rewriteReviewNotes, rewriteStringSchema } from "./rewrite-contract";
import { LiveError } from "@/lib/experience-translator/server/validation";

/** Blank/private units cannot have a nonblank exact original. Filter choices,
 * not source content; reconstruction still retains every untouched source unit. */
export function rewriteBaseLines(base: string) {
  const allowed = sharedLines(base).filter(line => line.text.trim());
  if (!allowed.length) throw new LiveError("invalid_input", "No nonblank source lines are available after privacy filtering. Your work is kept; no AI request was sent.", 422);
  return allowed;
}

function schema(lineId: Record<string, unknown>) {
  return shape({ replacements: rewriteArraySchema(shape({ lineId, text: rewriteStringSchema(rewriteLimits.text) }), rewriteLimits.replacements) });
}
export const rewriteSchema = schema(rewriteStringSchema(rewriteLimits.lineId));
export function rewriteSchemaFor(base: string) {
  return schema({ type: "string", enum: rewriteBaseLines(base).map(line => line.id), description: "Exact supplied nonblank current-base block ID, once only." });
}
/** Resolve ID-only proposals from the CURRENT edited base. Never repair a model-
 * authored original, fuzzy-match, trim, normalize, truncate or drop an invalid edit. */
export function parseRewritePlan(value: unknown, base: string) {
  const body = responseObject("$", value, ["replacements"]), allowed = rewriteBaseLines(base);
  const replacements = responseList("replacements", body.replacements, rewriteLimits.replacements).map((item, index) => {
    const path = `replacements[${index}]`, r = responseObject(path, item, ["lineId", "text"]);
    const lineId = responseText(`${path}.lineId`, r.lineId, rewriteLimits.lineId);
    const text = responseText(`${path}.text`, r.text, rewriteLimits.text);
    const line = allowed.find(line => line.id === lineId);
    if (!line) throw new OutputValidationError("grounding", `${path}.lineId`, "line_reference", "string", "source_reference");
    return { lineId, original: line.text, text };
  });
  // Metadata comes from verified structure, not a model's preferred wording.
  // Validate EVERY edit with the existing exact-source/factual checks first.
  const checked = parseRewrite({ replacements, changes: [], notes: [] }, base);
  const changed = checked.replacements.filter(line => line.text !== line.original).length;
  const changes = changed ? [`Updated ${changed} source ${changed === 1 ? "line" : "lines"}; all other lines were retained.`] : [];
  const notes: string[] = [rewriteReviewNotes.general];
  if (allowed.some(line => protectedMeaning(line.text))) notes.push(rewriteReviewNotes.protected);
  if (!changed) notes.push(rewriteReviewNotes.unchanged);
  return parseRewrite({ ...checked, changes, notes }, base);
}
