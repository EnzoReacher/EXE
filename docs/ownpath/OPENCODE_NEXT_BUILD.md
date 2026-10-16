# OpenCode next build — CF-06-BE and pending verification

Current owner order: debugging only. Execute [OPENCODE_DEBUGGING](OPENCODE_DEBUGGING.md) for the two reproduced grounding defects and shell-test ownership gap. Do not restart the broader historical scope below or advance to integration work after debugging.

Execution checkpoint, 15 October2026: ready owner-local CF-06-BE and CF-07-BE work below executed at source `7965c2945f8e4acfa6034c9b869f98b65de1423f` after clean fast-forward to fixed baseline `bdc77d0dd01d685f93e410d6a95c86fecf669702`. Final424/53 tests, lint/types/build, seven compiled cases/30 steps,119 API probes and separate controlled-fixture QA completed. Actual Factory roles ran; full V2 verifier remains BLOCKED. Publication/current CI belong to draft PR #2. This instruction remains the task history, not a reason to repeat completed work. Next integration tasks still require frontend retirement and the designated cross-owner writer; see STATUS/BACKLOG/HANDOVER.

Owner instruction: subsequent implementation runs in OpenCode. Paste the instruction below into OpenCode in the existing backend worktree. This is an execution handoff, not evidence that the tasks have run.

## Execution instruction

You are the OwnPath backend implementer operating through OpenCode. Continue the approved plan and the three-person ownership contract. Two other people handle frontend. Progress through the ready tasks below without repeatedly asking for approval for already-authorized scoped implementation, tests, personal-branch publication or draft PR maintenance. Preserve the real permission system and ask only for genuinely missing decisions/access; do not disable permission checks to manufacture automation.

### 1. Refresh the actual repository before editing

- Inspect cwd, `git status --short --branch`, recent log, worktree list, local/remote branch state, changed/untracked files, PR #2 and exact-head CI where accessible. Inspect recent test artifacts as dated evidence.
- Work on `feat/ownpath-backend` in its existing worktree (previously `/home/enzoreacher/EXE-ownpath-backend`). Discover it if the path differs. Preserve the original EXE checkout and every teammate branch/worktree.
- Fetch origin. Fast-forward only if the backend worktree is clean and the branch has no divergent local commits. If local changes/divergence exist, inspect and preserve them, continue in an isolated worktree if needed, and do not reset/stash/delete unknown work or force-push.
- Known checkpoint before this handoff: backend `459c17aaa7f5be677c6def08fdd777191dad1a74`; Quality PR run `38699400376` passed. Runtime source `b515ff1d75781b6033ceaf81ced744d2cecf8da5` also passed Quality. A later handoff-only commit may advance HEAD. Refresh instead of assuming either hash is still latest.
- Record the full actual task baseline SHA before any edit. Do not move that baseline later to conceal scope violations.
- Read AGENTS.md and installed Next.js guides relevant to changes, then OwnPath PRD, ARCHITECTURE, BACKLOG, STATUS, HANDOVER, TEAM_WORKFLOW, TEST_STRATEGY, MANUAL_ACCEPTANCE and the AI Factory runbook. Current owner direction and current core-only sections supersede historical preserve-all-routes guidance.

### 2. Preserve completed work and boundaries

Already implemented: deterministic browser-only Translator; CF-00–03; CF-04A backend retirement of 17 API handlers; ownership guard; compiled API absence checker; backend-only factory engineer templates. Baseline after API retirement: 403 tests / 52 files, lint/types/build and 119 compiled HTTP absence checks passed. Do not repeat implementation of those tasks.

Remaining API-removal integration gate: old frontend pages still call removed APIs. Backend retirement stays staged in draft PR #2 targeting `feat/ownpath-experience-translator`. Do not merge/deploy it alone. Frontend 1 owns shell/landing/legacy page retirement; Frontend 2 owns `src/app/experience-translator/**`. Their published/local progress must be observed, never assumed.

Authorized edit scope for this run:

- `src/lib/experience-translator/engine.ts`, `adapter.ts`, `review.ts` and meaningful colocated regression tests. Other `src/lib/**` edits require a concrete core defect and the existing ownership contract, not opportunistic legacy cleanup.
- `scripts/setup-ownpath-factory.mjs`, `verify-ownpath-factory.mjs`, `check-ownpath-ownership.mjs`, `check-ownpath-retired-apis.mjs` and their tests only for demonstrated workflow/verification defects.
- Canonical `docs/ownpath/**` and `docs/ai-factory/**` progress/evidence/handoff records.
- Project-local generated OwnPath profiles only as an owner-runtime activation step: preserve differing existing profiles, review their diff, and do not silently overwrite. Keep untracked activation files out of the backend source commit unless a separately recorded tooling task explicitly owns them. The backend ownership guard intentionally does not permit `.opencode/**` publication.

Do not edit/delete frontend pages, components, CSS, UI tests, browser specs, shared `src/lib/experience-translator/types.ts`, package/lock, root config, workflows, proxy, Auth routes, migrations or stored data. Do not install new package versions, new model providers or alter owner global settings. No external model integration, new server API, persistence, CV export, login feature or factory dashboard belongs in this task.

Keep exported signatures, props, IDs and accessible labels stable. JD establishes relevance only; all personal claims come from confirmed personal facts. Confirmed user statements are not expert-verified credentials. No invented metrics, leadership, employment, deployments or technology use.

### 3. F-00-RUNTIME — Validate the local factory and use actual roles

1. Read the existing setup/verifier before executing. Inspect actual `opencode --version` and installed CLI help. Never hard-code a version/schema based only on the earlier log.
2. Run setup dry run. If no differing project profiles exist, activate the generated profiles in this backend worktree. If files differ, compare narrowly, preserve owner customizations, and make only the reviewed local adaptation within this authorization. Do not remove profiles just to bypass the preflight.
3. Use actual supported agent/config inspection mechanisms to inspect loaded lead/auditor/backend engineer/QA roles, ordered permission rules and available tools. Do not expose provider keys/private global config. Verify frontend writes and shared-type changes are not granted to the backend role; auditors/reviewers remain read-only.
4. Run the existing verifier. On V2 it deliberately reports `FACTORY_V2_RUNTIME_NOT_VERIFIED`. Do not relabel this as a pass. If supported installed CLI output makes a narrow V2 verifier extension feasible, implement it in the existing scoped setup/verifier files with policy regressions and actual runtime evidence. Otherwise keep that item explicitly blocked and continue supported backend implementation in one session with explicit file boundaries; never claim verified role isolation/delegation.
5. Where roles actually work, lead delegates read-only audit, exactly one backend engineer writer, and separate read-only QA. No concurrent writers on this worktree. If role activation cannot be verified, separate reviewer sessions may still review the final diff and exact logs when supported; accurately distinguish independent review from self-review.
6. Use the owner's existing configured coding provider/session. Do not select/install a paid/new provider or send real project/JD/private research inputs. Use synthetic fixtures only.

Exit: record actual CLI version, profile/discovery/permission inspection, task/reviewer execution and limits. Configuration generation/unit tests alone do not establish an operational AI factory. Do not spend the entire run building orchestration software; continue ready core work if only factory inspection is blocked.

### 4. CF-06-BE — Audit and fix concrete core defects

Create a bounded task card in BACKLOG with baseline, permitted files, failure example, expected behavior, checks and rollback. Auditor first inspects engine/adapter/review and existing tests, then returns prioritized findings. Investigate:

- Fact confirmation and exact excerpt/offset/source linkage; instruction text, negation, future/team/other-actor wording; JD relevance without importing personal claims.
- Validation of malformed adapter output, timeout bounds, retry limits, per-attempt abort behavior, synchronous throws, rejected promises and trusted-snapshot immutability. Inspect edge values only where supported by the public call contract; do not invent a bug from unused hypothetical input.
- Regeneration and editing: keep previous user edits, reset acceptance, detach obsolete source links, preserve rejected/edited wording as specified, accepted-only current non-rejected output.
- Empty/unknown input and conservative fallback behavior, without expanding the vocabulary/product scope merely to create work.

For each finding: reproduce first with the smallest synthetic regression that exercises the real failure, implement the smallest backend correction, and rerun focused checks. Preserve existing assertions. Do not refactor unrelated modules or change signatures/types to simplify the fix. If no concrete defect is found, record the audit result and continue the ready verification work; do not fabricate a defect or add tests that merely restate implementation.

Any necessary UI/contract/browser-spec change becomes a precise patch request for its owner, with affected behavior and acceptance criteria. Keep progressing on unrelated backend work while that dependency remains open.

### 5. CF-07-BE — Complete candidate verification in the owner environment

After runtime source/tooling changes, run appropriate focused tests, then the existing required checks: frozen install (if dependencies are not already verified), lint, typecheck, full retained suite, production build, diff check and the ownership guard against the recorded full task baseline.

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check
node scripts/check-ownpath-ownership.mjs backend <full-task-baseline-SHA>
```

Use actual available command syntax and review script side effects. Counts may change with justified regressions; explain additions/removals. Do not rerun unrelated disposable Supabase/legacy acceptance and expect the intentionally retired API flows to work.

For compiled acceptance:

1. Inspect existing local services/ports. Start an owned, disposable production app on an unused numeric loopback port with Auth/provider settings absent. Do not repurpose or stop the owner's existing server. Do not copy `.env` files into the disposable scope; do not run existing private app configuration accidentally.
2. Use an already available matching Chromium if possible. The Work container could not download either full Chromium or headless shell (invalid/truncated archive). The owner environment may have a cached browser. If a download is necessary, follow the local permissions policy; do not bypass network restrictions or claim execution if unavailable.
3. Run the existing `pnpm test:translator:browser` against that owned server with `OWNPATH_TEST_URL` set to its origin. Use shell syntax appropriate for the actual session (owner often uses fish). Preserve all seven cases/thirty named steps unless a reviewed legitimate change updates evidence. No UI/spec edits are permitted in this run to make a failure disappear.
4. Run `node scripts/check-ownpath-retired-apis.mjs <owned-origin>`: 119 checks over 17 patterns/seven methods; verify source/build has no API handlers. Smoke-check landing and Translator without service configuration.
5. Stop only the owned server and clean its temporary scope in finally/trap cleanup, including failure/interruption. Do not spoof CI variables or bypass the CI-only browser harness guard. Use the existing local Playwright configuration against the owned compiled app.
6. If a failure belongs to frontend, record exact case/step and a minimal synthetic reproduction for that owner; fix only backend-caused failures inside this run's scope. A blocked browser/device check stays open.

Full CF-07 is still incomplete until coordinated page/runtime cleanup is integrated. No physical-device, actual zoom, screen-reader, real clipboard-denial or participant result may be inferred from automated browser checks.

### 6. Separate review and publication

Give an actual separate read-only QA role/session the complete current diff, exact commands/results and source checkpoint. Review contract preservation, unsupported claims, stale approvals, retained print security, source/build/API absence and scope boundaries. Address concrete findings with the one writer and rerun affected checks; rerun candidate acceptance when source changes invalidate it. Record unavailable review as pending, not approved.

Commit only scoped files, preserving unrelated local changes and generated owner activation settings. Publish to the existing backend branch without force and maintain draft PR #2 against integration. Before push, refresh remote head: if another session advanced backend, inspect/reconcile rather than overwriting. Update PR title/body for final actual scope; do not auto-send teammate comments/messages, request reviews, merge, retarget PR #1, deploy or mutate databases.

Use canonical BACKLOG, STATUS and HANDOVER. Mark each subtask complete only with actual evidence. Record source-tested SHA separately from docs-only followups and check CI for the published source/head. Old green CI is not current candidate evidence.

### 7. Do not advance blocked integration work

Inspect whether FE1-CF04B is actually published/reviewed and whether callers remain, but do not edit/merge teammate work during this run. INT-CF04C/05 (library/Auth/package/config/proxy/CI retirement) remains a coordinated integration task. If its prerequisites are missing, stop that task with exact unblock requirements and continue only ready backend tasks. Do not automatically revive legacy APIs because an old frontend page still calls them.

### 8. Final report

Report completed task IDs and concrete changes, branch and full SHA, clean/dirty status with preserved unrelated changes, files changed, local checks and counts, actual compiled browser/API results, OpenCode version and real factory/delegation/reviewer evidence, exact-head CI links, outstanding frontend/manual/research dependencies, rollback and next ready task. Distinguish PASS, FAIL, BLOCKED and NOT RUN. Do not claim the full product is complete or production-ready.

Start the refresh now, then proceed through all ready work above. Do not answer with another plan alone.

## Owner launch note

Open OpenCode in the backend worktree, not a frontend worktree. If this file is not yet in the local checkout, first ask OpenCode to inspect/preserve local changes, fetch origin and safely fast-forward `feat/ownpath-backend` before reading this instruction. An existing divergent/dirty branch must be reconciled deliberately; do not run a blind pull/reset. No new global installation or credential is needed merely to read the handoff.
