# EXE Web App Build Tracker

This tracks engineering work separately from course grading checkpoints. Mark a part complete only after its acceptance criteria and checks have been reviewed. The GitHub feature branch is for source review; do not merge to `main` or deploy without the project owner's approval.

| Part | Status | Scope | Exit criteria |
|---|---|---|---|
| M0 — Web app shell | Complete, awaiting owner review | Next.js + TypeScript shell, responsive overview, fictional report example, CV/JD intake UI, browser-only validation | App builds; lint and type checks pass; no file or job data leaves the browser; no deployment |
| M1 — Secure intake and identity | Complete locally — awaiting Supabase policy review | Supabase Auth, private CV storage, PDF/DOCX parsing, target role/JD persistence, replace/delete controls | Ownership policies included; parse failures recover; CV and derived text can be deleted; local policy integration tests unavailable |
| M2 — Evidence-based analysis | Pending | Requirement extraction, supported/partial/unclear/missing findings, CV evidence excerpts, caveats | Each supported finding points to source evidence; no unsupported skill claims; provider output validated |
| M3 — Roadmap and grounded CV draft | Pending | Prioritized next steps and editable job-specific CV draft with source provenance | Actions connect to gaps; draft claims trace to user facts; user reviews changes before use |
| M4 — Saved work and integration polish | Pending | Minimal saved history, empty/loading/error states, security and responsive review | Full core flow works with fictional data; privacy, ownership, and failure handling pass checks |
| M5 — CP1 Slot 8 demo readiness | Pending | Demo script, sample CV/JD, known limits, product/service and technology description | 3–5 minute demo of the core flow; all limitations and sample data are clear |
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
- Local Supabase CLI/services were not available in this repository, so RLS and Storage policies have **not** been integration-tested. Unit tests cover parsing and input validation; policy tests must run against a local Supabase instance before real CVs are accepted.
- M1 local checks passed on 2026-10-01: `pnpm test` (13 tests), `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check`.
