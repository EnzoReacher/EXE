# EXE Project Current State

**Last updated:** 2026-10-02
**Status:** M1 is accepted as the baseline. M2 evidence analysis and M3 roadmap/source-grounded CV draft are implemented on `codex/exe-web-app-m2`; automated code checks pass, while the expanded M2/M3 local Supabase integration and owner review remain pending.

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
- Started M2 from M1 commit `7909dc8` in a separate feature worktree; the original M0 workspace was left untouched.
- Added a server-side local wording adapter, labeled requirement extraction, four evidence states, self-reported claim vs example-context labels, excerpt/offset validation, saved analysis runs, and a private report UI.
- Added retry-safe request IDs, run retry handling, owner-scoped analysis/finding tables and RLS, and CV-delete cascades for derived excerpts.
- The AI provider is still unselected. M2 sends no CV/JD text to an external AI provider; the local wording adapter can miss context and cannot assess proficiency.
- Added unit coverage for direct/partial/ambiguous/missing/contradictory wording, excerpt traceability, malformed output, injection-like text as data, transient provider failure/retry, authentication, cross-user inputs, and CV readiness.
- Added M3 private roadmap actions linked to missing/partial/unclear findings, including priority, explanation, and a user-controlled progress state.
- Added a source-grounded CV draft screen. Initial generated claims are exact previously stored CV excerpts with requirement and offset provenance; editing and explicit acceptance are available to the user.
- Added `20261002_m3_roadmap_cv_draft.sql` with owner-scoped roadmap, draft, and provenance records. Source-CV deletion cascades to all M2/M3 derived records.
- Added the single living project report: `docs/PROJECT_MASTER_REPORT.md`.

## Checks run for M1

- `pnpm test` — passed: 3 test files and 13 tests (validation, PDF/DOCX parsing, owner/unauthenticated/partial-delete repository behavior).
- `pnpm lint` — passed.
- `pnpm typecheck` — passed.
- `pnpm build` — passed: `/`, `/assessment`, `/api/intake/cv`, `/api/intake/cv/[id]`, `/api/intake/jobs`, and `/icon.svg` built successfully.
- `git diff --check` — passed.
- Secrets/personal-data diff scan — passed; only configuration placeholders and fictional test strings are present.
- `pnpm test:supabase:local` — passed against a local Docker Supabase stack after `pnpm dlx supabase start`. The test confirms own-user CRUD/replacement/deletion, cross-user and unauthenticated denial, owner-scoped private paths, private-bucket access, extracted-text removal, and retryable deletion-failure state. No hosted Supabase project, production data, or deployment was used.
- M2/M3 local code checks — `pnpm test` passed (6 files, 35 tests); `pnpm lint`, `pnpm typecheck`, `pnpm build`, `node --check scripts/m1-local-policy-check.mjs`, and `git diff --check` passed. The current environment has no Docker or Supabase CLI executable, so the expanded M2/M3 Supabase integration script has not been run here.

## Current limits and open decisions

- A reviewed Supabase project/environment is still required for any real user data. Use only placeholder values in `.env`; never commit credentials or real CVs.
- Supabase Storage deletion removes the live object, but project-level backup and retention behavior must be reviewed and documented before real CVs are accepted.
- No AI provider has been selected. The M2 matcher and M3 composer are local deterministic tools, do not independently validate skills, and do not produce a hiring score. Sharing, job links, payments, and mobile work remain out of scope.
- Supabase backup/retention settings still need review before using real CVs. M2/M3 migrations and two-user RLS/cascade checks have not yet been run in the current environment.
- M1 branch `codex/exe-web-app-m1` was approved as M2's base. `main` remains unchanged; no merge or deployment was initiated.

## Resume from here

1. Run `pnpm test:supabase:local` against local Docker Supabase to verify M2/M3 RLS, retry-safe request IDs, roadmap/draft isolation, and deletion cascades.
2. Review the M2 evidence report and M3 roadmap/draft with fictional data; confirm that the wording is clear for students and recent graduates.
3. Choose and review an AI provider only after the team evaluates cost, privacy, retention, and consent; until then, keep local mode clearly labeled.
4. Review Supabase backup/retention settings before using real CVs. Do not merge to `main` or deploy without explicit owner approval.
