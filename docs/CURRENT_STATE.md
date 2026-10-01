# EXE Project Current State

**Last updated:** 2026-10-01
**Status:** M1 secure-intake implementation and local Supabase policy acceptance are complete on `codex/exe-web-app-m1`; it awaits owner/source review.

## Completed in this build part

- Cloned the clean `main` baseline and created `codex/exe-web-app-m0` locally and on GitHub for source review.
- Added the Next.js App Router and TypeScript application foundation.
- Built a responsive workspace overview with the project's core value proposition and assessment path.
- Added a clearly labeled fictional report preview using supported, partial, and missing-evidence examples; it has no match score.
- Built the first CV/JD intake screen with PDF/DOCX selection, role/company/JD fields, and browser-only form validation.
- Added privacy and advisory notices. The selected file and job text are not uploaded, persisted, or analyzed.
- Updated setup instructions and added an app-build tracker.
- Added server-only Supabase Auth session access, owner-scoped Postgres/Storage migration policies, and a private `cv-private` Storage bucket definition.
- Added PDF/DOCX CV intake with server-side 5 MiB, extension, signature, and DOCX archive checks; PDF/DOCX parsing stays server-side and uses no AI provider.
- Added saved-CV processing states, parse retry, replace, delete confirmation, safe partial-deletion status, and persisted target-role/company/job-description records.
- Added unit tests for allowed/rejected file validation, target-job validation, PDF/DOCX extraction, and safe malformed/empty parser errors. Test fixtures contain fictional content only.
- Applied `20261001_m1_secure_intake.sql` to an isolated Docker-based local Supabase stack and passed an authenticated two-user RLS/private-Storage acceptance test using only temporary fictional accounts/files.

## Checks run for M1

- `pnpm test` — passed: 3 test files and 13 tests (validation, PDF/DOCX parsing, owner/unauthenticated/partial-delete repository behavior).
- `pnpm lint` — passed.
- `pnpm typecheck` — passed.
- `pnpm build` — passed: `/`, `/assessment`, `/api/intake/cv`, `/api/intake/cv/[id]`, `/api/intake/jobs`, and `/icon.svg` built successfully.
- `git diff --check` — passed.
- Secrets/personal-data diff scan — passed; only configuration placeholders and fictional test strings are present.
- `pnpm test:supabase:local` — passed against a local Docker Supabase stack after `pnpm dlx supabase start`. The test confirms own-user CRUD/replacement/deletion, cross-user and unauthenticated denial, owner-scoped private paths, private-bucket access, extracted-text removal, and retryable deletion-failure state. No hosted Supabase project, production data, or deployment was used.

## Current limits and open decisions

- A reviewed Supabase project/environment is still required for any real user data. Use only placeholder values in `.env`; never commit credentials or real CVs.
- Supabase Storage deletion removes the live object, but project-level backup and retention behavior must be reviewed and documented before real CVs are accepted.
- No AI provider, analysis, scoring, roadmap, rewriting, sharing, job links, payments, or mobile work is included. The existing overview’s report preview remains fictional.
- The current M1 branch starts at M0 commit [`5852f10`](https://github.com/EnzoReacher/EXE/commit/5852f100b9d214ba36c367a173ed968c716eba5a); `main` remains unchanged and no deployment was initiated.

## Resume from here

1. Review provider backup/retention settings and approve private-data handling before any real CV is accepted.
2. Obtain owner review of the M1 feature branch; do not merge or deploy without approval.
3. After M1 owner review, proceed only to M2 evidence-based analysis.
