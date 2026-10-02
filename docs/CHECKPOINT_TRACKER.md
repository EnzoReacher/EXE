# EXE101 Checkpoint Tracker

Use this file as the team's working checklist. Mark an item complete only when its evidence exists and has been reviewed by the team.

| Checkpoint | Slot | Weight | Status | Owner | Evidence / exit condition |
|---|---:|---:|---|---|---|
| CP1 — idea lock | 3 | Part of 10% | Not started | TBD | Product/service description, target-user hypothesis, problem, value proposition, MVP boundary |
| CP2 — market research | 5 | 20% | M10 evidence review complete — evidence collection pending | TBD | M8/M9 research package and M10 execution records are ready; the 2026-10-02 M10 review found only template/example material. Actual reviewed survey/interview and market/competitor/value evidence is still required before CP2 can be marked complete |
| CP1 — MVP demo | 8 | Part of 10% | Demo package ready — team/course review pending | TBD | Fictional local end-to-end runbook and product/technology descriptions in `docs/demo/`; complete rehearsal, owner review, and course evidence before marking CP1 complete |
| CP3 — BMC | 8 | 15% | Not started | TBD | Business Model Canvas supported by research or assumptions clearly labeled |
| CP4 — pitch deck | 10 | 40% | Not started | TBD | Option 1 working rubric: Team profile 10%; Product-market fit 40%; Business model 20%; Operations 20%; Fundraising plan 10% |
| Constructivism presentation | No limit stated | 15% | Not started | TBD | Rubric and evidence format not included in the guide; keep a learning/decision log and ask instructor |

## CP2 research checklist

- [x] Prepare consent-safe M8 research plan, interview guides, anonymous survey template, blank evidence register, current-source comparison template, and owner checklist.
- [x] Prepare M9 evidence-register validator, evidence-review template, product decision gate, next-feature matrix, and unchecked owner status.
- [x] Initialize M10 CP2 execution workspace with blank status, session-log, and product-direction records.
- [x] Review the repository evidence state for M10/M10.1; confirmed no actual CP2 evidence, anonymized note, owner review, or M11 decision is recorded.
- [ ] Decide primary segment and sampling method.
- [ ] Survey target: more than 100 responses, or document interviews with at least two qualified industry experts.
- [ ] Separately plan 5–10 target-customer video interviews.
- [ ] Prepare consent and safe storage for recordings/notes.
- [ ] Confirm whether “5 target customers, 5 suppliers” is an additional requirement and who counts as a supplier.
- [ ] Confirm what “hub” means in the guide.
- [ ] Ask about current solutions, unmet need, reaction to core features, use intent, and expected price.
- [ ] Research industry outlook, market size, trends, segments, key players, market share where reliable, and product/service pricing.
- [ ] Compare competitors/substitutes and explain value proposition and market fit.
- [ ] Cite sources and dates; distinguish evidence from assumptions; do not invent results.
- [ ] Run `pnpm cp2:validate:collected` after evidence entry; treat a pass as a structural/safety check only, then record owner/team review of limitations and hypotheses.

## Open course questions

1. What does “hub” refer to in the CP2 instructions?
2. Are five target customers and five suppliers required in addition to the survey/two-expert condition and the 5–10 customer video interviews?
3. Who qualifies as a “supplier” for this project (recruiter, career center, mentor, job board, or another group)?
4. What are the Constructivism presentation requirements and rubric?
5. What is Checkpoint 4 Option 2, and may the team select it?
6. What presentation length, format, and evidence-submission rules apply at each checkpoint?

## Evidence folder suggestion

Keep one dated evidence item per file in `docs/evidence/`: interview guide, anonymized survey export, consent-safe interview notes, market source log, competitor matrix, prototype/demo screenshots, BMC, pitch-deck source notes, and decision log. Do not commit raw CVs, names, phone numbers, email addresses, interview recordings, or API secrets.

## App implementation status

The M5 fictional-data demo package is ready for review, but CP1 is not complete until the team performs the demo and records the required course evidence. Track engineering parts, checks, and remaining product work in [`APP_BUILD_TRACKER.md`](APP_BUILD_TRACKER.md).
