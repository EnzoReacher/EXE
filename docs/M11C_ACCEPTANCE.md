# M11C — Actual results and remaining acceptance

**Implementation run date:** 2026-10-04; **owner local rerun:** 2026-10-05
**Exact baseline:** e15d9584fa67230024ed21cc6258f29a1353726b
**Review branch:** codex/exe-web-app-m11c-proof-review
**Published implementation commit:** 7738159434cb732ca94095d6a5db4b4e388a9eac
**Overall status:** Implementation and isolated code/rendering verification complete. Owner local-stack journey was run on 2026-10-05 and failed after proof upload; exact failed post-upload action is not yet identified.

## Section progress

| Section | Result | Evidence |
|---|---|---|
| 1 — Baseline | Complete | GitHub ref matched the supplied M11B.1 SHA. A clean separate worktree was created from it. Existing worktrees were preserved. |
| 2 — Implementation | Complete | Protected proof rendering, fresh expert acknowledgements, source-aware history, guidance, new-claim preparation, safe errors and stale-panel handling. |
| 3 — Verification/audit | Isolated checks passed; owner integration run failed after uploads | Owner reported review verification passed all five checks, including 300 tests and production build; proof-preview and workspace UI suites passed. Local migration list matched for versions 20261001–20261007. End-to-end browser run passed sign-in, workspace, validation, CV upload and proof upload; it then failed within the same combined owner flow. Harness cleanup succeeded. |
| 4 — Reporting/publication | Complete — implementation published for source review | All 30 intended file blobs and the complete Git tree matched the staged/tested source. New GitHub review ref matched 7738159434cb732ca94095d6a5db4b4e388a9eac; main remained at d956118e3b89eb1fdcfd10fb48a45ba150fec20a. This documentation follow-up changes no tested application code. Publication does not constitute integration acceptance or release. |

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
| Owner `pnpm run test:e2e:local` | Failed after nested steps `OWNER_REAL_SIGN_IN`, `OWNER_WORKSPACE_OPEN`, `OWNER_FORM_VALIDATION`, `OWNER_CV_UPLOAD`, and `OWNER_PROOF_UPLOAD` passed; synthetic fixture cleanup passed. Reporter attributed the failure to the last nested step and enclosing line, so the later failed operation is unknown. |
| Owner `pnpm run test:proof-preview` / `pnpm run test:workspace-ui` | Passed both isolated browser suites |

## Follow-up diagnostic change (2026-10-05)

The test now reports claim draft creation, claim submission, and responsive layout as separate named browser steps after the CV/proof upload steps. This makes a subsequent failure attributable to the operation that actually timed out or failed. Lint, typecheck, and `git diff --check` passed for this test-only change. The genuine local-stack journey was not rerun in this execution environment because the owner's local configuration and Supabase stack are not available here. This change does not fix or claim acceptance of the failing owner flow.

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
| Genuine local Supabase browser acceptance of this new branch | Owner ran it on 2026-10-05; failed after both uploads. Rerun the updated branch to identify the specific claim or layout step. |
| M11A manual owner/browser/mobile/accessibility review | Not performed |
| Screen-reader evaluation and full accessibility audit | Not performed |
| Real browser printing/PDF pagination; external DOCX-editor inspection | Not performed |
| Owner's review date, routes, viewport/keyboard actions, issues and retests | Unknown; no owner result supplied for this stage |
| Real expert qualification/enrollment, revocation/conflict policy approval | Not performed |
| Privacy/backup/retention/real-data approval | Not performed |
| CP2 participant/source evidence, reviewed pricing/market decision | Not performed |
| PR, merge, deployment, live publication or release approval | Not performed |

The working main baseline is d956118e3b89eb1fdcfd10fb48a45ba150fec20a; no main write is part of this stage. Use the review branch's published head for source inspection and the [master report](PROJECT_MASTER_REPORT.md) for current project tracking.
