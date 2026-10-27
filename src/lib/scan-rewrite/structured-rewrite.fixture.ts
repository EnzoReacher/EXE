// Test-only generic wire fixture, never imported by the application workflow.
import { structuredSources } from "./structured-rewrite";
import { sectionLabel } from "@/lib/cv-templates/structure";
import { contactLine } from "@/lib/cv-templates/assignments";
export function completeRewriteFixture(base: string, edits: Record<string, string> = {}) {
  const sources = structuredSources(base);
  const first = sources[0], name = first && !sectionLabel(first.text) && !contactLine(first.text) ? first.id : "";
  const contacts = sources.filter(s => s.id !== name && s.private && !sectionLabel(s.text)).map(s => s.id);
  return { header: { nameSourceId: name, titleSourceId: "", contactSourceIds: contacts }, sections: [{ heading: "Additional information", entries: sources.filter(s => !s.private && s.id !== name && !sectionLabel(s.text)).map(s => ({ title: "", context: "", date: "", paragraphs: [edits[s.id] ?? s.text], bullets: [], sourceIds: [s.id] })) }] };
}
