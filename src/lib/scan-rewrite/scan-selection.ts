import { shape } from "./provider";
import { record } from "@/lib/cv-review/domain";
import { jsonType, OutputValidationError, parseScan, protectedMeaning, responseList, responseText, scanSources, type Input } from "./domain";
import { scanLimits, scanStringSchema } from "./scan-contract";
import { LiveError } from "@/lib/experience-translator/server/validation";

/** Only intact, bounded source units are selectable. Nothing is normalized,
 * truncated, fuzzy-matched or recovered from a generated quotation. */
export function scanCatalog(source: Input) {
  const sources = scanSources(source);
  const requirements = [...new Set([source.jd, ...source.jd.split("\n")])]
    .filter(text => text.trim() && text.length <= scanLimits.requirement)
    .map((text, index) => ({ id: `jd:r${index + 1}`, text }));
  const cv = sources.cv.filter(block => block.text.trim() && block.text.length <= scanLimits.excerpt);
  return { requirements, cv, omittedCvBlocks: sources.cv.length - cv.length,
    omittedJdLines: source.jd.split("\n").filter(text => text.trim() && text.length > scanLimits.requirement).length };
}
type Catalog = ReturnType<typeof scanCatalog>;
export function requireSelectableRequirements(catalog: Catalog) {
  if (!catalog.requirements.length) throw new LiveError("input", "The JD has no selectable requirement within the source-unit limit. Add line breaks between requirements before processing. No AI request was sent. Your work is kept.", 400);
}
const choice = (...values: string[]) => ({ type: "string", enum: values });
const fields = ["title", "requirementSourceId", "excerptSourceId", "explanation", "nextStep", "priority", "expectation", "group"];
export function selectionSchema(catalog: Catalog) {
  requireSelectableRequirements(catalog);
  const common = { title: scanStringSchema(scanLimits.title), requirementSourceId: choice(...catalog.requirements.map(r => r.id)),
    explanation: scanStringSchema(scanLimits.explanation), nextStep: scanStringSchema(scanLimits.nextStep),
    priority: choice("important", "secondary"), expectation: choice("required", "preferred", "unspecified") };
  const supported = catalog.cv.filter(block => !protectedMeaning(block.text)).map(block => block.id);
  const branches = [
    ...(supported.length ? [shape({ ...common, group: choice("supported"), excerptSourceId: choice(...supported) })] : []),
    shape({ ...common, group: choice("unclear"), excerptSourceId: choice("", ...catalog.cv.map(block => block.id)) }),
    shape({ ...common, group: choice("not_found"), excerptSourceId: choice("") }),
  ];
  return shape({ coverage: scanStringSchema(scanLimits.coverage), findings: {
    type: "array", items: { anyOf: branches },
    description: `0 to ${scanLimits.findings} source selections. Use [] when none is safe.`,
  } });
}
function object(value: unknown, path: string, keys: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new OutputValidationError("output_schema", path, "field_shape", jsonType(value), value === undefined ? "required" : "type");
  const result = record(value);
  if (Object.keys(result).some(key => !keys.includes(key))) throw new OutputValidationError("output_schema", path, "field_shape", "object", "allowed_fields");
  return result;
}
function enumeration(value: unknown, path: string, choices: readonly string[]) {
  if (typeof value !== "string" || !choices.includes(value)) throw new OutputValidationError("output_schema", path, "enum", jsonType(value), value === undefined ? "required" : typeof value !== "string" ? "type" : "enum");
  return value;
}
export function parseSelection(value: unknown, source: Input, catalog: Catalog) {
  requireSelectableRequirements(catalog);
  const result = object(value, "$", ["coverage", "findings"]);
  const coverage = responseText("coverage", result.coverage, scanLimits.coverage);
  const findings = responseList("findings", result.findings, scanLimits.findings).map((item, index) => {
    const path = `findings[${index}]`, f = object(item, path, fields);
    const title = responseText(`${path}.title`, f.title, scanLimits.title);
    const explanation = responseText(`${path}.explanation`, f.explanation, scanLimits.explanation);
    const nextStep = responseText(`${path}.nextStep`, f.nextStep, scanLimits.nextStep);
    const priority = enumeration(f.priority, `${path}.priority`, ["important", "secondary"]);
    const expectation = enumeration(f.expectation, `${path}.expectation`, ["required", "preferred", "unspecified"]);
    const group = enumeration(f.group, `${path}.group`, ["supported", "unclear", "not_found"]);
    const requirement = catalog.requirements.find(r => r.id === f.requirementSourceId);
    if (!requirement) throw new OutputValidationError("grounding", `${path}.requirementSourceId`, "line_reference", jsonType(f.requirementSourceId), "source_reference");
    const evidence = catalog.cv.find(block => block.id === f.excerptSourceId);
    if (typeof f.excerptSourceId !== "string" || f.excerptSourceId !== "" && !evidence) throw new OutputValidationError("grounding", `${path}.excerptSourceId`, "line_reference", jsonType(f.excerptSourceId), "source_reference");
    // Resolve from trusted input, not model-authored text. parseScan below still
    // enforces source identity, exact quotes, protected context and group rules.
    return { title, explanation, nextStep, priority, expectation, group,
      requirement: requirement.text, requirementSourceId: "jd", excerpt: evidence?.text ?? "", excerptSourceId: evidence?.id ?? "" };
  });
  return parseScan({ coverage, findings }, source, scanSources(source));
}
export const selectionInstructions = "Return source selections, not quotations. Each finding has exactly title, requirementSourceId, excerptSourceId, explanation, nextStep, priority, expectation, group. Select requirementSourceId from requirements[].id and excerptSourceId from cv[].id. NEVER return requirement or excerpt text fields: the server resolves selected IDs to untouched original text. Supported requires a supplied unprotected CV block; unclear may select context or use an empty excerptSourceId; not_found requires an empty excerptSourceId. Never infer a skill from a job requirement. Do not claim Excel, market research, import/export or other experience without relevant CV evidence. Explain negation and attribution honestly. A source selection is evidence, not proof of semantic entailment. Only supplied bounded source units are selectable; omit a finding that cannot be safely represented. Mention omitted source units and limited coverage honestly. Analyze only; DO NOT rewrite. Distinguish required/preferred/unspecified. Missing evidence is not proof of missing ability. UI and findings in English.";
