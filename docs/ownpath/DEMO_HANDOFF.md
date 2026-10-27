# OwnPath demo handoff — 27 October 2026

## Active release

- Signup: **http://127.0.0.1:4318/sign-up**; sign-in: `/sign-in`; Saved CVs: `/app/cvs`.
- Build **`p39IuhtOe0JYFdj0gkF2q`**, PID `199835` at verification.
- Snapshot: `.local-demo/releases/ownpath-demo-production-xNGqjp`.
- Start after checking that 4318 is free:
  `node scripts/ownpath-demo-runtime.mjs start .local-demo/releases/ownpath-demo-production-xNGqjp`
- Safe stop: same command with `stop`. Never overwrite/rebuild a running snapshot.
- Immediate rollback: `.local-demo/releases/ownpath-demo-production-k7Jqt3`, build
  `OblJJtrTCFSNy0qrtjz8-`. The earlier `aIh2y4` snapshot is also retained.
  Stop the exact current release, then start the chosen verified snapshot.
- Port 4317 remains PID `9372`; owner browser tabs, current in-memory result and
  saved records were not touched. A currently open tab still uses its loaded code;
  no reload or retroactive rewrite of its result was performed.

## Fixes and acceptance boundaries

Complete structured Rewrite → approved Classic template → direct editing → explicit
revision-guarded save/reopen/export is the primary flow. Legacy saved CVs remain
readable/editable; line assignment is a collapsed optional fallback. Three-item
navigation and the approved template are retained.

UI polish follow-up: consistent workspace type/spacing and forest primary buttons;
compact upload/job inputs; scope then priority-sorted Scan findings with one Rewrite
CTA; evidence collapsed without repeated explanations; full-width CV preview with
compact instructions collapsed after success. Save status, editing and exports stay
visible. Saved CVs show last-updated dates and place editing above the preview, with
a useful empty state and cancel-first delete confirmation. Recent CVs are collapsed;
recovery appears only for known uncertainty. Industry-neutral copy and source-derived
section labels remain. Screen-only mobile paper sizing removes blank space; exported
CV template, AI/factual checks, Auth, accounting and saved-data contracts are unchanged.

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

- `pnpm exec vitest run`: **1,405 passed / 114 files**. Includes transport,
  validation, atomic rejection, usage finalization, Auth and save revision guards.
- Reused `node --test scripts/cv-layout.test.mjs`: **5 passed** from the functional
  release; extraction geometry is unchanged in this UI-only follow-up.
- `pnpm exec eslint src e2e scripts next.config.ts eslint.config.mjs vitest.config.mts`
  and `pnpm exec tsc --noEmit`: passed with no lint warnings.
- Isolated production build and **seven compiled-browser flows**: PDF upload → Scan →
  structured Rewrite → edit → explicit save → reopen → copy/TXT/PDF; private local
  PDF and legacy TXT; four-page Unicode/long-name/missing-header output; Free
  summary (3 Scan / 1 Rewrite / 3 saves), deduplicated save, listing, update/stale
  revision rejection, logout/login persistence, other-owner read/update denial;
  pending/duplicate-click and rejected-result preservation; library loading/error/retry,
  empty/saved states and cancel-first deletion. These use loopback
  fictional Auth/REST and controlled AI, not hosted services or paid inference.
- Final PDF text independently matches TXT in normalized Unicode order; one-page
  source examples and four-page long output pass A4/margins/no blank-page checks.
  Export consistency and margins were rechecked after polish. Prior reference-design and four activity/date-pair
  visual evidence is reused; not all earlier browser suites were rerun.
- **28 desktop/mobile state screenshots** captured (1440px / 390px), including
  empty inputs, prioritized findings, Rewrite instructions/loading/ready/saved,
  saved preview, Scan loading/error, and library loading/error/empty/saved/delete.
  Representative screenshots were visually inspected. Core text/button contrast
  ratios are 6.01–11.48:1 (primary button 7.45:1); focus rings and dialog Cancel focus
  were checked. All captured states fit without horizontal overflow; a 320px long-CV
  check also passed. This is not a complete assistive-technology certification.
- Separate real-config production build: all **295 source hashes** verified;
  production sources/helpers match the controlled build. Compiled real public Auth
  is present and fixture Auth absent. After activation: signup/sign-in HTTP 200,
  four protected routes redirect anonymously, saved/billing APIs return 401,
  **14 served asset hashes** match; Anthropic pinned model and billing OFF verified.
  Auth forms were not submitted. The final real bundle was smoke-tested, while
  authenticated automated flows used the matching-source fixture build.

Current evidence: `.local-demo/evidence/ui-polish/`; prior functional evidence:
`.local-demo/evidence/final-acceptance/` and `.local-demo/evidence/structured-cv/`.
These remain private/ignored; do not publish applicant artifacts. Older specialized
browser suites had selectors maintained but were not all rerun.

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
  records the functional handoff. UI polish:
  **`b07b21764cff8f88940b69c5bff33aa2fd749a6d`**; companion docs update records this release.
  [Branch](https://github.com/EnzoReacher/EXE/tree/feat/ownpath-demo-rc).
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
