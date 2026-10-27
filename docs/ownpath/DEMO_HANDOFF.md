# OwnPath demo handoff — 27 October 2026

## Active release

- Signup: **http://127.0.0.1:4318/sign-up**; sign-in: `/sign-in`; Saved CVs: `/app/cvs`.
- Build **`OblJJtrTCFSNy0qrtjz8-`**, PID `172412` at verification.
- Snapshot: `.local-demo/releases/ownpath-demo-production-k7Jqt3`.
- Start after checking that 4318 is free:
  `node scripts/ownpath-demo-runtime.mjs start .local-demo/releases/ownpath-demo-production-k7Jqt3`
- Safe stop: same command with `stop`. Never overwrite/rebuild a running snapshot.
- Rollback retained: `.local-demo/releases/ownpath-demo-production-aIh2y4`, build
  `6g2nnU7ApUEwJrzu1Q3fN`. Stop the exact current release, then start that snapshot.
- Port 4317 remains PID `9372`; owner browser tabs, current in-memory result and
  saved records were not touched. A currently open tab still uses its loaded code;
  no reload or retroactive rewrite of its result was performed.

## Fixes and acceptance boundaries

Complete structured Rewrite → approved Classic template → direct editing → explicit
revision-guarded save/reopen/export is the primary flow. Legacy saved CVs remain
readable/editable; line assignment is a collapsed optional fallback. Three-item
navigation and the approved template are retained.

The privately inspected reference extraction has an intact research sentence,
quoted title and closing punctuation. The old renderer made each returned bullet
its own row. Adjacent fragments now join only when their combination matches a
cited source span in the same entry/list; unsupported punctuation-only output is
rejected atomically, not discarded. Independent awards remain independent. Provider
instructions preserve research titles and official award names, including spelling.
No actual live response payload was available: the reported split shape was reproduced
with fictional controlled output. This is not a claim of semantic perfection or a
guarantee for every possible cross-entry fragmentation shape.

Scan prompts address the applicant, not a recruiter. Recognizable old recruiter
instructions display a safe conditional applicant action without mutating stored
findings. New guidance never treats missing CV evidence as proof of missing ability.

Owner evidence establishes real visible Scan and structured Rewrite success. The
latest sanitized runtime events each show provider HTTP 200 / `end_turn` and an
application `completed` event after awaited usage finalization acknowledgement.
**Independent hosted ledger/readback, hosted save/update/export, logout/login
persistence and cross-account isolation remain unverified.** No authorized user
access token or service-role credential is available; owner browser storage was not
inspected. Normal Free limits are checked in schema and controlled fixtures, not
claimed as freshly observed hosted allowance values. No historical reconciliation
was repeated. Semantic review of the live CV remains the owner's responsibility.

## Checks run for this release

- `pnpm exec vitest run`: **1,403 passed / 113 files**. Includes transport,
  validation, atomic rejection, usage finalization, Auth and save revision guards.
- `node --test scripts/cv-layout.test.mjs`: **5 passed** (separate Node geometry suite).
- `pnpm exec eslint src e2e scripts next.config.ts eslint.config.mjs vitest.config.mts`
  and `pnpm exec tsc --noEmit`: passed with no lint warnings.
- Isolated production build and **six compiled-browser flows**: PDF upload → Scan →
  structured Rewrite → edit → explicit save → reopen → copy/TXT/PDF; private local
  PDF and legacy TXT; four-page Unicode/long-name/missing-header output; Free
  summary (3 Scan / 1 Rewrite / 3 saves), deduplicated save, listing, update/stale
  revision rejection, logout/login persistence, other-owner read/update denial;
  pending/duplicate-click and rejected-result preservation. These use loopback
  fictional Auth/REST and controlled AI, not hosted services or paid inference.
- Final PDF text independently matches TXT in normalized Unicode order; one-page
  source examples and four-page long output pass A4/margins/no blank-page checks.
  Rendered pages were inspected. Prior reference-design and four activity/date-pair
  visual evidence is reused; not all earlier browser suites were rerun.
- Separate real-config production build: all **294 source hashes** verified;
  production sources/helpers match the controlled build. Compiled real public Auth
  is present and fixture Auth absent. After activation: signup/sign-in HTTP 200,
  four protected routes redirect anonymously, saved/billing APIs return 401,
  **14 served asset hashes** match; Anthropic pinned model and billing OFF verified.
  Auth forms were not submitted. The final real bundle was smoke-tested, while
  authenticated automated flows used the matching-source fixture build.

Private evidence remains local under `.local-demo/evidence/final-acceptance/` and
`.local-demo/evidence/structured-cv/`; do not publish applicant artifacts.

## Short demo

Keep the existing result tab open. In a separate tab sign in, inspect the normal
plan, open a deliberately saved CV, edit a section, explicitly save, reopen it,
then copy/download TXT/print PDF. Check research title/award spelling and accents.
For an already authorized live journey: upload → review extraction → Scan → Rewrite
→ review facts → edit → save → reopen/export. Scan/Rewrite use allowances and may
incur charges; **no additional live request was made during this acceptance pass**.

## Git delivery and intentional exclusions

- Branch: `feat/ownpath-demo-rc` in `https://github.com/EnzoReacher/EXE`.
- Implementation: **`60354c9528140be81556dfe293b2f3189d41767b`**; companion docs commit
  records this handoff. [Branch](https://github.com/EnzoReacher/EXE/tree/feat/ownpath-demo-rc).
- Selectively reviewed implementation, tests, brand assets, generic scripts, five
  schema migrations and useful setup/history docs are included. Schema files do
  not execute grants merely by being committed; **no hosted SQL was executed**.
- Preserved but excluded: private `.env.local`, `.local-demo/`, `.local-diagnostics/`,
  `.factory/` backups/evidence and `.opencode/` machine configuration; dependencies,
  build output, real CVs and generated private artifacts. Only sanitized `.env.example`
  is included, with empty credentials.
- Intentionally untracked: `supabase/diagnostics/` (owner-specific recovery/accounting
  operations), seven historical recovery/credit/tab-compatibility checker scripts,
  and 23 owner diagnostic/recovery/checkpoint docs/JSON. These retain historical
  identifiers or depend on excluded operations; they are not release prerequisites.
  Nothing was deleted, reset, cleaned or stashed. Other worktrees remain intact.

Not claimed: full hosted acceptance, semantic proof, real-device/cross-browser
acceptance, payment readiness, or automatic migration approval.
