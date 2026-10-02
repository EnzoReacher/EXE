# M10 CP2 Research Execution Status

**Status:** Evidence collection pending — M10 review confirmed no CP2 evidence or owner-review result is recorded in this repository.
**Branch:** codex/exe-web-app-m10  
**Purpose:** execute the M8 research plan and use the M9 decision gate before selecting the next product feature.

This file is a live checklist. An unchecked item is not complete. Do not mark an item complete from an assumption, a template, a fictional demo, or a validator pass.

## M10 execution review — 2026-10-02

**Evidence IDs or source IDs used:** none. The CP2 register contains only explicitly labelled example rows; no anonymized participant, expert, survey, competitor, pricing, or market evidence was supplied for this review.

| Check | Result | What remains uncertain / required action |
|---|---|---|
| M7 desktop review | No documented owner result | Owner must complete it with fictional demo data and record the result. |
| M7 narrow-mobile review | No documented owner result | Owner must complete it with fictional demo data and record the result. |
| M7 keyboard-only review | No documented owner result | Owner must complete it with fictional demo data and record the result. |
| Private review-link behavior | No documented owner result | Owner must test selected-only visibility, feedback, revocation, and unavailable state using fictional data. |
| Opportunity-tracker behavior | No documented owner result | Owner must test fictional link state, edit/delete, empty/error, and external-link disclosure. |
| M5 CP1 demo rehearsal | No documented team/course result | Owner/team must rehearse and retain the required course evidence. |
| Privacy and retention review | No owner decision recorded | Owner must decide/document data handling, deletion, backup, retention, and access before real CV use. |
| CP2 target-user, expert, and survey evidence | No collected evidence | Owner/team must provide consent-safe anonymized summaries/aggregate results. |
| Current public market, competitor, and pricing research | No supplied or authorized source evidence | Owner/team must provide current cited source records before any comparison or price claim. |

**Status change:** none. CP2 remains pending; no M11 feature is authorized. This review does not replace owner/team review or collect evidence.

## M10.1 evidence intake review — 2026-10-02

- **Section completed:** repository intake check for owner-supplied evidence or anonymized notes.
- **Evidence IDs or source IDs received:** none.
- **What was checked:** tracked documentation, untracked repository files, and evidence/research/interview/survey/market/competitor/pricing/notes paths outside dependencies and build output.
- **Observation:** no actual evidence file or anonymized note is present. The only CP2 IDs remain explicitly labelled `TU-000`, `EX-000`, `SV-000`, and `CM-000` examples in the blank register.
- **What remains uncertain:** every CP2 research question and all open instructor questions; no conclusion is supported.
- **Decision / next action:** retain **Evidence collection pending**. Do not add an evidence row, run collected-mode validation, complete the product-direction decision, or authorize M11.
- **Owner/team review status:** not reviewed; no owner/team decision or approval was supplied.

## Exact inputs required next

1. Documented fictional-data results for every M7/M5 owner review item above.
2. Actual collection dates, anonymized category, consent-safe summary, related hypothesis, signal, limitations, and owner-review status for each target-user or expert activity.
3. Aggregate anonymous survey counts/results and sampling limitations, if a survey is used.
4. Current public-source records with URL, access date, source/update date when available, region, currency, plan/tax/access context, and the exact supported fact for market, competitor, privacy, or pricing research.
5. Owner/team review date, reviewer, limitations/bias discussion, hypothesis classifications, and explicit product-direction decision.
6. Instructor answers, dated and attributed, for the open CP2 requirement questions in `CHECKPOINT_TRACKER.md` before interpreting ambiguous requirements as complete.

## Current boundary

M10 is the evidence-collection and product-direction stage. It is not permission to:

- claim that EXE is cheaper, better, more affordable, easier, validated, or market-ready;
- accept real CVs or private application material into the repository;
- select the next app feature before evidence review;
- merge to main or deploy.

## Required evidence path

1. Complete the M7 owner review with fictional data.
2. Rehearse and review the M5 CP1 fictional demo.
3. Confirm the target segment, recruitment route, consent wording, and safe note storage.
4. Conduct consent-safe target-user interviews.
5. Conduct qualified expert interviews according to the course requirement.
6. Run the anonymous survey if required or useful.
7. Collect current, cited alternative, competitor, privacy, and pricing sources.
8. Enter only anonymized summaries into CP2_EVIDENCE_REGISTER.md.
9. Run the M9 collected-evidence validator.
10. Review limitations, bias, contradictions, and uncertainty with the owner/team.
11. Classify hypotheses and record a product-direction decision.
12. Authorize M11 only after the decision is recorded.

## Course requirement record

The current checkpoint tracker records:

- more than 100 survey responses, or interviews with at least two qualified industry experts;
- a separate plan for 5–10 target-customer video interviews;
- competitor, market, value, and price research;
- dated citations and clear separation between evidence and assumptions.

Confirm any ambiguity with the instructor before marking CP2 complete. The numbers above are a course-tracker requirement record, not collected results.

## Owner execution checklist

### M7 and CP1 review

- [ ] Complete M7 desktop review with fictional data.
- [ ] Complete M7 narrow-mobile review with fictional data.
- [ ] Complete M7 keyboard-only review.
- [ ] Review private review-link visibility, revocation, and feedback.
- [ ] Review opportunity-link empty, error, status, and deletion behavior.
- [ ] Rehearse the M5 CP1 demo.
- [ ] Record the team/course evidence required for CP1.

### Primary research

- [ ] Decide and record the target-user segment.
- [ ] Decide and record the sampling/recruitment method.
- [ ] Confirm consent wording and safe note storage.
- [ ] Conduct the target-user interviews.
- [ ] Conduct the expert interviews.
- [ ] Run the anonymous survey, if required.
- [ ] Keep names, contacts, recordings, full CVs, credentials, and confidential applications outside Git.

### Desk research

- [ ] Record each public source URL and access/source date.
- [ ] Record region, currency, plan, tax, and access conditions for pricing.
- [ ] Compare direct tools and manual substitutes.
- [ ] Record privacy/data-handling statements only when a current source supports them.
- [ ] Keep source facts separate from team interpretation.
- [ ] Do not claim EXE is cheaper or better from one source.

### Evidence review

- [ ] Add only anonymized evidence summaries.
- [ ] Run pnpm cp2:validate:collected.
- [ ] Correct structural or safety failures.
- [ ] Review sample limitations and possible bias.
- [ ] Classify each hypothesis.
- [ ] Complete M10_PRODUCT_DIRECTION_DECISION.md.
- [ ] Complete M9_NEXT_FEATURE_SELECTION.md.
- [ ] Decide whether M11 is authorized.

## Progress report format

After each completed section, record:

- date and owner;
- section completed;
- evidence IDs or source IDs;
- what was observed;
- what remains uncertain;
- decision or next action;
- owner/team review status.

Do not record participant names, direct contact details, raw recordings, full CV text, credentials, or private employer information.

## M11 authorization gate

M11 may begin only when:

- M7 owner review is recorded;
- CP1 evidence is recorded;
- CP2 evidence is entered and structurally validated;
- limitations and bias are reviewed;
- hypotheses are classified;
- the owner/team records one product-direction decision;
- the selected feature has supporting evidence IDs;
- owner approval to build the selected feature is explicit.

Until then, the next action remains evidence collection and review. No product feature is selected by this file.
