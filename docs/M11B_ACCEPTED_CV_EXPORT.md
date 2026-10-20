# M11B — Export accepted CV versions

**Date:** 2026-10-04

**Branch:** `codex/exe-web-app-m11b-cv-export`

**Exact base:** Published M11A `bc24377d57d503a21059ee0a467ede23252f289a`.

## Owner-directed technical prototype

The project owner requested exports after credential review, team-approved expert approval, and owner acceptance. This authorizes technical implementation only. M11A manual browser/accessibility review, privacy/retention and expert-role policies, CP2 research, and broader product validation remain pending. No PR, merge, deployment, live release, or release approval occurs in this phase. Use fictional data and synthetic documents only.

Approval continues to mean **“Approved by a team-approved expert after reviewing submitted proof.”** It does not mean institutional certificate authentication. Export adds no AI, OCR, issuer lookup, scraping, payments, or job integration.

## Owner workflow and formats

Open `/credential-versions` while signed in. Beside eligible historical versions:

- **Download editable DOCX** creates a Word-compatible editable document in server memory.
- **Download TXT** returns the exact UTF-8 saved snapshot, including original whitespace, tabs, and line-ending sequences.
- **Print / Save as PDF** opens a private print-ready view in a new tab. Use the browser's Print / Save as PDF action. EXE does **not** generate or serve a PDF download.

The UI announces preparation, safe errors/retry, and that a download was requested. It does not claim a browser actually saved a file. Download controls are disabled while preparing; keyboard focus returns to the triggering control. Narrow layouts wrap controls and long document text.

| Version state | Export rule |
|---|---|
| `accepted` | Allowed only with an owner acceptance timestamp and valid cumulative provenance/evidence |
| `superseded` | Allowed only with historical owner acceptance and valid cumulative provenance/evidence |
| `candidate` | Blocked; review privately and accept first |
| `rejected` | Blocked |
| `evidence_withdrawn` | Blocked, even if historically accepted |
| Missing/invalid state, acceptance, provenance, or ownership | Blocked |

Displayed actions are based on state/acceptance metadata; every actual export and print request independently rechecks current authorization and provenance. Stale workspace actions therefore cannot bypass withdrawal. Supporting portfolio withdrawal also blocks export, matching M11A's conservative evidence rule.

## Server contract

- DOCX/TXT: `GET /api/credential-versions/[id]/export?format=docx|txt` (DOCX is the default).
- Print: `GET /credential-versions/[id]/print`.
- Both use authenticated `requireCurrentUser`, explicit current-owner filtering, and existing RLS. No service role, Storage download, public object URL, or signed object URL is used.
- One relational database statement reads the selected immutable version, cumulative claim/decision links, minimal evidence withdrawal metadata, and original CV filename. This avoids combining independently timed version and proof reads around withdrawal.
- Validation requires historical owner acceptance; allowed version state; no withdrawal tombstone; all linked claims in `version_created`; exact approved wording and linked decision; same-owner source/proof/optional portfolio; no self-approval; and a complete exact-content inherited chain from the original source to the selected snapshot. Missing ancestors or extra unsupported text fail closed.
- Historical expert authority remains the checked immutable M11A decision. Export does not alter reviewer, approval, owner-acceptance, or withdrawal authority or grant new expert roles.
- Missing, cross-owner, withdrawn, and otherwise non-exportable records return the same neutral unavailable response. Unauthenticated requests return an authentication failure. Unexpected errors disclose no internal detail.
- Successful export input contains only snapshot text, a CV filename for download-name sanitization, and a version number. No proof filenames/bytes, paths, IDs, reviewer notes, expert identity/contact details, tokens, or unrelated records reach the generated document.

Responses use appropriate MIME types, sanitized ASCII attachment filenames, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, `X-Robots-Tag: noindex, nofollow`, and no-referrer. The print route is dynamic and also sends a restrictive CSP with a hash-authorized fixed print script. User text is HTML-escaped; no user-supplied markup executes. Print controls and on-screen notices are hidden in print, leaving only snapshot text.

## Fidelity and dependency

`docx` **9.8.1** (MIT, registry modification date 2026-09-28) is the sole new direct dependency; the lockfile records it and its transitive requirements. Existing `mammoth` and `pdf-parse` read documents and cannot generate editable DOCX. The maintained DOCX library supplies escaped OOXML, ZIP packaging, and paragraph/font/margin handling without handwritten production ZIP/XML generation.

DOCX uses only the immutable saved content. Every logical line, including blank/trailing lines, becomes an editable paragraph with zero added before/after spacing; tabs use Word tab elements. CRLF, CR, and LF become corresponding logical paragraph boundaries; DOCX does not preserve the original byte encoding of newline characters. TXT is the byte-exact UTF-8 fallback. Text is never trimmed, summarized, rewritten, corrected, embellished, or expanded with claims. Source-upload formatting is not reconstructed; this is a clean export of the saved text snapshot. No EXE badge, expert information, or institutional-verification claim is added.

Generation stays in memory; nothing is written to repository/public directories or persisted as another version. Browser object URLs exist only locally for download and are revoked shortly after dispatch. Previously downloaded/printed copies cannot be recalled by later evidence withdrawal; subsequent server requests are blocked after withdrawal.

## Verification and owner handoff

See [actual acceptance results](M11B_ACCEPTED_CV_EXPORT_ACCEPTANCE.md). No schema, migration, RLS, or Storage behavior changed, so no local policy acceptance is required for M11B. Existing M11A policy results remain historical.

After `pnpm review:verify` passes, use `pnpm dev` with the existing local public Supabase settings and synthetic fixtures only. The owner should review accepted/superseded downloads, editable DOCX text in a document editor, Print / Save as PDF pagination, blocked candidate/withdrawn states, stale-action rejection, keyboard focus, narrow widths, and private errors. Record actual findings only. This checklist is not a performed manual review or CP2 evidence.
