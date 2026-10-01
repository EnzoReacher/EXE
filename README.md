# EXE101 — AI Career Readiness Platform

A course project for helping students and recent graduates understand how their current CV matches a specific job, identify evidence and skill gaps, and decide what to improve next.

## Start here

- [Project scope, architecture, phases, and acceptance criteria](docs/PROJECT_SCOPE_AND_PLAN.md)
- [Ready-to-use prompts for each phase](docs/PHASE_PROMPTS.md)
- [Checkpoint tracker and open course questions](docs/CHECKPOINT_TRACKER.md)
- [Decision log](docs/DECISIONS.md)
- [Current state](docs/CURRENT_STATE.md)

## MVP in one sentence

Upload a CV, provide a target job description, receive an evidence-based fit and gap report, get a prioritized learning/project roadmap, and draft a job-specific CV without inventing qualifications.

## Run the production web foundation

The production foundation is a Next.js and TypeScript application in [`web/`](web/). It uses pasted CV/JD text and fictional demo data, shows four evidence states with exact CV excerpts, and makes no external AI or storage call.

```bash
cd web
npm ci
npm run dev
```

Open `http://localhost:3000`, then select **Điền dữ liệu mẫu**. The original static implementation remains in [`prototype/`](prototype/) as a fallback.

## Current architecture

Next.js and TypeScript are approved and implemented as a single modular web app. Supabase, authentication, persistence, file upload, and a server-side AI provider adapter remain later proposals and require separate approval. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/OPENCODE_SETUP.md`](docs/OPENCODE_SETUP.md).

## Course checkpoints

| Checkpoint | Slot | Weight | Main deliverable |
|---|---:|---:|---|
| CP1 | 3 and 8 | 10% | Lock the idea; later demo MVP with product/service and technology descriptions |
| CP2 | 5 | 20% | Market research, customer discovery, competitor/value proposition analysis |
| CP3 | 8 | 15% | Business Model Canvas |
| CP4 | 10 | 40% | Pitch deck/presentation; Option 1 rubric captured in the tracker |
| Constructivism presentation | No limit stated | 15% | Separate presentation; detailed rubric not present in the guide |

## Current project state

Planning documents, browser prototype v0.2, and the tested production web foundation are present. CP2 fieldwork, the final audience/job-family decision, grounded CV improvement, persistence, file upload, and external AI integration remain pending. See [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) for the exact status.
