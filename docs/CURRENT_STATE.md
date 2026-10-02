# EXE Project Current State

**Last updated:** 2026-10-02
**Status:** M10.2 existing-experience engineering hardening passed automated/local fictional checks on `codex/exe-web-app-m10-2-hardening` from exact M10 baseline `4af832c`. M7/M10.2 owner manual review remains pending. CP2 evidence collection is pending, the target segment remains open, M11 is blocked, and no merge, deployment, public production environment, or real-data authorization exists. See `M10_2_HARDENING_ACCEPTANCE.md` for actual checks and owner follow-up.

## Completed in this build part

- M10.5 local owner-review preflight added on `codex/exe-web-app-m10-5-qa-preflight` from M10.3 `9d9e3c2`: `pnpm review:preflight` reads only a local `.env.local`, requires local public Supabase browser settings, rejects private credential settings or hosted URLs without echoing values, and confirms the fictional DOCX demo/checklist are available. The full test suite passed (179 tests in 24 files), along with lint, typecheck, production build, direct synthetic CP2 checks, and diff check. An initial sandbox-only child-process capture issue was resolved by a full outside-sandbox rerun and is documented only as diagnostic context. It has no network call, no write, no app workflow change, and does not replace browser testing or create CP2 evidence. See `M10_5_QA_PREFLIGHT.md` and `M10_5_QA_PREFLIGHT_ACCEPTANCE.md`.

- M10.3 local CP2 research operations toolkit prepared on `codex/exe-web-app-m10-3-research-ops` from M10.2 `bd34743`: ignored private drafts, aggregate survey validation/neutral summaries, source-log completeness checks, schemas, synthetic fixtures and owner handoff. No app workflow changes or collected evidence. Checks passed: final 175 tests in 23 files, lint/typecheck/build, all required script syntax/template/synthetic CLI/diff checks and fictional local Supabase acceptance. See `M10_3_RESEARCH_OPS_ACCEPTANCE.md`.

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
- Ran the expanded M1/M2/M3 local Supabase acceptance with Docker and `pnpm dlx supabase` 2.119.0, using only two temporary fictional accounts and fictional CV/JD content. It passed private Storage, ownership, read/write/update/delete denial, request-ID uniqueness, and all source-CV deletion cascades.
- Corrected a real local-stack blocker: M1/M2 and M2/M3 had duplicate date-only Supabase migration versions. The M2 migration is now `20261002_m2_evidence_analysis.sql`; M3 is `20261003_m3_roadmap_cv_draft.sql`.
- Added M4 private saved work: an owner-scoped server DTO/API and return-to-work screen with role, optional company, CV filename, date, report state, derived finding summary, and draft-review state only.
- Added plain-language empty, loading, session/private-data error, report-processing, failed-report retry, no-plan, and saved-draft-review states, plus Saved work navigation and narrow-mobile layout improvements.
- Added M6a private review links for one completed report, optionally including only its explicitly accepted CV draft. Owners select 24-hour, 7-day, or 30-day expiry, receive the raw URL only at creation, can revoke links, and can read feedback scoped to their own shares.
- Added `20261004_m6_private_review_links.sql`: owner RLS, SHA-256 token hashes, direct-anonymous table denial, limited public token RPC functions, feedback idempotency, accepted-draft validation, source-deletion cascades, and automatic link revocation when an included draft is edited/unaccepted.
- Added unlisted `/review/[token]`, marked `noindex,nofollow` and private no-store through route metadata and response headers. It projects only selected report findings/excerpts and optional accepted draft, has a neutral unavailable state, and provides an accessible bounded plain-text advisory feedback form without reviewer accounts.
- Added M6b private `/opportunities`: a user can select their own saved target job, store an HTTPS reference they found, add an optional company/note, and track only their own `saved`, `preparing`, `applied`, `closed`, or `dismissed` process state. It clearly states that EXE does not check the page, vacancy, or CV fit.
- Added `20261005_m6b_private_opportunity_links.sql`: owner RLS, same-owner target-job composite foreign key, status constraint, and target-job deletion cascade. The M6b server APIs validate HTTPS-only links, reject embedded credentials and malformed/overlong inputs, and do not fetch, scrape, preview, parse, or otherwise inspect external URLs.
- Added an intentionally empty typed future curated-source contract and `docs/OPPORTUNITY_CURATION_STANDARD.md`. No real source or listing is present; CP2 evidence plus documented team approval remains required before one can appear.
- Added M7 release-candidate response hardening: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, restrictive `Permissions-Policy`, and no-store headers for API/review routes. CSP remains deliberately deferred pending approved deployed-origin policy review.
- Added `docs/RELEASE_CANDIDATE_ACCEPTANCE.md`, `docs/OWNER_REVIEW_M7.md`, and `.github/workflows/quality.yml`. CI does not deploy and contains no secrets or hosted Supabase checks.
- Added M8 documentation-only CP2 and owner-review package: research plan, consent-safe target-user/expert interview guides, anonymous survey template, blank example-only evidence register, cited-source competitor/pricing template, owner execution checklist, and index. No participants, CVs, contact information, results, competitor facts, prices, or market claims were added.
- Added M9 CP2 evidence-gate tooling: a template/collected-register validator with deterministic fictional tests; package commands; evidence-review, decision-gate, next-feature-selection, and owner-status templates. No production workflow was changed, no feature was selected, and no evidence was collected automatically.
- Added M10 CP2 execution workspace: `M10_CP2_EXECUTION_STATUS.md`, `M10_RESEARCH_SESSION_LOG.md`, and `M10_PRODUCT_DIRECTION_DECISION.md`. These are blank owner/team execution records; no participant/source evidence, product-direction decision, or M11 feature selection was added.
- Performed an M10 repository evidence review. The CP2 register remains example-only; no owner-review result, anonymized interview/expert/survey evidence, current public market/competitor/pricing source, or product-direction review was supplied. Recorded the exact missing inputs without adding an evidence row, claim, or M11 feature selection.

## Checks run for M1

- `pnpm test` — passed: 3 test files and 13 tests (validation, PDF/DOCX parsing, owner/unauthenticated/partial-delete repository behavior).
- `pnpm lint` — passed.
- `pnpm typecheck` — passed.
- `pnpm build` — passed: `/`, `/assessment`, `/api/intake/cv`, `/api/intake/cv/[id]`, `/api/intake/jobs`, and `/icon.svg` built successfully.
- `git diff --check` — passed.
- Secrets/personal-data diff scan — passed; only configuration placeholders and fictional test strings are present.
- `pnpm test:supabase:local` — passed against a local Docker Supabase stack after `pnpm dlx supabase start`. The test confirms own-user CRUD/replacement/deletion, cross-user and unauthenticated denial, owner-scoped private paths, private-bucket access, extracted-text removal, and retryable deletion-failure state. No hosted Supabase project, production data, or deployment was used.
- M2/M3 local code checks — `pnpm test` passed (6 files, 35 tests); `pnpm lint`, `pnpm typecheck`, `pnpm build`, `node --check scripts/m1-local-policy-check.mjs`, and `git diff --check` passed.
- M2/M3 local Supabase acceptance — passed on 2026-10-02: `pnpm dlx supabase start`, then `set -a; eval "$(pnpm dlx supabase status -o env | grep -E '^(API_URL|PUBLISHABLE_KEY)=')"; set +a; SUPABASE_URL="$API_URL" SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY" pnpm test:supabase:local`. The check used only temporary fictional accounts and fictional source content.
- M4 checks — passed on 2026-10-02: `pnpm test` (7 test files, 40 tests), `pnpm lint`, `pnpm typecheck`, `pnpm build`, `node --check scripts/m1-local-policy-check.mjs`, and `git diff --check`. The available local stack also reran and passed `pnpm test:supabase:local` with fictional data only.
- M5 demo package — completed on 2026-10-02: `docs/demo/` contains the fictional Aria Vale CV/JD material, parser-verified 1,489-byte DOCX fixture, local environment checklist, CP1 Slot 8 runbook, product/service description, technology/tools description, and owner review checklist. All names, company, qualifications, and achievements are fictional.
- M5 final checks — passed on 2026-10-02: `pnpm test` (7 files, 40 tests), `pnpm lint`, `pnpm typecheck`, `pnpm build`, `node --check scripts/m1-local-policy-check.mjs`, `git diff --check`, and repeated `pnpm test:supabase:local` with temporary fictional local accounts/content only.
- M6a checks — passed on 2026-10-02: `pnpm test` (9 files, 44 tests), `pnpm lint`, `pnpm typecheck`, `pnpm build`, `node --check scripts/m1-local-policy-check.mjs`, `git diff --check`, and `pnpm test:supabase:local` after local `supabase db reset`. The two-user fictional acceptance checks share isolation, direct-table denial, selected-only content, expired/revoked/invalid denial, bounded feedback/idempotency, accepted-draft and draft-edit guards, and deletion cascades.
- M6b checks — passed on 2026-10-02: `pnpm test` (10 files, 51 tests), `pnpm lint`, `pnpm typecheck`, `pnpm build`, `node --check scripts/m1-local-policy-check.mjs`, `git diff --check`, and `pnpm test:supabase:local` after `pnpm dlx supabase db reset --local`. The fictional two-user acceptance checks opportunity owner CRUD, anonymous and cross-user denial, cross-user target-job reference denial, and target-job cascade.
- M7 checks — passed on 2026-10-02: `pnpm test` (**11 files, 54 tests**), `pnpm lint`, `pnpm typecheck`, `pnpm build`, `node --check scripts/m1-local-policy-check.mjs`, `git diff --check`, and `pnpm test:supabase:local` with temporary fictional local accounts. See `docs/RELEASE_CANDIDATE_ACCEPTANCE.md` for the complete 20-item acceptance record.
- M8 checks — passed on 2026-10-02: documentation-only changes ran `pnpm test` (**11 files, 54 tests**), `pnpm lint`, `pnpm typecheck`, and `pnpm build`. No application behavior was intentionally changed.
- M9 checks — passed on 2026-10-02: `pnpm test` (**12 files, 65 tests**), `pnpm lint`, `pnpm typecheck`, `pnpm build`, `node --check scripts/validate-cp2-evidence.mjs`, `pnpm cp2:validate`, and the explicit template-mode validator command. `git diff --check` passed. `pnpm test:supabase:local` also passed using the available local Supabase stack and two temporary fictional users; it did not access a hosted or production system.

## Current limits and open decisions

- M10.2 checks passed: 115 tests in 22 files, lint, typecheck, build, both policy/evidence script syntax checks, CP2 template validation and diff check. Local Supabase acceptance passed with temporary fictional users only. CI checks were updated but a remote CI outcome is not claimed.
- M10.2 hardens existing flows through skip/focus/form/readability/responsive/reduced-motion safeguards, truthful asynchronous states and narrow safe API validation/error fixes. No schema/RLS/token lifecycle changes, research records or major features were added.
- Connected-browser testing could not run because `browser.disconnected`. Complete `M10_2_OWNER_REVIEW.md` at all listed widths, keyboard/zoom and assistive-technology modes; this remains an owner gate.

- A reviewed Supabase project/environment is still required for any real user data. Use only placeholder values in `.env`; never commit credentials or real CVs.
- Supabase Storage deletion removes the live object, but project-level backup and retention behavior must be reviewed and documented before real CVs are accepted.
- No AI provider has been selected. The M2 matcher and M3 composer are local deterministic tools, do not independently validate skills, and do not produce a hiring score. M6a private sharing and M6b private user-saved opportunity references are implemented; payments, marketplace/reviewer verification, messaging, job-board integration, scraping, external URL fetching, and real curated listings remain out of scope.
- Saved work is a minimal private index, not a data-export or source-text browsing feature. It deliberately excludes sensitive source content and internal records from list responses.
- Supabase backup/retention settings still need review before using real CVs. The local M2/M3 migration and two-user RLS/cascade checks now pass; this does not replace an owner security/privacy review.
- M1 branch `codex/exe-web-app-m1` was approved as M2's base. `main` remains unchanged; no merge or deployment was initiated.
- The M5 package supports a fictional-data local demo, not a completed CP1 course checkpoint. A connected-browser pixel review was unavailable during the final implementation session; the owner must complete the desktop and narrow-mobile visual review in the M5 checklist before presenting.
- Connected-browser interactive review was also unavailable for M7. Static responsive/focus inspection passed, but the owner must complete desktop/narrow-mobile visual and keyboard review before approving a release.
- M8 preparation is not research evidence. Pricing, lower-price, better-value, competitor, market, target-segment, and validation claims remain blocked until CP2 evidence is collected and owner/team reviewed.
- M9 validator success is not research validation. Claims that EXE is cheaper, better, better value, validated, in demand, more private, easier to use, market-ready, or competitively superior remain blocked until relevant evidence and owner/team review exist.
- M10 has not satisfied the decision gate: no real evidence IDs, source IDs, owner/team review, target segment, pricing decision, or M11 approval exists. CP2 and M11 remain blocked.

## Resume from here

1. Complete the M7 owner review using fictional data only.
2. Complete the M5 CP1 demo rehearsal and record the required course evidence.
3. Provide/collect the exact missing consent-safe inputs listed in `M10_CP2_EXECUTION_STATUS.md`; keep raw identities outside Git, enter anonymized summaries, and run the M9 validator.
4. Complete the M10 product-direction decision only after owner/team review. Do not select an M11 feature before this gate.
5. Complete privacy, retention, backup, merge, and deployment review with explicit owner approval.

- M10 evidence-pending documentation review checks passed on 2026-10-02: `pnpm test` (**12 files, 65 tests**), `pnpm lint`, `pnpm typecheck`, `pnpm build`, `node --check scripts/validate-cp2-evidence.mjs`, `pnpm cp2:validate` (template mode, reporting evidence pending), and `git diff --check`. No application behavior changed. No merge or deployment occurred.
