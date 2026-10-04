# M11B.1 — Local browser acceptance record

**Date:** 2026-10-04

**Branch:** `codex/exe-web-app-m11b1-browser-acceptance`

**Exact remote M11B base:** `64b0dc9e0c138ae31ed0eda102a783f0db9137b5`

**Status:** Engineering gate and complete source review passed. Real local synthetic browser journeys and verified cleanup, targeted checks, preflight, five-step verification, CP2 template validation and working whitespace checks passed. Feature-branch commit/push authorized after staged whitespace verification. This is automated engineering evidence only.

## Actual checks

| Command | Actual result |
|---|---|
| `pnpm vitest run scripts/e2e-local-support.test.mjs scripts/e2e-local-reporter.test.mjs src/app/credential-versions/workspace.test.tsx` | Passed — 21 tests, 3 files |
| `pnpm test:e2e:local` | Passed — all synthetic journey steps on existing local Supabase and cached Chromium; isolated owned Turbopack server, verified current-run cleanup and temporary artifact removal |
| `pnpm review:preflight` | Passed — public loopback settings/fictional fixture; no values printed |
| `pnpm review:verify` | Passed all five steps: preflight, lint (no warnings), typecheck, 281 tests in 35 files, production build |
| `pnpm cp2:validate` | Passed template validation only; CP2 evidence explicitly pending |
| `git diff --check` / `git diff --cached --check` | Passed working and staged checks after removal of four Markdown trailing spaces |
| `node --check scripts/e2e-local.mjs` / `node --check scripts/e2e-local-support.mjs` | Passed both harness syntax checks |

## Failures diagnosed, scope and coverage

- Initial generic alert locator was ambiguous; scoped the validation assertion to its actual `#claim-error` announcement. Required assertions retained.
- Real 320px page overflow fixed narrowly with credential-workspace grid/fieldset constraints. No workflow authority change.
- Native Chromium inline proof viewer raised sandbox/opaque-origin `SecurityError`; retained security headers and exercised the existing authenticated download review path. App-page error assertion retained. Inline-preview compatibility is not claimed passed.
- Temporary server-copy experiment using Webpack returned HTTP 500 on CV upload. Final harness copies installed dependencies (preserving pnpm relative links) and uses normal Turbopack; isolated-server browser flow passed. Hard links across filesystems were unavailable; `cp -a --reflink=auto` copies without network downloads.
- Every completed failed browser attempt ran current-run fixture cleanup and reported its actual failure. No browser screenshots, traces, videos or documents were committed.
- First staged whitespace check found four Markdown hard-break trailing spaces in the new guides; removed before final staged verification.
- Covered genuine owner/expert sign-in, synthetic CV/proof upload, pending claim, assigned-only review/download, exact-wording automated synthetic approval, candidate/export denial, explicit owner acceptance, DOCX/TXT contents/metadata, private print view, anonymous/non-expert/unassigned/cross-owner denials, withdrawal and stale-action errors.
- Covered keyboard forms, names, invalid-error announcement/focus, visible primary-action focus and page/action bounds at 320/375/768/1024/1440px. No human approval or accessibility/usability result is inferred.

## Not performed / pending gates

- `pnpm test:supabase:local`: **Not performed — browser harness only; no database/RLS/Storage changes.** Existing local Supabase was used by the browser suite; no schema/policy/migration/Storage configuration change or container management.
- Manual M11A owner/browser/accessibility review, screen-reader evaluation/full accessibility audit: **Not performed; pending.**
- Native inline proof-preview compatibility review: **Not performed; pending** after the observed native sandbox error.
- Actual browser print dialog, PDF generation/pagination, external document-editor review: **Not performed; pending.** Print-view assertions are not printing/editor results.
- Real users/documents/certificates/experts/participant data; external AI/OCR/issuer lookup/payments/job boards/hosted Supabase: **Not performed.** All fixtures synthetic; no institutional authentication.
- SIGKILL/machine-failure recovery and full interruption fault-injection: **Not performed.** Catchable interruption cleanup is implemented; normal/failure cleanup was exercised.
- CP2 evidence collection/review, demand/pricing/competitor/product validation: **Not performed; pending.** Evidence register and manual-review completion records untouched.
- Expert-role/privacy/backup/retention approval, PR, merge, deployment, public/live release or release approval: **Not performed; pending owner decisions.**

## Final source review

Complete review covered **17 intended text files**: manifests/lockfile, harness/config/spec/reporter and guard/privacy tests, documentation, and the narrow CSS/workspace class regression fix. Local credential-value/pattern, generated-file and protected-scope scan passed. No environment/secret/binary/generated document, real identity/data, test-auth bypass, hosted network target, schema/RLS/Storage/configuration/deployment or CP2 evidence/manual-review change. Negative hosted-URL guard examples exist only in deterministic tests. Local `main` remains `d956118e3b89eb1fdcfd10fb48a45ba150fec20a`; HEAD before commit is the exact M11B base. Final staged whitespace verification passed; push only the authorized feature branch without force. Setup and cleanup contract: [M11B.1 guide](M11B_1_LOCAL_BROWSER_ACCEPTANCE.md).
