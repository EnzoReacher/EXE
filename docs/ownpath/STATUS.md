# OwnPath implementation status — 2026-10-15

## Accounts stage execution — 16 October 2026

W7 test-only recovery continuation from48e58c6: actual Firestore with fake billing provider exercises orphaned signed receipt, second worker after interrupted-claim lease expiry, inert duplicate and backoff boundary. Exact-source23backend+24direct denials,7browser/15steps, owned cleanup, full542/23explicit emulator skips, lint/types passed. No production scheduler/CLI/Stripe/cloud/UI implementation; no independent W7 reviewer execution or approval claimed. W7 publication-head CI status belongs on draft PR#3 after inspection. FE1/FE2 reviewed delivery remains next integration prerequisite.

W6 independent verification from7069243: real two-browser same-identity all-session logout now passes7authenticated browser cases/15steps, actual Firebase21backend+24denials, full542tests/63files(21explicit emulator skips), lint/types/build/diff. First context's cookie clears; second still holds an HttpOnly cookie yet is denied401/SESSION_EXPIRED. Second identity token is issued by owned Auth emulator; no second frontend SDK-login/UI claim. Failed immediate revocation check and whole-second synchronization recorded in AB_EVIDENCE. FE1/FE2 delivery, combined UI, real Stripe/cloud and scheduler gates remain open. Exact-head hosted status on draft PR#3 after publication.

Next-order continuation **W5**: updated [FLOWS](FLOWS.md) and [AB_NEXT_STEPS](AB_NEXT_STEPS.md) show the actual dependency order. Official browser SDK acceptance now passes **6total cases/12steps** (3transport +3SDK), actual Firebase21backend+24denials and owned cleanup. Fresh **542default tests/63files,21explicit emulator skips**, lint/types/frozen install pass. Policy-only safe-unavailability repair integrated as61d8568 after RED/GREEN and read-only review; native policy **success/enforcement remains unverified**, no fallback. Verification/reset use actual emulator action codes, not real email. CLI action links redacted before output. Human auth/billing UI/shared cutover, actual Stripe, cloud/operations and FactoryV2 gates remain open. Guest final regression/publication evidence is recorded in AB_EVIDENCE/PR#3 separately.

Continuation publication: repair **e498a98**, root tooling **5fbbb6b**, packets/evidence **f22e49b** published to [draft PR#3](https://github.com/EnzoReacher/EXE/pull/3); exactf22e49b push+PR Quality and acceptance all SUCCESS. Inspected hosted counts/cleanup and links in [AB_EVIDENCE](AB_EVIDENCE.md). This publication-record follow-up is docs-only; its exact-head CI status is maintained on PR#3 after inspection. Human UI/external gates below remain open.

Continuation fromfd0644b: fresh **539default tests/63files**, **21explicit emulator skips**, actual Firebase **21backend+24client denials**, new **3authenticated browser API cases/6steps**, retained **7guest cases/30steps+119retired probes**, frozen install/lint/types/build/diff PASS. Narrow reviewed adapter error repair integrated ase498a98; new harness's2P2 lifecycle findings reproduced/corrected/closed. Reviewers read source/logs only. [Ledger](AB_EXECUTION_LEDGER.md), [FE1](AB_FE1_PACKET.md)/[FE2](AB_FE2_PACKET.md) and [external packet](AB_EXTERNAL_PACKET.md) prepared; no frontend delivery/acknowledgment. API transport uses owned demo emulators and seeded history, **not UI, paid browser saves, actual Stripe/cloud acceptance**. Combined legacy cutover blocked on human delivery. Factory V2 unverified;8local profiles byte-preserved. Current source/log/publication details: [AB_EVIDENCE](AB_EVIDENCE.md).

Durable sandbox billing backend source **`41ef853c058de952b8c54e9ba48248cb31fb2bf5`** is implemented after the delegated writer hit its usage limit and coordinator took sole completion ownership. Separate read-only QA found3 P2 issues; corrections and re-review closed all3 with no new actionable blocker. Default-off explicit sandbox gate, real Stripe23 adapter, durable reservations/receipt retries, canonical lease/generation fencing, expiry/risk and owned portal are present. **533 default tests pass /21 emulator skips**, actual Firebase **21 backend cases (account9+billing12) +24 direct-client denials** pass; billing provider is fake, actual Stripe remains blocked. Full lint/types/build and fresh final **compiled7-case/30-step +119-probe acceptance** pass. The isolated earlier PR CI768px keyboard failure and reviewed heading-focus correction are recorded in [AB_EVIDENCE](AB_EVIDENCE.md). Publication/exact-head CI is recorded on draft PR#3. Emulator HOME/config/temp isolation and root integration passed separate source/log review; reviewers ran no commands/tests.

Account QA corrections **`9a56dc9`** are complete and separately re-reviewed: all3 medium findings closed, no new actionable account blocker. Actual RED/GREEN reproduced key-order retry conflicts, first-use CSRF failure and incorrect quota; final **28 deterministic backend tests**, **9 actual backend emulator cases +24 client denials**, **519 full default tests /9 explicit emulator skips**, types/scoped lint/build/diff pass. Added real all-session logout, stale-unverified versus refreshed-cookie access, cursor/dedupe/metadata/concurrency checks. Bootstrap outage/repair is a mocked handler test; SDK sign-out failure testing proves sanitized failure, not identity clearing after failed SDK cleanup. Separate QA ran no commands/tests. Ready sandbox billing implementation continues independently; account acceptance does not imply payment acceptance.

Contracts frozen at `4269e828c613a9d91b6f04d385d5ddfe7795bb25`; both frontend task cards are in [ACCOUNTS_BILLING_CONTRACTS](ACCOUNTS_BILLING_CONTRACTS.md), ready for owner pickup without claimed acknowledgment. Its implementation-gates section now documents default-off sandbox activation; frozen browser DTOs are unchanged. Initial account/session/repository source `15d8c6a058d1167b7906886057640af6ba410858` passed515 default tests/6 explicit emulator skips; actual Auth/Firestore6 +24 direct denials and compiled browser7/30 +119 retired probes passed. Three medium QA defects from that checkpoint were subsequently corrected and closed as recorded above. These checkpoints do not imply combined UI/cloud/Stripe acceptance.

Active branch `feat/ownpath-accounts-billing`, isolated `/home/enzoreacher/EXE-ownpath-accounts-billing`, fixed baseline `e5119961570c52f4e5c3d9ef3647650d1de08d67`. Scoped integration tooling/config and separate-QA corrections published as `e3893fa` → `c32fc0abe1689717224b9d2c026596b46db87859` in [draft PR #3](https://github.com/EnzoReacher/EXE/pull/3), targeting backend. PR #2 retains its integration base. Original checkout and eight backend-local profiles are preserved.

Actual baseline486/53 passed; final scoped tooling29/5 passed; real Firebase Auth/Firestore emulator startup, two synthetic identities, Admin read/write and24 client-rule denials passed, with owned data cleanup/five-port rebind. Isolated Java21 resolved missing system Java. Separate read-only tooling QA closed three reproduced findings after corrections; reviewer did not run tests independently. Exact tooling-head Quality push [38847512132](https://github.com/EnzoReacher/EXE/actions/runs/38847512132) and PR [38847542826](https://github.com/EnzoReacher/EXE/actions/runs/38847542826) SUCCESS. Full V2 Factory verifier remains explicitly not verified.

Backend contracts/account/session/persistence implementation and runtime acceptance are tracked separately in [AB_EVIDENCE](AB_EVIDENCE.md); tooling results alone do not complete AB-01/03/04/06. FE1/FE2 ownership remains reserved. Actual Stripe sandbox and Firebase cloud configuration are unavailable; live payments remain disabled. Read [AB_TASKS](AB_TASKS.md), [ACCOUNTS_SETUP](ACCOUNTS_SETUP.md), [AB_LEGACY_DEPENDENCIES](AB_LEGACY_DEPENDENCIES.md). Earlier planning-only sections below are dated history, not current implementation status.

## Accounts/Firebase/sandbox billing stage authorized — 16 October 2026

Owner explicitly requested revamped login/registration, Firebase-backed account/database and subscription tiers; selected test payments first. New isolated `feat/ownpath-accounts-billing` is based on completed backend HEAD `7adbd6b77085318be43d55bff382d74b499e6350`. [ACCOUNTS_BILLING_STAGE](ACCOUNTS_BILLING_STAGE.md) and [OPENCODE_ACCOUNTS_BILLING](OPENCODE_ACCOUNTS_BILLING.md) define AB-00–07, frozen contract planning, ownership and real acceptance boundaries. Only documentation/scope preparation occurred at this checkpoint. No Firebase/Stripe dependency, account/database/cloud project, checkout, UI, live charge or deployment has been implemented/executed here. Earlier core-only restrictions remain historical for completed milestones; current user authorization supersedes them only within the declared AB scope.

## DBG-04 completed — 16 October 2026

**Final verified source:** `87e1f116b9a7df6b704af60a7e22d411422ee6e0`; fixed actual task baseline `c628f2fa9f7d2db70300e56f8eb354982a3fc7c9` after safe non-divergent fast-forward from `295306b`. Eight local `.opencode` profiles and original M17 worktree preserved; all profile checksums match. Baseline exact-head Quality PR38843614164/push38843610324 SUCCESS.

**DBG-04 PASS within bounded scope.** One `ownpath-engineer` added an excerpt-level recognized-action alternative guard, preserving genuine conjunctions, single actions, affirmative tool lists, unrelated purposes and independent sentences with exact provenance. Only engine and colocated grounding tests changed. Actual read-only auditor and separate read-only QA executed; no factory/provider/config change or broader isolation claim.

Initial RED18 failed/5 passed; repeated-predicate RED4 failed; separate QA found a comma-punctuation bypass, which the same writer reproduced RED4 failed/32 passed before the one-line correction. Skips are recorded separately. Final focused **123/2**, full retained **486/53**, lint/types/build/diff PASS. Fresh post-fix compiled browser **7 cases/30 steps**, **119** retired-API probes and landing/Translator smoke PASS. Owned settings-free loopback server/temp cleaned in `finally`; port33359 rebind PASS. Matching cached Chromium; no CI spoofing or service reuse. Final separate QA PASS, no remaining scoped blocker; QA reviewed supplied execution logs and independently analyzed source, but ran no shell/tests/Git/CI.

Clean detached final-source ownership **PASS2 paths** against the unchanged baseline; final source+docs check recorded on PR #2. Active-tree ownership remains separately **FAIL** only eight preserved profiles; policy/baseline unchanged. [DBG_04_EVIDENCE](DBG_04_EVIDENCE.md) records task card, actual failed attempts, commands, counts and grammar limits. Source commits `73ed2e9` then `87e1f11`; evidence/checklist/handoff follow-up is docs-only. Existing draft PR #2 retains integration base; full publication SHA and exact-head CI results are recorded in its current evidence section.

DBG-01–03 were not reopened. Frontend/integration/Auth/package/config/CI cleanup, broader V2 verification, manual/device/research and release stay open with assigned owners. Stop after DBG-04; no merge, deployment or database operation.

## DBG-01 / DBG-02 / DBG-03 debugging batch

**Verified source:** `55d29cc8cbba3fccbd7091755cbbc43ebef007d0`, branch `feat/ownpath-backend`, existing draft PR #2 against integration. Fixed task baseline: `c3d8ae9795c19506a33cc0d33c292878aa484bf4` after safe fast-forward of the existing backend worktree from `7d7d401`. Eight local untracked Factory profiles and original M17 worktree are preserved. Baseline exact-head Quality runs `38712669937` / `38712664302` passed.

**DBG-01/02/03 PASS in bounded reviewed scope.** One `ownpath-engineer` writer corrected supported Vietnamese actor boundaries, personal technology alternatives and explicit root shell page/layout test ownership. Frontend, frozen types/interfaces/IDs/labels, adapter/review, Auth/packages/config/workflows/migrations were untouched. Task cards, exact commands, RED evidence and acceptance are in [DBG_01_03_EVIDENCE](DBG_01_03_EVIDENCE.md).

| Check | Actual outcome |
|---|---|
| Original RED | DBG-01:5 failed; DBG-02:5 failed/1 passed; DBG-03:1 failed/1 passed; name-filtered skipped cases recorded separately |
| Post-QA focused regressions | PASS91 tests/3 files; original facts-before-confirmation and bullets-after-confirmation, genuine personal coordination, tool lists/JD relevance, exact offsets and role denials |
| Final full retained suite | PASS450 tests/53 files:424 baseline +24 grounding +2 ownership cases; no previous assertions removed |
| Lint/typecheck/production build/diff | PASS; sanitized build, no source/config workarounds |
| Actual compiled browser | PASS7 cases/30 named steps at320/375/768/1440 plus keyboard, injected clipboard rejection and long content; existing no-store/traffic/sentinel/socket/error/overflow/TXT guards intact |
| Compiled APIs + smoke | PASS119 HTTP probes across17 patterns; source/build inventory absent; landing/Translator HTTP200 and CTA |
| Owned cleanup | PASS in finally; server port33757 subsequently rebound successfully; matching cached Chromium, no service/provider settings or CI spoofing |
| Separate audit and QA | Actual read-only `ownpath-auditor` acceptance audit and `ownpath-qa` complete-diff/evidence review. QA PASS on all three after one fixture correction; no independent shell/test rerun by QA |
| Committed-source ownership | Clean detached source55d29cc against unchanged baseline:PASS4 paths; owned worktree removed normally in finally |
| Active-tree ownership | FAIL precisely8 preserved local `.opencode` profiles; checksums match, guard not weakened |

QA rejected a misleading positive fixture that asserted both actions for `listing or search`. The same writer replaced it with unrelated `for sorting or filtering`; focused and full suites reran afterward. Runtime hashes matched the compiled checkpoints, so no new browser execution is claimed after the test-only correction. Action-alternative grounding remains a separately recorded domain-owner limitation outside DBG-01/02/03.

The writer invocation stalled across parent interruption; only that owned child execution was interrupted and the same writer resumed synchronously to finish the fixture correction. No service restart, factory installation/configuration change or second source writer was introduced. The earlier source checkpoints remain historical.

**Published:** normal non-force push after fresh fetch showed2 ahead/0 behind; source55d29cc and docs checkpoint **`b041ae413667cff07a268e954bedd4399d6025ab`** are on existing draft PR #2, whose description was updated. Exact-head Quality [PR38723535938](https://github.com/EnzoReacher/EXE/actions/runs/38723535938) and [push38723530453](https://github.com/EnzoReacher/EXE/actions/runs/38723530453) both completed SUCCESS at b041ae4. Clean detached committed-source+docs ownership PASS8 paths against the fixed baseline; active checkout still FAIL only8 local profiles. This publication/CI follow-up is docs-only; later exact-head checks are recorded on PR #2 and do not imply another browser execution.

Frontend integration, later Auth/package/config/CI cleanup, broader V2 verification, manual/device/research and release remain open for their owners. This batch does not authorize merge/deployment of API retirement alone.

## Current owner-local CF-06-BE / CF-07-BE candidate

**Verified source:** `7965c2945f8e4acfa6034c9b869f98b65de1423f` on `feat/ownpath-backend`; subsequent evidence/handoff changes are docs-only. Existing [draft PR #2](https://github.com/EnzoReacher/EXE/pull/2) still targets `feat/ownpath-experience-translator`. Backend checks and separate controlled-fixture QA completed. Full product reduction remains blocked by matching frontend retirement; do not merge/deploy staged API retirement alone.

### Baseline and scope

Inspected status/logs/worktrees/diffs, fetched origin and fast-forwarded clean, non-divergent backend from `3223484` to fixed task baseline `bdc77d0dd01d685f93e410d6a95c86fecf669702` (four incoming commits). Original `/home/enzoreacher/EXE` at M17 remains preserved; backend worktree `/home/enzoreacher/EXE-ownpath-backend`. Baseline Quality [PR](https://github.com/EnzoReacher/EXE/actions/runs/38705343799) and [push](https://github.com/EnzoReacher/EXE/actions/runs/38705336526) were observed successful. Only backend and integration OwnPath branches and PRs #1/#2 were published at refresh; frontend local-only work remains unknown.

One Core Engineer writer changed only `src/lib/experience-translator/engine.ts`, `adapter.ts`, new `hardening.test.ts`; Lead changed the existing verifier and its test plus canonical docs. No frontend pages/components/styles/UI tests/browser specs, frozen types, public signatures/IDs/labels, root config/packages/lock/workflows/proxy/Auth/migrations changed. The installed Next testing and CLI type-generation guides were consulted. Existing frozen dependency installation was reused: manifest/lock did not change during fast-forward or this task.

### Concrete corrections and review

- Reject whole excerpts containing `instead of`, `rather than`, `as opposed to` instead of turning excluded technologies into personally-used facts.
- Extend the bounded mixed-subject guard to supported action verbs and conjunction/comma separators (including no-space commas), avoiding name blacklists. Genuine repeated first-person clauses and technology lists retain positive coverage and exact source offsets.
- Validate every numeric adapter-array slot so wholly/partly sparse arrays cannot bypass bullet/source validation. Return trusted recomposed bullets.
- Settle timeout rejection before abort dispatch so a signal-aware adapter's abort rejection cannot replace timeout-specific guidance. Retry/abort limits and immediate non-timeout failure behavior remain intact.
- Preserve the explicit `FACTORY_V2_RUNTIME_NOT_VERIFIED` diagnostic by allowing digits in fixed diagnostic codes; no false PASS or raw CLI/config diagnostic output.

Separate read-only `reviewer` audit found the initial four core defects. Actual `ownpath-auditor` inspected ownership and the retained frontend/print integration gate. Actual `ownpath-engineer` was the sole runtime writer. Actual separate `ownpath-qa` reviewed the diff/evidence, identified two additional comma/exclusion examples, and re-reviewed their corrections: no remaining blocking defect identified in the inspected correction; fixture closure only. QA did not independently run shell/tests. Optional stronger positive fact-set assertions remain a non-blocking coverage improvement. This is bounded heuristic grounding, not arbitrary-language verification.

### Actual checks and failed attempts

| Executed check | Outcome / exact boundary |
|---|---|
| Verifier CLI RED → GREEN | Initial 10 PASS/1 FAIL (V2 code hidden); corrected 11/11 PASS; actual verifier exits1 with explicit V2-not-verified code |
| Core initial RED → GREEN | Engineer's 14-case suite:9 FAIL/5 PASS before fixes; existing+new core suite then57 PASS/2 files |
| QA follow-up RED → GREEN | Three new exclusion/comma reproductions FAIL before fix; final core suite63 PASS/2 files (43 existing+20 hardening) |
| Focused Factory/ownership/retired-API/print tests | 25 PASS/5 files, including3 retained print security cases |
| `pnpm lint` | PASS at final source |
| `pnpm typecheck` | Initial FAIL: ignored `.next/types/validator.ts` still referenced17 deleted API handlers after fast-forward. Installed-guide `pnpm exec next typegen` regenerated types; final typecheck PASS. No source/config workaround |
| `pnpm test` | Final424 PASS/53 files =403 baseline+20 core+1 verifier. No test retirement in this run. Intermediate418/53 run preceded QA follow-up and is superseded |
| Sanitized `pnpm build` | PASS at final source; no `/api/**` in compiled inventory. Legacy frontend/Auth/print/proxy intentionally remain |
| First compiled-browser launch | FAIL before browser bodies: Python random temp suffix violated existing alphanumeric owned-temp guard (`OWNED_TRANSLATOR_TEMP_REQUIRED`). Changed only temporary runner name; existing config/spec/guard preserved; owned server/temp cleaned |
| Final `pnpm test:translator:browser` | PASS at `7965c29`:7 executed Chromium cases/30 named steps, all four widths320/375/768/1440, keyboard/focus, injected clipboard rejection, long sources/edits, approval/edit/regeneration, accepted TXT, clear/reload and traffic/privacy guards. Cached matching Chromium; no browser download or CI spoofing |
| Final compiled API/smoke | `node scripts/check-ownpath-retired-apis.mjs http://127.0.0.1:53337`:119 PASS/17 patterns ×7 methods; source/build handlers absent. Landing+Translator HTTP200 and landing CTA PASS |
| Owned server/temp cleanup | PASS in finally (including failed launch); service/provider env absent, no loaded `.env` files (only example), process env allowlisted. Existing services/Supabase/owner servers untouched. Browser/download/results/log scope removed |
| `git diff --check` | PASS |
| Active-tree ownership guard | FAIL for precisely8 preserved untracked local `.opencode` activation files. No source-scope violation observed; guard not weakened and profiles not deleted/ignored/committed |
| Committed-source ownership | Clean disposable detached worktree, same fixed baseline; initial source `5203720` PASS5 paths. Final documentation/source candidate checked separately before publication; exact result recorded in PR evidence |

Final source/build/browser/API checks supersede the intermediate candidate `5203720` (418 tests and its browser/API pass). The full retained suite contains mocked legacy component/library tests; this does not establish working retired legacy API flows. No unrelated disposable Supabase or legacy real-stack acceptance was rerun.

### F-00-RUNTIME: actual activation with explicit limits

Actual installed OpenCode `v2.0.7`. Setup dry run found no differing profiles; `--write` created four agents/four commands, preserving existing settings. Eight activation files remain untracked. `opencode debug agents` inspection confirmed each OwnPath role's mode/system and exact ordered terminal V2 policy block matched the generated profile; backend has no frontend edit grant and explicitly denies shared types; auditors/QA retain default-deny/read-only policies. Explicit-location `/api/command` discovery returned the four OwnPath command names; the public command listing did not expose template/binding/tool details. An initial unlocated API query did not identify the project commands; no discovery pass was inferred from it.

Actual auditor/engineer/QA child tasks ran through this existing configured session/provider; no new model/provider/global settings selected or installed. The full verifier still exits `FACTORY_V2_RUNTIME_NOT_VERIFIED`: command binding/tool-catalog parity, comprehensive resource matching, prompts and universal isolation are not established by role discovery or these tasks. No broad runtime-verifier rewrite or permission bypass was made. F-00 activation/inspection is recorded; full V2 verification remains BLOCKED, not PASS. Historical Work-container OpenCode absence below does not describe this owner-local environment.

### Integration and next work

FE1-CF04B remains unobserved as published/reviewed. Caller paths include assessment form, analysis status/review links/next-steps workspace, opportunities workspace, saved-work list, credential workspace/export controls and review feedback. Direct repository/Auth consumers and WorkspaceHeader navigation also remain. The retained print route still requires owner-checked accepted snapshot, no-store, escaping/CSP; preserve its dependencies until the frontend owner retires it. All frontend source remains untouched.

Next: owner/frontend supplies reviewed page/navigation retirement; then one designated integration writer combines BE-CF04A+FE1-CF04B and audits transitive consumers before library/Auth/package/proxy/config/legacy-CI cleanup. Full reduced-product CF-07/09, physical mobile keyboard, actual200% zoom/screen reader/clipboard denial, owner walkthrough and participant/research/release decisions remain pending. No external team messages, merge, deployment, database mutation or fabricated approval occurred.

Rollback: revert runtime commits in reverse order `7965c29`, `5203720`, `df6874a` on a feature branch if needed; preserve other work and local activation settings. Source `7965c29` was published to existing draft PR #2 after a fresh fetch confirmed remote backend still matched the fixed baseline (three local commits ahead, zero remote-only commits); no force. Exact-head CI completion is recorded on the PR to avoid confusing docs-only follow-ups with newly tested runtime.

## Previous Work CF-04A backend candidate — three-person build

Owner authorized execution of the approved plan and specified two other frontend developers. This session cloned `feat/ownpath-backend` into an isolated Work checkout from `3223484b78c05784112de48810ecc72c2c2a2860`. Clean initial git status and recent log inspected. GitHub PR #2 remained open/draft against integration `d1ec1a0`; exact-head PR Quality run `38682665717` was freshly observed successful. Only backend/integration OwnPath branches were published at this refresh; frontend local work is unknown. The owner's original machine/worktrees were not available and were not modified.

### Implementation and integration boundary

- Removed all 17 inventoried legacy `src/app/api/**/route.ts` handlers and six API test files. Three print-route cases from the mixed export suite were relocated to `src/lib/cv-export/print-route.test.ts` because the frontend-owned print route remains active.
- Preserved every frontend page/component/style, existing domain implementation, shared types/adapter, Auth/proxy, root package/lock/config/CI and applied migration. No database operation or new app/API/provider was introduced.
- Added `check-ownpath-ownership` preflight, covering committed/staged/unstaged/untracked paths and both sides of renames against an explicit baseline. Backend, shell and Translator roots are disjoint; root/shared tooling and types are reserved.
- Added `check-ownpath-retired-apis`: verifies source/build handler absence and probes 17 fictional route patterns over seven HTTP methods on a disposable numeric loopback server. Redirects, successful legacy responses, authorization-only responses and 500s fail.
- Updated version-aware factory templates to a backend-only engineer and explicit shared-type edit deny. Added policy regressions for both template versions; real resource matching is not established by these tests.
- [TEAM_WORKFLOW](TEAM_WORKFLOW.md) supplies file ownership, FE1/FE2/backend/integration task cards, frozen contract, branch procedure and combined integration gate. No teammate messages sent or acknowledgment invented.

**Staged backend candidate only:** old frontend source still calls retired APIs. Do not merge/deploy API removal alone. Frontend owners must supply matching page/navigation removal before combined acceptance and later library/Auth/package/config cleanup. CF-04 overall and CF-05–09 remain pending.

### Fresh verification

| Check | Actual result |
|---|---|
| Frozen install | PASS; Node 24.19.0 / pnpm 11.25.0; manifest/lock unchanged |
| Unchanged baseline full suite | PASS: 429 tests / 55 files |
| Focused ownership/retirement/factory tests | PASS: 21 tests / 4 files |
| Final retained suite | PASS: 403 tests / 52 files: baseline minus 35 retired cases, plus six guard/template cases and three relocated print cases |
| `pnpm lint`, `pnpm typecheck` | PASS |
| `pnpm build` | PASS: no `/api/**` route in compiled route inventory; legacy pages/Auth/print/proxy remain intentionally |
| Backend ownership guard against full starting SHA | PASS; no frontend/shared-config/type edit |
| Owned compiled HTTP checks, no service/provider env | PASS: landing and Translator HTTP 200, landing Translator CTA; 17 patterns × seven methods = 119 absence checks, all 404/405; server stopped in finally |
| `git diff --check` | PASS |
| OpenCode setup/runtime | BLOCKED: executable absent; setup exits without generating profiles |
| Fresh compiled Chromium journey | BLOCKED: browser installation failed with invalid/truncated download archives; no cached/system Chromium available. No bypass of the CI-only harness |
| Legacy real-stack/browser suite | NOT RUN: API retirement intentionally invalidates old browser flows; workflows untouched until coordinated integration cleanup |
| Separate review / actual devices / screen reader / zoom / real clipboard denial | NOT RUN; self-review only |

Intermediate checks are not final evidence: a check before all deletions were reflected still included legacy APIs and passed 435 tests; a partial-retirement attempt then failed two suites importing removed handlers (400 assertions passed). Completed/staged all 23 removals, preserved the mixed print-route coverage, and reran the final retained suite successfully. No assertion was removed merely to conceal a retained runtime failure.

Published to existing draft PR #2 without changing its integration base. Shareable tooling commit: `74b11d2330696490dc1433d6a1e0c0e07c40e3ae`. Verified API retirement source: `b515ff1d75781b6033ceaf81ced744d2cecf8da5`, tree `74b3fc30493b323192339baf8ef6ec2b574aea88`; published tree was compared with the local candidate index before ref update. Fresh [Quality PR run 38699141055](https://github.com/EnzoReacher/EXE/actions/runs/38699141055) completed successfully for that exact source SHA. Backend worktree was clean and synchronized after publication; no integration/main merge or deployment. A later docs-only checkpoint records these results and does not imply another browser execution. These two implementation commits separate shareable ownership/factory tooling from API retirement for coordinated integration.

## Current core-only continuation: CF-00–03

**Completed first cleanup slice: isolate shared requirement extraction.** Core-only pruning is authorized by the owner; actual route/API/package removal remains CF-04–05, pending the coordinated frontend patch boundary in [BACKLOG](BACKLOG.md). The historical prototype results below remain dated evidence.

### Refreshed baseline and preservation

- Started in clean `/home/enzoreacher/EXE` on `codex/exe-m17-survey-readiness`, HEAD `ae2527633733fc5081a96ecb2c16e09081a8c878`, no modified/untracked files. One existing worktree; no existing local backend or frontend team branches. Original checkout preserved.
- `git fetch origin`, remote branch listing and GitHub PR/run inspection confirmed integration still at `d1ec1a076155b76a503693ff9fe411b933b62f8c`. Only published `feat/ownpath-*` branch is integration; teammates' local-only work is unknown. PR [#1](https://github.com/EnzoReacher/EXE/pull/1) remains open/draft with base `codex/exe-m17-survey-readiness`; no retarget/merge.
- Latest historical integration [Quality PR run](https://github.com/EnzoReacher/EXE/actions/runs/38676238316) and [push run](https://github.com/EnzoReacher/EXE/actions/runs/38676230646) succeeded at `d1ec1a0`. These precede this extraction.
- Created `feat/ownpath-backend` from refreshed integration in `/home/enzoreacher/EXE-ownpath-backend` and moved this OpenCode session there. Personal PR base is integration. No other worktree/branch was edited.
- Local Node `v24.19.0`, pnpm `11.25.0`, OpenCode `v2.0.7`. `pnpm install --frozen-lockfile` passed without package/lock changes; installed versions match the handoff (Next 16.3.7, React 19.2.8, TypeScript 5.9.3, Vitest 5.0.2, Playwright 1.61.1). Read project instructions/source/docs, proxy/header config and all three CI workflows; installed Next project-structure/header guides consulted. No Factory configuration installation/change, delegation or independent review performed.

### Implemented scope and contract

- Moved `src/lib/analysis/requirements.ts` to `src/lib/job-description/requirements.ts`, retaining the algorithm unchanged. Updated core engine, legacy analysis provider/workflow and demo-fixture imports to that single implementation.
- Moved the existing three extractor tests into `job-description/requirements.test.ts` so future analysis deletion preserves them. No assertions removed; no compatibility duplicate left behind.
- Updated PRD/README/architecture/backlog/handoff for the 15 October decision, keep/cut/dependency inventory, CF checkbox tracker and concrete frontend coordination list. Current type/adapter/error/state/memory contract recorded in ARCHITECTURE.
- Frontend-owned source, props/types/adapters/accessible labels untouched. No routes/APIs/packages retired in CF-03; build still lists legacy routes and the Auth proxy. No migration/data changes. This is a prerequisite cleanup, not completion of the smaller runtime.

### Fresh checks on the extraction candidate

Verified source commit: `f3ed7ad` (`refactor(ownpath): isolate shared job requirement extraction`). Subsequent first-slice commits update documentation only.

Published `feat/ownpath-backend` and opened [draft PR #2](https://github.com/EnzoReacher/EXE/pull/2) targeting `feat/ownpath-experience-translator`. At documentation checkpoint `1b8f16f`, fresh [push Quality](https://github.com/EnzoReacher/EXE/actions/runs/38682622868) and [PR Quality](https://github.com/EnzoReacher/EXE/actions/runs/38682627649) were observed in progress; no CI pass inferred. The current acceptance workflow only triggers on integration pushes, so the compiled evidence above is actual local execution, not a new browser CI claim. Check the PR for subsequent CI completion/current HEAD.

| Command / check actually run | Result |
|---|---|
| `pnpm install --frozen-lockfile` | PASS; lockfile unchanged |
| Before extraction: `pnpm exec vitest run src/lib/analysis/analysis.test.ts src/lib/experience-translator/engine.test.ts src/app/experience-translator/translator.test.tsx` | PASS: 66 tests / 3 files |
| After extraction: same targeted tests plus `src/lib/job-description/requirements.test.ts` | PASS: 66 tests / 4 files |
| First full-suite attempt | FAIL: stale `analysis/requirements` import in `scripts/demo-fixture.test.mjs`, 428 tests passed / one suite failed to import; build not reached. Updated that import, keeping its assertion |
| Final `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` | PASS: 429 tests / 55 files; production compilation completed. Extra file is the relocated extractor test group; total test count unchanged |
| `pnpm test:translator:browser` against this `pnpm build`, cached Chromium | PASS: seven executed cases / 30 named steps, 320/375/768/1440 widths, keyboard, injected clipboard rejection, long content, exact TXT/approval/edit/regeneration/clear/reload/traffic guards. Owned loopback compiled server on port 53431, no Auth/provider settings, stopped in `finally`; no Supabase/browser install or CI-only harness bypass |
| `git diff --check` | PASS |
| `pnpm cp2:validate` | PASS structure only: 9 rows, 0 owner-reviewed, 9 pending; no research outcome established |

No fresh disposable Supabase/legacy real-stack acceptance was run; runtime consumers remain, but this slice only relocates the pure shared helper and tests. No actual device, screen-reader, 200% zoom, real clipboard permission denial, owner walkthrough or participant study result is supplied. Browser rejection is injected. CF-07 reduced-product route-removal acceptance remains pending. Source publication/checkpoint is recorded in the first-slice draft PR; later docs-only changes do not imply a new browser execution.

### Next bounded work

CF-04: audit/retire obsolete API handlers and exclusive tests in feature-sized batches, preserving libraries still imported by legacy frontend pages. Owner coordinates the explicit obsolete route/navigation patch in BACKLOG with frontend owners before page/component removal. Then remove unused runtime libraries/packages/proxy/config and obsolete CI/harnesses together; retain core quality/browser/security gates. Final reduced suite, compiled acceptance and retired route/API absence checks follow that candidate. Physical/manual/research/owner decisions remain open.

## Historical prototype status — 12 October 2026

The synthetic Translator vertical slice and **OP-11 automated acceptance are complete**. This is an engineering review candidate, not a production release, completed user study, external AI-provider integration or course approval.

**Verified code/test checkpoint:** `d2979c6a8c074dabe245ba5fa79991d65ae6de93`, tree `10b12995c74476b99cf5353367b07d52f190181d`, on `feat/ownpath-experience-translator`; [draft PR #1](https://github.com/EnzoReacher/EXE/pull/1). Both [Quality push](https://github.com/EnzoReacher/EXE/actions/runs/38219710104) and [Quality PR](https://github.com/EnzoReacher/EXE/actions/runs/38219713034) passed. [Synthetic acceptance run 38219710485](https://github.com/EnzoReacher/EXE/actions/runs/38219710485) completed successfully for that exact SHA: Translator job `114712738762`, backend job `114712739071`, including cleanup. A subsequent documentation-only commit may advance HEAD; it does not replace this tested code checkpoint.

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
| Full current tests | **429 tests / 54 files passed**, locally, Quality CI and disposable backend engineering verification. Includes 10 Factory self-check regressions, selective-skip/fact-review invalidation and 12 private pilot instrument regression cases. |
| Lint, typecheck, production build | Passed locally/CI. Compiled Translator job independently built unchanged isolated source. No deployment. |
| Independent QA | Prior 54 targeted tests / 3 files passed; keyboard/fallback/layout and exact interview-label correction reviewed read-only; current pilot schema, math, privacy, template and runbook corrections also reviewed independently. Previous actual V1 normalized-permission review retained. No unresolved concrete blocker in synthetic scope. |
| Compiled Translator Chromium | **7 actual browser cases, 30 named steps passed**: four responsive journeys at 320/375/768/1440px, keyboard-only Tab/Shift+Tab/Enter/Space transitions and visible focus, injected clipboard rejection/manual text selection, and long unbroken source/edited wording at 320px. Intake, fact confirmation, keyboard approval, edit invalidation, regenerate/preserve/reset, accepted-only exact TXT bytes, overflow on all screens, heading focus, no-store, clear/reload. Exact-origin GET allowlist, blocked-attempt/socket/page-error failure and source sentinel checks passed. No screenshots/traces/videos. Owned browser/server/download/output scope cleaned. |
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

## Historical checklist continuation — pilot preparation and Factory self-check

Following the owner's 2026-10-12 instruction to continue the proposed workflow, E01 operational measurement/rubric is defined before any study in [PILOT_PROTOCOL](PILOT_PROTOCOL.md): equal fact access, counterbalanced task/tool allocation, 600-second cap, blind claim rubric, explicit formative targets and failure/denominator rules. This is protocol preparation only; no participant/owner signature/outcome added. Real consent/retention and course requirements remain open.

[MANUAL_ACCEPTANCE](MANUAL_ACCEPTANCE.md) supplies exact A06/C07–C10 owner-local steps and blank NOT RUN outcome rows. `scripts/verify-ownpath-factory.mjs` provides reproducible V1 pure config/ordered-policy/tool-availability verification with content-free diagnostics and owned fixture cleanup. Generated agent instructions now name the full docs paths; writer scope adds only this bounded verifier alongside existing setup scripts. No app, DB, migration or provider behavior changes.

At the previous `2cee287` checkpoint, actual verification: full local suite **416 tests / 53 files** passed; lint/typecheck and docs link/whitespace checks passed. Updated isolated self-check passed on official OpenCode 1.18.35 with four agents/four commands. Regression checks cover missing/changed role policies, disabled writer/orchestration tools, unexpected tools, late overrides, glob/traversal managed-output paths, rule order, command diversion and private CLI stderr/fixture cleanup. Fresh full Quality push/PR and compiled-browser/disposable-backend acceptance passed at `2cee287135d22234a77e288cf1c04d905dfd2ea9`; both job cleanup steps passed. The original OP-11 checkpoint `a7260d5` remains historical evidence; application/DB source is unchanged by this follow-up. A subsequent documentation-only HEAD may advance the branch; exact tested source remains identified here and in PR #1. V2, owner local tool execution, physical devices and participant study remain unverified.

## Historical resumed keyboard/fallback QA — completed

Each Skip button now names its own question while retaining the visible label. Selective skip clears only its answer and invalidates prior fact review. Scoped source-text wrapping supports narrow long-content layout. The first compiled run at `9ebdea2` found partial question-label test locators matching both the input and newly named Skip button; exact label matching fixed that collision. The final source `c89fc32` passed all seven compiled cases / 30 steps, the full 417-test suite, both Quality runs, all six disposable backend commands and both cleanup scopes. Independent source review found no unresolved concrete blocker. No DB, migration, provider or input persistence change.

Clipboard coverage injects a rejected browser API; it does not prove actual OS/browser permission denial. Physical keyboard/device, real 200% zoom, screen reader, owner-local Factory execution and participant study remain open. The execution checklist remains 25/45 main items; this strengthens C01–C06 evidence without closing C07–C10 or human study/release gates.

## Next workflow support — private pilot instrument preparation

`scripts/ownpath-pilot.mjs` and [PILOT_DATA_RUNBOOK](PILOT_DATA_RUNBOOK.md) prepare E02/E03 recording and descriptive analysis. They do not collect or infer observations. Exact-schema, human-coded records stay outside Git; new outputs use private exclusive creation and fixed content-free diagnostics. Failures/caps/missing slots, pending review, coaching versus factual access, comparator mix, generated safety and within-pair statistics are preserved. Blank templates are refused for analysis; synthetic inputs produce an explicitly non-evidence aggregate. Collected-data declarations remain owner-supplied and unverified; the tool cannot detect fabricated provenance. No actual participant, consent signature, CP2 register result or approval was added. E02/E03 and the 25/45 main checklist count stay open/unchanged.

Completed engineering verification at source `d2979c6a8c074dabe245ba5fa79991d65ae6de93`, tree `10b12995c74476b99cf5353367b07d52f190181d`: 12 focused synthetic cases, full 429 tests / 54 files, lint/types/build, both Quality runs and [synthetic acceptance](https://github.com/EnzoReacher/EXE/actions/runs/38219710485) passed. The compiled seven cases / 30 steps, all six disposable backend commands and both cleanup scopes passed at this exact source. Independent read-only review found no unresolved concrete blocker. Application/DB/migrations/provider source matches the prior `c89fc32` checkpoint. A later documentation-only HEAD may advance the branch; source/run IDs above remain the acceptance evidence. Owner/device/research/release gates remain open.
