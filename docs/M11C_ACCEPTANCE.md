# M11C — Actual results and remaining acceptance

**Run date:** 2026-10-04
**Exact baseline:** e15d9584fa67230024ed21cc6258f29a1353726b
**Review branch:** codex/exe-web-app-m11c-proof-review
**Overall status:** Implementation and isolated code/rendering verification complete; full local-stack acceptance pending.

## Section progress

| Section | Result | Evidence |
|---|---|---|
| 1 — Baseline | Complete | GitHub ref matched the supplied M11B.1 SHA. A clean separate worktree was created from it. Existing worktrees were preserved. |
| 2 — Implementation | Complete | Protected proof rendering, fresh expert acknowledgements, source-aware history, guidance, new-claim preparation, safe errors and stale-panel handling. |
| 3 — Verification/audit | Isolated checks passed; integration pending | Tests and code review preserve the existing owner/assignment/RLS/immutable/export/withdrawal authority. No database migration was changed. |
| 4 — Reporting/publication | Prepared for feature-branch source review | Master report, tracker/current state, guide and this actual-results record updated. Publication does not constitute acceptance or release. |

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
| Genuine local Supabase browser acceptance of this new branch | Not performed; must rerun on the existing owner stack |
| M11A manual owner/browser/mobile/accessibility review | Not performed |
| Screen-reader evaluation and full accessibility audit | Not performed |
| Real browser printing/PDF pagination; external DOCX-editor inspection | Not performed |
| Owner's review date, routes, viewport/keyboard actions, issues and retests | Unknown; no owner result supplied for this stage |
| Real expert qualification/enrollment, revocation/conflict policy approval | Not performed |
| Privacy/backup/retention/real-data approval | Not performed |
| CP2 participant/source evidence, reviewed pricing/market decision | Not performed |
| PR, merge, deployment, live publication or release approval | Not performed |

The working main baseline is d956118e3b89eb1fdcfd10fb48a45ba150fec20a; no main write is part of this stage. Use the review branch's published head for source inspection and the [master report](PROJECT_MASTER_REPORT.md) for current project tracking.
