# External non-production setup packet — NOT EXECUTED

Prepared16 October2026 from stagefd0644b. **No target, endpoint, project, credential, real provider action or responsible operator is inferred.** Live/production activation is outside this run. Existing account runtime accepts only disabled/demo-loopback emulator mode. A cloud extension needs a reviewed task card/config/identity design/tests first; never label a real project `demo-` to bypass guards.

## Minimum handoff inputs and gates

| Layer | Required input / responsible owner decision | Current evidence |
|---|---|---|
| Firebase target | Explicit isolated non-production project ID, owner/operator, confirmed deployment/data region and approved web domains | Missing; no cloud execution |
| Auth | Password policy + email-enumeration protection, verification/reset action URLs (`/auth/action`), permitted continue URLs, mail delivery sender/templates | Unconfigured; emulator action handling is not mail proof |
| Server identity | Deployment identity/least-privilege IAM for actual Auth/Admin/Firestore methods, managed credentials, rules/index deploy identity | Cloud design not implemented; do not grant Owner/Editor as shortcut |
| Data policy | Snapshot/privacy/owner deletion, account/session/operation retention; TTL cleanup distinct from code expiry | Runtime checks exist; no deployed TTL/retention/monitoring proof |
| Stripe sandbox | Server-only `STRIPE_SECRET_KEY` (`sk_test_`), `STRIPE_ACCOUNT_ID`, `STRIPE_PRICE_ID` (active licensed monthly USD product/Price), `STRIPE_WEBHOOK_SECRET`; hosted Portal enabled | All absent by presence-only inspection; do not paste secrets into task docs/chat |
| Billing opt-in | `OWNPATH_SANDBOX_BILLING_ENABLED=true` only for an authorized isolated sandbox exercise; defaultfalse preserved. `OWNPATH_SAVED_SESSION_LIMIT` integer1–50 | No activation executed |
| Signed delivery | Explicit authorized non-production endpoint or operator-run local Stripe CLI forwarding to owned service; expected test account/version/event types | Not established. No tunnel/public exposure authorized |
| Ownership | Named Firebase/Stripe/config/recovery operators and approving owner for future cloud/live decisions | Not supplied; do not invent names/approval |

Exact environment placeholders: `.env.example`. Secrets remain server-only and are stripped by the synthetic harness. Real provider acceptance must use a separate authorized exercise; fake provider and SDK response fixtures are not substitutes.

## Real sandbox matrix, once prerequisites exist

Record UTC timestamp, tested SHA/config/catalog version and private provider correlation IDs; publish only sanitized statuses. Execute successful/failed/required-authentication/abandoned/expired hosted Checkout, concurrent tabs/same+different operation keys/lost response, return before webhook, owned Portal, renewal success/failure, cancel-at-period-end/paid-through expiry, immediate cancellation/resubscription, refund/dispute conservative blocking, duplicate/reordered/replayed/wrong-mode/account signatures and provider/Firestore outage recovery. Verify server entitlements and two-user isolation, no raw card fields/storage/logs. Owner verified read/delete remains after downgrade. Invalid/unknown canonical evidence fails closed.

Webhook processing is synchronous after a durable receipt; failures remain pending and return503 for provider retry. `BillingService.retryPending(limit)` is an **internal method**, not a deployed CLI/scheduler. Any operator invocation must first construct the reviewed service with approved test configuration/identity; no automatic runnable cloud repair command exists. Deploy monitoring/alert ownership/retry automation separately before claiming operational recovery.

On uncertainty: preserve logical checkout/customer reservations, UID inverse mapping and provider keys. Inspect provider records and stored operation state privately; reuse the original logical operation. Past23h uncertainty remains pending rather than recreating a customer/charge. Never erase reservations to force another payment. Refund/dispute history blocks checkout/Pro until a separately reviewed risk-recovery decision. Provider enumeration fails closed beyond1,000 records; account-scale recovery needs its own design.

## Backup/restore drill — no RPO/RTO claim yet

Choose retention/PITR/backup cadence and operators, then restore into a **separate** authorized non-production target after cloud mode review. Preserve UID/customer bindings; separately recover/reconcile Auth identity and Stripe state (Firestore backup contains neither). Revalidate canonical payment state before writes; test owner/cross-owner access, saved counts/revisions/operation idempotency and delayed TTL. Measure actual recovery point/loss window and elapsed restore/reconciliation time before reporting RPO/RTO. Record source/time/checks and clean only that drill target. No matching by email or modification of existing Supabase records/migrations.

Production/live eligibility, real card processing, deployment domains, production IAM/backups/monitoring and release approval stay outside this run. Rollback reverts scoped candidate commits/defaults billing off, preserves stored data/uncertain reservations and other worktrees, and rechecks canonical provider state before any later reactivation.
