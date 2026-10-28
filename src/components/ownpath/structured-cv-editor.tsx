"use client";
import type { CVEntry, StructuredCV } from "@/lib/scan-rewrite/structured-cv";
// Direct section/entry editing. No source-line assignment or AI call is needed.
export default function StructuredCVEditor({ cv, onChange }: { cv: StructuredCV; onChange: (cv: StructuredCV) => void }) {
  const changeHeader = (fields: Partial<StructuredCV["header"]>) => onChange({ ...cv, header: { ...cv.header, ...fields } });
  const changeEntry = (i: number, j: number, fields: Partial<CVEntry>) => onChange({ ...cv, sections: cv.sections.map((s, k) => k === i ? { ...s, entries: s.entries.map((e, n) => n === j ? { ...e, ...fields } : e) } : s) });
  return <section aria-label="Edit structured CV"><p>Edit your CV directly. All changes are user-supplied; check the facts. Preview and exports update without AI. Save explicitly to keep edits.</p>
    <label>Candidate name<input maxLength={300} value={cv.header.name} onChange={e => changeHeader({ name: e.target.value })} /></label>
    <label>Professional title<input maxLength={500} value={cv.header.title} onChange={e => changeHeader({ title: e.target.value })} /></label>
    <label>Contact information (one per line)<textarea value={cv.header.contacts.join("\n")} onChange={e => changeHeader({ contacts: e.target.value.split("\n") })} onBlur={e => changeHeader({ contacts: e.target.value.split("\n").filter(s => s.trim()) })} /></label>
    {cv.sections.map((s, i) => <fieldset key={i} style={{ minWidth: 0, marginBlock: 16 }}><legend>Section {i + 1}</legend><label>Section {i + 1} heading<input maxLength={100} value={s.heading} onChange={e => onChange({ ...cv, sections: cv.sections.map((section, k) => k === i ? { ...section, heading: e.target.value } : section) })} /></label>
      {s.entries.map((entry, j) => <div key={j}><h3>Entry {j + 1}</h3><label>Section {i + 1} entry {j + 1} title<input maxLength={500} value={entry.title} onChange={e => changeEntry(i, j, { title: e.target.value })} /></label><label>Section {i + 1} entry {j + 1} context<input maxLength={500} value={entry.context} onChange={e => changeEntry(i, j, { context: e.target.value })} /></label><label>Section {i + 1} entry {j + 1} date<input maxLength={160} value={entry.date} onChange={e => changeEntry(i, j, { date: e.target.value })} /></label><label>Section {i + 1} entry {j + 1} paragraphs (one per line)<textarea value={entry.paragraphs.join("\n")} onChange={e => changeEntry(i, j, { paragraphs: e.target.value.split("\n") })} onBlur={e => changeEntry(i, j, { paragraphs: e.target.value.split("\n").filter(s => s.trim()) })} /></label><label>Section {i + 1} entry {j + 1} bullets (one per line)<textarea value={entry.bullets.join("\n")} onChange={e => changeEntry(i, j, { bullets: e.target.value.split("\n") })} onBlur={e => changeEntry(i, j, { bullets: e.target.value.split("\n").filter(s => s.trim()) })} /></label></div>)}
    </fieldset>)}
  </section>;
}
