# M11C — Actual results and remaining acceptance

**Implementation run date:** 2026-10-04; **owner local rerun:** 2026-10-05
**Exact baseline:** e15d9584fa67230024ed21cc6258f29a1353726b
**Review branch:** codex/exe-web-app-m11c-proof-review
**Published implementation commit:** 7738159434cb732ca94095d6a5db4b4e388a9eac
**Overall status:** Implementation, isolated verification, and genuine owner local-stack synthetic browser acceptance passed on 2026-10-05 at `b7807e5`. All journeys and run-scoped fixture cleanup passed. Manual owner/accessibility review, CP2, expert-policy and release gates remain pending.

## Section progress

| Section | Result | Evidence |
|---|---|---|
| 1 — Baseline | Complete | GitHub ref matched the supplied M11B.1 SHA. A clean separate worktree was created from it. Existing worktrees were preserved. |
| 2 — Implementation | Complete | Protected proof rendering, fresh expert acknowledgements, source-aware history, guidance, new-claim preparation, safe errors and stale-panel handling. |
| 3 — Verification/audit | Complete for automated local acceptance; manual review remains open | Owner reports all five `review:verify` steps passed (300 tests/37 files/build), proof-preview and workspace UI suites passed, migration list matched for 20261001–20261007, and full local journey on `b7807e5` passed every step with cleanup. No real-user data or human expert decision was used. |
| 4 — Reporting/publication | Complete — diagnostics and acceptance record published on feature branch | Implementation remains on the review branch; latest branch head at acceptance was `b7807e5`. `main` remains `d956118e3b89eb1fdcfd10fb48a45ba150fec20a`. Nothing was merged or deployed. Passing automated acceptance is not release approval. |

## Commands and actual outcomes

| Command | Actual result |
|---|---|
| pnpm install --frozen-lockfile | Passed; no dependency/lockfile changes |
| pnpm lint | Passed |
| pnpm typecheck | Passed |
| pnpm test | Passed — 300 tests in 37 files |
| NEXT_TELEMETRY_DISABLED=1 pnpm build | Passed — production routes compiled |
| pnpm test:proof-preview | Passed with explicit local Chromium 153.0.8010.0 — decoded PNG, large PNG/JPG at five widths, opaque sandbox, PDF guidance, no uncaught page error/external request |
| pnpm test:workspace-ui | Passed with the same explicit local Chromium — production UI with intercepted fictional responses; keyboard validation, two-source filters, five widths, focus and stale refresh |
| pnpm cp2:validate | Passed template validation; evidence remains pending |
| node --check scripts/proof-preview-browser.mjs | Passed |
| node --check scripts/workspace-ui-browser.mjs | Passed |
| git diff --check / staged whitespace | Passed — all 30 intended text files also passed scope/credential/generated-file scan |
| pnpm review:verify | Blocked, exit 1 at step 1 — missing local configuration; steps 2–5 were not run by this invocation. Individual code checks above were run independently. |
| pnpm test:e2e:local | Blocked, exit 1 during configuration — LOCAL_PREFLIGHT_BLOCKED; no account/server fixture was created by that invocation |
| pnpm test:supabase:local | Not performed — Docker/local Supabase unavailable in this execution environment; no schema/RLS/Storage change |
| Owner `pnpm dlx supabase migration list --local` | Passed — local and remote showed matching versions `20261001` through `20261007` |
| Owner `pnpm run review:verify` | Passed all five steps — preflight, lint, typecheck, 300 tests/37 files, and production build |
| Owner `pnpm run test:e2e:local` on `7bbaed5` | Passed nested steps `OWNER_REAL_SIGN_IN`, `OWNER_WORKSPACE_OPEN`, `OWNER_FORM_VALIDATION`, `OWNER_CV_UPLOAD`, `OWNER_PROOF_UPLOAD`, and `OWNER_CLAIM_DRAFT_CREATION`; `OWNER_CLAIM_SUBMISSION` failed with `ELEMENT_WAIT_FAILURE`. Synthetic fixture cleanup passed. |
| Owner `pnpm run test:e2e:local` on `ebc98f9` | Passed `OWNER_CLAIM_SUBMIT_REQUEST` after all earlier owner steps; `OWNER_CLAIM_SUBMITTED_STATE` failed with `ELEMENT_WAIT_FAILURE`. Synthetic fixture cleanup passed. |
| Owner API fallback on `ebc98f9` | Returned the synthetic claim with state `submitted`; no claim contents were printed. This verifies the stored transition but not successful UI display. |
| Owner `pnpm run test:e2e:local` on `b7807e5` | Passed `OWNER_REAL_SIGN_IN`, `OWNER_WORKSPACE_OPEN`, `OWNER_FORM_VALIDATION`, `OWNER_CV_UPLOAD`, `OWNER_PROOF_UPLOAD`, `OWNER_CLAIM_DRAFT_CREATION`, `OWNER_CLAIM_SUBMIT_REQUEST`, `OWNER_CLAIM_SUBMITTED_STATE`, `OWNER_CLAIM_SERVER_STATE`, `OWNER_WORKSPACE_RESPONSIVE_LAYOUT`, `NONEXPERT_UNASSIGNED_AND_ANONYMOUS_DENIALS`, `ASSIGNED_SYNTHETIC_EXPERT_REVIEW`, `CANDIDATE_EXPORT_DENIAL_AND_OWNER_ACCEPTANCE`, `DOCX_TXT_PRINT_AND_PRIVATE_METADATA_EXCLUSION`, and `WITHDRAWAL_AND_STALE_EXPORT_DENIAL`. Synthetic browser checks passed; run-scoped synthetic accounts and private objects cleaned up. |
| Owner `pnpm run test:proof-preview` / `pnpm run test:workspace-ui` | Passed both isolated browser suites |

## Follow-up diagnostic change (2026-10-05)

The `ebc98f9` run showed the submit POST succeeded and the API state was `submitted` while the broad text locator timed out. The page also has a filter option with the same words, so the E2E check was scoped to the matching claim card's status paragraph. The owner's `b7807e5` rerun passed that check and the full journey. This was a test-selector correction; no product behavior changed.

Browser commands above used PROOF_BROWSER_EXECUTABLE and LD_LIBRARY_PATH for a temporary, separately installed test executable. That browser package/binary is outside the app repository and is not an app dependency. Playwright's standard Chromium download failed because the returned archive was invalid in this environment; no success is claimed for that installation.

Initial proof-rendering diagnostics failed on Playwright's service-worker sandbox shim. The source of the error was reproduced and the rendering context corrected with JavaScript disabled; all product sandbox restrictions remained. An initial large-image fixture block was placed in the wrong hook and was corrected before the final passing run. No failing diagnostic is counted as a pass.

## Coverage and security review

- Expert decision/explanation/checkbox carryover regression, per-claim re-acknowledgement and close-review focus.
- Source/next-step filtering across distinct CVs with identical version numbers; copies into new proposals without automatic submission.
- Withdrawn/stale candidate refresh; partial deletion recovery; saved-action/failed-refresh distinction without duplicate POST.
- Mismatched version IDs/malformed assigned detail fail safely with no actionable acceptance/decision panel.
- Raster-only signature/bounds checks, inert markup bytes, fixed CSS hash, safe attachment names, neutral errors and private headers.
- Existing export code and database transitions reviewed: owner acceptance, exact wording/cumulative provenance, candidate denial and withdrawal protections remain in place. This review is not a new database integration run.
- No real CV, proof, portfolio, expert/account identity, source path, private credential, generated document or CP2 evidence added.
- CI remains non-deploying; ordinary unit/verification commands do not start browsers or Supabase.

## Not performed and unknown

| Activity | Actual status |
|---|---|
| Genuine local Supabase browser acceptance of this branch | Passed on `b7807e5` on 2026-10-05, including cleanup. Manual owner review and CP2 remain outstanding. |
| M11A manual owner/browser/mobile/accessibility review | Not performed |
| Screen-reader evaluation and full accessibility audit | Not performed |
| Real browser printing/PDF pagination; external DOCX-editor inspection | Not performed |
| Owner's review date, routes, viewport/keyboard actions, issues and retests | Unknown; no owner result supplied for this stage |
| Real expert qualification/enrollment, revocation/conflict policy approval | Not performed |
| Privacy/backup/retention/real-data approval | Not performed |
| CP2 participant/source evidence, reviewed pricing/market decision | Not performed |
| PR, merge, deployment, live publication or release approval | Not performed |

The working main baseline is d956118e3b89eb1fdcfd10fb48a45ba150fec20a; no main write is part of this stage. Use the review branch's published head for source inspection and the [master report](PROJECT_MASTER_REPORT.md) for current project tracking.

## M11C.1 — Existing-flow reliability and accessibility hardening — 2026-10-05

**Branch:** `codex/exe-web-app-m11c-proof-review`

**Exact starting / verification base SHA:** `4117575126f3c2163582d5bf6a2fb20bc1f641c9`

**Status:** Narrow existing-flow fixes and automated verification complete. The tested change set is on this base; final publication SHA is reported after commit/push. Manual owner/accessibility review and release approval remain pending.

### Section results

1. **Safe synchronization:** `git status --short --branch` confirmed a clean checkout. Fetched `origin/codex/exe-web-app-m11c-proof-review`, switched to the same branch and merged fast-forward only from `b7807e5` to the exact starting SHA above. Frozen-lockfile installation passed without dependency/lockfile changes.
2. **Audit:** Reviewed current project/CP2 documents, M11A workflow/owner instructions, M11B export acceptance, M10.2 manual checklist, and the installed Next.js client-component guide. Traced workspace, expert form, API handlers/repository, evidence delivery/renderer, export controls/repository, print route/HTML, database transitions and existing coverage.
3. **Implementation:** Fixed the verified stale-cache and field-semantics defects below. One new proposal interaction regression; strengthened existing partial-deletion and expert-form regressions. Targeted workspace tests passed: 15 tests.
4. **Verification:** All required commands passed on the actual local environment. Browser reports were content-free; screenshots/traces/videos remained disabled. The existing Supabase stack was reused; no duplicate stack or database reset occurred. Synthetic account/private-object cleanup passed.
5. **Reporting/publication:** This acceptance record and the master report record the actual results. Full working/staged diff and whitespace review precede a normal fast-forward push to the review branch. No PR, merge or deployment.

### Findings, fixes and audit boundaries

| Area | Actual finding / result |
|---|---|
| Partial evidence deletion / stale state | Server `delete_pending` means withdrawal persisted before Storage removal failed. Previously the client retained cached history, the snapshot panel and confirmation, including candidate acceptance controls. The client now hides cached lists and closes actionable panels on that response. Safe focused error and Retry loading remain; loading the withdrawn tombstone exposes Retry deletion. Regression checks one withdrawal POST, no stale acceptance/confirmation, no private error leakage, and refreshed withdrawn/export-blocked state. |
| Candidate proposal accessibility | Previously any proposal error marked every select (including optional portfolio) and the skill invalid, while wording lacked `aria-invalid`. Invalid state now follows each required field's actual value and clears as corrected; optional portfolio stays valid. Required fields expose native required semantics; existing custom validation/focus remains. Regression covers valid selections/skill, missing wording focus and description, correction, optional semantics, and no invalid submission. |
| Expert decision accessibility | Previously missing acknowledgement marked the valid explanation invalid and the focused checkbox had no error association. Explanation and checkbox now expose their own invalid states; the checkbox describes `decision-error`. Regression checks focused checkbox/error association, valid explanation, keyboard Space acknowledgement and exact assigned decision payload. |
| Keyboard / responsive / retry | Existing candidate confirmation/Escape/close-review focus and fresh expert state remain covered. Isolated UI browser checks passed keyboard validation, source filters, narrow layout and stale refresh; genuine journey passed five-width responsive checks. Saved-action/failed-refresh coverage remains; partial-deletion recovery does not repeat withdrawal when retrying loading. |
| Proof preview / download | Authorized RPC and private Storage delivery still precede rendering/download. Raster signature/bounds checks, script-free opaque sandbox, PDF private-download guidance, neutral errors and fixed attachment filenames remain. Isolated raster/PDF suite and assigned-expert genuine journey passed. |
| Ownership / acceptance / export / print | Reviewed owner-scoped queries, assigned active expert RPC access, separate owner confirmation, accepted-state/cumulative-provenance export boundary and escaped private print view. Genuine journey passed anonymous/nonexpert/unassigned denials, candidate export denial, acceptance, DOCX/TXT/print private-metadata exclusion, withdrawal and stale-export denial. Authorization/Storage/RLS/immutable snapshots are preserved. |

### Exact commands and outcomes for this stage

| Command | Actual result |
|---|---|
| `pnpm install --frozen-lockfile` | Passed; no lockfile/dependency changes |
| `pnpm run review:preflight` | Passed; local public settings/fictional fixtures checked without printing values |
| `pnpm exec vitest run src/app/credential-versions/workspace.test.tsx` | Passed — 15 tests, 1 file |
| `pnpm run review:verify` | Passed all five sequential steps: preflight, lint, typecheck, 301 tests in 37 files, production build |
| `pnpm run test:proof-preview` | Passed — decoded raster, large PNG/JPEG at five widths, protected view and PDF guidance |
| `pnpm run test:workspace-ui` | Passed — production UI with synthetic intercepted responses; keyboard/source-filter and narrow-layout/stale-candidate checks |
| `pnpm run test:e2e:local` | Passed after local preflight; real local synthetic sign-in/uploads/submission, assigned expert review, denials, candidate acceptance/export, private metadata exclusion, withdrawal/stale export. Run-scoped synthetic accounts and private objects cleaned up. |
| `pnpm cp2:validate:collected` | Passed structure/safety checks — 9 rows, 0 owner-reviewed, 9 pending/not-reviewed |
| `pnpm cp2:sources:validate -- --file docs/evidence/cp2-public-source-log-2026-10-05.md` | Passed source-log structure/completeness; no URL fetched or fact verified |
| `git diff --check` | Passed after correcting two Markdown trailing-space line breaks found in the initial documentation check; repeated with final documentation and staged diff before commit |

### Limitations and owner actions

- The partial-deletion failure and accessibility semantics are exercised by synthetic component interaction tests. The genuine browser journey verifies normal withdrawal/denial and the existing lifecycle; it does not inject a real Storage deletion failure.
- Manual owner desktop/mobile/200% zoom/keyboard and screen-reader review remains unperformed. Use `M10_2_OWNER_REVIEW.md` and the M11A/M11C instructions, including two CV histories, fresh expert acknowledgement, PDF download, revised claims, withdrawal/recovery and acceptance. Record actual route, viewport, input method, issues and retests.
- Actual browser Print / Save as PDF pagination and external DOCX-editor review remain unperformed. Automated print-view/document checks are not those manual reviews.
- `pnpm test:supabase:local` was not performed in this stage; no database/RLS/Storage implementation changed. The required genuine local browser suite used the existing stack and passed.
- CP2 remains open: nine rows, zero owner-reviewed; instructor clarification draft remains unsent. Public-source data and validators are not user research, instructor approval, demand validation or a product-direction decision. No M11D policy work or new feature selection occurred.
- Expert qualification/authorization/revocation/conflict and privacy/backup/retention/real-data approvals remain pending. No real documents/accounts/research or generated user documents were committed. No release approval, PR, main merge or deployment occurred.
