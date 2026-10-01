# EXE Project Current State

**Last updated:** 2026-10-01
**Status:** Reduced course MVP approved and web implementation started. A functional browser prototype exists; CP2 fieldwork, final audience/job-family selection, production-stack approval, persistence, file upload, and AI integration remain pending.

## Completed

- Reviewed the project brief and checkpoint guide.
- Mapped the concept, architecture proposal, checkpoint work, scope boundaries, risks, and phase prompts.
- Prepared the CP1 idea-lock discussion draft; prior Slot 3 submission status remains unconfirmed.
- Prepared a separate editable CP2 market-research pack; real fieldwork has not started.
- Approved a reduced course MVP focused on one CV-to-JD evidence flow.
- Built browser prototype v0.2 in `prototype/` for students and recent graduates.
- Implemented pasted CV text, target role/JD input, fictional demo data, four evidence states, cited CV passages, and priority actions.
- Kept prototype processing inside the browser with no login, storage, external AI call, or real participant data.
- Added analyzer checks covering requirement extraction, all four evidence states, missing evidence, input validation, and absence of hiring-prediction scores.

## Current product baseline

- Broad audience: university students and recent graduates preparing for internships or early-career roles.
- First specific segment and job family remain hypotheses until CP2 evidence is analyzed.
- Core flow: CV text + one target JD → supported/partial/unclear/missing report → up to three priority actions → later grounded CV improvement.
- The current analyzer is a transparent keyword baseline. It is useful for UX validation but is not the final AI analysis engine.
- Next.js + TypeScript, Supabase, and a server-side AI adapter remain production proposals. Approval is required before the prototype is migrated.

## Research status

- No survey or interview has been conducted for this project work.
- There are no verified respondent counts, customer quotes, willingness-to-pay findings, or product-market-fit claims.
- The guide's “hub,” customer/supplier counts, supplier definition, and two-expert alternative still need instructor clarification.

## Next actions

1. Have the project manager review browser prototype v0.2.
2. Approve or revise the production stack before migration.
3. Reconcile the original course files and CP2 pack into the project evidence workflow.
4. Confirm CP2 ambiguities, finalize research ownership, and conduct consent-safe fieldwork.
5. Use analyzed evidence to approve or revise the first segment, job family, and value proposition.

## Resume guidance

Use `docs/CHECKPOINT_TRACKER.md` for checkpoint status and `docs/DECISIONS.md` for accepted decisions. Keep market claims labeled as hypotheses until evidence exists. Do not add real CVs, participant identities, recordings, or secrets to the repository.
