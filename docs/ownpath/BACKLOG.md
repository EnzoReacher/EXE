# Execution backlog and estimated roadmap

One writer per worktree. Read-only reviewers may run concurrently. Every issue records actual evidence in STATUS; formal production gate remains pending. Estimate units are focused engineer days, not elapsed commitments.

| Issue / scope | Files | Dependency | Owner | Definition of Done / checks | Evidence | Estimate | Gate / rollback |
|---|---|---|---|---|---|---|---|
| OP-00 Audit | STATUS, existing docs/source read | None | Auditor | HEAD/base, dirty trees preserved, CI, versions, reuse, 8 migrations inventoried; fresh baseline | Git/API + test logs | 0.5 | Authorized read-only; no mutation |
| OP-01 Scope/PRD | PRD, existing README/state/tracker | OP-00 | Lead | Persona, flow, non-goals, approval distinction, no fabricated signature | Owner handoff + PRD | 0.5 | Synthetic planning authorized; revert own docs |
| OP-02 Research/workarounds | RESEARCH_PLAN, existing CP2 records | OP-01 | Owner/team + Auditor | Real consented interviews, dated official alternatives + actual workaround, reviewed evidence | Pending actual TU/SV/CM IDs | 1 + recruitment | Human input pending; retain historical evidence |
| OP-03 ADR/threat/reuse | ARCHITECTURE, FLOWS | OP-01 | Architect | In-memory/proposed persistence distinction, semantic guard and privacy review | ADR-001 | 0.5 | Design proposed; no DB change |
| OP-04 Four-screen UX | Translator client, CSS | OP-03 | Core Engineer | Intake/interview/bullets/review, keyboard labels, empty/error/loading | Component tests; browser/mobile pending if unavailable | 0.75 | Synthetic only; remove route |
| OP-05 Contract/provenance | translator types/engine + tests | OP-03 | Core Engineer | Exact sources, personal facts, schema+semantic validation, no JD facts | Controlled fixtures | 0.5 | Synthetic only; revert isolated module |
| OP-06 Intake | Translator client + engine | OP-04, OP-05 | Core Engineer | One bounded project/JD; recover validation errors | Intake tests | 0.5 | Synthetic only; remove route |
| OP-07 Extract/match | engine, requirements reuse | OP-06 | Core Engineer | Negation/instruction/team guard, missing is not lack | TC01/02/06/08 | 0.75 | Synthetic only; revert new wrapper |
| OP-08 Interview | engine/client | OP-07 | Core Engineer | No repeated known facts; 2–4 missing questions; skip | TC03/07 | 0.5 | Synthetic only; revert own files |
| OP-09 Bullets | composer/adapter/validator | OP-08 | Core Engineer | 0–3 English bullets, exact facts, no fabricated metrics; malformed/timeout bounded | TC04/05/09/10/14 | 1 | Synthetic only; adapter stays local |
| OP-10 Review/copy | client/review helpers | OP-09 | Core Engineer | Edit resets approval, regenerate preserves edit, accepted-only copy/TXT, clear | TC11/13 interactions | 0.75 | Memory only; DB/save/export integration blocked |
| OP-11 QA/security | e2e/translator*, e2e/auth-flow.spec.ts, e2e/safe-reporter.ts; scripts/ci-ownpath-browser*, e2e-local-reporter.test.mjs; ownpath/local-acceptance workflows, .gitignore, TEST_STRATEGY, STATUS | OP-10 | Independent QA | Full unit/integration/lint/types/build; injection; existing regression; browser/mobile and RLS boundaries explicit | Fresh commands and reviewer findings | 1 | No 'production ready'; revert branch changes |
| OP-12 Usability study | real research records | OP-02, OP-11 | Owner/team | Counterbalanced actual observations, accuracy/time/edit comparison | Pending actual evidence | 1 | Real consent/course gate; no invented data |
| OP-13 Demo/RC/handoff | STATUS, demo script, pitch | OP-11, OP-12 | Lead + Owner | Honest deterministic demo, exact commands/limitations, explicit release decision | Draft PR + acceptance | 0.75 | Owner release pending; no merge/deploy |
| OP-14 Provider (conditional) | future server adapter/contracts | OP-02/03/05 + approval | Core Engineer + Owner | Model/budget/consent/privacy approved, server validation/rate-limit/Auth/isolation/idempotency, timeout tests | Approval not supplied | TBD | Blocked; local adapter fallback |

Factory configuration and version-aware setup belong to OP-00/01, `docs/ai-factory/` and `scripts/setup-ownpath-factory.mjs`. Agent/command discovery and loaded permission rules passed using actual official OpenCode 1.18.35 in an isolated synthetic fixture. Owner-local global/MCP settings, permission tool execution and V2 runtime remain unverified; no cost/provider is selected.

## Ten working days (estimate; research and engineering can overlap)

```mermaid
gantt
  title OwnPath reference plan — 12 to 23 October 2026
  dateFormat YYYY-MM-DD
  excludes weekends
  section Engineering
  Audit / Factory / scope :audit, 2026-10-12, 1d
  UX / research instruments :ux, after audit, 1d
  ADR / contracts :contract, after ux, 1d
  Intake / extraction :intake, after contract, 1d
  Smart interview :interview, after intake, 1d
  Grounded bullets :bullets, after interview, 1d
  Edit / approval / copy :review, after bullets, 1d
  QA / security / regression :qa, after review, 1d
  Usability / fixes :study, after qa, 1d
  Demo / release candidate :rc, after study, 1d
  section Human evidence
  Recruit / consent / interviews :research, 2026-10-13, 6d
  Owner research and release review :gate, 2026-10-22, 2d
```

A synthetic vertical slice can advance ahead of this schedule; that does not advance the human gates. Re-estimate after owner study availability and actual browser results.

## Current checkpoint

At current code/test SHA `d2979c6a8c074dabe245ba5fa79991d65ae6de93`, OP-04–10 synthetic implementation and OP-11 automated/independent acceptance passed, including seven compiled Translator cases / 30 steps and disposable backend regression. OP-13 synthetic demo/handoff is ready. OP-02/12 real research and final OP-13 release decision remain pending; OP-14 provider remains conditional. Manual device/accessibility checks and owner-local Factory tool execution are still open. See STATUS for exact commands/run links; the schedule above remains an estimate, not a claim of completed human evidence.

## Follow-up preparation scope

User instructed continuing the checklist/workflow on 2026-10-12. The bounded follow-up adds `scripts/verify-ownpath-factory.mjs` and its policy-regression tests, fixes explicit docs paths in Factory prompts, and updates `docs/ownpath/PILOT_PROTOCOL.md`, `MANUAL_ACCEPTANCE.md` plus planning/runbook/handoff records. E01 operational measurement/rubric definition is complete as preparation; actual study and owner-machine/manual gates stay open. Single writer; independent reviewer reads only. No app/DB/provider implementation or migration change. Rollback is removal/revert of these isolated scripts/docs; existing profiles are never automatically overwritten.

Follow-up source checkpoint `2cee287135d22234a77e288cf1c04d905dfd2ea9` passed full Quality push/PR and [synthetic acceptance](https://github.com/EnzoReacher/EXE/actions/runs/38210654756), including both cleanup steps, with 416 tests / 53 files. E01 protocol preparation is done; A06, manual device/owner checks and D03–D07/E02–E05 human study remain open.

## Keyboard and fallback acceptance follow-up

Authorized synthetic QA continuation owns `src/app/experience-translator/translator.tsx`, `translator.test.tsx`, `translator.css`, `e2e/translator.spec.ts`, `scripts/ci-ownpath-browser.mjs` and relevant status/test docs only. Fix repeated Skip accessible names; exercise keyboard-only transitions/selective skip/reject/restore, injected clipboard rejection and long-source narrow layout in the existing compiled loopback CI harness. DoD is local checks, actual browser/legacy CI results and read-only independent review; whole manual/device/participant/release gates stay open. No DB/provider/migration change; revert this isolated UI-label/test diff if needed.

Completed at source `c89fc32b28ca015f0ffbf5c60ee5d70709295e43`: 417 tests / 53 files, Quality push/PR, [synthetic acceptance](https://github.com/EnzoReacher/EXE/actions/runs/38216785533) seven compiled cases / 30 steps, all six disposable backend commands and cleanup passed. Read-only QA reviewed the UI/test scope and exact question-label correction after the first compiled run exposed partial-label collisions. No unresolved concrete blocker in this bounded synthetic scope. C01–C06 evidence renewed; C07–C10, owner-local/research/release gates remain open.

## Next workflow support — private pilot instrument

Owner instructed continuing on 2026-10-12. Root sole writer owns `scripts/ownpath-pilot.mjs`, its synthetic regression tests and `docs/ownpath/PILOT_DATA_RUNBOOK.md` plus protocol/research/status/handoff links. Bounded E02/E03 preparation: strict private structured observations, fixed sequence/checkpoint, explicit missing slots/failures/caps, human-review-gated completion, separate coaching/fact requests and generated/final safety, within-pair statistics and private drafts requiring review. No collection, recruitment, raw research record, app/API/DB/provider/migration or register/approval write. Independent reviewer reads only. DoD: meaningful tests, engineering checks, exact-tree branch publication and CI evidence; actual E02/E03 stay open. Rollback reverts these scripts/docs without changing app source or private observations.

Private instrument preparation completed at `d2979c6a8c074dabe245ba5fa79991d65ae6de93`: 12 focused tests, full 429/54, lint/types/build, Quality push/PR, [compiled seven cases/30 steps + backend acceptance](https://github.com/EnzoReacher/EXE/actions/runs/38219710485) and cleanup PASS. Independent read-only QA cleared schema/missing-data/math/privacy/template/runbook corrections. No participants/data/approvals added; E02/E03 actual work remains pending.
