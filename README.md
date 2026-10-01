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

The repository proposes a single modular web app using Next.js and TypeScript, with Supabase for authentication, Postgres, and private CV storage, plus a server-side AI provider adapter. The local UI shell uses Next.js and TypeScript as a reversible starting point. Supabase and AI provider choices still need team confirmation before integration; the course materials do not mandate a stack.

## Run the local prototype

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. The overview and assessment-intake screens are UI-only. They do not upload or store CVs, call an AI provider, or expose a public deployment. Use fictional/sample information until private processing is implemented and approved.

## Course checkpoints

| Checkpoint | Slot | Weight | Main deliverable |
|---|---:|---:|---|
| CP1 | 3 and 8 | 10% | Lock the idea; later demo MVP with product/service and technology descriptions |
| CP2 | 5 | 20% | Market research, customer discovery, competitor/value proposition analysis |
| CP3 | 8 | 15% | Business Model Canvas |
| CP4 | 10 | 40% | Pitch deck/presentation; Option 1 rubric captured in the tracker |
| Constructivism presentation | No limit stated | 15% | Separate presentation; detailed rubric not present in the guide |

## Current project state

The repository now contains the first local web-app slice on branch `codex/exe-web-app-m0`: a responsive workspace overview, a fictional evidence-report preview, and a CV/JD intake form with browser-only validation. No real CV processing, database, authentication, or AI integration is connected. See the [current state](docs/CURRENT_STATE.md) and [app build tracker](docs/APP_BUILD_TRACKER.md).
