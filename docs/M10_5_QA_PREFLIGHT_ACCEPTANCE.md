# M10.5 QA Preflight Acceptance

**Date:** 2026-10-02

**Branch:** `codex/exe-web-app-m10-5-qa-preflight`

**Base:** M10.3 commit `9d9e3c2b49e5421dc625952f5fbbe3570188d285`
**Status:** Engineering checks completed; owner browser review, CP2 evidence, M11 selection, merge, and deployment remain pending.

## Delivered

- Added `pnpm review:preflight`.
- Added a bounded, read-only local configuration check:
  - requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
  - accepts only an HTTP loopback Supabase URL;
  - rejects service-role, secret, database, private-key, or access-token settings without printing their names or values;
  - checks the fictional Aria Vale DOCX fixture and owner-review checklist exist.
- Added four regression tests for valid local settings, hosted URL rejection, credential rejection without value disclosure, missing settings, dotenv parsing, and the explicit CLI shape.
- Changed Next's build-time TypeScript configuration to use the installed TypeScript API rather than captured child-process CLI output. This resolves the build environment's valid-JSON-but-empty-capture failure and preserves the standalone `pnpm typecheck` command.
- Added a local preflight guide and updated the README, build tracker, current state, and master report.

## Validation actually performed

| Command / activity | Actual result |
|---|---|
| `pnpm test` | Passed outside the sandbox: 24 test files, 179 tests. |
| `pnpm vitest run scripts/review-preflight.test.mjs --pool=threads --maxWorkers=1` | Passed: 4 tests. |
| `pnpm vitest run --exclude scripts/cp2-research.test.mjs --pool=threads --maxWorkers=1` | Passed: 23 test files, 119 tests. Includes the new preflight regression tests. |
| `pnpm lint` | Passed. |
| `pnpm typecheck` | Passed. |
| `pnpm build` | Passed after the TypeScript API configuration change. |
| `pnpm cp2:validate` | Passed in template mode; it correctly reported CP2 evidence pending. |
| `pnpm cp2:survey:validate -- --file scripts/fixtures/cp2-research/survey-valid.csv` | Passed on synthetic aggregate-only data. |
| `pnpm cp2:sources:validate -- --file scripts/fixtures/cp2-research/source-valid.md` | Passed on a synthetic source record; no URL was fetched or fact verified. |
| Syntax checks for M1 policy, CP2 validator, and preflight scripts | Passed. |
| `git diff --check` | Passed. |
| `pnpm test:supabase:local` | Not performed in this stage; M10.5 changes no database, API, RLS, Storage, or application workflow. |
| Connected-browser owner review | Not performed; deferred by owner. |

## Sandbox diagnostic and resolution

An initial default `pnpm test` run inside this execution sandbox did not complete. Its existing `scripts/cp2-research.test.mjs` uses Node child-process capture for script stdout and `git check-ignore --stdin`; this sandbox suppresses child stdout and leaves that Git child waiting. Direct shell execution of the same `git check-ignore` command and the synthetic CP2 CLI commands completed normally.

The full suite was then rerun outside that sandbox and passed: **179 tests in 24 files**. The sandbox behavior is therefore recorded as a tooling diagnostic, not an outstanding product or QA failure.

## Scope and decision boundary

M10.5 does not create market research, validate a target segment, make a price/competitor/value claim, choose M11, use a real CV, call external AI, or access a hosted Supabase project. It is not a replacement for the manual owner review tomorrow. No merge to `main`, deployment, public launch, or release approval occurred.
