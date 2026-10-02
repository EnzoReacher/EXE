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
| D-007 | M1 uses the existing Next.js + TypeScript application with Supabase Auth, Postgres, and a private Supabase Storage bucket. | Owner-approved for M1 on 2026-10-01 | M1 implementation direction supplied by project owner |
| D-008 | M1 accepts PDF and DOCX CV files only, with server-side signature/type validation and a configurable 5 MiB limit. | Owner-approved for M1 on 2026-10-01 | M1 implementation direction supplied by project owner |
| D-009 | M1 stores a minimal owner-scoped CV record and target-job record; document parsing occurs server-side without AI. | Owner-approved for M1 on 2026-10-01 | M1 implementation direction supplied by project owner |
| D-010 | M1 has a 5 MiB (`5,242,880` bytes) upload limit. Server validation uses filename, PDF signature, and DOCX archive markers; browser MIME type is not trusted. | Implementation decision, 2026-10-01 | Limits resource use and blocks simple file-type spoofing. |
| D-011 | M1 private deletion removes the live Supabase Storage object first, then its row and extracted text. A storage failure leaves a `delete_failed` record for retry. | Implementation decision, 2026-10-01 | Avoids falsely reporting deletion while the original remains. |
| D-012 | The selected parsers produce normalized raw text in M1; stable page/section locations are not persisted because the parser output does not reliably expose them across both supported formats. | Implementation limit, 2026-10-01 | Preserve source-location context in a later parser upgrade before evidence analysis begins. |
| D-013 | M2 uses a deterministic local evidence adapter while the team has not selected an AI provider. It returns wording-based findings only and sends no CV/JD text to an external service. | Reversible M2 prototype decision, 2026-10-01 | Lets the team review the end-to-end report safely; does not approve an AI vendor or make a proficiency/hiring claim. |
| D-014 | M3 uses a deterministic source composer for roadmap actions and its first CV draft. Generated draft claims are exact stored CV excerpts with provenance; edits require user review and acceptance. | Reversible M3 prototype decision, 2026-10-02 | Keeps the job-seeker workflow useful while no AI provider, retention policy, or consent flow has been approved. |

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
| 2026-10-01 | Approve M1 secure CV and target-job intake: Supabase Auth/Postgres/private Storage; PDF and DOCX only; AI unselected and out of scope. | Project owner | Explicit M1 direction. | Implement ownership policies, server-side parsing, replace/delete, and target-job persistence only. |
| 2026-10-01 | Set M1 CV upload maximum to 5 MiB and preserve only server-extracted document text in the owner-scoped CV record. | Implementation | Explicit, configurable resource boundary; no AI provider receives CV or job content. | Review Supabase project backup/retention settings before accepting real CVs. |
| 2026-10-01 | Start M2 from the accepted M1 branch and use a server-side local wording matcher until an AI provider and its data handling are approved. | Project owner / implementation | Owner requested the next milestone; the M1 branch records passing local two-user policy acceptance. | Review M2 output and run the M2 local Supabase RLS/cascade acceptance script. Do not merge or deploy without owner approval. |
| 2026-10-02 | Begin M3 implementation at the owner's request while the M2 local policy run remains blocked by missing Docker/Supabase tooling. | Project owner / implementation | User directed work to continue and requested immediate progress reporting. | Run the expanded M2/M3 local policy script when the required tooling is available; do not merge or deploy without owner approval. |
| 2026-10-02 | Implement M6a as a narrowly scoped private review-link feature: selected completed report, optional accepted draft, owner expiry/revocation, and unverified advisory feedback. | Project owner / implementation | Explicit M6a feature direction and privacy boundary. | Use server-generated 256-bit tokens hashed with SHA-256; use owner RLS and limited token RPCs; do not add marketplace, payments, reviewer verification, messaging, public browsing, or M6b opportunity links. |

## Instructor questions

See the open course questions in `CHECKPOINT_TRACKER.md`. Record the instructor's answer and date here when received.
