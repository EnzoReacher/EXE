# OpenCode debugging-only run — 15 October 2026

Owner approved this order: debug the audit findings first; leave frontend, integration and remaining work to the assigned people later. This instruction supersedes the broader next-build prompt for this run. These are reproduced audit findings, not completed fixes.

## Execute now in the existing backend OpenCode session

Continue `feat/ownpath-backend`. First inspect status/log/worktrees/local changes, fetch origin, current PR #2 and exact-head CI. Preserve unknown work, local factory profiles and all teammate branches. Fast-forward only when safe and non-divergent; do not reset/stash/delete someone else's changes or force-push. Record the full actual starting SHA. Audit checkpoint was `7d7d4014aec2f2de52bd5fa4b7fe18ad4af1b778`; subsequent instruction-only commits may advance HEAD. Latest audit reproduced 424 tests/53 files, lint/types/build and 119 compiled API-absence checks, with clean published source. Refresh; do not assume that evidence applies to a changed source tree.

Read AGENTS.md, relevant installed Next guides, PRD, ARCHITECTURE, TEAM_WORKFLOW and the current sections of STATUS/BACKLOG/HANDOVER. Use the existing configured OpenCode lead, read-only auditor, one backend writer and separate read-only QA where supported. Do not reinstall/reconfigure the factory or attempt a broad V2 verifier project: its explicit not-verified status stays open. Never claim delegation/review that did not run.

Create and execute exactly the following debugging task cards. Reproduce RED before each fix; implement narrowly; verify GREEN and positive controls. Do not return another plan without implementation.

### DBG-01 — Vietnamese mixed-actor attribution

Synthetic input:

```text
Project: Mình làm danh sách sản phẩm bằng React và An làm tìm kiếm.
JD:
Frontend Developer Intern
Requirements:
- React
- TypeScript
```

Current reproduced behavior: `prepareSession` offers React, implemented product listing and implemented search as personal facts. Confirming all those facts and composing produces `Implemented product listing and search using React.` Search belongs to An, so the proposed personal fact and generated claim are unsupported.

Expected: another person's action cannot become the student's fact/bullet. Conservative rejection of the entire ambiguous excerpt, followed by existing clarification behavior, is acceptable; accurate clause separation is also acceptable if safely bounded. Fact confirmation is a final user check, not a substitute for correct attribution. Do not change UI or fabricate a clarification answer.

Regression requirements: assert the unsupported search fact is absent before confirmation AND no generated bullet claims it after confirmation of the remaining facts. Add a small number of meaningful variants for Vietnamese actor/action boundaries and separators. Avoid a name blacklist, special-casing An, or banning every Vietnamese conjunction. Preserve genuine personal statements and technology lists, e.g. `Mình làm danh sách sản phẩm bằng React.` and supported clearly first-person coordinated work. Retain exact excerpt/offset linkage.

### DBG-02 — Alternative technologies become cumulative claims

```text
Project: I built product listing using React or TypeScript.
JD:
Frontend Developer Intern
Requirements:
- React
- TypeScript
```

Current reproduced behavior: React and TypeScript become two personal facts and the generated bullet says `Implemented product listing using React and TypeScript.` The input does not establish use of both.

Expected: reject ambiguous personal technology claims or use existing clarification until actual tools are stated. Do not rewrite alternatives into conjunctions or choose a technology by guessing. Scope the guard to personal evidence, not arbitrary JD relevance. Test the original input, a few supported equivalent alternative expressions (including Vietnamese `hoặc` where applicable), and meaningful positive controls such as `I built product listing using React and TypeScript.` Do not solve this with a blanket ban on every occurrence of `or` inside words or unrelated prose.

### DBG-03 — Shell owner cannot modify its landing test

Current `ownsPath('shell', 'src/app/page.test.tsx')` is false, although the shell developer owns landing work and its tests. `src/app/page.tsx` is allowed.

Expected: add a narrow explicit allowance for agreed root shell page/layout colocated test files. At minimum, permit existing `src/app/page.test.tsx` for shell. Preserve role separation: backend and Translator must still reject that frontend test; shell must reject Translator files, API files, shared types, root configuration, workflows and traversal-like paths. Extend ownership-policy tests with these positive/negative cases. Do not allow all `src/app/**` or weaken the guard for local `.opencode` files. Do not edit the frontend test itself in this run.

## Strict file boundaries

Permitted implementation files:

- `src/lib/experience-translator/engine.ts` and relevant colocated grounding regression tests (`hardening.test.ts` / existing `engine.test.ts` as needed).
- `scripts/check-ownpath-ownership.mjs` and its test.
- Canonical OwnPath progress/evidence/handoff docs and this task's status.

Keep exported interfaces, `types.ts`, adapter/review behavior, IDs, labels and all frontend files unchanged. No UI/CSS/browser-spec edit. No legacy route or library/Auth/package/config/proxy/CI/migration cleanup. No new dependency, model/provider, agent team, server endpoint, persistence or feature. No frontend branch integration, PR merge, deployment or database operation.

If a new finding directly caused by a fix prevents these cases or existing core acceptance passing, resolve it within this scope. Record unrelated findings for their owner and keep moving; do not expand into an entire NLP rewrite. Preserve local `.opencode` profiles; an active-tree guard failure for those known untracked files remains an honest separately reported limitation. A clean detached-worktree check may verify committed source against the original task baseline; it must not conceal source violations.

## Verification and completion

1. Run focused core and ownership regressions, including RED evidence and positive cases. Preserve existing assertions; do not suppress failures or lower acceptance standards.
2. After the fixes, run lint, typecheck, the full retained test suite, production build, diff check and backend ownership preflight against the fixed actual baseline. If ignored generated Next types are stale, use installed-guide type generation/rebuild; do not edit app/config to hide stale artifacts.
3. Use an owned disposable settings-free compiled server on unused numeric loopback. Run existing Translator browser acceptance (seven cases/thirty steps), 119 retired-API probes and landing/Translator smoke. Reuse the owner's cached matching Chromium if available. Never spoof CI variables or bypass the CI-only harness. Stop/clean only owned processes/temp scope in finally, including failure paths. A blocked browser check remains blocked, not passed.
4. Give actual separate read-only QA the complete diff, exact outputs and candidate source SHA. Require review of the original two counterexamples, positive controls, fact/source linkage, frozen frontend contract and ownership permissions. One writer fixes blocking findings and reruns affected checks.
5. Commit/publish scoped changes on the existing backend branch, without force and without overwriting concurrent remote work. Maintain existing draft PR #2 against integration; update its description to actual changes/evidence. Do not send teammate messages or pretend another person's approval.
6. Update BACKLOG/STATUS/HANDOVER with DBG-01/02/03 outcomes, failed attempts, full tested/source SHA, actual test counts, browser/API/QA results and exact-head CI. Distinguish docs-only followups. If only documentation changes after a source checkpoint, do not imply a new browser execution.

Finish this debugging batch and report PASS/FAIL/BLOCKED/NOT RUN separately. Leave all remaining frontend, integration, Auth/package/CI cleanup, broader factory verification, manual/research and release tasks open for their assigned people. Do not automatically advance to them after these fixes.
