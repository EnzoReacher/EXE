# EXE101 — AI Career Readiness Platform

A course project for helping students and recent graduates understand how their current CV matches a specific job, identify evidence and skill gaps, and decide what to improve next.

## Start here

- [Master plan and progress report](docs/PROJECT_MASTER_REPORT.md)
- [Project scope, architecture, phases, and acceptance criteria](docs/PROJECT_SCOPE_AND_PLAN.md)
- [App build tracker](docs/APP_BUILD_TRACKER.md)
- [Ready-to-use prompts for each phase](docs/PHASE_PROMPTS.md)
- [Checkpoint tracker and open course questions](docs/CHECKPOINT_TRACKER.md)
- [Decision log](docs/DECISIONS.md)
- [Current state](docs/CURRENT_STATE.md)

## MVP in one sentence

Upload a CV, provide a target job description, receive an evidence-based fit and gap report, get a prioritized learning/project roadmap, and draft a job-specific CV without inventing qualifications.

## Working architecture proposal

The repository uses a single modular web app with Next.js, TypeScript, and Supabase Auth/Postgres/private Storage. An AI provider is still unselected. M2 therefore uses a server-side, deterministic wording prototype: no CV or job text is sent to an external AI service, and its categories are not a measure of proficiency or hiring likelihood.

### Local synthetic browser acceptance (M11B.1)

Run `pnpm test:e2e:local` for the separate real-browser credential/CV-export journey. Requires the **already-running local Supabase stack**, public-only loopback settings, existing migrations, and cached compatible Chromium; it never downloads browsers or manages Supabase/Docker. It owns a temporary Next.js server and cleans up only current-run fictional accounts/objects. See [setup and boundaries](docs/M11B_1_LOCAL_BROWSER_ACCEPTANCE.md) and [actual results](docs/M11B_1_LOCAL_BROWSER_ACCEPTANCE_ACCEPTANCE.md). Automated checks do not complete M11A manual owner review, M11B print-pagination/editor review, CP2, or merge/deployment approval.

## Run the local prototype

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. The `/assessment` workspace uses Supabase Auth and private, owner-scoped CV/job intake when placeholder values are configured for a reviewed Supabase project. It accepts PDF/DOCX CVs up to 5 MiB. Select a saved CV and job to create an evidence report. M2 uses local text matching only and does not call an AI provider. Use fictional/sample information until the team reviews Supabase backup, retention, deletion, and the M2 database policies.

### Fictional-data owner-review verification

For a local owner review, configure only the local Supabase public URL and publishable key in `.env.local`; never put a service-role key, database URL, private credential, real CV, or hosted environment value there. Then run:

```bash
pnpm review:verify
pnpm dev
```

`pnpm review:verify` runs `pnpm review:preflight`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` in that exact order, stopping at the first failure. Start `pnpm dev` only after all five pass. The runner does not print configuration values; it disables Next telemetry and makes no network request or automatic Supabase/Docker operation. It does not check browser rendering, mobile, keyboard, screen-reader/accessibility behavior, database policies, research quality, or privacy/owner approval.

Use only the fictional DOCX in `docs/demo/fixtures/` and complete the actual [M10.2 owner checklist](docs/M10_2_OWNER_REVIEW.md). Record actual dates, viewport sizes, keyboard actions, issues, and retests only. Use an existing local Supabase stack if running; do not start a duplicate because port `54322` is occupied. See the [M10.6 handoff](docs/M10_6_REVIEW_VERIFY.md) and [actual acceptance results](docs/M10_6_REVIEW_VERIFY_ACCEPTANCE.md). M10.6 engineering verification passed on 2026-10-03 after local configuration became available. Manual owner review is not performed, CP2 evidence/review is pending, and broader M11 product validation remains blocked. No merge to main or deployment; owner approval required.

## Course checkpoints

| Checkpoint | Slot | Weight | Main deliverable |
|---|---:|---:|---|
| CP1 | 3 and 8 | 10% | Lock the idea; later demo MVP with product/service and technology descriptions |
| CP2 | 5 | 20% | Market research, customer discovery, competitor/value proposition analysis |
| CP3 | 8 | 15% | Business Model Canvas |
| CP4 | 10 | 40% | Pitch deck/presentation; Option 1 rubric captured in the tracker |
| Constructivism presentation | No limit stated | 15% | Separate presentation; detailed rubric not present in the guide |

## Current project state

### M11C private proof and credential workflow

Current review branch: `codex/exe-web-app-m11c-proof-review`, from exact M11B.1 `e15d9584fa67230024ed21cc6258f29a1353726b`. Protected JPG/PNG proof pages, PDF-download guidance, per-claim expert form reset, source-CV filters/history labels, next-step guidance, new-claim preparation and safe stale/deletion/refresh recovery are implemented. No database/RLS/Storage or authority redesign. Code checks passed: 300 tests/37 files, lint/typecheck/build; isolated Chromium proof rendering and fixture-backed production UI checks passed. Genuine local Supabase acceptance is pending because this build environment lacks local configuration/stack. See the [M11C guide](docs/M11C_PROOF_REVIEW_AND_WORKFLOW.md), [actual results](docs/M11C_ACCEPTANCE.md) and [single master report](docs/PROJECT_MASTER_REPORT.md).

Additional optional browser checks use installed Chromium and no Supabase: `pnpm test:proof-preview`; after a fresh `pnpm build`, `pnpm test:workspace-ui`. They are separate from ordinary verification/CI and do not replace genuine-authentication acceptance or owner review. Reuse the existing local stack for `pnpm review:verify` and `pnpm test:e2e:local`; do not create duplicate containers. Manual printing/editor/accessibility, role/privacy/retention and CP2 gates remain pending. No merge or deployment.

### M11B accepted CV export prototype

Owner-directed M11B on `codex/exe-web-app-m11b-cv-export` starts from verified M11A `bc24377d57d503a21059ee0a467ede23252f289a`. Eligible accepted/superseded versions offer an editable DOCX, exact-text TXT fallback, and private browser Print / Save as PDF view. Every request rechecks owner acceptance and cumulative evidence provenance; candidates, rejected versions and evidence-withdrawn versions cannot export. Export uses immutable saved text and does not rewrite claims or include proof metadata. DOCX is built in memory using the new `docx` library; no generated documents are stored in the repository. The print view is browser printing, not an EXE-generated PDF download. See the [M11B guide](docs/M11B_ACCEPTED_CV_EXPORT.md) and [actual acceptance record](docs/M11B_ACCEPTED_CV_EXPORT_ACCEPTANCE.md). M11A manual review, CP2, broader validation, and release/privacy gates remain pending; no merge or deployment occurred.

### M11A owner-directed technical prototype

Credential-gated CV versions passed the engineering gate on `codex/exe-web-app-m11a-credentialed-cv-versions` from published M10.6 `5dd5fbebf688aeafe20ecc91cb55838bdc5d851e`: 224 full-suite tests and existing-stack fictional database/private Storage acceptance. Open `/credential-versions` as a signed-in owner and `/expert/credential-reviews` as an authenticated, active team-approved expert. CV + optional portfolio → bounded proposed skill/wording + private certificate/degree → assigned expert decision → immutable candidate → before/after review and explicit owner acceptance. No upload alone adds a skill; original CVs, M3 drafts and old version text remain unchanged. Private evidence withdrawal is reflected in all dependent histories.

Approval means **“Approved by a team-approved expert after reviewing submitted proof.”** It is not institutional authentication. Expert authorization is administered by the team outside the UI; there is no self-service role assignment or public-token expert authority. No OCR, external AI, issuer lookup, scraping, public evidence URLs, payments or document export. Fictional data only. Engineering checks and actual limitations are in the [M11A acceptance record](docs/M11A_CREDENTIAL_GATED_CV_VERSIONING_ACCEPTANCE.md); see the [workflow/security guide](docs/M11A_CREDENTIAL_GATED_CV_VERSIONING.md). This owner-directed prototype is not CP2 validation; research, broader M11 product-market decisions, manual review, privacy/role-policy approval, merge and deployment remain pending.

### Local CP2 research operations

M10.3 tooling is on `codex/exe-web-app-m10-3-research-ops` from M10.2 commit `bd34743`. Place private drafts in ignored `research/private/` or `docs/evidence/private/`; keep identity/contact/raw research material separate and never force-add it. See the [owner handoff](docs/M10_3_OWNER_HANDOFF.md), [data boundary](docs/M10_3_RESEARCH_DATA_BOUNDARY.md) and [acceptance record](docs/M10_3_RESEARCH_OPS_ACCEPTANCE.md).

```bash
pnpm cp2:survey:validate -- --file research/private/cp2-survey-aggregate.csv
pnpm cp2:survey:summarize -- --file research/private/cp2-survey-aggregate.csv --output docs/evidence/private/survey-draft.md
pnpm cp2:sources:validate -- --file docs/evidence/private/cp2-public-source-log.md
```

Local structure/sensitive-pattern checks and count-only summaries do not collect evidence, verify facts/research quality, approve claims or select M11. CP2 remains pending; M7/M10.2 owner browser review and release decisions remain pending. No application workflow changes, merge or deployment.

M10.2 hardening is on `codex/exe-web-app-m10-2-hardening`, based on M10 commit `4af832c`. It improves the existing fictional-data workflow, accessibility, responsive safeguards and error handling; it does not select a new product feature. CP2 evidence remains pending and M11 is blocked. No merge or deployment is authorized. See the [hardening acceptance record](docs/M10_2_HARDENING_ACCEPTANCE.md), [fictional-data owner checklist](docs/M10_2_OWNER_REVIEW.md), [current state](docs/CURRENT_STATE.md) and [app build tracker](docs/APP_BUILD_TRACKER.md).
