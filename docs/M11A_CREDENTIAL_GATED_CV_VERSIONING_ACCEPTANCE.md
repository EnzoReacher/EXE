# M11A — Credential-gated CV versioning acceptance

**Date:** 2026-10-03

**Branch:** `codex/exe-web-app-m11a-credentialed-cv-versions`

**Exact base:** Published M10.6 `5dd5fbebf688aeafe20ecc91cb55838bdc5d851e`.

**Status:** Engineering gate passed on 2026-10-03; existing local Supabase migration/RLS/Storage acceptance passed using temporary fictional fixtures. Feature-branch publication authorized after final source/diff review; manual owner review and CP2 remain pending.

## Completed engineering work

- Private portfolio/credential intake with size, filename, MIME and signature guards; no OCR/AI/issuer API or inference.
- Separate authenticated owner/expert workspaces; assigned-only proof downloads and safe list/error DTOs; accessible form labels, live feedback and explicit confirmation/focus handling.
- Seven RLS-protected record types, no client lifecycle writes/role assignment, checked database submission/approval/version/acceptance/withdrawal functions.
- Immutable base/wording/version snapshots, exact approved-wording append, owner acceptance, prior-version history and cumulative withdrawal propagation. Existing M3 drafts and token-review model unchanged.
- Deterministic unit/interaction tests and a local fictional-account RLS/private-Storage policy suite using the existing local stack. Test expert approvals are synthetic fixtures, never real expert outcomes.

## Actual verification

| Command | Actual result |
|---|---|
| `pnpm vitest run src/lib/credential-versions/validation.test.ts src/lib/credential-versions/repository.test.ts src/app/credential-versions/workspace.test.tsx 'src/app/api/credential-versions/evidence/[id]/route.test.ts'` | Passed — 35 tests, 4 files |
| `pnpm review:verify` | Passed — all five sequential checks |
| `pnpm review:preflight` | Passed through `review:verify`; no configuration values printed |
| `pnpm lint` | Passed through `review:verify` |
| `pnpm typecheck` | Passed through `review:verify` |
| `pnpm test` | Passed through `review:verify` — 224 tests, 29 files |
| `pnpm build` | Passed through `review:verify`, with telemetry disabled by the runner |
| `pnpm cp2:validate` | Passed template validation only; no real research evidence |
| `pnpm test:supabase:local` | Passed — M1–M6b and extended M11A fictional RLS/Storage suite, existing stack only |
| `git diff --check` | Passed; repeated on the staged diff before commit |

Local policy invocation used Node `--env-file=.env.local` and a child environment mapping `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the helper's `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`. No values were printed or committed. Migration `20261006` was already applied; additive migration `20261007` was applied transactionally and recorded in local migration history without restarting/resetting Supabase.

### Failures diagnosed and resolved

- Initial targeted gate: 27 passed, 2 failed, with two rendering errors. Detail actions unnecessarily reloaded lists and consumed sequential action mocks as list data. Corrected detail/retry refresh behavior; added malformed-response handling and regression coverage.
- New private-preview gate: 34 passed, 1 failed. The test setup returned a mock function, which Vitest interpreted as teardown and invoked after the rejection test. Corrected the hook; the route's neutral failure behavior remained intact. Final targeted and full-suite checks passed.
- Final review completed individual unaccepted-claim withdrawal, exact-provenance before/after views, first-invalid-field focus, sandboxed authenticated proof previews, marked additional-skill sections, explicit administrative expert approval metadata, lifecycle dates, and active-expert rechecking before candidate creation. Candidates are read-only; revised wording needs a new reviewed claim.

Final source review covered 27 intended text source/documentation files. Local credential-value comparison and credential-pattern scan passed; no environment files or binary personal documents were added. No public object URL is created by product code; the integration suite tests that a guessed public Storage route is denied. Deployment/configuration files are unchanged. Local `main` remains at `d956118e3b89eb1fdcfd10fb48a45ba150fec20a`; only the authorized feature branch is eligible for commit/push.

## Not performed / owner gates

- Manual browser/mobile/keyboard/screen-reader/accessibility review and usability findings — Not performed.
- Real certificates/degrees/portfolios/CVs, expert enrollment/approval, participant data or actual research — Not performed.
- Issuer authentication, OCR, external AI, scraping, payments, document export — Not performed; outside scope.
- CP2 evidence collection/review, market/pricing/competitor validation, broader M11 product-market decisions — Pending.
- Expert-role administration policy and privacy/backup/retention approval — Pending.
- Merge to main, deployment, PR, public launch or release approval — Not performed.

## Owner handoff

This is an owner-directed technical prototype, not CP2 validation. See `M11A_CREDENTIAL_GATED_CV_VERSIONING.md` for exact workflow, safe role administration and historical withdrawal behavior. Rerun `pnpm review:verify`, then `pnpm dev` only on pass; reuse the existing local stack. Complete the actual fictional owner checklist and M11A owner/expert flow with real date/viewport/keyboard/issues/retests only. Owner approval is required before merge/deployment.
