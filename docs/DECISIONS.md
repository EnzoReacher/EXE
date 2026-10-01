# EXE Project Decisions and Assumptions

Use this file to keep team decisions visible. A proposed choice is not approved until the team records who agreed and when. Update the scope and build prompts when a decision changes the project.

## Decisions carried forward from the project brief and course guide

| ID | Decision / constraint | Status | Source |
|---|---|---|---|
| D-001 | Product helps students/recent graduates assess a CV against a particular job and act on evidence/skill gaps. | Confirmed concept | `EXE.docx` |
| D-002 | The core course MVP should demonstrate CV intake, target JD, analysis, gap report, roadmap, and job-specific CV support. | Confirmed concept; implementation details open | `EXE.docx` |
| D-003 | Generated CV content must be based on real user information and must not invent skills or experience. | Required product guardrail | `EXE.docx` |
| D-004 | Expert review and job opportunity links are part of the broader idea; full marketplace and automated integrations are not needed to prove the first core loop. | Optional/thin MVP only | `EXE.docx` and prior scope planning |
| D-005 | Course checkpoint slots/weights are CP1 at Slots 3 and 8 (10%), CP2 Slot 5 (20%), CP3 Slot 8 (15%), CP4 Slot 10 (40%), and Constructivism presentation (15%; no slot limit stated). | Captured from guide | `HƯỚNG DẪN CÁC CHECKPOINT_EXE101.docx` |
| D-006 | CP4 Option 1 is the working rubric: Team profile 10%, Product-market fit 40%, Business model 20%, Operations 20%, Fundraising plan 10%. | Working interpretation; ask instructor about Option 2 | Checkpoint guide |

## Proposed technical/product choices — team confirmation needed

| ID | Proposal | Why it is proposed | Status |
|---|---|---|---|
| P-001 | Build a single modular web app with Next.js and TypeScript. | Fits the browser-based student service and keeps the course MVP in one app. | Proposed; not yet approved |
| P-002 | Use Supabase Auth, Postgres, and private Storage for the first version. | Provides a compact path for identity, relational records, and private CV uploads. | Proposed; validate cost, team familiarity, and data handling |
| P-003 | Call AI only through a server-side adapter and validate structured output. | Protects credentials and lets the team change providers without changing the product flow. | Proposed; provider not selected |
| P-004 | Accept PDF and DOCX CVs first; let users paste the JD. | Keeps the MVP intake flow narrow and demonstrable. | Proposed; confirm after format needs are researched |
| P-005 | Use supported / partial / unclear / missing categories and show CV evidence. | Makes the analysis explainable and reduces misleading certainty. | Proposed acceptance behavior |
| P-006 | Do not make an opaque numeric hiring score central to the MVP. | The score could be mistaken for a hiring probability; categories and evidence are clearer. | Proposed guardrail |
| P-007 | Choose one initial customer segment/job family after CP2 research. | Prevents building a broad system before demand is understood. | Open; decide from evidence |
| P-008 | Expert review links and curated job links are optional thin features after the core analysis loop. | Protects the Slot 8 demo from scope growth. | Proposed scope boundary |

## Decision log

| Date | Decision | Owner(s) | Evidence / reason | Follow-up |
|---|---|---|---|---|
| 2026-10-01 | Begin the local web-app foundation using the repository's Next.js + TypeScript proposal for the UI shell only. | Project owner | User directed the project to focus on building the web app. | Confirm the full stack with the team before adding persistent storage, authentication, or AI services. |
| 2026-10-01 | Push M0 to `codex/exe-web-app-m0` for source review; keep `main` and deployment unchanged. | Project owner | User requested automatic GitHub updates and stated that nothing goes live without approval. | Get explicit approval before merging or deploying. |

## Instructor questions

See the open course questions in `CHECKPOINT_TRACKER.md`. Record the instructor's answer and date here when received.
