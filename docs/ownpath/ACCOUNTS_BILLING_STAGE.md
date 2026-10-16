# OwnPath accounts, Firebase and sandbox subscriptions

**Planning baseline, retained for decisions/requirements.** Statements below about absent packages/runtime describe the initial checkpoint, not current implementation. Current continuation source/evidence/ownership: [AB_EVIDENCE](AB_EVIDENCE.md), [AB_EXECUTION_LEDGER](AB_EXECUTION_LEDGER.md), [STATUS](STATUS.md). Backend/local completion does not close human UI, actual Stripe, cloud/recovery or release gates.

Decision date: 16 October 2026. Owner explicitly requested revamped login/registration, robust account creation, a reliable database and Free/Pro subscription payments. Owner selected **test payments first**. This authorizes the new implementation stage and supersedes the earlier no-Auth/no-persistence/no-subscriptions scope only for the bounded work below. No runtime feature is implemented by this planning checkpoint.

## Outcome and baseline

Deliver tested accounts, server sessions, account data, a Free/Pro pricing and billing flow, and explicit Pro session saving. Keep the grounded Translator and DBG-01–04 behavior intact. Do not claim zero bugs, market validation or production readiness from tests.

Feature branch: `feat/ownpath-accounts-billing`, created separately from backend `7adbd6b77085318be43d55bff382d74b499e6350`. Debugging source `87e1f116b9a7df6b704af60a7e22d411422ee6e0`; prior full acceptance is owner-reported 486 tests/53 files, seven browser cases/thirty steps, 119 retired-API checks and exact-head green CI. Refresh before implementation. Existing PR #2 and its branch are preserved; this stage does not merge/deploy staged API retirement alone.

Existing source has Supabase Auth/session helpers and a shared Auth page that imports `assessment/auth-controls` and redirects to `/assessment`. No Firebase or Stripe package is present at the baseline. Old frontend callers still depend on retired APIs. These are migration/integration constraints, not reusable account UX as-is.

## Architecture decisions

- **New identity authority:** Firebase Authentication, initially email/password. Use official SDK account creation, login, verification and reset flows; never store passwords or password hashes in Firestore.
- **New app database:** Cloud Firestore for account profiles, opt-in saved sessions, billing projections and durable operational records. Access through authenticated server APIs; deny direct web/mobile Firestore access by default. Firebase Admin bypasses Firestore rules, so every server repository operation must verify ownership/authorization; rules alone are insufficient.
- **Web sessions:** Firebase client uses memory persistence for the credential exchange. A recently authenticated ID token is exchanged server-side for a Firebase session cookie after CSRF/origin validation. Use HttpOnly, appropriate SameSite and Secure in deployed HTTPS; local insecure cookies only in explicit loopback emulator mode. Verify session validity/revocation, project and user state on protected operations; do not trust browser UID, emailVerified, tier or roles.
- **Billing:** Stripe-hosted Checkout + Billing Portal in a sandbox/test account only, behind a provider interface. Stripe is the external subscription source of truth; Firestore is an authorized, reconciled projection. No card form or card storage in OwnPath. Credentials and webhook secret remain server-only. Reject live-mode configuration/events in this stage.
- **Core boundary:** guest/local Free translation remains available. Signup/payment is optional. No model-provider integration, arbitrary-industry support, CV upload, assessment score or job board is introduced.
- **Migration:** no UID equivalence by email, automatic account linking, Supabase-user import, copying/deleting old CV data, applied migration rewrite or live database change. Build Firebase on an explicit local demo/emulator environment, then a configured non-production Firebase project when supplied. Existing Supabase data remains intact. Retire legacy auth runtime only after the coordinated caller/page removal; never allow a Firebase session to authorize old Supabase records implicitly.

This is a planned replacement for new accounts, not an instruction to run two interchangeable identity authorities. While branches are staged, old consumers stay isolated. A finished combined candidate must have one clearly documented new-account authority and no broken exposed legacy navigation.

## Product flows

```mermaid
flowchart TD
    A["Guest Translator"] --> B["Create account or sign in"]
    B --> C["Verify email and establish server session"]
    C --> D["Account: Free tier"]
    D --> E["Compare plans"]
    E --> F["Server creates sandbox checkout"]
    F --> G["Hosted test payment"]
    G --> H["Return: payment processing"]
    G --> I["Signed webhook and canonical reconciliation"]
    I --> J["Server entitlement projection"]
    J --> K["Pro: explicitly save project sessions"]
    H --> J
```

### Login and registration

Signup: email + password + password confirmation + clear validation → Firebase creates identity → idempotent server bootstrap creates profile → send verification → explain next step. Duplicate submissions must not create multiple profiles. Network loss after identity creation must recover by sign-in/bootstrap retry; do not delete an existing identity as naive compensation. Distinguish account-created/profile-pending/mail-send-pending states accurately.

Login: email/password → server session exchange → bootstrap/repair if needed → safe same-origin `next` or `/account`. Never `/assessment`. Server-rendered auth-entry pages use Firebase session verification after cutover, not stale Supabase `getCurrentUser`. Unverified users can see account/verification status and request verification again; saving, checkout and privileged account actions require verified email. Verification handling refreshes the identity and server session before granting newly verified access.

Include resend verification, forgotten-password request, invalid/expired/used action links, password-reset completion, invalid credentials, disabled accounts, throttling, sign-out and session expiry/revocation. Use safe generic recovery/login errors and project email-enumeration protection; never disable protection to make existing-email UI easier. Password rules must match the configured Firebase policy, with SDK validation where available. Keep passwords out of URLs, logs, app storage and telemetry. Social providers/MFA are separate later work, not required to ship the first email/password slice.

Auth/session/logout endpoints validate origins/CSRF and body size. Use documented recent-auth checks for session issuance and sensitive operations. Cookie duration is bounded/configurable; a five-day development default is a proposed policy, not a Firebase mandate. Clear client credential persistence after cookie issuance so there is one app session authority. Verify cookie revocation/disabled identity for protected operations. Use a shared deployed abuse-control strategy for server endpoints; an in-memory map is acceptable only as an explicitly labeled local test double. Document provider-side controls versus app-level limits.

### Free and Pro

| Capability | Free/guest | Pro sandbox subscriber |
|---|---|---|
| Existing local Translator, source review, edit/accept, clipboard/TXT | Included | Included |
| Authenticated account and verification | Included | Included |
| Save project sessions/history in Firestore | Not included in this first catalog | Included, proposed demo limit 50 saved sessions |
| Read/delete own previously saved sessions after downgrade | Available to the verified owner | Available |
| Create/update saved sessions | Requires active Pro entitlement | Server-enforced entitlement and quota |
| Billing/payment | No card, no checkout | Hosted sandbox checkout and portal |

Demo quotas/catalog are configurable and not a validated business offer. Do not promise stronger AI, better grounding, guaranteed jobs or a real model as Pro benefits. The core runs locally, so UI hiding cannot securely meter local generation; only server-backed benefits are paywalled.

Use a labeled, configurable sandbox USD monthly Pro price; a USD5/month test fixture is an optional seed only, never a production price. Prefer a configured Stripe test Price as the displayed/catalog amount source. Fetch and validate allowed product/price/currency/interval server-side; no amount/price/customer/UID supplied by the browser determines the charge. No annual, trial, coupon or additional tier until the basic lifecycle works. Missing price/key configuration shows checkout unavailable without inventing a success state.

Pricing page: Free/Pro comparison, current plan, amount/currency/period and prominent test-mode notice. Payment page: order summary, selected plan, hosted-checkout CTA, processing/retry/cancel/error states and a link to billing management. Return/success page displays processing until server-confirmed entitlement; a query string or redirect never upgrades an account. Free selection requires no payment. Active Pro users go to their billing management instead of creating another subscription. Cancellation-at-period-end retains access until verified paid-through expiry; immediate cancellation/expired entitlement removes new Pro writes while preserving existing owner read/delete access. First policy for past_due/unpaid/incomplete/paused is no new Pro writes, without deleting user data.

### Opt-in saved sessions

No autosave of project/JD text. A verified Pro user explicitly chooses Save after a clear notice about what is stored; a reload does not silently save prior tab input. Persist a validated versioned snapshot with owner UID, title, timestamps, input/source/fact/candidate/review state and a schema version. Client state cannot grant subscription access or turn edited wording into verified facts. Restore through server validation and the domain boundary; expired/unknown schemas fail recoverably. Untrusted or edited restored snapshots require renewed fact/wording review; do not infer acceptance from arbitrary stored flags. Define and test the exact restore contract with the Translator UI owner before connecting it.

Propose max 50 saved sessions/account and a conservative serialized byte bound (e.g. 128KiB); exact limits are checked server-side before Firestore writes. Enforce concurrent quota updates atomically, not with a list-then-write race. Save uses client operation id/revision guards so retries do not duplicate records and concurrent edits cannot silently overwrite. Deletion adjusts counts atomically and is idempotent. Query by authenticated UID with pagination and declared indexes; never expose cross-owner queries. Save/reload/delete UI belongs to the Translator owner.

## Database contract

| Collection/path | Authority and rules |
|---|---|
| `users/{uid}` | Server bootstrap creates one profile per Firebase UID; mutable display name only through validated account API; email/verified state derived from Firebase, not client input |
| `users/{uid}/sessions/{sessionId}` | Server checks authenticated owner, verified identity, schema/revision/size and entitlement/quota before write; owner read/delete remains allowed after downgrade |
| `billingAccounts/{uid}` | Server-owned customer binding, subscription state, allowed catalog/version, paid-through, entitlement version/asOf; never client writable |
| `billingCustomers/{providerCustomerId}` | Unique server-owned inverse mapping to UID for webhook binding; browser cannot choose another customer |
| `checkoutOperations/{operationId}` | UID-scoped idempotency, provider key and reservation/result; bounded retention, no card/token/private content |
| `billingEvents/{eventId}` | Durable dedupe/processing state/retry metadata, minimal identifiers and hashes; do not store unnecessary raw provider payload/PII |
| operational lease/quota/rate-limit records | Server-only, explicit expiry enforced by code; TTL deletion is cleanup, not authorization |

Use server timestamps and explicit allowed-field validation. Transactions protect bootstrap, customer reservations, event claims, quota and snapshot revisions. Never make Stripe/email/external calls inside retryable Firestore transactions. Handle partial failures with durable operation state and retry-safe reconciliation. Index config and deny-by-default rules are committed and exercised with Firebase Auth + Firestore emulators. Server-only Firebase Admin credentials/IAM need least privilege; emulator success is not cloud IAM/backup verification.

Maintain a local emulator seed/reset harness scoped to a `demo-` project and loopback ports. It must refuse cloud/live project targets and must not reset an existing owner emulator/service. Use isolated owned data directories and cleanup in finally. Do not rely on production credentials in tests. Document separate non-production project creation/region/config/IAM/backup/restore/retention steps; report those not executed without project access. Choose the cloud region from confirmed deployment/data needs, not from a guessed user location. The account database is not described as production-reliable until configuration and recovery have actual evidence.

## API contract to freeze before frontend work

All state-changing browser routes require verified server identity where applicable, origin/CSRF checks, size/schema validation and safe errors. Auth signup/password exchange itself uses Firebase's official client SDK. No password-handling custom server endpoint is needed. JSON errors use `{error:{code,message,retryable,requestId}}` with safe messages and status401/403/409/422/429/503 as appropriate. Responses containing identity/billing/private sessions are no-store; correlation logs omit passwords, session tokens and project/JD contents.

| Endpoint | Purpose |
|---|---|
| `GET /api/auth/csrf` | Reviewed AB-00 extension: no-store HttpOnly-cookie-bound CSRF bootstrap token before browser mutations; no identity/password exchange |
| `POST /api/auth/session` | Recent Firebase ID token exchange, idempotent profile bootstrap, bounded HttpOnly cookie; unverified identity gets only limited account access |
| `DELETE /api/auth/session` | CSRF-protected logout and cookie clearing; define current-device versus explicit all-session revocation |
| `GET /api/account` | Trusted identity, profile/setup/verification status and server plan summary |
| `PATCH /api/account` | Validate profile-only fields; reject owner, role, tier, verified-email and billing mutations |
| `GET /api/billing/plans` | Public sanitized Free/Pro test catalog; no secrets/customer data |
| `GET /api/billing/status` | Own trusted billing/entitlement state plus asOf and safe pending/error state |
| `POST /api/billing/checkout` | Body `{planId:'pro'}` + scoped operation key; derive identity/customer/price/URLs server-side; returns only approved hosted checkout URL |
| `POST /api/billing/portal` | Verified user's own customer, trusted return URL; no arbitrary customer ID |
| `POST /api/webhooks/stripe` | Raw-body signature verification; no browser CSRF token, session or redirect required; accept only expected sandbox account/mode; durable processing |
| `GET, POST /api/sessions` | Own paginated history / explicit Pro save; server ownership/quota/schema/revision handling |
| `GET, PATCH, DELETE /api/sessions/[id]` | Own snapshot read/update/delete, cross-owner not-found, optimistic concurrency and idempotent retry behavior |

Freeze request/response types under a dedicated account/billing contracts module without modifying core `experience-translator/types.ts`. Frontend developers consume Firebase client adapter and those frozen DTOs. Do not resurrect `/api/saved-work` or any of the 17 retired APIs.

## Billing correctness requirements

- Idempotent customer creation and one active subscription per UID/environment. Concurrent tabs, different retry keys, slow provider calls, stale reservations and lost responses must not create duplicate subscriptions. Reuse a valid pending checkout or recover its operation; provider calls use stable logical-operation keys.
- Verify Stripe signature over the unmodified raw body. Store/claim verified event IDs atomically; persist failure/retry state and only acknowledge successful durable receipt or completed processing according to the chosen worker model. Unsigned/bad-signature events cannot reach business mutation.
- Do not trust delivery order or dedupe alone. Retrieve current provider subscription/invoice state and reconcile under a per-customer serialized/versioned scheme that prevents stale concurrent work overwriting a newer cancellation/payment state. Event timestamps alone are insufficient. Include a retry/reconciliation path and test an event lost between receipt and update.
- Bind provider customer/subscription to the server's UID mapping; reject mismatches or unknown price/product/mode. Use installed stable SDK/API docs for actual payload fields, not remembered or fabricated versions.
- Grant Pro only from the tested allowed-state policy after verified server reconciliation of paid subscription/invoice state. `checkout.session.completed`, client metadata or `?success=1` alone is not enough. Treat pending/incomplete/payment failure/unpaid/past_due/canceled/expired/disputed/refunded states according to explicit tested policy; first-stage access is conservative and preserves data. Handle refunds/disputes for sandbox fixtures or record a clear unsupported gate rather than silently retaining access.
- Keep cancellation-at-period-end, renewal success/failure, portal changes, re-subscription and provider/Firestore outages recoverable. Avoid creating a second subscription for an already active user; show/manage the current one.
- Provider-facing state and minimal audit records are separate from account-editable fields. No client-writable Pro flag or optimistic paid-access success message. Apply expiry at authorization time so a missed webhook cannot grant Pro indefinitely.

## Ownership and execution order

| Owner | Exclusive implementation scope |
|---|---|
| Backend engineer | New identity/Firebase/account/billing/session modules and new APIs; server repositories, adapters and contract tests; no frontend edits |
| Frontend 1 | Existing sign-in/sign-up/shared auth entry replacement, new verification/reset/action/account entry UI and auth-scoped tests/styles; shared shell/navigation integration in its own task |
| Frontend 2 | New pricing/checkout-return/billing-management UI and scoped tests; existing Translator UI plus opt-in save/restore only after backend contracts are frozen |
| One integration writer | Root packages/lock/config, `.env.example`, Firebase rules/index/emulator config, auth route/proxy cutover, shared browser specs/CI/ownership/factory profiles. Own these in explicit task cards, never concurrent edits |

Frontend directory assignment is a proposed extension for the existing two people, not a claim they have acknowledged it. Before touching existing frontend work, inspect their actual branch/local progress. New default branch names: `feat/ownpath-accounts-billing` backend/stage, `feat/ownpath-auth-ui` FE1 and `feat/ownpath-billing-ui` FE2; reuse existing suitable branches without reset. Separate worktrees. Record baseline and changed-file ownership for each task. Canonical status docs have one coordinator writer. Explicit cross-owner changes are integrated by one writer after review.

1. **AB-00 scope/contracts/tooling:** revise owner plan and limited permissions; inventory old Auth consumers and reviewed legacy-page retirement dependency; freeze DTOs. Update ownership/factory generator for new backend paths and an explicitly scoped integration writer, preserving read-only roles. The existing checker rejects every `/api/**` build entry; revise it to reject the 17 retired patterns while accepting new declared auth/billing/session endpoints. Keep HTTP absence checks and coverage for catch-all handlers/redirects that could revive old APIs.
2. **AB-01 Firebase + identity:** packages/config via the integration writer, local Auth/Firestore emulators and guarded harness, profile bootstrap, ID-token/session exchange, cookie verification/logout and two-user server/rules tests.
3. **AB-02 auth UX:** FE1 signup/login/verification/reset/recovery, safe redirects and account-entry cutover. New pages cannot still import assessment controls or Supabase auth. Ready after auth contract freeze; actual integration waits for reviewed changes.
4. **AB-03 persistence + entitlements:** backend account/profile and versioned saved-session repositories, atomic quota/idempotency/revisions, Free/Pro capability checks. Firebase emulator integration proves ownership and failure recovery. FE2 explicit save/restore attaches only after contract review.
5. **AB-04 sandbox billing:** backend catalog/provider adapter, checkout/portal, durable signed-webhook handling/reconciliation and entitlement lifecycle. Real test keys optional for deterministic work; distinguish mocked provider tests from actual sandbox execution. Production/live mode stays disabled.
6. **AB-05 pricing/payment UX:** FE2 pricing, order summary, hosted redirect, processing/cancel/error/retry, status and billing management. No client tier or amount authority; test-mode labeling is visible.
7. **AB-06 combined acceptance:** integrate reviewed backend+FE1+FE2 and required legacy page retirement; one identity cutover. Run previous core regression and new auth/storage/billing browser+emulator+sandbox checks, separate QA and exact-head CI. Only then evaluate removal of obsolete Auth/packages/config; old data/migrations remain preserved.
8. **AB-07 handoff:** verified feature candidate, local/sandbox setup, missing cloud credentials/config, rollback and remaining deployment/manual/research decisions. No live charges/cloud mutation/merge/deploy is inferred from this plan.

Tasks are TODO until actual implementation/evidence. Auth and billing UI may progress in disjoint worktrees after DTOs are frozen, but no combined readiness claim precedes integration. Do not reset PR #2's base or merge the old staged branch silently; record branch dependency in a new feature draft PR after implementation. Existing debugging history remains authoritative.

## Required evidence

Preserve all 486 baseline assertions unless a reviewed retired feature genuinely removes them. Add meaningful tests for real behavior, not just mocks of the implementation. Run focused RED/GREEN, lint/types/full tests/build/diff, scoped ownership, compiled public Translator and retired-API checks. New test counts are measured, not preset.

Account matrix: create/duplicate/concurrent submit; verification and resend failure; invalid/expired links; reset neutral response; wrong/disabled/revoked identity; session rotation/expiry/logout; CSRF/open redirects; profile bootstrap failure+retry; unverified access denied; account/tier/UID spoof denied; cookie settings and no private logs.

Firestore matrix: no anonymous/direct-client writes; cross-owner API access denied; Admin repository authorization; malformed/oversized docs; conflicting edits; duplicate retries; concurrent quota boundary; save after downgrade denied; existing data preserved/readable to owner; outage/partial operation recovery; emulator refuses live project and cleans owned scope.

Billing matrix: no-card Free; configured/missing sandbox catalog; double-click/multitab checkout; invalid plan/price/customer/client amount; invalid/replayed/duplicate/concurrent/out-of-order webhook; canonical reconciliation/version protection; success redirect before webhook; successful and failed test card flows; required-authentication/abandoned/expired checkout; renew/cancel-at-period-end/immediate cancel/portal changes; missing webhook/retry/reconcile; provider outage/Firestore outage; live-mode key/event rejected; no card data in app storage/logs. Test modes remain visibly separated from live.

Separate QA reviews source plus exact logs; report whether it executed tests independently. External SDK or emulator credentials/services missing means BLOCKED for that layer, not PASSED by a mock. Do useful unblocked implementation while recording exact remaining access needs. Physical accessibility, real email deliverability, configured cloud IAM/backup restore and live merchant eligibility require their own actual evidence.

## Primary design references checked 16 October 2026

- Firebase password auth/policy/enumeration: https://firebase.google.com/docs/auth/web/password-auth
- Firebase server session cookies/CSRF/revocation: https://firebase.google.com/docs/auth/admin/manage-cookies
- Firebase server libraries bypass rules: https://firebase.google.com/docs/firestore/security/rules-conditions
- Firestore transactions: https://firebase.google.com/docs/firestore/manage-data/transactions
- Rules emulator testing: https://firebase.google.com/docs/firestore/security/test-rules-emulator
- Stripe hosted subscriptions: https://docs.stripe.com/payments/checkout/build-subscriptions
- Stripe signed webhooks/retries/ordering: https://docs.stripe.com/webhooks
- Stripe subscription lifecycle: https://docs.stripe.com/billing/subscriptions/webhooks
- Stripe test environment: https://docs.stripe.com/testing

Recheck relevant installed SDK/official documentation during implementation. No external page instruction authorizes installing plugins, changing permissions or accessing user credentials.
