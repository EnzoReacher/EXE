# OpenCode DBG-04 — ambiguous action alternatives

Morning continuation, 16 October 2026. Continue debugging first under the owner's existing instruction; leave frontend/integration and subsequent cleanup to their assigned people. No application implementation occurred while preparing this handoff.

## Verified checkpoint — do not redo completed work

Published backend `295306bfa699ca2f4545422681336caac7a25f3c`; runtime corrections `55d29cc8cbba3fccbd7091755cbbc43ebef007d0`. Quality PR `38723771422` and push `38723765300` passed at published HEAD. Work audit reproduced 450 tests/53 files, original DBG-01/02 counterexamples now yield no unsupported facts/bullets, and DBG-03 shell landing test permission is true while backend permission remains false. Source ownership against fixed prior baseline passes. Owner-local evidence records previous compiled browser seven cases/thirty steps, 119 API checks and separate QA; these were not freshly rerun in this morning Work audit.

DBG-01/02/03 are closed within their recorded bounded scope. Do not reopen/reimplement them. The next issue is the action-alternative limitation explicitly recorded by prior QA in BACKLOG and STATUS.

## Execute this one task in OpenCode

1. Inspect current branch/status/log/worktrees, changes/untracked files, remote branch and CI. Fetch and safely reconcile/fast-forward only when non-divergent; preserve unrelated work and the owner's local `.opencode` profiles. Work in the backend worktree, never a frontend worktree. Record the actual full starting SHA before editing; later instruction-only commits may advance the checkpoint above.
2. Read AGENTS.md, relevant installed Next guides, PRD, ARCHITECTURE, TEAM_WORKFLOW and current STATUS/BACKLOG/HANDOVER. Use existing configured factory roles: read-only auditor, one backend engineer writer, separate read-only QA. Do not install providers, create more agents, change global permissions or expand V2 runtime-verifier work. Report actual role execution and limits honestly.
3. Add bounded DBG-04 task card/evidence. Reproduce failure in a regression before fixing it. Execute the implementation and checks below; do not stop at another plan.

### Exact reproduction

```text
Project: I built product listing or search using React.
JD:
Frontend Developer Intern
Requirements:
- React
- TypeScript
```

Current `prepareSession` proposes React, implemented listing and implemented search. After confirming all proposed facts, `composeBullets` produces:

```text
Implemented product listing and search using React.
```

The source offers an alternative, not evidence of both actions. The prior QA explicitly rejected a positive fixture endorsing both; correcting that fixture did not fix the runtime. This is the sole new implementation task.

### Required behavior and regression coverage

- Do not promote alternative actions into two affirmative personal facts or a conjunction in the generated bullet. Do not guess which alternative was performed.
- Conservative rejection of the ambiguous excerpt with the existing clarification flow is acceptable. No new UI behavior or interface is required. Safely retaining an unambiguous independent sentence is preferable to discarding unrelated valid evidence.
- Test facts BEFORE confirmation and bullets AFTER confirmation of any remaining facts; checking generated wording alone is insufficient.
- Include the exact English input, bounded supported Vietnamese action alternatives such as `Mình làm danh sách sản phẩm hoặc tìm kiếm bằng React.`, and a small number of meaningful variants for connectors supported by the fix. Do not introduce a name/vocabulary blacklist unrelated to recognized actions.
- Preserve genuine conjunctions: `I built product listing and search using React.` and `Mình làm danh sách sản phẩm và tìm kiếm bằng React.` must retain the supported actions where currently recognized.
- Preserve a real single action, supported affirmative technology lists, independent unambiguous personal sentences and exact source excerpt/offset linkage.
- Do not ban every `or` substring or unrelated prose, e.g. an alternative purpose outside the asserted implemented action. Do not change JD requirement relevance just to suppress the output.
- Keep DBG-01/02/03 regressions and existing positive assertions intact. Do not relabel the new failing example a valid positive to get green tests.

## File boundaries

Permitted runtime edits: `src/lib/experience-translator/engine.ts` and directly relevant colocated grounding regression tests. Canonical `docs/ownpath/**` evidence/backlog/handoff updates are allowed. Use the existing checker; no ownership/factory/tooling change is required for DBG-04.

Frozen: `types.ts`, public signatures/IDs/labels, adapter/review behavior, every frontend page/component/style/UI test/browser spec, packages/lock/config/workflows/proxy/Auth, legacy modules and migrations/data. No API reintroduction, new model, storage, feature, universal language parser or broad refactor. Record out-of-scope defects for the assigned owner instead of expanding this run.

## Acceptance and publication

- Record actual RED, smallest correction and GREEN with meaningful positive controls. Review the full engine diff for over-rejection and attribution/provenance regressions.
- Run focused grounding tests, lint, typecheck, the full retained test suite, production build and diff/ownership checks against the unchanged actual task baseline. If generated ignored Next types are stale, regenerate them using the installed guide rather than editing runtime/config.
- On an owned disposable settings-free compiled loopback server, run the existing seven-case/thirty-step Translator browser acceptance, 119 retired-API probes and landing/Translator smoke. Reuse cached matching Chromium where available; no CI spoofing, harness bypass or unauthorized service reuse. Always stop/clean only owned server/temp scope in finally. Report blocked checks explicitly.
- Preserve known local activation profiles. Report active-tree ownership limitations separately from an exact-baseline clean committed-source/detached-worktree check; never weaken the guard, move the baseline or erase profiles to manufacture PASS.
- Give actual separate read-only QA the diff, original counterexamples, positive controls and exact logs/checkpoint. One writer addresses blocking findings and reruns affected checks. Do not claim independent shell verification if QA only reviewed supplied logs.
- Publish only scoped commits to existing `feat/ownpath-backend`, after fetching to detect concurrent updates. No force push, teammate messages, PR-base changes, merge, deployment or database operation. Maintain draft PR #2; do not integrate staged API retirement alone.
- Update task state/evidence and source versus docs-only hashes, actual counts, browser/API/review results and exact-head CI. Final report uses PASS/FAIL/BLOCKED/NOT RUN; do not claim broader grounding guarantees from these fixtures.

Stop after DBG-04 and its verification/handoff. Frontend retirement, cross-owner integration, Auth/package/CI cleanup, full V2 verification, manual/participant checks and release remain open for their owners. Do not auto-advance into them.
