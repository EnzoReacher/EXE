# OwnPath implementation status — 2026-10-12

The synthetic Translator vertical slice and **OP-11 automated acceptance are complete**. This is an engineering review candidate, not a production release, completed user study, external AI-provider integration or course approval.

**Verified code/test checkpoint:** `2cee287135d22234a77e288cf1c04d905dfd2ea9`, tree `023ae3922ceb1eeb1b4b04c57b467b11a3d2ce3a`, on `feat/ownpath-experience-translator`; [draft PR #1](https://github.com/EnzoReacher/EXE/pull/1). Both [Quality push](https://github.com/EnzoReacher/EXE/actions/runs/38210654534) and [Quality PR](https://github.com/EnzoReacher/EXE/actions/runs/38210658386) passed. [Synthetic acceptance run 38210654756](https://github.com/EnzoReacher/EXE/actions/runs/38210654756) completed successfully for that exact SHA. A subsequent documentation-only commit may advance HEAD; it does not replace this tested code checkpoint.

The owner approved branch publication and draft PR on 2026-10-12. No merge, deployment, paid provider or real-research approval is inferred from that publication approval.

## Audited base and preservation

- Repository `EnzoReacher/EXE`; default `main` remains the older foundation at `d956118e3b89eb1fdcfd10fb48a45ba150fec20a`.
- Selected cumulative base `codex/exe-m17-survey-readiness` is `ae2527633733fc5081a96ecb2c16e09081a8c878`; it already includes M18 `ec563c8666cc5ddae14949586b542334a096750e` and later survey/status work. Main is not the review base.
- Isolated worktree `/workspace/scratch/beb51ea3bd99/EXE`. Original clean M17 checkout and dirty M15 modified/untracked work remain preserved.
- Initial published snapshot `21845b1e3cdf89be9fdcee04d3a6754bbdada0e7` exactly matched local snapshot `c7edaaea3c113e1b321f880c75b9bf88d1f3337e`, tree `49e5c79514ba19ae84015cfdeb9b96b0caab001e`. Original local histories remain on checkpoint branches; the original OP-11 local commit `69fb7514abac79a798bd69e4e37ac896cebc9103` matches the original `a7260d5` acceptance tree and is preserved as `checkpoint/ownpath-op11-local`.
- Eight migrations retained unchanged. No Auth behavior/API/DB/Storage/RLS implementation change. Existing exact-excerpt and credential/export acceptance rules remain intact.
- Stack: Next 16.3.7, React 19.2.8, TypeScript 5.9.3, Supabase JS 2.117.2/SSR 0.12.7, pnpm 11.25.0, Vitest 5.0.2, Playwright 1.61.1. Installed Next docs were read before code changes and production-build harness design. Disposable CI used Supabase CLI 2.119.0; owner PostgreSQL/OpenCode configuration remains unseen.

## Delivered

1. OwnPath branding and primary Translator landing/demo route; existing private features retained.
2. `/experience-translator`: one bounded project/JD → selected questions/skip → exact-source personal fact confirmation → 0–3 grounded English local-template bullets → source/JD relevance → edit/reject/regenerate → individual acceptance → copy/local TXT → clear. No CV prerequisite, database save, external model or URL fetching.
3. Schema/provenance/template guards, negation/actor/instruction constraints, contextual technology links, frozen adapter snapshots, timeout/abort/bounded retry and stable regeneration. Editing invalidates approval; detached revisions survive without false current provenance.
4. PRD, ADR/reuse/contracts/threat model, seven Mermaid diagrams, issue dependencies/estimates/ownership/rollback, research instruments, alternative source observations, demo and handoff.
5. Version-aware OpenCode Factory installer: four roles/four commands, V1/V2 templates, idempotent dry-run/install, differing-config/symlink refusal, root AGENTS preservation, restricted writer/read-only reviewers. Actual V1 discovery/loaded permissions passed; owner-local execution remains a separate check.
6. Scoped feature CI: compiled Translator desktop/mobile-width browser journeys plus reusable disposable Supabase policy and legacy browser regression. Legacy Auth test locators now match OwnPath branding/navigation; app Auth behavior was not changed.

## Actual validation

| Executed check | Result and boundary |
|---|---|
| Frozen dependency installation | Passed locally and on CI; lock unchanged. |
| Pre-change tests/lint | Historical baseline: 349 tests / 48 files passed. |
| Full current tests | **416 tests / 53 files passed**, locally, Quality CI and disposable backend engineering verification. Includes the previous 406 tests plus 10 new Factory config self-check regressions. |
| Lint, typecheck, production build | Passed locally/CI. Compiled Translator job independently built unchanged isolated source. No deployment. |
| Independent QA | Prior 54 targeted tests / 3 files passed; new acceptance diff and actual V1 normalized permissions reviewed read-only. No unresolved concrete blocker in synthetic scope. |
| Compiled Translator Chromium | **4 actual browser journeys, 20 named steps passed** at 320/375/768/1440px. Intake, fact confirmation, keyboard approval, edit invalidation, regenerate/preserve/reset, accepted-only exact TXT bytes, overflow on all screens, heading focus, no-store, clear/reload. Exact-origin GET allowlist, blocked-attempt/socket/page-error failure and source sentinel checks passed. No screenshots/traces/videos. Owned browser/server/download/output scope cleaned. |
| Real local Supabase policies | **Passed** on disposable CI stack: M1–M6b ownership/private Storage/cascade checks; M15 atomic rollback, concurrency retry, exact provenance, accepted-draft preservation; M11A assigned-expert/immutable credential/acceptance/withdrawal policies. Fictional actors only. |
| Legacy Auth/core/credential browser | **Passed**: cold/warm sign-in, sign-out/protected routes, signup/session, anonymous denial, core save/reopen/feedback/revocation/cascade, expert review, accepted export and withdrawal/stale-export denial. This existing harness uses a dev server, separately from compiled Translator acceptance. Current-run browser accounts/private objects cleaned. |
| Proof-preview and workspace browser | **Passed** separate fictional suites, including responsive and keyboard checks. |
| Disposable stack teardown | **Passed** `supabase stop --no-backup`; temporary startup/stop logs and `.env.local` removed. M1 policy Auth accounts survive until this stack teardown, not per-test deletion. |
| CP2 register/source structure | Passed. Register remains 9 public-source rows, 0 owner-reviewed, 9 pending. Provisional Rezi/Teal source-log observations are not participant evidence. |
| OpenCode 1.18.35 configuration | **Passed actual runtime discovery**: four agents/four commands, command→Lead binding, modes and normalized permissions via `agent list --pure`, `debug config --pure`, `debug agent <role> --pure`. Isolated settings, no credentials/model tasks. Runtime tool-output external-directory exception documented. V2 and owner-local permission execution not tested. |
| Physical mobile keyboard, screen reader, 200% zoom, owner walkthrough | **Not performed**. Responsive Chromium widths do not substitute for these. |
| Real usability/research, paid provider, merge/deploy | **Not performed / not approved**. |

The acceptance workflow records all six backend commands as PASS: `review:verify`, `test:supabase:local`, `test:e2e:local`, `test:proof-preview`, `test:workspace-ui`, `cp2:validate`. Both jobs and their cleanup steps passed. Work itself did not install/run Chromium or start a preview/database; browser infrastructure ran on disposable GitHub runners.

Earlier adversarial review exposed actor/curly-negation/authoring/technology/reference/error-target/React.js and stale-edit defects; meaningful regressions fixed them before green results. This turn corrected stale legacy Auth locators before running real browser acceptance. A controlled fixture pass is not universal semantic correctness.

## Gates and next work

| Gate / issue | Current state |
|---|---|
| A / OP-00 audit | Accessible repo/base/CI/reuse observed; V1 Factory config loading verified. Owner global/runtime execution unseen. |
| B / OP-01–02 scope/research | Synthetic scope authorized. Formal CP2, consented interviews, real workaround trials and evidence review pending. |
| C / OP-03 design | Proposed architecture and in-memory slice documented. Production persistence/provider design acceptance pending. |
| D / OP-04–10 controlled feature | Implemented; current unit/component and compiled-browser acceptance passed. |
| E / OP-11 independent QA/security | Automated acceptance complete, including real disposable policies and regression. Manual accessibility/device checks open. |
| OP-12 usability | Actual counterbalanced observations and accuracy/time/edit comparison pending; no participant outcomes invented. |
| OP-13 demo/handoff | Synthetic engineering candidate and deterministic demo ready. Final study-backed release decision still depends on OP-12/owner. |
| F / release; OP-14 provider | Draft review branch only. No merge/deployment or approved model/budget/real-data retention. |

No real TU/EX/SV results, verified mentor transcript, recruitment messages or owner signatures were added. Inputs/edits remain React memory; reload/clear discards them. Clipboard/TXT are deliberate user actions. Existing configured Supabase navigation proxy may refresh Auth but does not receive Translator input. Templates may omit genuine facts; there is no general AI translation or arbitrary-model fact verifier.

Next follow the existing lifecycle: review this concrete engineering candidate, use RESEARCH_PLAN for actual consented OP-02/12 evidence, perform outstanding manual checks, and make the separate release/provider decision when that evidence exists. Continue bounded synthetic fixes if actual findings arise; do not repeat completed acceptance as if it were pending.

## Checklist continuation — pilot preparation and Factory self-check

Following the owner's 2026-10-12 instruction to continue the proposed workflow, E01 operational measurement/rubric is defined before any study in [PILOT_PROTOCOL](PILOT_PROTOCOL.md): equal fact access, counterbalanced task/tool allocation, 600-second cap, blind claim rubric, explicit formative targets and failure/denominator rules. This is protocol preparation only; no participant/owner signature/outcome added. Real consent/retention and course requirements remain open.

[MANUAL_ACCEPTANCE](MANUAL_ACCEPTANCE.md) supplies exact A06/C07–C10 owner-local steps and blank NOT RUN outcome rows. `scripts/verify-ownpath-factory.mjs` provides reproducible V1 pure config/ordered-policy/tool-availability verification with content-free diagnostics and owned fixture cleanup. Generated agent instructions now name the full docs paths; writer scope adds only this bounded verifier alongside existing setup scripts. No app, DB, migration or provider behavior changes.

Actual verification: full local suite **416 tests / 53 files** passed; lint/typecheck and docs link/whitespace checks passed. Updated isolated self-check passed on official OpenCode 1.18.35 with four agents/four commands. Regression checks cover missing/changed role policies, disabled writer/orchestration tools, unexpected tools, late overrides, glob/traversal managed-output paths, rule order, command diversion and private CLI stderr/fixture cleanup. Fresh full Quality push/PR and compiled-browser/disposable-backend acceptance passed at `2cee287135d22234a77e288cf1c04d905dfd2ea9`; both job cleanup steps passed. The original OP-11 checkpoint `a7260d5` remains historical evidence; application/DB source is unchanged by this follow-up. A subsequent documentation-only HEAD may advance the branch; exact tested source remains identified here and in PR #1. V2, owner local tool execution, physical devices and participant study remain unverified.
