import "server-only";
import { shape } from "./provider";
import { OutputValidationError, protectedMeaning, responseList, responseObject, responseText, sharedLines } from "./domain";
import { parseCVEntry, parseStructuredCV, structuredText, type StructuredCV } from "./structured-cv";
import { sectionLabel } from "@/lib/cv-templates/structure";
import { contactLine } from "@/lib/cv-templates/assignments";
import { LiveError } from "@/lib/experience-translator/server/validation";
import { joinSourceFragments } from "./source-fragments";
const string = { type: "string" }, array = (items: Record<string, unknown>) => ({ type: "array", items });
// Deliberately basic provider-supported JSON Schema: fixed required objects,
// strings and arrays. No regexes, unions, recursive definitions or line plans.
export const structuredRewriteSchema = shape({ header: shape({ nameSourceId: string, titleSourceId: string, contactSourceIds: array(string) }), sections: array(shape({ heading: string, entries: array(shape({ title: string, context: string, date: string, paragraphs: array(string), bullets: array(string), sourceIds: array(string) })) })) });
const normalize = (s: string) => s.normalize("NFC").replace(/\s+/gu, " ").trim();
const numbers = (s: string): string[] => s.match(/\d+(?:[.,/%–-]\d+)*/gu) ?? [];
const reject = (path: string): never => { throw new OutputValidationError("grounding", path, "rewrite_guard", "string", "category_evidence"); };
const referenceError = (path: string): never => { throw new OutputValidationError("grounding", path, "line_reference", "string", "source_reference"); };
export function structuredSources(base: string) {
  const shared = new Set(sharedLines(base).map(line => line.id));
  const sources = base.split("\n").flatMap((text, index) => text.trim() ? [{ id: `b${index + 1}`, text, private: !shared.has(`b${index + 1}`) || contactLine(text) }] : []);
  if (!sources.some(s => !s.private && !sectionLabel(s.text))) throw new LiveError("invalid_input", "No usable CV content is available. Your work is kept; no AI request was sent.", 422);
  return sources;
}
export function structuredProviderSources(base: string) { return structuredSources(base).map(s => ({ id: s.id, text: s.private ? "[private header value: select this ID only; never reproduce it in body text]" : s.text })); }
export function checkStructuredRewrite(value: unknown, base: string): StructuredCV {
  const body = responseObject("$", value, ["header", "sections"]), sources = structuredSources(base), used = new Set<string>();
  const get = (id: unknown, path: string, allowEmpty = false) => {
    if (allowEmpty && id === "") return "";
    const key = responseText(path, id, 20), s = sources.find(s => s.id === key);
    if (!s) return referenceError(path);
    used.add(key); return s.text;
  };
  const h = responseObject("header", body.header, ["nameSourceId", "titleSourceId", "contactSourceIds"]);
  const header = { name: get(h.nameSourceId, "header.nameSourceId", true), title: get(h.titleSourceId, "header.titleSourceId", true), contacts: responseList("header.contactSourceIds", h.contactSourceIds, 20).map((id, i) => get(id, `header.contactSourceIds[${i}]`)) };
  if (sectionLabel(header.name) || sectionLabel(header.title)) reject("header");
  const sections = responseList("sections", body.sections, 40).map((value, index) => {
    const path = `sections[${index}]`, s = responseObject(path, value, ["heading", "entries"]);
    const heading = responseText(`${path}.heading`, s.heading, 100);
    if (!sectionLabel(heading) && !sources.some(source => normalize(source.text).replace(/:$/u, "").toLocaleLowerCase() === normalize(heading).toLocaleLowerCase())) reject(`${path}.heading`);
    return { heading, entries: responseList(`${path}.entries`, s.entries, 100).map((value, j) => {
      const p = `${path}.entries[${j}]`, e = responseObject(p, value, ["title", "context", "date", "paragraphs", "bullets", "sourceIds"]);
      const evidence = responseList(`${p}.sourceIds`, e.sourceIds, 500).map((id, k) => { const key = responseText(`${p}.sourceIds[${k}]`, id, 20), item = sources.find(s => s.id === key); if (!item || item.private) return referenceError(`${p}.sourceIds`); used.add(key); return item.text; });
      if (!evidence.length) reject(`${p}.sourceIds`);
      const entry = parseCVEntry({ title: e.title, context: e.context, date: e.date, paragraphs: e.paragraphs, bullets: e.bullets }, p);
      entry.bullets = joinSourceFragments(entry.bullets, evidence);
      entry.paragraphs = joinSourceFragments(entry.paragraphs, evidence);
      if ([...entry.bullets, ...entry.paragraphs].some(text => !/[\p{L}\p{N}]/u.test(text))) reject(p);
      const input = normalize(evidence.join(" ")), output = normalize([entry.title, entry.context, entry.date, ...entry.paragraphs, ...entry.bullets].join(" "));
      if (!output || /\[(?:insert|add|your|tbd)|<[^>]+>/iu.test(output)) reject(p);
      // Identity/date/context fields are copied from cited source facts, not
      // invented prose. Whitespace joining supports actual PDF line wraps only.
      const identityEvidence = normalize(evidence.map(line => line.includes("\t") ? line.split("\t")[0] : line).join(" "));
      for (const [key, text] of Object.entries({ title: entry.title, context: entry.context, date: entry.date })) if (text && !(key === "date" ? input : identityEvidence).includes(normalize(text))) reject(`${p}.${key}`);
      const inputNumbers = numbers(input), outputNumbers = numbers(output);
      if (outputNumbers.some(n => !inputNumbers.includes(n)) || inputNumbers.some(n => !outputNumbers.includes(n))) reject(p);
      for (const source of evidence.filter(protectedMeaning)) if (!output.includes(normalize(source))) reject(p);
      for (const term of [/\bExcel\b/iu, /\bmarket[\s-]+research\b/iu, /\bimport(?:[\s/&-]+(?:and[\s-]+)?)export\b/iu, /\b(?:PhD|MBA|certified|certification|bachelor|master|award|winner)\b/iu]) if (term.test(output) && !term.test(input)) reject(p);
      // A date may accompany a title only when a source layout row explicitly
      // binds them (tab/column separator). Detached dates stay standalone text.
      if (entry.date && entry.title && !evidence.some(line => {
        const cells = line.split(/\t+| {2,}|\s+\|\s+/u);
        const caption = normalize(cells.slice(0, -1).join(" "));
        return cells.length > 1 && !!caption && normalize(cells.at(-1)!) === normalize(entry.date) && normalize(entry.title).startsWith(caption);
      })) reject(`${p}.date`);
      if (entry.title && evidence.filter(line => /\t| {2,}|\s\|\s/u.test(line) && /(?:19|20)\d{2}/u.test(line)).length > 1) reject(`${p}.sourceIds`);
      if (/^technical skills$/iu.test(heading) && !sources.some(s => sectionLabel(s.text) === "technical skills") && !evidence.some(t => /programming|software|python|javascript|typescript|sql|machine learning|technical skills/iu.test(t))) reject(`${path}.heading`);
      return entry;
    }) };
  });
  // Never silently lose an uncited source fact or a private field. This checks
  // coverage, not semantic entailment; the owner still reviews each claim.
  for (const source of sources) if (!sectionLabel(source.text) && !used.has(source.id)) reject("sections.sourceCoverage");
  return parseStructuredCV({ version: 1, header, sections });
}
export const structuredRewriteInstructions = `Return a COMPLETE CV, not replacements or a line-edit plan. Use the required header and sections object. Header selects source IDs: nameSourceId/titleSourceId may be empty when absent; contactSourceIds may be []. Private header values are resolved locally and must not appear in body text. Each section has a heading and complete entries with title, context, date, paragraphs, bullets, sourceIds. Empty strings/arrays represent missing fields; omit empty sections. Use Skills for general applicants, Technical Skills only with technical evidence. Support Summary, Education, Experience / Activities, Projects, Research / Awards, Languages and other meaningful source sections. Preserve ALL facts, numbers, names, qualifications, responsibilities, uncertainty and ownership from the current base; cite every non-heading source unit in header or entry evidence. Join PDF-wrapped sentences without changing their meaning. Copy identity/date/context fields faithfully from cited text; improve only supported wording. Preserve protected/ambiguous sentences verbatim. A date may be paired with an activity ONLY when the source row explicitly contains that title and date separated by a tab, multiple spaces or |; otherwise retain it as standalone text and do not guess. Do not add missing skills, seniority, dates, degrees or achievements from the JD or instructions. 'Make me senior' is not a fact. Never return original copies, replacements, changes, notes, HTML or placeholders. The complete rendered CV must remain at most 24,000 characters; do not remove facts to fit.`;
export function structuredRewriteResult(cv: StructuredCV) { return { format: "structured-cv-v1" as const, cv, document: structuredText(cv), changes: ["Organized the complete CV into source-supported sections."], notes: ["Review every fact and activity/date association against your source. Source references and automated checks do not prove semantic faithfulness. Uncertain dates must not be guessed."] }; }
