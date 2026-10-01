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

## Run the current web prototype

The approved reduced-scope browser prototype is in [`prototype/`](prototype/). It uses pasted CV/JD text and fictional demo data, shows four evidence states, and makes no external AI or storage call.

```bash
python3 -m http.server 4173 --directory prototype
```

Open `http://localhost:4173`, then select **Điền dữ liệu mẫu**.

## Working architecture proposal

The planning baseline proposes a single modular web app using Next.js and TypeScript, with Supabase for authentication, Postgres, and private CV storage, plus a server-side AI provider adapter. This is a working recommendation to validate with the team before implementation; the course materials do not mandate a stack.

## Course checkpoints

| Checkpoint | Slot | Weight | Main deliverable |
|---|---:|---:|---|
| CP1 | 3 and 8 | 10% | Lock the idea; later demo MVP with product/service and technology descriptions |
| CP2 | 5 | 20% | Market research, customer discovery, competitor/value proposition analysis |
| CP3 | 8 | 15% | Business Model Canvas |
| CP4 | 10 | 40% | Pitch deck/presentation; Option 1 rubric captured in the tracker |
| Constructivism presentation | No limit stated | 15% | Separate presentation; detailed rubric not present in the guide |

## Current project state

Planning documents and browser prototype v0.2 are present. CP2 fieldwork, the final audience/job-family decision, the production stack, persistence, file upload, and external AI integration remain pending. See [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) for the exact status.
