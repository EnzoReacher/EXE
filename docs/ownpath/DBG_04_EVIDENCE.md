# DBG-04 — ambiguous action alternatives

## Task card and fixed baseline

- Branch: `feat/ownpath-backend`; existing draft PR #2 targets `feat/ownpath-experience-translator`.
- Found existing backend worktree at `295306bfa699ca2f4545422681336caac7a25f3c`; original M17 worktree preserved. Inspected status, local changes, log and worktrees; only eight untracked local `.opencode` profiles were present.
- Fetched origin and safely fast-forwarded one instruction-only commit to fixed task baseline **`c628f2fa9f7d2db70300e56f8eb354982a3fc7c9`**. No local divergence or tracked changes. Baseline exact-head Quality PR `38843614164` and push `38843610324` were SUCCESS.
- Preserve all eight local profile checksums; never weaken ownership policy or move this baseline to hide violations.
- Read AGENTS, PRD, ARCHITECTURE, TEAM_WORKFLOW, STATUS/BACKLOG/HANDOVER, task instructions and installed Next Vitest/Playwright guides. Reuse installed dependencies and matching cached Chromium.

| Task | Reproduction / expected behavior | Permitted edits | Verification / rollback |
|---|---|---|---|
| DBG-04 | `I built product listing or search using React.` and bounded Vietnamese alternatives must not become two affirmative personal actions or a conjunction. Existing clarification is acceptable; retain independent valid evidence. | Sole engineer: `engine.ts` and directly relevant colocated grounding regressions. Lead: canonical OwnPath docs. | RED before correction; facts before confirmation, bullets after confirmation, positive conjunction/single-action/tool-list/purpose/provenance controls; retained quality/build/browser/API checks and separate read-only QA. Revert scoped source commit if needed. |

DBG-01–03 remain completed. Execution results and publication checkpoints follow below as checks complete.

## Execution state

Final source checkpoint **`87e1f116b9a7df6b704af60a7e22d411422ee6e0`**; initial candidate `73ed2e9da11a289d574a82dfcc4d5710c623bbfa` was superseded after QA's comma-connector finding. Actual configured read-only auditor, sole `ownpath-engineer` and separate read-only `ownpath-qa` executed. Lead ran retained and compiled acceptance below. Final QA **PASS within bounded DBG-04 scope**; publication checkpoint and exact-head CI are recorded on existing draft PR #2.

## Read-only design audit

Actual `ownpath-auditor` inspected the required docs, engine and current grounding tests. It confirmed that the alternative guard covered technologies only, while extraction created both action facts and the composer joined them. It recommended an excerpt-level guard derived from recognized action definitions, preserving independent sentences and exact source linkage. No architectural blocker identified. It specifically requested consideration of repeated predicates and cautioned against broad purpose-prose rejection or guessing an alternative. The auditor ran no shell/tests and did not independently verify Git/CI.

Baseline active-tree ownership check: **FAIL**, precisely the eight preserved `.opencode/agents/ownpath-{auditor,engineer,lead,qa}.md` and `.opencode/commands/ownpath-{audit,build,scope,verify}.md` profiles. This is distinct from the pending clean committed-source check against the same full baseline. Original profile checksums are saved locally in `/tmp/opencode/ownpath-dbg04-profiles-before.sha256`.

## Acceptance method

Lead prepared external disposable runners under `/tmp/opencode`, without changing repository tooling. The quality runner executes lint, typecheck, full tests and production build with an environment allowlist. Installed Next CLI guidance documents `next typegen` if ignored generated route types require regeneration. The browser runner invokes the existing package command directly on an owned compiled numeric-loopback server, with a validated temporary browser/download scope, cached matching Chromium and no service/provider/CI settings. It also invokes the unchanged 119-probe checker and landing/Translator HTTP/CTA smoke. Server/process/temp cleanup is in `finally`, followed by a port-rebind check. It does not invoke or bypass the CI-only harness.

The exact-baseline committed-source check uses a disposable detached worktree and removes it normally in `finally`. This must be reported separately from the preserved-profile active-tree failure. Prepared runners are not test execution evidence.

## Actual RED, correction and GREEN

The sole engineer added regressions before changing runtime. Initial RED: **18 failed / 5 passed / 44 skipped** (name-filtered DBG-04). Both exact English and Vietnamese inputs offered `react`, `listing`, `search` and composed `Implemented product listing and search using React.` A subsequent repeated-predicate regression was also RED before extending the correction: **4 failed / 67 skipped**. Skipped cases are not executions.

```text
pnpm exec vitest run src/lib/experience-translator/hardening.test.ts -t DBG-04
pnpm exec vitest run src/lib/experience-translator/hardening.test.ts -t 'DBG-04.*(or implemented|hoặc triển khai)'
pnpm exec vitest run src/lib/experience-translator/engine.test.ts src/lib/experience-translator/hardening.test.ts
  Final focused GREEN: 117 tests / 2 files (43 engine + 74 hardening).
```

Exact local logs: `/tmp/opencode/ownpath-dbg04-red.log`, `ownpath-dbg04-predicate-red.log`, `ownpath-dbg04-focused.log`. Thirty DBG-04 cases were added; no existing assertions removed. Tests inspect facts before confirmation and bullets after confirmation, exact English/Vietnamese counterexamples, supported connector variants, contribution answers, genuine conjunctions/repeated predicates, single actions, affirmative tools, unrelated alternative purposes and independent personal sentences with nonzero exact offsets.

The correction adds one excerpt-level guard derived from existing recognized action definitions. It rejects direct alternative connectors `or`, `versus`, `vs`, `hoặc`, `hay` (optional `là`), including a repeated supported authoring predicate and ordinary `responsive UI` form. It does not choose an alternative, alter JD relevance or rewrite source text. Independent sentences survive. Only `engine.ts` and `hardening.test.ts` changed in the source commit; public contracts, frontend and tooling remain frozen.

**Bounded limitation:** this is not an arbitrary-language parser. Longer alternatives involving extra subjects/objects/intervening prose are not comprehensively parsed. Conservative rejection also removes technology facts from the ambiguous excerpt. These fixtures establish no broader grounding guarantee.

## Initial Lead acceptance at source 73ed2e9 — superseded

| Check actually executed | Result |
|---|---|
| Sanitized `pnpm lint` | PASS, exit 0 |
| Sanitized `pnpm typecheck` | PASS, exit 0; no stale-type workaround required |
| Sanitized `pnpm test` | PASS **480 tests / 53 files** = 450 prior + 30 DBG-04 |
| Sanitized `pnpm build` | PASS, 11/11 static pages; no compiled API handlers |
| Existing compiled Translator browser suite | PASS **7 cases / 30 named steps**, widths 320/375/768/1440, keyboard, injected clipboard rejection and long content; traffic/no-store/source-sentinel/socket/error/overflow/TXT guards retained |
| Existing retired-API checker | PASS **119 actual HTTP checks / 17 patterns × 7 methods**, source/build inventory absent |
| Landing/Translator smoke | PASS HTTP 200 for both and landing CTA |
| Owned cleanup | PASS in `finally`; port **36425** rebound successfully afterward |
| Clean detached source ownership/diff | PASS **2 paths**, source 73ed2e9 against unchanged full baseline; worktree removed normally in `finally` |

Commands: `node /tmp/opencode/ownpath-dbg04-quality.mjs`; `TMPDIR=/tmp/opencode node /tmp/opencode/ownpath-dbg04-acceptance.mjs`; `node /tmp/opencode/ownpath-dbg04-ownership.mjs 73ed2e9da11a289d574a82dfcc4d5710c623bbfa`. Quality runner launches `pnpm lint`, `typecheck`, `test`, `build` with only HOME/PATH/TMPDIR/NEXT_TELEMETRY_DISABLED. Acceptance used `http://127.0.0.1:36425`, the current production build and cached matching Chromium; no CI spoofing, browser install, service/provider environment or unauthorized server reuse. No failed compiled launch occurred. Exact logs: `/tmp/opencode/ownpath-dbg04-{lint,typecheck,test,build,acceptance}.log`.

Preliminary lint/typecheck also passed before the final writer handoff; final results above supersede them. No physical-device, actual zoom/screen-reader, real clipboard permission, participant/research, legacy authenticated flow, broader Factory V2, deployment or release result is claimed.

## Separate QA finding and final correction

Actual separate read-only `ownpath-qa` reviewed the complete baseline diff, actual source and supplied exact logs. Its initial recommendation was **FAIL**, one HIGH blocker: ordinary `listing, or search` / `danh sách sản phẩm, hoặc tìm kiếm` bypassed the direct-connector regex. QA performed static analysis, not an executable reproduction. Its request for exact ownership output was missing from the first packet; the refreshed packet includes the actual clean detached output. External `/tmp/opencode` reads were permission-denied for QA; no bypass attempted.

The same sole writer reproduced this finding before changing the guard: **4 failed / 32 passed / 44 skipped**, both unsupported fact sets and conjunction bullets. It then allowed an optional comma in the existing connector grammar and added punctuated genuine conjunction controls. Exact log `/tmp/opencode/ownpath-dbg04-qa-red.log`; affected focused GREEN `/tmp/opencode/ownpath-dbg04-qa-focused.log`: **123 tests / 2 files** (43 engine + 80 hardening). Total new DBG-04 cases: **36**. Existing DBG-01–03 assertions remain intact. There was no second runtime writer.

## Final Lead acceptance at source 87e1f11

After the QA correction, reran the same sanitized quality and disposable compiled acceptance commands:

| Final executed check | Result |
|---|---|
| Lint / typecheck / production build / diff | PASS; no source/config workaround |
| Full retained suite | PASS **486 tests / 53 files** = 450 prior + 36 DBG-04 |
| Focused grounding (writer) | PASS **123 tests / 2 files** |
| Existing compiled browser | PASS **7 cases / 30 steps**, all four widths and existing guards |
| Retired API probes | PASS **119 / 17 patterns**; source/build inventory absent |
| Landing/Translator HTTP/CTA smoke | PASS |
| Owned server/temp cleanup | PASS in `finally`; final port **33359** rebind PASS |
| Clean detached committed source ownership | PASS **2 paths** against unchanged baseline; removed normally in `finally` |
| Local profiles | All eight checksums match starting snapshot; active-tree limitation remains separately FAIL |

Final exact logs are `/tmp/opencode/ownpath-dbg04-{lint,typecheck,test,build,acceptance,ownership}.log`. These now contain the final 87e1f11 checks. The first review packet preserves the superseded candidate's execution logs locally; initial passes are not final QA closure. No runtime or test changes follow this final source checkpoint unless explicitly recorded.

## Final separate QA and handoff

The same separate read-only QA re-reviewed final source `87e1f116b9a7df6b704af60a7e22d411422ee6e0`, the complete baseline diff and exact final execution logs. It closed the HIGH comma-connector finding and returned **PASS**, with no remaining scoped blocker identified. The refreshed packet included actual detached ownership output and eight matching profile checksums. QA independently analyzed source/diff but ran no shell, tests, Git or CI; execution evidence is Lead/writer supplied. The temporary in-repository review packet was removed after review, not published as product source.

Source commits: `73ed2e9da11a289d574a82dfcc4d5710c623bbfa` then QA correction `87e1f116b9a7df6b704af60a7e22d411422ee6e0`. Following evidence/checklist/handoff publication is docs-only and does not imply a later browser execution. Rollback: revert the two scoped source commits in reverse order on a feature branch, preserving unrelated work and profiles.

Publication procedure: fresh fetch and ahead/behind inspection before normal non-force push to existing `feat/ownpath-backend`. Existing draft PR #2 retains its integration base; its current evidence section records the full docs-only publication SHA and exact-head Quality run results. A final clean detached source+docs ownership check uses the unchanged actual task baseline; the active checkout still separately flags preserved local profiles. No teammate messages, merge, deployment, database operation or PR-base change.

**Final bounded task state:** DBG-04 regression/correction, retained quality/build, compiled browser/API/smoke and separate source QA **PASS**. Active-tree ownership **FAIL** only preserved profiles; committed-source check **PASS**. Broader Factory V2 and combined frontend integration remain **BLOCKED/open** as previously assigned. Manual/device/research/legacy authenticated flow/deployment **NOT RUN** in this task. Stop after DBG-04; frontend/integration/Auth/package/config/CI cleanup and release remain with their assigned owners.
