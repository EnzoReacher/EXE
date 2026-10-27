# Complete structured CV Rewrite — prepared, not activated

Historical preparation record. Activation and final acceptance now supersede the
release state below: see [current demo handoff](DEMO_HANDOFF.md).

## Interrupted work audit and retained work

The interrupted tree contained working geometry-aware PDF extraction, reference-template typography, optional source-line structure correction, and JSONB snapshot persistence for corrected legacy results. Controlled correction → save → reopen → export had passed with sanitized data and a privately reviewed local owner export. These edits and existing records were preserved.

The production Rewrite still generated ID/text replacement plans. That was unfinished relative to the new direction. The new primary workflow now returns a complete CV and edits its actual sections/entries. Source-line assignment remains only inside **Legacy CV structure correction (optional)** for old results; it is not part of the new Rewrite journey.

## New contract and workflow

- `structured-rewrite.ts`: a 929-byte native JSON Schema with required objects, strings and arrays only; root fields are `header` and `sections`. No model-authored originals, replacement plans, regex constraints, recursive definitions or additional model metadata.
- Provider header selects `nameSourceId`, `titleSourceId`, `contactSourceIds`. Private values identified by the existing limited privacy filter are masked in the request and hydrated from exact local source values. This is not a promise that every personal detail can be detected or removed.
- Sections contain `heading` and complete `entries`; entries contain `title`, `context`, `date`, `paragraphs`, `bullets`, `sourceIds`. Evidence references are internal factual provenance, not a user-facing assignment plan. Output includes the whole document, not just changes.
- `rewrite-workflow.ts` dispatches once using the complete-CV schema. Scan remains the established source-selection workflow; Rewrite consumes its validated result. Auth, current-source checks, fresh disclosure binding, origin checks, durable reservations, finalization, one-attempt transport and rejected-output accounting remain in place.
- `structured-cv.ts` defines public format `structured-cv-v1` and one shared layout/text serialization. Provider-only references are removed from public entries. Server-supplied review notes never claim full semantic verification.
- `StructuredCVEditor` directly edits name/title/contact, section headings, entry titles/context/dates, paragraphs and bullets. Preview/export update without another AI request. Saving remains explicit and revision-guarded.
- `schemaVersion: 2` saved snapshots accept optional `structuredCV` alongside the canonical `document`. They must agree. Structured and legacy assignment metadata cannot conflict in the same snapshot. New structured CVs render directly; they are not flattened and heuristically parsed again when reopened.
- Existing plain-text snapshots and earlier profile/version readers remain available. No automatic migration, record rewrite, new Scan or new Rewrite is required to read or edit an old saved CV.

## Fact/resource safeguards and limits

The complete response is rejected on invalid types, extra fields, source references, uncited non-heading source units, private body references, explicit identity/context/date mismatches, added/missing numeric facts within cited evidence, changed protected negation/third-party ownership, selected unsupported qualification/requirement claims, unsupported technical-section labeling, or total document overflow. Dates accompanying activity titles require an explicit same-source-row binding (tab/multiple-space/pipe evidence); a detached date is retained separately instead of being guessed. Whole-document rejection never applies a partial CV or silently truncates it.

These checks are deliberately **not a proof of semantic entailment or exhaustive preservation of every nonnumeric fact**. A source citation alone cannot establish attribution or truth. Owner review is still required; no additional verification inference or retry is performed. Empty fields and sections are omitted; meaningful source sections are supported without applicant-specific rules. Source identity fields are preserved rather than inventing missing titles/qualifications. Protected ambiguous text remains verbatim, including when another output language is requested.

The disclosure purpose was versioned for the changed contract so a stale acknowledgement cannot silently authorize a different send.

## Private real-source verification

The locally available original two-column PDF and downloaded TXT were found and used privately. No personal details, source-specific date mappings or provider fixture output were put into production code or committed fixtures.

- The actual PDF now extracts the sidebar and main column separately. Main-column Summary text is contiguous rather than interrupted by sidebar headings. Four title/date rows retain their geometry-supported association, including a narrow-gap full month/day/year date.
- A private, source-reviewed complete-CV response was supplied to the real native Claude transport/parser workflow through an **in-memory HTTP stub**, not a model call. The source PDF retains its actual spelling and facts; spelling changes were not invented from the separate TXT export.
- The actual TXT is separately verified as an unchanged legacy saved-document input. It may not be the latest live saved revision; no hosted record was read or overwritten.

## Checks and evidence

Evidence: `.local-demo/evidence/structured-cv/` (private/ignored; owner artifacts contain personal data and must not be published).

- **378 tests / 22 files passed**: complete-CV schema/factual/resource checks, native Claude envelope/transport, reservation rejection/finalization, bounded redacted diagnostics, old decoder compatibility, saved snapshot APIs, rendering and Scan/Rewrite component behavior.
- **5 geometry checks passed**, including uneven column starts and narrow-gap dates.
- **4 browser flows passed** on an isolated fixture production build:
  1. Sanitized PDF: upload preview → Scan → structured Rewrite → direct edit → save → reopen → clipboard/TXT/PDF.
  2. Actual local source PDF: the same complete flow, preserving all four title/date pairs.
  3. Actual local TXT: legacy saved CV remains readable/editable; correction is optional/collapsed and reading does not mutate the record.
  4. Long structured CV: Vietnamese accents, long name, absent optional header fields, 320px overflow check, and four-page PDF without truncation.
- Actual parser/transport/application functions were used during private response preparation. Browser Scan/Rewrite responses were intercepted with those already-validated controlled results. Browser persistence used fictional loopback Auth/REST, not the owner's Supabase. This does not certify live Claude output quality, native service acceptance or hosted end-to-end acceptance.
- PDF text was independently compared to TXT in Unicode-normalized reading order. A4, margins, no blank pages/stranded headings, and source title/date pairs on the same page passed. The private owner case is one page; the long case is four pages. PDF rasterizations, desktop/mobile previews and the long final page were visually inspected against the approved single-column reference design.
- TypeScript and production builds passed. ESLint: zero errors; two unused-import warnings in historical test files. `git diff --check` passed.

Key artifacts:

- `sanitized.pdf`, `sanitized-page1.png`
- `owner-local-pdf.pdf`, `owner-local-pdf-page1.png`, `owner-local-pdf-mobile.png` (**private owner data**)
- `long-structured.pdf`, `long-structured-page4.png`
- `preparation-checks.json`, `pdf-checks.json`, `unit-checks.log`, `build-browser.log`
- `production-build.json`, `production-prepared-check.json`

## Prepared real production release — no switch

Directory:
`/home/enzoreacher/EXE-ownpath-demo-rc/.local-demo/releases/ownpath-demo-production-aIh2y4`

Build ID: `6g2nnU7ApUEwJrzu1Q3fN`.

Built with `node scripts/ownpath-demo-runtime.mjs build` into a separate directory with valid `release.json`. All 290 recorded source hashes match; 194 production source/helper files match the final controlled build. Compiled real public Auth values and configuration identity match the previous real production release. Fixture Auth values are absent from the 72 inspected browser assets. Provider configuration resolves to the pinned Anthropic model with billing OFF without making a network call. No secret values were printed.

**Not started or activated.** The previous release directory and its source hashes remain intact. The final listener checks show port **4317** still running as PID **9372**, and **no listener on 4318**. This work did not stop/switch either main runtime or reload the owner's browser. Temporary fixture services have been stopped. Activation must be a separate approved action; listener state must be checked again first.

After approved activation, the Saved CVs URL will be `http://127.0.0.1:4318/app/cvs`. Keep the existing owner tab open and back up any unsaved accepted text before deliberately opening a separate tab. Existing saved CVs can be inspected/edited/exported without another AI request. For a future real complete-CV workflow, upload → review extracted text → Scan → Rewrite → Edit complete CV → explicit Save CV → reopen/export. **Real Scan/Rewrite are paid/allowance-using actions and were not executed here; live acceptance requires separate authorization.**

No paid inference, hosted SQL, real credit/allowance changes, real account creation, automatic reload, saved-record overwrite, browser storage clearing or navigation redesign was performed.
