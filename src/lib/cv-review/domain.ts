import { sectionLabel } from "@/lib/cv-templates/structure";
export type Language = "English" | "Vietnamese";
export type Block = { id: string; section: string; text: string; sourceText: string };
export type Profile = { source: string; revision: string; blocks: Block[]; confirmed: boolean };
export type Suggestion = { id: string; blockId: string; original: string; proposed: string; reason: string; sourceIds: string[]; kind: "wording" | "clarification"; question: string; bulkEligible: boolean };
export type Mapping = { requirement: string; experience: string; sourceIds: string[]; status: "supported" | "needs clarification" | "not found" };
export type Review = { summary: string[]; suggestions: Suggestion[]; mapping: Mapping[]; profileRevision: string; jd: string; language: Language };
export type Decision = { action: "accepted" | "edited" | "dismissed"; text: string };
export type Decisions = Record<string, Decision>;
export type Draft = { source: string; jd: string; language: Language; profile: Profile | null; review: Review | null; decisions: Decisions; step: "input" | "profile" | "review" | "final"; name: string; role: string; company: string };
export const emptyDraft: Draft = { source: "", jd: "", language: "English", profile: null, review: null, decisions: {}, step: "input", name: "", role: "", company: "" };
export const MAX_SOURCE = 24000;
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid response. Your draft is kept.");
  return value as Record<string, unknown>;
}
export function str(value: unknown, max = MAX_SOURCE, allowEmpty = false): string {
  if (typeof value !== "string" || value.length > max || (!allowEmpty && !value.trim())) throw new Error("Invalid or oversized content. Your draft is kept.");
  return value;
}
function arr(value: unknown, max: number): unknown[] { if (!Array.isArray(value) || value.length > max) throw new Error("Invalid response. Your draft is kept."); return value; }
export function language(value: unknown): Language { if (value !== "English" && value !== "Vietnamese") throw new Error("Choose English or Vietnamese."); return value; }
// Exact collision-free revision for this bounded document, not a security hash.
export function revision(blocks: Block[]): string { return JSON.stringify(blocks.map(({ id, section, text, sourceText }) => [id, section, text, sourceText])); }
export function draftProfile(source: string): Profile {
  str(source); let section = "Experience";
  const blocks = source.split("\n").map((text, index) => {
    if (sectionLabel(text)) section = sectionLabel(text)!;
    return { id: `b${index + 1}`, section, text, sourceText: text };
  });
  if (blocks.length > 500) throw new Error("Please use at most 500 lines.");
  return { source, blocks, revision: revision(blocks), confirmed: false };
}
export function parseProfile(value: unknown): Profile {
  const p = record(value); const source = str(p.source); const original = draftProfile(source);
  const blocks = arr(p.blocks, 500).map((value, i) => {
    const b = record(value); if (b.id !== original.blocks[i]?.id || b.sourceText !== original.blocks[i]?.sourceText) throw new Error("Source blocks do not match.");
    return { id: str(b.id, 20), section: str(b.section, 100), text: str(b.text, MAX_SOURCE, true), sourceText: str(b.sourceText, MAX_SOURCE, true) };
  });
  if (blocks.length !== original.blocks.length || blocks.reduce((n, b) => n + b.text.length, 0) > MAX_SOURCE || typeof p.confirmed !== "boolean" || p.revision !== revision(blocks)) throw new Error("Profile revision does not match.");
  return { source, blocks, revision: revision(blocks), confirmed: p.confirmed };
}
function refs(value: unknown, profile: Profile, allowEmpty = false): string[] {
  const ids = arr(value, 12).map(v => str(v, 20));
  if ((!allowEmpty && !ids.length) || new Set(ids).size !== ids.length || ids.some(id => !profile.blocks.some(b => b.id === id && b.text.trim()))) throw new Error("Invalid source references. Your draft is kept.");
  return ids;
}
function numbers(text: string) { return text.match(/\d+(?:[.,/%-]\d*)*/gu)?.sort().join("|") ?? ""; }
export function eligibleWording(original: string, proposed: string, kind: string, question: string): boolean {
  // Deliberately narrow: punctuation/case only. Reordering may change who did
  // what or the scope of a negation, even when the bag of words is identical.
  const words = (s: string) => s.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)?.join("|");
  return kind === "wording" && !question && words(original) === words(proposed);
}
export function parseReview(value: unknown, profile: Profile, jd: string, outputLanguage: Language): Review {
  const r = record(value); const used = new Set<string>();
  const suggestions = arr(r.suggestions, 500).map((value, index): Suggestion => {
    const s = record(value); const blockId = str(s.blockId, 20); const block = profile.blocks.find(b => b.id === blockId);
    if (!block || !block.text.trim() || used.has(blockId) || s.original !== block.text) throw new Error("Conflicting or invalid source block. Your draft is kept.");
    used.add(blockId);
    const proposed = str(s.proposed, 6000); const kind = s.kind; const question = str(s.question, 500, true);
    if (kind !== "wording" && kind !== "clarification") throw new Error("Invalid suggestion type.");
    if (numbers(proposed) !== numbers(block.text)) throw new Error("A suggestion changed source numbers or dates. Your draft is kept; retry.");
    const sourceIds = refs(s.sourceIds, profile); if (!sourceIds.includes(blockId)) throw new Error("Missing source block reference.");
    return { id: `s${index + 1}`, blockId, original: block.text, proposed, reason: str(s.reason, 1000), sourceIds, kind, question, bulkEligible: eligibleWording(block.text, proposed, kind, question) };
  });
  const mapping = arr(r.mapping, 30).map((value): Mapping => {
    const m = record(value); const status = m.status;
    if (!["supported", "needs clarification", "not found"].includes(status as string)) throw new Error("Invalid mapping status.");
    const sourceIds = refs(m.sourceIds, profile, status === "not found");
    if (status === "not found" && sourceIds.length) throw new Error("Invalid missing-evidence mapping.");
    return { requirement: str(m.requirement, 1000), experience: str(m.experience, 2000, status === "not found"), sourceIds, status: status as Mapping["status"] };
  });
  if (!jd && mapping.length) throw new Error("Unexpected job mapping.");
  return { summary: arr(r.summary, 5).map(s => str(s, 1000)), suggestions, mapping, profileRevision: profile.revision, jd, language: outputLanguage };
}
export function isCurrent(review: Review | null, profile: Profile | null, jd: string, outputLanguage: Language) { return Boolean(review && profile && review.profileRevision === profile.revision && review.jd === jd && review.language === outputLanguage); }
export function finalDocument(profile: Profile, review: Review, decisions: Decisions): string {
  if (profile.revision !== review.profileRevision) throw new Error("Review this changed profile again before exporting.");
  return profile.blocks.map(block => {
    const suggestion = review.suggestions.find(s => s.blockId === block.id); const decision = suggestion && decisions[suggestion.id];
    return decision && decision.action !== "dismissed" ? decision.action === "edited" ? decision.text : suggestion!.proposed : block.text;
  }).join("\n");
}
export function parseDecisions(value: unknown, review: Review): Decisions {
  const out: Decisions = {};
  for (const [id, item] of Object.entries(record(value))) {
    if (!review.suggestions.some(s => s.id === id)) throw new Error("Unknown review decision.");
    const d = record(item); if (!["accepted", "edited", "dismissed"].includes(d.action as string)) throw new Error("Invalid review decision.");
    out[id] = { action: d.action as Decision["action"], text: str(d.text, 6000, true) };
  }
  return out;
}
export function parseDraft(value: unknown): Draft {
  const d = record(value); const source = str(d.source, MAX_SOURCE, true); const jd = str(d.jd, 18000, true); const lang = language(d.language);
  const profile = d.profile === null ? null : parseProfile(d.profile);
  const review = d.review === null ? null : profile ? parseReview(d.review, profile, str(record(d.review).jd, 18000, true), language(record(d.review).language)) : null;
  if (review && record(d.review).profileRevision !== profile?.revision) throw new Error("Saved review source changed.");
  if (!["input", "profile", "review", "final"].includes(d.step as string)) throw new Error("Invalid workspace step.");
  if (d.step !== "input" && !profile) throw new Error("Missing profile.");
  if ((d.step === "review" || d.step === "final") && !review) throw new Error("Missing review.");
  return { source, jd, language: lang, profile, review, decisions: review ? parseDecisions(d.decisions, review) : {}, step: d.step as Draft["step"], name: str(d.name, 120, true), role: str(d.role, 120, true), company: str(d.company, 120, true) };
}
