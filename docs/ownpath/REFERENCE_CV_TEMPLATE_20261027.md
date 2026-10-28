# Reference-led default CV template

Implemented in the canonical worktree. The supplied PDF is a **design reference only**; all generated evidence uses fictional applicants. No reference personal information or achievements are used as defaults.

## Separate pipeline repairs

1. **Extraction:** `scripts/cv-extract.mjs` now reads PDF.js text coordinates through the existing pinned parser dependency. `scripts/cv-layout.mjs` groups baselines and detects repeated opposing text separated by an empty gutter. It reads evidenced columns independently, keeps same-row dates with their entry, and does not treat right-aligned date suffixes alone as another column. Sparse/ambiguous layouts stay in geometric row order. Every upload opens the editable extraction review; no semantic association is inferred. Text-only DOCX extraction remains unchanged. Isolated-runtime copy lists include the new parser helper.
2. **Section parsing:** `src/lib/cv-templates/structure.ts` recognizes letter-spaced English/Vietnamese headings. Source blocks retain their original text, line IDs and order. `draftProfile` shares that recognition so rendering and provider source classification no longer disagree about CONTACT/EDUCATION/SKILLS.
3. **Presentation:** the existing `classic` template ID now uses the reference-led single-column A4 design, black text, centered header, ruled uppercase headings, bold entries/field labels, italic explicit context and right-aligned explicit dates. Print can span pages; narrow-screen dates wrap. Technical Skills is never introduced automatically; source headings are retained. Empty recognized sections are omitted from all rendered/plain exports without altering the stored editable source. Unknown meaningful text is retained.

For an already-flattened draft, the renderer deliberately does **not** promote a later arbitrary line into a name or attach a standalone date to a guessed employer. A structure-review notice opens the existing full-text editor. The owner can explicitly correct order/associations without AI, preserving accepted wording and manual edits. There is no automatic saved-record migration.

## Measured visual comparison

Measured locally from PDF text bounding boxes and embedded fonts, not from applicant facts:

| Property | Reference | New exported PDF |
|---|---:|---:|
| Page | A4 | A4 |
| Name | 22pt bold sans | 22pt bold sans |
| Professional title | 11.5pt bold | 11.5pt bold |
| Contact | 9.5pt | 9.5pt |
| Section heading | 10.5pt bold | 10.5pt bold |
| Body | 10pt | 10pt |
| Dates | 8.5pt italic | 8.5pt italic |
| Left content edge | 40.35pt | 39.75pt |
| First heading top | 105.65pt | 108.24pt |

Arial resolves locally to Liberation Sans, matching the reference's embedded family. Margins are 12mm vertically / 14mm horizontally. Layout is closely matched, not a claim of pixel-identical pagination across different content or browsers. A responsive preview reflows on mobile rather than shrinking a fixed A4 image.

## Verification and evidence

Evidence directory: `.local-demo/evidence/reference-template/`.

- 80 focused template, upload, saved-snapshot and Scan/Rewrite component checks passed.
- 50 source-domain, rewrite-plan and local-preview regression checks passed.
- 3 coordinate-layout checks passed, including ambiguity fallback and date-column distinction.
- 20 real isolated PDF/DOCX parser/security/resource-limit checks passed.
- Offline visual/export checks: reference-style, flattened, Vietnamese, minimal, long and long-entry fixtures; actual synthetic two-column PDF extraction. Long output is four pages; long-entry output is two. Full Unicode reading order, embedded fonts, page margins, no blank pages/stranded section headings, and 390/320px overflow checks passed.
- 2 controlled browser flows passed on the same isolated production build: existing Rewrite → explicit edit/correction → save → reopen → clipboard/TXT/PDF. Accepted bullet wording, manual edit and completed Scan survive; saved revision changes only after an explicit save. A network boundary rejects AI endpoints and non-loopback requests. No forbidden requests occurred.
- Actual app PDFs were independently checked against their TXT exports for Unicode content, reading order and margins.
- Focused ESLint, TypeScript and `git diff --check` passed.
- **One** isolated production build passed; browser screenshot checks were repeated against that same build, not rebuilt. Browser contexts, ports 4396/4397 and fixture records are disposable and unrelated to the owner's running session. Test services were stopped.

Visually inspected: standalone and in-app desktop previews, 320px preview, PDF rasterizations, first/last long-document pages, and explicit corrected-structure PDF. Full-page app capture is used because Chromium's oversized-element screenshot can crop a paper taller than the viewport.

Key artifacts:

- `reference-preview.png`, `reference-app-preview.png`, `reference-app-320.png`
- `reference-app.pdf`, `reference-app-pdf-page1.png`
- `two-column-source.pdf`, `two-column-source.png`, `two-column-extracted.txt`
- `flattened-app.pdf`, `flattened-app-pdf-page1.png`
- `long.pdf`, `long-pdf-page1.png`, `long-pdf-last-page.png`
- `checks.json`, `app-pdf-checks.json`, `build-and-browser.log`, `browser-rerun.log`

The real problematic two-column source file was not available in this task; its failure shape was reproduced with sanitized fixtures. This does not certify ambiguous associations in the owner's actual document.

## Owner-safe viewing of the existing result

The owner's tab, active production release, successful Scan and hosted saved records were **not** changed. The new code has not been activated on the existing owner server. The isolated build uses fictional services and must not be substituted for that server's deployment.

1. Keep the current owner tab open. Copy/download its complete accepted CV text as a backup. If the result is unsaved, explicitly save it through the existing UI before any later reload; in-memory workspace state does not survive a reload. Do not click Rewrite again.
2. After the updated source is deliberately activated with the normal real configuration, open the existing saved CV in a **separate tab**. The same stored document automatically uses the new default template without an AI request or saved-record write.
3. Choose **Open saved CV editor**. If a structure notice appears, use **Correct structure without AI**. Move only source-verified header/entry/date lines; keep accepted bullets and manual edits. A tab or ` | ` before a supported date keeps it attached to its entry. If the source is unavailable, leave the association unresolved rather than guessing.
4. Review the preview, explicitly save only if desired, then copy/download TXT or choose Print / Save as PDF. Use A4, 100% scale, no browser headers/footers; do not force a long CV onto one page.

No paid inference, credit changes, hosted SQL, automatic reload, storage clearing, saved-record overwrite, or navigation redesign was performed.
