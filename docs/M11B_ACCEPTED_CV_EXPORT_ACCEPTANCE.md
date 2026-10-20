# M11B — Accepted CV export acceptance

**Date:** 2026-10-04

**Branch:** `codex/exe-web-app-m11b-cv-export`

**Exact M11A base:** `bc24377d57d503a21059ee0a467ede23252f289a`.

**Status:** Engineering gate and final source review passed. Feature-branch commit/push authorized after staged-diff verification. Owner-directed technical prototype only; no live release approval.

## Completed implementation

- Owner-authenticated accepted/superseded export with historical acceptance and complete immutable claim/decision/evidence-chain validation using one RLS-scoped relational statement.
- In-memory editable DOCX via `docx` 9.8.1; exact UTF-8 TXT fallback; filename sanitization and private/no-store/nosniff attachment headers.
- Private escaped print HTML with hash-authorized fixed print action and print-specific typography/control hiding. Browser Print / Save as PDF only, no generated PDF download.
- Version-history export controls, plain-language blocked-state reasons, live loading/error status, safe retry and keyboard-focus restoration.
- No schema, migration, RLS, Storage, approval, acceptance, reviewer, withdrawal, deployment, or CP2 register change.

## Actual checks

| Command | Actual result |
|---|---|
| `pnpm vitest run src/lib/cv-export/repository.test.ts src/lib/cv-export/document.test.ts 'src/app/api/credential-versions/[id]/export/route.test.ts' src/app/credential-versions/export-controls.test.tsx src/app/credential-versions/workspace.test.tsx` | Passed — 48 tests, 5 files (42 M11B tests plus 6 M11A workspace regressions) |
| `pnpm review:preflight` | Passed — local public settings/fictional fixture checks; no values printed |
| `pnpm review:verify` | Passed all five sequential checks: preflight, lint, typecheck, 266 tests in 33 files, and production build (telemetry disabled by runner) |
| `pnpm cp2:validate` | Passed template validation only; CP2 evidence remains pending |
| `git diff --check` / `git diff --cached --check` | Passed working-tree and staged checks before commit |
| Final source/secret/generated-document review | Passed — 20 intended text source/documentation/manifest files; no local credential-value/pattern matches, real/binary/generated documents, database/deployment/configuration or CP2 register changes |

All required commands passed; no failed required check was hidden or bypassed. Exact M11A base was confirmed before branching. Local `main` remained `d956118e3b89eb1fdcfd10fb48a45ba150fec20a`; only the M11B branch is authorized for push. No environment values were printed or staged. Dependency/lockfile changes contain only `docx` and its required transitive packages.

Tests use only synthetic CV text and mocked fictional evidence metadata. An independent test-only ZIP reader inspects generated DOCX bytes in memory, decodes editable document text, and confirms line/tab/blank/trailing-line preservation. Tests also cover CRLF/CR logical boundaries and byte-exact TXT, inherited and missing provenance, changed wording, withdrawals, cross-owner/anonymous denial, sanitized headers, private print escaping/CSP, blocked-state labels, keyboard preparation/retry/focus, and truthful download status. No generated documents are written to disk.

## Not performed and pending gates

- `pnpm test:supabase:local` — Not performed; no database/RLS/Storage behavior change.
- Manual browser/mobile/keyboard/screen-reader/accessibility review, browser printing/PDF pagination, and external document-editor opening — Not performed.
- M11A manual owner/browser/accessibility review — Still pending; no owner result supplied or marked complete.
- Real CVs/proof/portfolios, expert outcomes/enrollment, participant data, or research — Not performed.
- CP2 collection/review, broader product validation, expert-role policy, privacy/backup/retention approval — Pending.
- Generated PDF download, AI, OCR, issuer authentication, scraping, payments, job integration — Not performed; outside scope.
- PR, merge, deployment, live app/public release, or release approval — Not performed.

This engineering acceptance is not evidence of demand, usability, certificate issuer authenticity, product-market fit, privacy approval, or manual owner review. See [M11B guide](M11B_ACCEPTED_CV_EXPORT.md).
