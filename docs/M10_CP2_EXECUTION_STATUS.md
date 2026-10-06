# M10 CP2 Research Execution Status

**Status:** M17 decision preparation complete; CP2 human gate OPEN — 9 public-source rows, 0 owner-reviewed, 9 pending. No primary-research results, manual owner acceptance or product direction recorded. Public-source rechecks are dated 2026-10-06; historical collection began 2026-10-05.
**Current branch:** `codex/exe-m17-cp2-evidence-review` (historical M10 branch: `codex/exe-web-app-m10`)
**Purpose:** execute the M8 research plan and use the M9 decision gate before selecting the next product feature.

This file is a live checklist. An unchecked item is not complete. Do not mark an item complete from an assumption, a template, a fictional demo, or a validator pass.

## M17 current execution handoff — 2026-10-06

The [existing owner review packet](evidence/CP2_GATE_RECONCILIATION_2026-10-05.md#current-owner-review-packet--m17-2026-10-06) lists all nine pending register IDs (CM-001–CM-008, EDU-001 mapped to source CM-009), missing TU/EX/SV research, manual M7/CP1/M16 outcomes and exact M18 decision fields. The [source snapshot](evidence/CP2_PUBLIC_SOURCE_SNAPSHOT_2026-10-05.md) records five usable official-source rechecks, Jobie timeout, TopCV HTTP 403 responses, unreadable Jobscan pricing and MOET Page not found HTML. This is assistant desk research, not owner/team evidence review. Preserve historical sections below as dated status records; their M11 gate is now applied to M18 feature selection and does not undo completed M15/M16 engineering.

Next owner actions: confirm instructor requirements; provide actual anonymized participant/expert summaries and survey aggregates if applicable; review the nine source rows and limitations; record fictional manual walkthrough/rehearsal results; complete the existing reviewed direction/feature records and explicit approval. A validator pass does not authorize M18.

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
| Current public market, competitor, and pricing research | At the 2026-10-02 review, no source evidence had been recorded | Owner/team must review the subsequent 2026-10-05 source records, verify current checkout/promotion/tax context, and add needed market/outlook sources. No price or competitive claim is approved. |

**Status as of 2026-10-02:** no status change. CP2 remained pending; no evidence-selected M11 feature was authorized. No participant research or owner/team review was performed by that review.

## Public-source update — 2026-10-05

- Activity: manually reviewed official public pages for candidate product features and displayed access/pricing context; this was not an interview, survey, expert interview, product usability test, or market-size study.
- Source IDs: CM-001–CM-008; detailed dated notes are in `docs/evidence/CP2_PUBLIC_SOURCE_SNAPSHOT_2026-10-05.md`, and structured fields are in `docs/evidence/cp2-public-source-log-2026-10-05.md`.
- Checks: `pnpm cp2:validate:collected` passed with 8 records and 0 owner-reviewed records. `pnpm cp2:sources:validate -- --file docs/evidence/cp2-public-source-log-2026-10-05.md` passed documentation-completeness checks; it did not fetch URLs or verify facts.
- Review/decision: owner/team review remains pending. No price, differentiation, market, target-segment, job-family, or product-direction decision was made. CP2 remains pending and no evidence-selected M11 feature is authorized.

## Follow-on education-context source and instructor clarification draft — 2026-10-05

- Activity: added CM-009 from an official Ministry of Education and Training higher-education statistics PDF. It reports 2,355,711 undergraduate students across 243 universities for academic year 2023–24, with an explicit exclusion for Public Security and National Defence institutions. This is education enrolment context only, not a count of job seekers or CV-support demand.
- Evidence records: CM-009 is in the dated public-source log and snapshot; EDU-001 is the corresponding neutral context row in `docs/CP2_EVIDENCE_REGISTER.md`. Publication date is not stated in the PDF.
- Validation: `pnpm cp2:validate:collected` passed with 9 evidence rows and 0 owner-reviewed; `pnpm cp2:sources:validate -- --file docs/evidence/cp2-public-source-log-2026-10-05.md` passed source-log structure/completeness. The source validator did not fetch URLs or verify facts. Direct PDF retrieval timed out; CM-009 is based on indexed text and requires owner inspection.
- Instructor follow-up: `docs/M10_CP2_INSTRUCTOR_CLARIFICATION_DRAFT.md` contains English and Vietnamese draft wording for the ambiguous “hub,” participant-count, overlap, supplier, expert-qualification, and evidence-format requirements. It is **not sent**; no instructor reply or outreach is recorded.
- Review/decision: CM-001–CM-009 and EDU-001 remain pending owner/team review. No recruitment, fieldwork, product selection, price/competitive claim, CP2 completion, or M11 authorization occurred.

## Supplementary public-page retrieval — 2026-10-05

A separate web retrieval directly opened the official FitCV pricing, TopCV sign-up/CV-template, Rezi pricing, and Jobscan tools pages. It recorded the on-page access, plan, credit, promotion, and price context in the [source snapshot](evidence/CP2_PUBLIC_SOURCE_SNAPSHOT_2026-10-05.md). Jobscan pricing redirected without readable price details. Direct Jobie, NSO, and MOET retrieval timed out in that session. This is assistant-performed public-source retrieval, not owner/team review: all nine source/register rows remain pending with zero owner-reviewed. No account, checkout, purchase, primary research, manual owner review, or product decision occurred. The source log and evidence register were unchanged. Project validators and app tests were not run in that separate environment; previously recorded results remain historical.

## Exact inputs required next

### Reconciliation — 2026-10-05

The [evidence inventory and decision-preparation packet](evidence/CP2_GATE_RECONCILIATION_2026-10-05.md) confirms 9 collected register rows and 0 owner-reviewed. Source-log CM-009 maps to register EDU-001; not an extra tenth item. Actual primary-research results and recent manual owner observations were not found; activity details outside this checkout remain Unknown. No historical result or source review status was replaced.

Technical attempts to close existing gaps: Jobie timed out, Jobscan pricing had no readable response and desktop browsing was unavailable, and the MOET PDF URL returned a Page not found page. Current checkout/price and direct PDF verification remain unavailable. Both validators passed structural checks, not source accuracy or approval. User-friendliness and affordability remain hypotheses; decision and new-feature gates remain pending. No outreach, primary collection, owner/team decision or feature implementation occurred.

M10.3 prepares local operations only: use `M10_3_OWNER_HANDOFF.md` and the survey/source schemas to manually anonymize, validate and summarize actual owner-supplied evidence before safe register entry. Private drafts go in ignored `research/private/` or `docs/evidence/private/`; identities/raw files stay separate. The 2026-10-02 review found no research had been collected or entered at that time; the subsequent 2026-10-05 public-source activity is recorded separately above. CP2 remains **Evidence collection pending**. Target segment/job family remain open, price/competitor claims blocked and M11 blocked. M7/M10.2 fictional owner browser reviews remain pending. No merge or deployment occurred.

1. Documented fictional-data results for every M7/M5 owner review item above.
2. Actual collection dates, anonymized category, consent-safe summary, related hypothesis, signal, limitations, and owner-review status for each target-user or expert activity.
3. Aggregate anonymous survey counts/results and sampling limitations, if a survey is used.
4. Owner/team review of `docs/evidence/CP2_PUBLIC_SOURCE_SNAPSHOT_2026-10-05.md` and CM-001–CM-009 / EDU-001; recheck live pricing/checkout terms and add required market/outlook sources with dates, region, currency, plan/tax/access context, and exact supported facts.
5. Send the instructor clarification draft if the project owner chooses, then record the actual send date/reply. Do not treat the draft as course approval.
6. Owner/team review date, reviewer, limitations/bias discussion, hypothesis classifications, and explicit product-direction decision.

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
