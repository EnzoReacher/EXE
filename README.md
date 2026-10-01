# EXE101 — AI Career Readiness Platform

A course project for helping students and recent graduates understand how their current CV matches a specific job, identify evidence and skill gaps, and decide what to improve next.

## Start here

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

## Run the local prototype

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. The `/assessment` workspace uses Supabase Auth and private, owner-scoped CV/job intake when placeholder values are configured for a reviewed Supabase project. It accepts PDF/DOCX CVs up to 5 MiB. Select a saved CV and job to create an evidence report. M2 uses local text matching only and does not call an AI provider. Use fictional/sample information until the team reviews Supabase backup, retention, deletion, and the M2 database policies.

## Course checkpoints

| Checkpoint | Slot | Weight | Main deliverable |
|---|---:|---:|---|
| CP1 | 3 and 8 | 10% | Lock the idea; later demo MVP with product/service and technology descriptions |
| CP2 | 5 | 20% | Market research, customer discovery, competitor/value proposition analysis |
| CP3 | 8 | 15% | Business Model Canvas |
| CP4 | 10 | 40% | Pitch deck/presentation; Option 1 rubric captured in the tracker |
| Constructivism presentation | No limit stated | 15% | Separate presentation; detailed rubric not present in the guide |

## Current project state

The repository's M2 review branch is `codex/exe-web-app-m2`, based on M1 commit `7909dc8`. It adds an owner-scoped evidence report with a local wording matcher, schema validation, traceable CV excerpts, and retryable analysis runs. M1 local two-user Supabase policy checks passed. M2 unit checks are part of `pnpm test:supabase:local`, but the M2 Supabase integration check still needs to be run. No branch has been merged and no deployment was initiated. Review [current state](docs/CURRENT_STATE.md) and the [app build tracker](docs/APP_BUILD_TRACKER.md) for details.
