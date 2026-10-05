# EXE Web App Build Tracker

This tracks engineering work separately from course grading checkpoints. Mark a part complete only after its acceptance criteria and checks have been reviewed. The GitHub feature branch is for source review; do not merge to `main` or deploy without the project owner's approval.

## Latest — M14 visual foundation

Prepared on `codex/exe-web-app-m14-visual-foundation` from M13 head `b8e5cbb6c00222215d5382f17274480698b0f018`. Refined shared visual tokens and scoped the public landing/sign-in/sign-up styling, reflow, focus, and reduced-motion behavior. Added a design-system guide and owner acceptance checklist. M13 engineering/Quality passed, but its real local-Supabase browser journey remains pending. M14 automated Quality and owner visual/accessibility review are pending until verified. No account/backend/schema changes, PR, merge, deployment or release approval. See `M14_VISUAL_DESIGN_SYSTEM.md`, `M14_VISUAL_ACCEPTANCE.md`, and [the master report](PROJECT_MASTER_REPORT.md).


| Part | Status | Scope | Exit criteria |
|---|---|---|---|
| M0 — Web app shell | Complete, awaiting owner review | Next.js + TypeScript shell, responsive overview, fictional report example, CV/JD intake UI, browser-only validation | App builds; lint and type checks pass; no file or job data leaves the browser; no deployment |
| M1 — Secure intake and identity | Local policy acceptance passed — owner approved as M2 baseline | Supabase Auth, private CV storage, PDF/DOCX parsing, target role/JD persistence, replace/delete controls | Local two-user RLS/Storage policy checks pass; parse failures recover; CV and derived text can be deleted |
| M2 — Evidence-based analysis | Local Supabase acceptance passed — owner review pending | Local requirement extraction, four evidence states, CV excerpts, self-reported claim vs example context, owner-scoped saved runs, retry/report UI | Findings cite exact CV text or say no text was found; provider output is validated; run/finding RLS and deletion cascade passed local integration |
| M3 — Roadmap and grounded CV draft | Local Supabase acceptance passed — owner review pending | Private gap-linked roadmap, editable source-grounded CV draft, claim provenance, explicit acceptance, owner-scoped storage | Actions connect to gaps; generated draft claims trace to CV excerpts; user reviews changes before use; RLS/cascade checks passed locally |
| M4 — Saved work and integration polish | Complete — owner review pending | Private saved-work history, empty/loading/error states, security and responsive review | Full core flow works with fictional data; private owner-scoped list DTO, responsive navigation, and failure handling passed checks |
| M5 — CP1 Slot 8 demo readiness | Demo package complete — owner/course review pending | Fictional CV/JD fixture, local setup checklist, 3–5 minute core-flow runbook, known limits, product/service and technology description, failure plan, owner checklist | Fictional-data local demo package and automated verification are complete; owner must perform the presentation review before CP1 can be marked complete |
| M6a — Private review links and feedback | Complete — owner review pending | Owner-selected completed report, optional accepted draft, expiry, revoke, bounded feedback, and unlisted reviewer view | M6a migration/RLS/RPC, local fictional two-user acceptance, and quality checks pass |
| M6b — Private opportunity links and curated-source framework | Complete — owner review pending | Private owner-saved HTTPS job references and status tracking; empty future team-curated-source contract | Owner RLS/same-owner target-job guard/cascade, server validation, quality checks, and local fictional two-user acceptance pass; no fetching, scraping, or real listings |
| M7 — Internal release candidate | Ready for owner review | Privacy/route audit, response hardening, fictional acceptance evidence, non-deploying CI, and owner handoff | 54 unit tests, lint, typecheck, build, script syntax/diff checks, and local M1–M6b fictional Supabase acceptance pass; owner must complete connected-browser desktop/narrow-mobile keyboard and visual review and record the release decision |
| M8 — Research and owner-review package | Prepared — evidence collection pending | CP2 plan, consent-safe target-user/expert guides, anonymous survey, blank register, current-source alternative/pricing template, and owner checklist | No real participant, market, competitor, pricing, or acceptance results are present. Owner must collect/review evidence before product-value, affordability, competitive, or validation claims and before choosing the next feature. |
| M9 — Evidence gate and product-decision workflow | Evidence gate prepared — CP2 evidence pending | Template/collected register validator, deterministic tests, review template, decision gate, qualitative next-feature matrix, and owner status | Validator checks structural/safety requirements only; it does not prove research quality. No product feature selected or app workflow changed. M11 selection is blocked until reviewed evidence and the documented decision gate are complete. |
| M10 — CP2 research execution workspace | Evidence collection pending | CP2 execution status, research-session log, product-direction decision, and owner gate | M10 evidence review found only template/example material. No owner-review result, collected research, public source record, product direction, or M11 feature decision is recorded; M11 remains blocked until reviewed CP2 evidence. |
| M12 — Public landing and account access | Implemented — local auth acceptance pending | Public landing, Supabase email/password sign-in/sign-up, confirmation callback, and session refresh | M12 implementation passed recorded build checks; M13 local browser journey remains an owner action. See master report and `M13_AUTH_ACCEPTANCE.md`. |
| M13 — Local landing and account acceptance | Engineering checks passed — owner local run pending | Synthetic local account journey, session persistence, generic failures, anonymous denial, and collected-mode CP2 CI repair | GitHub Quality passed; owner must still run the journey against the existing local Supabase stack. |
| M14 — Public visual foundation | Implementation on feature branch — automated checks and owner review pending | Shared visual tokens, landing/auth styling, responsive and reduced-motion rules, review documentation | Check current GitHub Quality, then record actual visual, keyboard, responsive, and accessibility review. No backend or auth behavior changes. |

## M10.2 existing-experience hardening

Engineering hardening checks passed on `codex/exe-web-app-m10-2-hardening` from exact M10 commit `4af832c`: 115 tests in 22 files, lint/typecheck/build, both script syntax checks, CP2 template validation, diff check and local fictional Supabase acceptance. Scope: current-route clarity, forms/keyboard support, shared responsive/readability safeguards, safe asynchronous/error behavior, privacy audit and meaningful regressions. Actual outcomes are recorded in `M10_2_HARDENING_ACCEPTANCE.md`; connected browser was unavailable and manual owner review is required. CP2 remains pending and no M11 feature is selected. No claim, merge or deployment is authorized.

## M10.3 research operations toolkit

Prepared on `codex/exe-web-app-m10-3-research-ops` from M10.2 `bd34743`: local-only aggregate/source validation and neutral summaries, ignored private directories, synthetic regression fixtures and owner schemas/handoff. Final 175 tests in 23 files and required quality/local fictional checks passed. No application workflow change or automated collection. CP2 remains pending, target segment/job family open, price/competitor claims blocked and M11 blocked. M7/M10.2 owner browser review remains pending; no merge or deployment. See `M10_3_RESEARCH_OPS_ACCEPTANCE.md`.

## M10.5 local owner-review preflight

Prepared on `codex/exe-web-app-m10-5-qa-preflight` from M10.3 `9d9e3c2`: a local-only `pnpm review:preflight` check for a bounded `.env.local`, public loopback Supabase settings, absence of private credential settings, and the fictional demo DOCX/owner checklist. The full suite passed (179 tests in 24 files), along with lint, typecheck, production build, direct synthetic CP2 checks, and diff check. An initial sandbox-only child-process capture issue was resolved by a full outside-sandbox rerun; it is retained in the acceptance record as diagnostic context, not a remaining test failure. The preflight emits no configuration values, sends no network requests, writes no data, and does not substitute for a browser review. CP2 evidence, M11 selection, merge, deployment, and real-data authorization remain blocked. See `M10_5_QA_PREFLIGHT.md` and `M10_5_QA_PREFLIGHT_ACCEPTANCE.md`.

## M10.6 local verification runner and handoff

Authorized continuation on 2026-10-03 preserved the existing M10.6 changes in place. Earlier attempts found absent local configuration; the final controlled sequence passed all five runner steps after configuration became available. No configuration values were printed or staged.

Implemented on `codex/exe-web-app-m10-6-review-verify` from exact remote M10.5 `aaee9f93d366f61ab2f284cdab363fa6cb582300`: `pnpm review:verify` runs preflight → lint → typecheck → test → build sequentially with inherited output, timing and first-failure status. Final engineering gate passed: 189 tests in 25 files (including ten runner tests), lint/typecheck/build, preflight and CP2 template/diff checks. See `M10_6_REVIEW_VERIFY_ACCEPTANCE.md`.

Not performed — no database/API/RLS/Storage change: `pnpm test:supabase:local`. Manual browser/mobile/keyboard/screen-reader/accessibility and privacy review are not performed. Pending owner action: configure existing local public settings, run `pnpm review:verify` then (only on success) `pnpm dev`, and complete `M10_2_OWNER_REVIEW.md` with only the fictional DOCX in `docs/demo/fixtures/` and actual date/viewport/keyboard/issues/retests. Reuse an existing local stack; port `54322` occupancy does not justify a duplicate. CP2 collection/review and M11 decision gate remain blocked/pending. No merge to main, no deployment; owner approval required. See `M10_6_REVIEW_VERIFY.md`.

## M11A — Owner-directed credential-gated CV version prototype

Engineering gate passed from published M10.6 `5dd5fbebf688aeafe20ecc91cb55838bdc5d851e` on `codex/exe-web-app-m11a-credentialed-cv-versions`. Seven private record types, two private buckets, frozen claims, active team-approved authenticated expert review, exact-wording immutable candidates, before/after owner acceptance/history, individual claim and cumulative evidence withdrawal. Passed 35 targeted tests, five-step verification (224 full-suite tests), CP2 template validation and existing-stack fictional RLS/Storage acceptance. Existing drafts/token reviews preserved. No CP2 validation or real expert approval. Manual browser/accessibility review, role administration policy, privacy/retention approval, CP2 and broader product-market decisions remain pending. No merge/deployment/PR/release approval. See `M11A_CREDENTIAL_GATED_CV_VERSIONING_ACCEPTANCE.md`.

## M11B — Owner-directed accepted CV export prototype

Engineering gate passed from exact published M11A `bc24377d57d503a21059ee0a467ede23252f289a` on `codex/exe-web-app-m11b-cv-export`. In-memory editable DOCX, exact UTF-8 TXT, private browser Print / Save as PDF, fresh owner/historical-acceptance/complete-provenance checks, safe filenames/headers, and accessible export controls. Candidates/rejected/evidence-withdrawn versions blocked. No saved text rewriting or proof metadata export; no database/RLS/Storage/authority change. Passed 48 targeted tests in 5 files, standalone preflight, full five-step verification (266 tests, 33 files), CP2 template/diff checks and source scan. Local policy suite not performed because policies/schema/Storage are unchanged. M11A manual review, CP2, broader validation and privacy/role gates remain pending; no PR/merge/deployment/release approval. See `M11B_ACCEPTED_CV_EXPORT_ACCEPTANCE.md`.

## M11B.1 — Local browser acceptance harness

Engineering gate passed on `codex/exe-web-app-m11b1-browser-acceptance` from exact M11B `64b0dc9e0c138ae31ed0eda102a783f0db9137b5`. Separate cached-Chromium command exercises real local synthetic owner/expert acceptance/export/denial/withdrawal flows, keyboard and five widths; fixtures/temporary server are run-scoped and cleaned up. Passed browser journeys, 21 targeted tests, preflight, five-step verification (281 tests in 35 files), CP2 template and whitespace checks. Final source/staged review precedes publication. Narrow 320px credential grid/fieldset regression fixed. No new product feature, database/RLS/Storage changes, hosted integration or container management. Not performed — browser harness only; no database/RLS/Storage changes: `pnpm test:supabase:local`. M11A manual review, native proof preview, M11B actual printing/editor review, CP2 and owner release decisions remain pending. See `M11B_1_LOCAL_BROWSER_ACCEPTANCE_ACCEPTANCE.md`.

## M0 review notes

- Working branch: [`codex/exe-web-app-m0`](https://github.com/EnzoReacher/EXE/tree/codex/exe-web-app-m0), pushed for source review at commit `a19d72e`.
- `main` remains unchanged; the branch has not been merged or deployed.
- Review routes: `/` and `/assessment`.
- Commands: `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.
- The form only validates fields in the browser. It does not upload, save, parse, or analyze selected content.
- M0 is an engineering foundation, not a completed course checkpoint or production-ready service.

## Build boundaries

- Use fictional or explicitly consented test content only.
- Never invent user skills, experience, survey results, quotes, market facts, or hiring outcomes.
- Keep CVs private, make sharing user-controlled, and include deletion of both source and derived data before accepting real CVs.
- Keep changes on the review branch until the project owner approves a merge or deployment. Do not accept real CVs until private processing, ownership, and deletion are implemented and reviewed.

## M1 implementation notes

- Upload limit: **5 MiB / 5,242,880 bytes**. The server validates an allowed extension, file signatures, and DOCX-specific archive entries; a browser-provided MIME type is not trusted.
- `supabase/migrations/20261001_m1_secure_intake.sql` creates owner-scoped `cv_documents` and `target_jobs` tables, enables RLS, creates a non-public `cv-private` bucket, and restricts object paths to `<auth.uid()>/...`.
- Deletion marks a record `deleting`, removes the private object, then deletes the row (including extracted text). Storage failure becomes `delete_failed` and remains retryable; target jobs are never deleted with a CV.
- Replacement stores the new CV before removing the selected old CV. If old-CV removal fails, the new file is retained and the user receives an explicit partial-failure message.
- Local Supabase policy acceptance passed on 2026-10-01 using Docker and Supabase CLI `2.118.0`; no hosted project was created. `supabase/config.toml` applies a matching 5 MiB local Storage limit.
- Exact local policy commands: `pnpm dlx supabase init`; `pnpm dlx supabase start`; `set -a; eval "$(pnpm dlx supabase status -o env | grep -E '^(API_URL|PUBLISHABLE_KEY)=')"; set +a; SUPABASE_URL="$API_URL" SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY" pnpm test:supabase:local`.
- The integration script creates two temporary fictional local accounts and verifies: authenticated own create/read/update/replace/delete for CV rows, target jobs, and owner-prefixed private objects; cross-user read/update/delete/path-upload denial; unauthenticated denial; a non-public bucket endpoint; source-object plus extracted-text removal; and a visible, retryable `delete_failed` row state. It passed with `M1 local Supabase RLS and private Storage policy checks passed for two fictional users.`
- M1 local checks passed on 2026-10-01: `pnpm test` (13 tests), `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check`.

## M2 implementation notes

- Working branch: `codex/exe-web-app-m2`, based on the reviewed M1 commit `7909dc8`.
- The AI provider is still unselected. `local-evidence` is a deterministic text-matching adapter for the prototype, not an AI service and not a provider decision. No CV/JD text is sent externally.
- The report extracts at most 12 requirements from labeled sections/bullets, compares wording with server-extracted CV text, and labels findings supported, partly supported, unclear, or missing. Evidence is labeled as a self-reported CV claim or example context; neither is independently verified. It stores the exact CV excerpt and normalized-text offsets when wording is present; parser page/section locations are unavailable in M1.
- `analysis_runs` and `requirement_findings` are owner-scoped with RLS. A stable client request ID reuses the same run after a network retry; failed runs can be retried. Deleting the source CV cascades to its run and evidence excerpts.
- Local acceptance passed on 2026-10-02 using Docker and `pnpm dlx supabase` 2.119.0. The script exercised two-user M2 run/finding isolation, cross-owner CV/job reference denial, retry-safe request-ID uniqueness, M1 private Storage protections, and CV deletion of all derived evidence.
- Pricing remains deferred and should be based on CP2 competitor and willingness-to-pay research. M2 differentiates the prototype through plain-language, checkable evidence rather than an unvalidated low-price claim.

## M3 implementation notes

- `roadmap_items`, `cv_drafts`, and `cv_draft_claims` are owner-scoped. Every generated draft claim stores the exact source excerpt and offsets; the database requires `claim_text = source_excerpt` for generated provenance.
- The local M3 composer creates at most five actions from non-supported M2 findings. It never treats a document gap as proof that the person lacks the requirement.
- The initial CV draft arranges only supported/partly-supported CV excerpts. Missing and unclear findings are excluded from generated draft claims. A user can edit and save the draft, and a save clears any prior explicit acceptance.
- The 2026-10-02 local acceptance also passed fictional two-user M3 roadmap/draft/provenance create/read/update isolation and source-CV deletion-cascade checks. M2 and M3 migration filenames were corrected to unique Supabase versions (`20261002` and `20261003`) after the CLI identified duplicate version identifiers.

## M4 implementation notes

- `/saved-work` is private and loads its data from an authenticated server route. The saved-work DTO deliberately selects and returns only display metadata: role, optional company, CV filename, timestamps, report state, derived finding counts, and draft/review state.
- The list does not return extracted CV text, job-description text, evidence excerpts, owner IDs, storage paths, or provider fields. Application filtering uses the current authenticated owner and all source tables retain existing owner-scoped RLS.
- The UI includes plain-language no-results, loading, session/private-data error, in-progress report, failed-report retry, no-plan-yet, and draft-review paths. Buttons and status labels remain readable on narrow mobile widths, with visible keyboard focus.
- M4 checks passed on 2026-10-02: `pnpm test` (7 files, 40 tests), `pnpm lint`, `pnpm typecheck`, `pnpm build`, `node --check scripts/m1-local-policy-check.mjs`, `git diff --check`, and the repeated fictional-data `pnpm test:supabase:local` acceptance.

## M5 implementation notes

- `docs/demo/` contains a fictional persona, fictional target role/company/JD, expected evidence states, expected roadmap/draft boundaries, and a 1,489-byte DOCX fixture. The fixture was parser-verified with `mammoth`, is below the 5 MiB intake limit, and contains no real-person data.
- The CP1 Slot 8 runbook covers the M0–M4 core path in 3–5 minutes, exact routes, safe presenter wording, known limitations, a local-stack failure plan, and a release-boundary checklist. The product/service and technology/tools descriptions keep segment, pricing, market, and competitor claims explicitly open for CP2 research.
- Final M5 automated checks passed on 2026-10-02: `pnpm test` (7 files, 40 tests), `pnpm lint`, `pnpm typecheck`, `pnpm build`, `node --check scripts/m1-local-policy-check.mjs`, `git diff --check`, and `pnpm test:supabase:local` against local Docker Supabase with temporary fictional users/data only.
- Static source review confirmed responsive breakpoints, long-text wrapping, visible `:focus-visible` treatment, text status labels, and loading/empty/error handling across home, assessment, evidence report, next steps/draft, and saved work. A connected browser was unavailable for a live pixel-level desktop/narrow-width session; the owner checklist requires that final visual review before presenting.

## M6a implementation notes

- `20261004_m6_private_review_links.sql` creates owner-scoped `review_shares` and `expert_reviews`. A share is immutable other than revocation; it references one owner-owned completed report and, only when selected, an explicitly accepted draft from that same report. Deleting a source CV/report cascades the share and feedback. Editing an included accepted draft clears acceptance and automatically revokes linked shares.
- The server generates a 32-byte (256-bit) URL-safe token and stores only its SHA-256 digest. The raw URL is returned once at creation and is absent from persisted management data. Owners can choose 24 hours, 7 days, or 30 days and revoke an active link immediately.
- Direct anonymous table access is denied. Two small `security definer` RPC functions validate the token hash, expiry, revocation, and fixed response projection. They use schema-qualified objects and a safe search path, return no content for invalid states, cannot enumerate records, and use no service-role key.
- `/review/[token]` is unlisted, `noindex,nofollow`, dynamically rendered with explicit private no-store response headers, and presents only the selected role/company, findings/excerpts, optional accepted draft, privacy/advisory notice, and a plain-text feedback form. It has one neutral unavailable state and never exposes owner identity, raw CV/JD, storage path, IDs, other work, or edit controls.
- M6a checks passed on 2026-10-02: `pnpm test` (9 files, 44 tests), `pnpm lint`, `pnpm typecheck`, `pnpm build`, `node --check scripts/m1-local-policy-check.mjs`, `git diff --check`, and `pnpm test:supabase:local` after local migration reset. The fictional two-user acceptance covers ownership, table denial, token projection, malformed/invalid/expired/revoked denial, accepted-draft guard, idempotent feedback, feedback ownership, draft-edit revocation, and deletion cascades.

## M6b implementation notes

- `20261005_m6b_private_opportunity_links.sql` adds only owner-scoped user-entered external HTTPS references. The same-owner composite foreign key prevents attaching a record to another user’s target job, and target-job deletion cascades to its opportunity records. RLS permits no anonymous or cross-owner read/write access.
- `/opportunities` lets a signed-in user add, edit, status-track, open, and clearly confirm deletion of their own private references. The list/API DTO excludes owner IDs, raw job descriptions, CV content, evidence, review links, and database details. External links use `noopener noreferrer` and disclose they open another website.
- Server validation requires a bounded absolute HTTPS URL without embedded credentials; company and note text are bounded; status is constrained both in application code and the database. EXE does not fetch, scrape, preview, parse, download, or otherwise inspect the submitted URL.
- `src/lib/opportunities/curated-sources.ts` is an intentionally empty typed contract. `docs/OPPORTUNITY_CURATION_STANDARD.md` requires team approval, source/review evidence, and CP2 support before any real curated source could appear.
- M6b checks passed on 2026-10-02: `pnpm test` (10 files, 51 tests), `pnpm lint`, `pnpm typecheck`, `pnpm build`, `node --check scripts/m1-local-policy-check.mjs`, `git diff --check`, and `pnpm test:supabase:local` after `pnpm dlx supabase db reset --local`. The fictional two-user acceptance covers owner CRUD, anonymous/cross-user denial, cross-user target-job denial, and target-job cascade.
