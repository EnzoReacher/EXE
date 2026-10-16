# AB execution task cards — 16 October 2026

Fixed stage baseline: `e5119961570c52f4e5c3d9ef3647650d1de08d67`.
Worktree: `/home/enzoreacher/EXE-ownpath-accounts-billing`.
Original M17 checkout clean; backend checkout retains eight untracked local Factory profiles. Fetch found no published FE1/FE2 branches; their private progress/acknowledgment is unknown. PR #2 is preserved against `feat/ownpath-experience-translator`. Stage PR depends on backend #2 and targets `feat/ownpath-backend`.

## AB-00-I / AB-01-I — designated integration writer

This session is the sole integration writer. Exact allowed files: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` (explicit dependency build policy), `.env.example`, `.gitignore`, `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `scripts/accounts-emulators.mjs`, `scripts/accounts-emulators.test.mjs`, `scripts/accounts-emulator-check.mjs`, existing ownership/retired-API/factory setup scripts and their tests, and coordinator `docs/ownpath/**`, `docs/ai-factory/**`. No proxy/auth-page cutover until reviewed FE1 and legacy caller retirement. Root tooling changes receive a separate commit from backend runtime.

Checks: focused guard/factory/harness regressions, frozen install, full retained tests, lint/types/build, compiled Translator/119 retired probes, actual owned Auth/Firestore emulator run if Java/CLI are available. Missing Java/service is BLOCKED, never substituted by a mock. Read-only separate QA reviews source and exact logs. Rollback: revert scoped commits; no existing services reset.

Explicit AB-06-I extension for the same sole integration writer: `.github/workflows/ownpath-accounts.yml` and `scripts/ci-ownpath-browser.mjs` only. Run actual demo Firebase acceptance on a disposable Java21 runner and existing compiled Translator acceptance plus retired probes for this stage; no secrets, external sandbox claim, global CI removal, or browser-privacy guard weakening.

Explicit AB-06-I browser-spec extension: the same integration writer owns the focused synchronization correction in `e2e/translator.spec.ts`. Await the existing generated-step heading-focus contract before focusing approval and sending Space. Preserve keyboard activation, privacy interception, all widths/cases and assertion strength; no frontend runtime edit, sleeps or retry-count changes. Separate read-only QA and compiled acceptance are required. This addresses PR acceptance run `38849771992` (768px approval assertion); that failed run remains recorded.

## AB-00-B / AB-01-B / AB-03-B / AB-04-B — backend writer

Exclusive implementation: `src/lib/accounts-billing/**`, new declared `src/app/api/{auth/session,account,billing/plans,billing/status,billing/checkout,billing/portal,webhooks/stripe,sessions}/**` plus `src/app/api/sessions/[id]/**`. Contracts first, with `docs/ownpath/ACCOUNTS_BILLING_CONTRACTS.md`; backend does not edit root configuration/frontend/core types. Meaningful authorization, CSRF, recent-auth, bootstrap retry, concurrency, entitlement expiry and provider-boundary tests. Emulator acceptance and actual Stripe sandbox execution reported separately. Live mode rejected.

Contract-review extension: explicitly declare `GET /api/auth/csrf` and `src/app/api/auth/csrf/**` for the HttpOnly-cookie-bound CSRF bootstrap before unauthenticated credential exchange. It returns only a no-store token, checks fetch origin/site, and grants no identity. This is an added CSRF prerequisite, not a password endpoint or retired-route alias. FE1/FE2 may use scoped `src/components/accounts-auth/**` / `src/components/accounts-billing/**` respectively. Shared account layout remains integration-reserved pending an explicit composition task; FE1 owns its entry page, FE2 its billing child.

## AB-02 / AB-05 — frontend handoffs

Billing writer interruption: backend subagent `ses_ebd34812dffeocziKZKGUPCaRp` stopped at its usage limit. The coordinator takes over as sole backend completion writer after that stop, within the exact AB backend scope above; the stopped writer must not resume concurrent edits. Separate read-only billing QA remains required.

FE1 owns auth/action/reset/account entry; FE2 pricing/billing and opt-in Translator integration. Consume the frozen contracts document once committed. Separate preserved worktrees, no coordinator status-doc edits, no automatic messages or claimed acknowledgment. Shared account parent belongs to FE1; FE2 uses `account/billing/**`. Restore connection requires FE2 review of reset/renewed-review semantics. Combined acceptance stays open until both reviewed UI deliveries and legacy page/caller retirement arrive.
