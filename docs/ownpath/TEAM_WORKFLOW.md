# OwnPath three-person build contract — 15 October 2026

## New accounts/billing-stage ownership override — 16 October 2026

The owner's new request authorizes auth/database/subscription work. Use the expanded matrix and task-scoped integration writer in [ACCOUNTS_BILLING_STAGE](ACCOUNTS_BILLING_STAGE.md) and the three execution instructions in [OPENCODE_ACCOUNTS_BILLING](OPENCODE_ACCOUNTS_BILLING.md). Backend owns new APIs/server contracts; FE1 auth entry/action/account UI; FE2 pricing/billing and reviewed opt-in Translator save UI. Root tooling/Firebase configs/proxy/shared tests have one integration writer. Existing frontend local work must be inspected before edits; this assignment does not claim acknowledgment. The earlier no-new-Auth/API scope is superseded only for declared AB tasks, not via blanket permission expansion.

Owner instruction: start the approved core-only plan, with two other people handling frontend. This is the proposed file assignment for those two developers and the enforced scope of this backend slice. Their names, local work and acceptance of the assignment are not known; no messages were sent on their behalf.

## Current integration rule

Integration branch: `feat/ownpath-experience-translator`. Backend branch: `feat/ownpath-backend`, existing draft PR #2. Refresh before work; preserve uncommitted changes and existing worktrees. Never reset personal branches or force-push. PR #1 remains unchanged.

This backend candidate removes legacy APIs while preserving legacy frontend source. **Do not merge or deploy API retirement alone.** The corresponding legacy page/navigation removal must be present in the combined integration candidate. The old pages and old authenticated browser acceptance are intentionally not functional end-to-end on this staged backend branch. The retained Translator uses no API and must continue to work.

## Ownership matrix

| Writer | Branch | Exclusive files | Work |
|---|---|---|---|
| Backend / factory engineer | `feat/ownpath-backend` | `src/app/api/**`, `src/lib/**` except frozen `experience-translator/types.ts`; `docs/ownpath/**`, `docs/ai-factory/**`; existing factory setup/verifier and new ownership/retirement scripts/tests | Legacy API retirement, domain defects, coordination docs and evidence. Keep libraries while frontend consumers remain |
| Frontend 1: shell | `feat/ownpath-ui-shell` (proposed; not observed published) | `src/app/page.tsx`, `layout.tsx`, `globals.css`, `src/components/**`; legacy page directories `assessment`, `analysis`, `opportunities`, `saved-work`, `review`, `expert`, `credential-versions` | Landing/shell, remove legacy pages and navigation. Do not remove Auth routes/proxy until the integration writer verifies consumers |
| Frontend 2: Translator | `feat/ownpath-translator-ui` (proposed; not observed published) | `src/app/experience-translator/**` including its colocated tests and stylesheet | Retained intake, interview, fact confirmation, source review, editing/approval/output UI |
| Integration writer: separately coordinated | Designated branch/worktree when dependencies ready | Root package/lock/config, `.github/**`, `src/proxy.ts`, Auth routes; shared types and cross-owner changes | One writer at a time; remove unused Auth/packages/tooling after all consumers retire |

The assigned roots are ceilings, not permission to refactor unrelated code. No one changes another owner's files as a shortcut. Frontend developers report requested domain/types/config changes as a small patch request to the owner/coordinator; do not make competing edits. Backend maintains canonical progress docs from supplied frontend evidence, avoiding three writers on STATUS/BACKLOG.

No CODEOWNERS identities are invented. This policy is a local preflight and review convention, not branch protection or a universal sandbox. Shell commands still require scope discipline.

## Frozen frontend integration contract

Authoritative definitions: `src/lib/experience-translator/types.ts`; behavior: ARCHITECTURE.md. This slice changes neither domain implementation nor public types/signatures/accessible labels.

- `prepareSession(Intake, Answers)` and `confirmFacts(session, ids)` retain current signatures.
- `Intake` has `project` and `jd`. Answer keys remain contribution, technology, outcome, reference.
- `TranslatorAdapter.generate(session, AbortSignal)` returns unknown output for trusted validation by `generateBullets`; default adapter stays deterministic/local.
- Source excerpts/offsets and `factIds`/`requirementIds` remain traceable. JD never supplies personal claims.
- Sufficient input skips questions, never fact confirmation. Answer changes/skips invalidate confirmation.
- Edits/rejection reset approval; successful regeneration retains edits and requires renewed acceptance. Detached edits lose source IDs.
- Copy/TXT includes accepted current non-rejected wording only. Clear invalidates in-flight work; reload clears tab memory.
- No new backend endpoint, login, model, database or browser persistence is required by either frontend developer.
- Preserve existing accessible names used by Translator acceptance. A necessary label change includes coordinated browser test updates by the assigned integration writer.

Frontend 1 uses minimal landing + CTA to `/experience-translator`, removes old Auth/assessment/roadmap/workspace/opportunity links, and must not edit Translator-specific CSS. Frontend 2 uses its scoped stylesheet and existing shared shell; it requests any global stylesheet/component change from Frontend 1.

## Branch and preflight procedure

Both frontend branches should start from the refreshed integration branch, not this backend-only API retirement candidate. If a personal branch already exists, continue it; do not re-create/reset it. Use separate local worktrees for concurrent sessions. Record the full starting SHA in each task card.

Before commit/review, run the role check against that exact starting commit:

```text
node scripts/check-ownpath-ownership.mjs backend <full-task-baseline-SHA>
node scripts/check-ownpath-ownership.mjs shell <full-task-baseline-SHA>
node scripts/check-ownpath-ownership.mjs translator <full-task-baseline-SHA>
```

The new script initially exists on the backend branch; an integration writer can land the tooling/docs commit separately so frontend branches can consume it without the API deletions. The guard includes committed/staged/unstaged/untracked paths and both sides of renames. It rejects root/shared configuration edits until an explicitly coordinated integration task owns them. Baseline must not be advanced merely to hide an out-of-scope change. Tests/build output is ignored by Git; inspect any other generated files before committing.

When integrating frontend branches, record a new task baseline after reviewing the incoming diff. Evaluate each personal branch against its own baseline, not the combined candidate (which legitimately includes multiple owners).

## Ready task cards

### BE-CF04A — API retirement

Baseline: `3223484b78c05784112de48810ecc72c2c2a2860`. Backend writer. Remove 17 inventoried `src/app/api/**/route.ts` handlers and six handler-exclusive `route.test.ts` files. Keep every frontend file, domain library, Auth wrapper/proxy, package/lock, root config, workflow and migration. Add explicit compiled absence checks; keep retained unit/domain/security coverage. Block independent integration until FE1-CF04B retires callers.

### FE1-CF04B — Shell and obsolete pages

Start from current integration and inspect existing local work. Remove the seven legacy page-directory groups listed in the matrix; update landing/layout/global styles/components only as needed. Remove stale nav and retain the Translator CTA. Do not add a login dependency. Do not change `src/lib/**`, API handlers, Translator files, root tooling or Auth/proxy. Report removed pages/components and any remaining Auth consumers to the integration writer. Verify remaining page build and landing-to-Translator navigation; do not mark old flows functional on the backend retirement candidate.

### FE2-CF06-UI — Retained journey

Start from current integration and inspect existing local work. Review the existing four-stage journey, retain completed behavior, fix concrete UI defects within `src/app/experience-translator/**`. Preserve facts/sources, acceptance invalidation, edited text on regeneration, clipboard/TXT rules, clear/reload behavior and accessibility labels. Verify component tests and responsive keyboard journey. Send domain/config/label-contract requests through the coordinator; do not create a new server API or edit shared components/global CSS.

### INT-CF04C/05 — Consumer retirement and tooling

Blocked until BE-CF04A and FE1-CF04B are reviewed and combined. One designated integration writer audits all remaining consumers, then retires obsolete libraries/Auth/proxy/routes, packages/config/legacy harnesses in bounded commits. Preserve migration/data history, core security headers and browser tests. Full reduced-product acceptance follows CF-06 fixes.

## Factory cycle and evidence

Task card → one scoped writer → focused checks → separate review when available → combined-candidate acceptance → update BACKLOG/STATUS/HANDOVER. No independent reviewer is claimed when only a self-review occurred. OpenCode is absent in this Work container: generator/policy tests are executable here; actual owner-runtime activation, V2 permissions matching and model delegation remain unverified. Setup refuses differing pre-existing profiles, so manually review/migrate generated profiles on the owner's machine; do not silently overwrite them.

For the staged backend candidate: frozen install, retained full tests, lint/types/build, actual compiled Translator browser suite, ownership check and compiled retired-API absence. Retirement checks require an owned disposable production server on numeric loopback with a port and no service/provider environment. After `pnpm build` and starting that server:

```text
node scripts/check-ownpath-retired-apis.mjs http://127.0.0.1:<owned-port>
```

This checks 17 patterns × 7 HTTP methods, rejects redirects/200/401/403/500, and requires source/build handler absence. Only final integration can validate retired frontend routes too. The current legacy acceptance workflows/harnesses remain unchanged pending INT-CF04C/05; they must not be reported as passing this retired-API branch. Final manual checks and owner release decisions remain open.
