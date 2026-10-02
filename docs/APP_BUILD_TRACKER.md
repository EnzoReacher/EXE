# EXE Web App Build Tracker

This tracks engineering work separately from course grading checkpoints. Mark a part complete only after its acceptance criteria and checks have been reviewed. The GitHub feature branch is for source review; do not merge to `main` or deploy without the project owner's approval.

| Part | Status | Scope | Exit criteria |
|---|---|---|---|
| M0 — Web app shell | Complete, awaiting owner review | Next.js + TypeScript shell, responsive overview, fictional report example, CV/JD intake UI, browser-only validation | App builds; lint and type checks pass; no file or job data leaves the browser; no deployment |
| M1 — Secure intake and identity | Local policy acceptance passed — owner approved as M2 baseline | Supabase Auth, private CV storage, PDF/DOCX parsing, target role/JD persistence, replace/delete controls | Local two-user RLS/Storage policy checks pass; parse failures recover; CV and derived text can be deleted |
| M2 — Evidence-based analysis | Local Supabase acceptance passed — owner review pending | Local requirement extraction, four evidence states, CV excerpts, self-reported claim vs example context, owner-scoped saved runs, retry/report UI | Findings cite exact CV text or say no text was found; provider output is validated; run/finding RLS and deletion cascade passed local integration |
| M3 — Roadmap and grounded CV draft | Local Supabase acceptance passed — owner review pending | Private gap-linked roadmap, editable source-grounded CV draft, claim provenance, explicit acceptance, owner-scoped storage | Actions connect to gaps; generated draft claims trace to CV excerpts; user reviews changes before use; RLS/cascade checks passed locally |
| M4 — Saved work and integration polish | Complete — owner review pending | Private saved-work history, empty/loading/error states, security and responsive review | Full core flow works with fictional data; private owner-scoped list DTO, responsive navigation, and failure handling passed checks |
| M5 — CP1 Slot 8 demo readiness | Demo package complete — owner/course review pending | Fictional CV/JD fixture, local setup checklist, 3–5 minute core-flow runbook, known limits, product/service and technology description, failure plan, owner checklist | Fictional-data local demo package and automated verification are complete; owner must perform the presentation review before CP1 can be marked complete |
| M6 — Optional thin features | Deferred | Expert review link and curated job links, only after the core loop is stable | Owner/team accepts the scope; links are private, revocable, and narrowly scoped where applicable |

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
