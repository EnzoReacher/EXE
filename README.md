# OwnPath — Scan, understand and rewrite your CV

**CV + target job description → Scan → Explain → Prompt → Rewrite → complete editable CV.**
Upload a text-based PDF/DOCX up to 5 MiB, then paste a target JD. Extracted CV text
is editable in an optional disclosure; there is no blank initial CV editor or
permanent consent panel. Extraction does not use AI or save originals. No OCR or
encrypted files; explicit manual correction is available after an extraction error.
Review grounded findings, write your own rewrite instructions, then edit, copy,
download TXT or open Print / Save as PDF. Saving and reopening named CV versions
is optional. Account manages an optional display name, verified email, password
access and local-browser sign-out; it does not supply applicant facts to the CV.

Release candidate branch: [`feat/ownpath-demo-rc`](https://github.com/EnzoReacher/EXE/tree/feat/ownpath-demo-rc).
Start at `/`; authenticated workspace: `/app`. Old Translator and `/cv-review`
routes redirect to the protected workspace. The questionnaire is retired.

## Current setup and acceptance

See [the final demo handoff](docs/ownpath/DEMO_HANDOFF.md) for the active build,
startup, current acceptance evidence and hosted limitations. Rewrite now returns
a complete structured CV with direct section editing; line assignment is an
optional fallback for legacy saved CVs. The notes below retain earlier evidence.

**Keyless local walkthrough:** `pnpm preview:local`, then open
**http://127.0.0.2:4327**. The persistent label identifies simulated AI and fictional
data. Samples, matching JD and the supported rewrite instruction are provided there.
Real PDF/DOCX extraction, editable Classic output, exports and isolated saving work
without OpenAI or hosted mutations. It uses a disposable build, never the normal
`.next` or the owner's 4317 server. See [preview instructions and limits](docs/ownpath/CV_WORKSPACE_SETUP.md#keyless-isolated-local-preview).

- [CV workspace setup and fictional browser fixture](docs/ownpath/CV_WORKSPACE_SETUP.md)
- [Account profile and security evidence](docs/ownpath/ACCOUNT_PROFILE_EVIDENCE.md)
- [Reliability repairs, migration contracts and local database checks](docs/ownpath/RELIABILITY_REPAIR_EVIDENCE.md)
- [Interaction polish and current verification](docs/ownpath/INTERACTION_POLISH_EVIDENCE.md)
- [Publication scope and verification record](docs/ownpath/PUBLICATION.md)

Install with `pnpm install --frozen-lockfile`. Configure public Supabase settings
from the sanitized `.env.example`, preserving any existing private `.env.local`,
then follow the setup guide. AI stays disabled unless explicitly configured and
consented to; the inherited provider gate permits numeric-loopback local use only.

**Live OpenAI acceptance: NOT RUN.** Published baseline evidence was **913 tests,
24 compiled-browser journeys, lint (no errors), typecheck and production build**.
Browser journeys use fictional Auth/REST and controlled AI responses. The follow-up
narrowly fixes the `AuthPanel` warning by closing over the identity string rather
than its enclosing user object; lint is now clean. Hosted Auth/mail/provider acceptance,
Safari/Firefox and real-device acceptance remain outstanding. Follow-up local
verification is recorded in [the completion handoff](docs/ownpath/COMPLETION_HANDOFF.md).
Current AI also requires the owner-applied `20261021_ownpath_ai_reservations.sql`
migration; missing durable quota infrastructure fails closed. It has **not** been
applied hosted. This is not approval for paid use or hosted AI enablement.

**Conditional legacy repairs — NOT APPLICABLE to the inspected hosted schema:**

- `supabase/migrations/20261020_legacy_draft_revision.sql`
- `supabase/migrations/20261020_review_rpc_submission_limit.sql`

Owner preflight found `cv_drafts`, `analysis_runs`, `review_shares`, `expert_reviews`
and relevant legacy RPCs absent. Do not create that subsystem or run all SQL files.
Only databases already containing it need separately authorized legacy repair review.
The required current-product `20261019_ownpath_cv_profiles_versions.sql` was applied
hosted; basic owner save/reopen was observed, not full hosted ownership acceptance.

Historical follow-up: [Classic/landing completion and verification](docs/ownpath/COMPLETION_HANDOFF.md)
and [preview preparation](docs/ownpath/PREVIEW_DEPLOYMENT.md). PR #4 was merged.
Current branch release/push authorization and evidence are recorded in the final handoff.

## Historical product and project records

The sections below preserve earlier project context. They do not supersede the
current CV-workspace setup above or authorize retired guest workflows.

Start with [current OwnPath status and handoff](docs/ownpath/STATUS.md), [PRD/scope](docs/ownpath/PRD.md), [ADR/contracts](docs/ownpath/ARCHITECTURE.md), [workflow diagrams](docs/ownpath/FLOWS.md), [backlog/roadmap](docs/ownpath/BACKLOG.md), [research instruments](docs/ownpath/RESEARCH_PLAN.md), [tests](docs/ownpath/TEST_STRATEGY.md), and [OpenCode Factory runbook](docs/ai-factory/AI_FACTORY_RUNBOOK.md). Actual owner research/production approval remains in the existing decision record. `EXE` is the repository name; EXE101 is the course.

## Core-only continuation — 15 October 2026

The owner has authorized removal of unnecessary legacy product features. Keep guided intake/fact confirmation, grounded drafting and accepted-only review/output as one Experience Translator journey. The implementation branch is `feat/ownpath-backend`, based on integration `feat/ownpath-experience-translator` at `d1ec1a0`. [BACKLOG](docs/ownpath/BACKLOG.md) tracks actual removals and frontend coordination; [STATUS](docs/ownpath/STATUS.md) distinguishes fresh checks from historical acceptance.

The first safe slice extracts the shared requirement helper into `src/lib/job-description/`, without changing frontend contracts. Legacy routes/Auth/dependencies are still present pending coordinated removal. For the retained workflow:

```bash
pnpm install --frozen-lockfile
pnpm dev --hostname 127.0.0.1
```

Open `http://127.0.0.1:3000/experience-translator`; no environment file, Supabase or sign-in is needed for this fictional-data path. Inputs and edits stay in tab memory; copy/TXT is deliberate. The deterministic vocabulary remains narrow.

## Historical application setup and milestones

The sections below describe the earlier application and its still-present legacy runtime, not the target scope or instructions to restart those features. No main merge, deployment, destructive migration, paid provider or production data processing is authorized by this branch.

Owner sign-in follow-up: [M15 auth handoff fix and local retest commands](docs/M15_AUTH_HANDOFF_FIX.md) on `codex/exe-m15-auth-handoff-fix`.


Latest review build: **M15 complete private workspace** on `codex/exe-web-app-m15-complete-workspace`. See [changes, additive migration, verification and owner testing](docs/M15_COMPLETE_WORKSPACE.md). Apply the additive migration to the existing local database with `pnpm dlx supabase db push --local` before testing roadmap creation.

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

Run pnpm test:e2e:local for the separate real-browser credential/CV-export and M13 landing/account journeys. Requires the already-running local Supabase stack, public-only loopback settings, existing migrations, and cached compatible Chromium; it never downloads browsers or manages Supabase/Docker. It owns a temporary Next.js server and cleans up only current-run synthetic accounts/objects. See [setup and boundaries](docs/M11B_1_LOCAL_BROWSER_ACCEPTANCE.md), [actual M11B.1 results](docs/M11B_1_LOCAL_BROWSER_ACCEPTANCE_ACCEPTANCE.md), and [M13 auth acceptance](docs/M13_AUTH_ACCEPTANCE.md). Automated checks do not complete manual owner/accessibility review, CP2, or merge/deployment approval.

## Run the local prototype

```bash
pnpm install
pnpm dev
```

For the default local Supabase redirect settings, open `http://127.0.0.1:3000` (the configuration also allows `http://localhost:3000`). The public home page links to `/sign-up` and `/sign-in`; successful authentication opens `/assessment`. The workspace uses Supabase Auth and private, owner-scoped CV/job intake when local public settings are configured. It accepts PDF/DOCX CVs up to 5 MiB. Select a saved CV and job to create an evidence report. M2 uses local text matching only and does not call an AI provider. Use fictional/sample information until the team reviews Supabase backup, retention, deletion, and the M2 database policies.

### M12 landing page and account access

Copy `.env.example` to `.env.local` and use the public URL and publishable key from the already-running local Supabase stack. `NEXT_PUBLIC_SITE_URL` should be the app's canonical origin. The local Auth config supports confirmation links to `/auth/callback`; local email confirmation is disabled, so a successful local sign-up should create an active session immediately. When email confirmation is enabled for another Supabase environment, the callback exchanges the PKCE code into the cookie session and returns to `/assessment`.

Before any hosted use, set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS site origin and add the exact `${NEXT_PUBLIC_SITE_URL}/auth/callback` URL to that Supabase project's Auth redirect allow-list. Do not add a service-role key to browser configuration. Supabase Auth manages passwords; the app uses the publishable key and cookie-based `@supabase/ssr` clients. The Next.js Proxy refreshes sessions; existing server routes continue to verify the user and owner-scoped policies remain the authorization boundary. No production redirect, email delivery, merge, or deployment has been tested or approved.

### Fictional-data owner-review verification

For a local owner review and browser acceptance, configure the local Supabase public URL and publishable key, plus the optional loopback NEXT_PUBLIC_SITE_URL, in .env.local; never put a service-role key, database URL, private credential, real CV, or hosted environment value there. Then run:

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

### Current engineering stage: M17 evidence and owner-review gate

The cumulative working branch is `codex/exe-m17-survey-readiness`. M0–M16 application work and automated engineering acceptance are documented as complete; M17 survey and evidence-review preparation is ready, but real research, owner/team review, manual M7/CP1 outcomes and M18 product approval remain pending. The next feature must be selected from reviewed evidence before implementation. Use the [current app completion tracker](docs/APP_BUILD_TRACKER.md) for the stage-by-stage roadmap, MVP implementation audit, owner actions and exit criteria. No merge to `main` or deployment is authorized by completing this work.

The earlier M11C proof/review work and M11B.1 local acceptance remain documented in the [M11C guide](docs/M11C_PROOF_REVIEW_AND_WORKFLOW.md), [M11C results](docs/M11C_ACCEPTANCE.md), and [M11B.1 harness guide](docs/M11B_1_LOCAL_BROWSER_ACCEPTANCE.md). Optional isolated Chromium checks use `pnpm test:proof-preview` and, after a fresh `pnpm build`, `pnpm test:workspace-ui`. Reuse the existing local stack; do not create duplicate containers. Manual owner/accessibility/print review, CP2, privacy/retention and release approval remain pending. No merge or deployment.

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
