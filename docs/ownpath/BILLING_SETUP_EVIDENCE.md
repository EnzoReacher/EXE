# OwnPath draft billing — local candidate

**Current owner session:** start with [MANUAL_ACCEPTANCE.md](MANUAL_ACCEPTANCE.md).
The integration checkpoint in `COMPLETION_HANDOFF.md` supersedes old running-process
and build identities below. Both disposable previews now show one visible notice,
use the existing exact sales scenario, and offer the same downloadable PDF/DOCX.
The Scan preview has isolated memory saves (no AI-quota/payment acceptance); the
Billing preview uses its separate disposable SQL database for real quota contracts.
Normal application Auth/storage/AI/payment configuration is never replaced by these
fixture services. Fresh integration evidence is under
`.factory/evidence/OWNPATH-INTEGRATION-20261021/`; earlier counts remain historical.

**Normal app summary 503 readiness (2026-10-22):** see
[NORMAL_SUPABASE_BILLING_READINESS.md](NORMAL_SUPABASE_BILLING_READINESS.md).
Read-only checks of the configured normal project found its summary RPC and
reservation/billing relations absent from the exposed schema cache. The guide
provides the owner's read-only catalog inventory, conditional exact migration
sequence and post-setup checks. No hosted change was applied. Summary reads do
not require merchant or service-role keys; missing data must remain unavailable,
not become an assumed Free plan.

## Safety and local walkthrough

**No live payment, hosted migration, deployment or refund was executed.** Limits
are draft economics. VND 79,000 is an illustrative LOCAL_FAKE price only. Live
sales remain closed by the reviewable acceptance object in
`src/lib/billing/config.ts` **and** the database acceptance policy; keys or an
environment flag alone cannot open sales. Existing OpenAI loopback restrictions
are unchanged. Billing does not enable hosted AI.

```sh
npm run preview:billing
```

Requires the existing local Docker container `supabase_db_EXE`, installed project
dependencies and unused ports 4347–4350. It refuses occupied ports/existing database
names, copies source without private env files, uses an isolated Auth cookie and
creates only a disposable `ownpath_billing_demo_<pid>` database. The normal `.next`,
owner's 4317 server and previous 4329 app are untouched. Ctrl+C stops only children
owned by this launcher and drops its disposable database/build.

1. Open `http://127.0.0.3:4347/pricing`. Sign in with
   `fictional@example.test` and any password of eight or more characters. This is
   fictional Auth, not a merchant or hosted account.
2. Return to Pricing. Choose Pro → Create order → Open hosted checkout. On the
   clearly labelled fake provider choose **Simulate verified payment**. Return and
   **Check payment**; Account shows Pro, 30 Scans/15 Rewrites/30 saved versions.
3. Buy another 30 days: Account shows the purchased next period. Current expiry
   and usage remain unchanged. No automatic renewal or early future spending.
4. Choose **Pay without callback (recovery)** on a later fake order. The protected
   runner checks every ten seconds; persisted backoff may defer recovery for a
   minute or more. Refresh Account. Reopening the browser preserves purchases in
   PostgreSQL until the demo is stopped.
5. Download the supplied synthetic sales PDF/DOCX from the visible **Sample account,
   CV and exact instructions** notice. Use its exact JD and English instruction
   (also in `MANUAL_ACCEPTANCE.md`) to exercise real input/result validation and SQL
   reservation paths. Both previews now reuse that same fixed sales scenario and
   reject arbitrary input before reservation; neither contacts OpenAI. Save explicitly;
   viewing, manual editing and exports use no AI quota. The fixed demo does not
   assess CV quality. The PostgreSQL tests below exercise the final-slot and
   expiry limits without making dozens of repetitive UI requests.

The fake provider is a test file loaded by the launcher only, not an application
API or public mark-paid route. Its disk-backed state and fictitious credentials
never reach hosted storage. Production application code contains no fake-payment
service or fake AI implementation. The LOCAL_FAKE adapter additionally requires
numeric loopback app/Auth/provider settings and database `billing_allow_fake`.

### Auth callback repair (2026-10-21)

The failing browser was the isolated billing preview at
`http://127.0.0.3:4347/sign-up`, not the normal app. `auth-panel.tsx` calls
`accountCallbackUrl` before sending signup/resend/recovery. The launcher's public
build-time `NEXT_PUBLIC_SITE_URL` was correctly set to `http://127.0.0.3:4347`,
but `auth-redirect.ts` deliberately allows plain HTTP only on its normal loopback
hosts (`localhost`, `127.0.0.1`, IPv6 localhost), not the preview's isolated IP.
It therefore returned null and emitted “Authentication callback is not configured.
Please contact the site owner.” No signup request reached Auth in the reproduction.
Server callback construction used the same validator and failed for the same reason.

`scripts/ownpath-preview-auth.mjs` now adds only that exact origin to the
**disposable billing build**, and refuses other app/Auth origin pairs. The billing
launcher applies it before compilation, alongside existing fictional cookie/AI
isolation. The normal application's validator and return-path restrictions are
unchanged; neither an environment fallback nor a general HTTP/loopback exception
was added. `--build-only` does not apply this fictional-preview transformation.
Public `NEXT_PUBLIC_*` values are embedded at build time, so restarting an old
bundle alone cannot repair this failure.

Working preview entry: **`http://127.0.0.3:4347/sign-in`**, fictional credentials
above. The active preview app child was rebuilt/restarted without replacing its
launcher, fictional Auth/provider or disposable database; the previous 4329 app
was left intact. No owner configuration is needed for this preview. Default
fictional signup intentionally has no returned session: it now reaches the Auth
fixture with a valid callback but does not pretend signup succeeded. An explicitly
enabled existing test-only signup-session scenario verifies the positive contract;
the test restores its default afterward. Use fictional signin for the normal demo.

Completed evidence: `.factory/evidence/OWNPATH-AUTH-CALLBACK-20261021/` contains
the before-error reproduction, repaired build ID, completed `browser.json` and
`browser.log`, recovery screenshot, lint/typecheck and preservation inventory.
The browser check covers signup-session verification and signin → `/app`, honest
missing-session failure, recovery PKCE exchange → `/reset-password`, missing code,
consumed verifier and unsafe redirect denial. The first browser attempt failed an
incorrect test expectation for a consumed verifier; only the corrected completed
run is counted as passing. Three preview-isolation tests and 53 focused Auth tests
also passed; their still-valid results were reused after interruption.

Real signup, email delivery and real emailed recovery links were **not** exercised.
For the separate real application, the owner must supply its actual trusted site
origin as `NEXT_PUBLIC_SITE_URL` **at build time** and configure the corresponding
`/auth/callback` in that real Supabase project's Site URL/redirect allow-list.
Do not point real Auth at this fictional preview or change confirmation settings
to address this preview-only origin mismatch. No private env files were read and
no hosted settings were changed.

## Contracts and deployment gates

### Owner-hosted checklist — prepared only, do not run tonight's fake against hosted data

- [ ] Inventory the **current-product** schema first. Dependency order is
  `20261019_ownpath_cv_profiles_versions.sql` →
  `20261021_ownpath_ai_reservations.sql` → `20261022_ownpath_billing.sql`.
  The first was previously owner-reported applied; confirm rather than reapply.
  The latter two are prepared and locally PostgreSQL-tested, **NOT applied hosted
  by this work**. Do not blindly apply all historical migrations.
- [ ] `20261020_legacy_draft_revision.sql` and
  `20261020_review_rpc_submission_limit.sql` are **not applicable when their legacy
  tables/RPCs are absent** (the earlier owner inspection found them absent). Do not
  create retired intake/review schema just to make those migrations run.
- [ ] Public build-time settings: `NEXT_PUBLIC_SITE_URL` = the exact intended trusted
  normal origin, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
  Set the matching normal `/auth/callback` URL in that Supabase project's Site URL/
  redirect allow-list; recovery retains `next=/reset-password`. Rebuild when public
  settings change. No preview IP/Auth endpoint belongs in real hosted settings.
- [ ] Server-only billing names: `SUPABASE_SERVICE_ROLE_KEY`, `PAYOS_CLIENT_ID`,
  `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `OWNPATH_BILLING_RUNNER_SECRET`;
  server configuration `OWNPATH_BILLING_MODE`, `OWNPATH_PRO_PRICE_VND`, optional
  `OWNPATH_BILLING_SUPPORT_URL`. Do not expose keys via `NEXT_PUBLIC_*`.
- [ ] Provision an authenticated periodic server-side **POST** to
  `/api/billing/reconcile` with the runner secret, plus monitoring/retry ownership.
  No intended-host scheduler has been provisioned. The ten-second fake runner is
  local only; it is not hosted recovery acceptance.
- [ ] Separately authorize/accept real price/economics, merchant/channel/webhook,
  hosted entitlement/quota/ownership checks, and actual hosted AI availability,
  cost/quality and privacy before money. Current code acceptance fields and DB
  policy keep sales closed. OpenAI still requires its original loopback guard,
  `OWNPATH_OPENAI_LOCAL_ENABLED`, `OWNPATH_OPENAI_LOCAL_ORIGIN`, `OPENAI_API_KEY`,
  `OPENAI_MODEL`; this checklist does not enable hosted or paid calls.

Missing billing schema is an actionable setup error, not an inferred Free/Pro
success. Current reading/editing/renaming/deleting/exporting existing versions
does not call the billing-summary gate; new saved-version creation fails closed
until its quota migration is configured. No hosted SQL, Auth settings, user writes,
webhook registration or transfers were performed for this integration session.

Canonical catalog: `src/lib/billing/catalog.ts`. The migration deploys a tested
snapshot of its Free limits/version; orders freeze Pro benefits, duration, price,
channel and environment. Catalog changes require a versioned deployment updating
that enforcement snapshot, not editing purchased records.

Apply **only after separate owner authorization**, in order:

* `20261019_ownpath_cv_profiles_versions.sql`
* `20261021_ownpath_ai_reservations.sql`
* `20261022_ownpath_billing.sql`

Four additive billing tables: orders, verified normalized receipts, purchased
periods, order-linked support requests. Financial history has no cascading user/CV
deletion; account deletion nulls owner identity and prevents unowned fulfillment.
Old saved CVs remain accessible after downgrade; only creation is limited. No
retention duration, tax invoice or legally final refund policy is promised.

Browser roles have no direct financial-table or policy/reservation-table grants.
Authenticated safe summary/support RPCs derive the owner from `auth.uid()`.
Service-role-only `ownpath_billing_command` performs financial transitions.
Consistent owner/order/receipt locking and uniqueness provide one fulfillment per
order and one funding transaction per provider/channel/environment. Snapshot
triggers reject financial rewrites. External HTTP never runs inside SQL locks.

Free follows the DB-calculated Asia/Ho_Chi_Minh month. Pro periods use UTC and
`starts_at <= clock_timestamp() < ends_at`; distinct renewals append under the
owner lock. Expiry is independent of scheduling. Reservations bind an input
digest and original period; completed/pending/unknown operations count, failed
ones do not. Legacy IDs cannot be silently rerun. Lost responses reuse a tab-scoped
digest/ID (not source content); existing process-local Controls may return a result.
After that existing cache expires, durable completion returns
`completed_unavailable`, with explicit new-operation confirmation. No content cache
or automatic saving was introduced. Sign-out clears tab retry metadata.

Server-only configuration names (do not paste secrets into chat):
`OWNPATH_BILLING_MODE` (`OFF`, `LOCAL_FAKE`, `LIVE`),
`OWNPATH_PRO_PRICE_VND` (positive integer, no live default), `NEXT_PUBLIC_SITE_URL`,
`PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `OWNPATH_BILLING_RUNNER_SECRET`, optional
`OWNPATH_BILLING_SUPPORT_URL`. Fake-only `OWNPATH_BILLING_FAKE_ORIGIN` is loopback.
No buyer CV/JD/model output goes into financial metadata.

Before LIVE: accept the real price, merchant/channel setup, hosted migrations and
quota enforcement, hosted AI availability/cost/quality, configured return origin,
webhook and scheduler, support/operational ownership, and secret management.
**All hosted/live acceptance remains NOT RUN.** The app has no merchant onboarding
or administrative dashboard. Existing account-deletion policy/retention decisions
remain an owner gate.

## payOS and recovery

Official references checked: [API](https://payos.vn/docs/api/),
[Node SDK](https://payos.vn/docs/sdks/back-end/node/),
[webhooks](https://payos.vn/docs/du-lieu-tra-ve/webhook/),
[signature](https://payos.vn/docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature/),
[no separate test environment](https://payos.vn/docs/moi-truong-test/).

Native REST adapter, no new SDK dependency: fixed
`https://api-merchant.payos.vn`, one attempt, eight-second timeout, bounded body,
no redirects. Creation/webhook/lookup signatures use the documented payment-link
HMAC canonicalization, not the payout algorithm. Creation signs fixed return/cancel
URLs and the trusted amount/orderCode. Returned URLs must match the exact provider
HTTPS host/link path. Order codes are random 52-bit UUID-derived integers with DB
uniqueness, never timestamps alone.

Lookup verifies exact order code/link, total, amount paid, zero remainder, known
status and one exact full transaction/reference. Currency is established by the
VND payment-link protocol plus signed creation/webhook; lookup has no invented
currency/channel fields. Credential-bound HTTPS plus the immutable client-ID
channel fingerprint bind lookup to the expected channel/environment. The local
fake signs the same shapes. A signature-valid registration/unknown-order sample is
durably quarantined and cannot create Pro. Financial conflicts cannot overwrite
earlier receipts. Partial/multiple/malformed/unknown responses never grant.

Callback evidence is persisted before ACK. Database failure returns non-2xx.
Webhook, browser recheck and scheduled execution call one reconciliation function.
Order-level durable leases, attempts, next-attempt time and exponential backoff
(up to six hours) survive lost requests/processes. Expired checkouts remain eligible
for late verified recovery. Returns/cancels never declare payment or refund.
Known creation rejection/financial mismatch is quarantined. Once creation was
attempted, recovery only looks up that same code, never blindly creates another.
If uncertain creation resolves to an unpaid link without a checkout URL, it stays
reviewable rather than inventing a URL or new order. Paid lookup can still fulfill.

The intended host/scheduler is not provisioned. The supported execution entry is:

```text
POST /api/billing/reconcile
Authorization: Bearer <server-only runner secret>
```

Invoke periodically with a trusted scheduler; each invocation is bounded and uses
the same durable claim path (at most three jobs, often one). Do not publish the
secret in a browser command. The demo provisions a local-only ten-second runner.
**Hosted recovery is not operational or accepted.** No cancellation endpoint is
exposed in this UX; payment cancellation would not be a refund.

## Manual support/refund runbook

1. Use the owner-scoped order-linked request or configured support channel. Verify
   rightful requester and actual merchant/bank payment, order and purchased period.
2. Check previous confirmed references and uncertain transfers before doing
   anything. A request/approval is never displayed as money returned.
3. Process through the owner's separately approved merchant/bank method. Never
   issue another transfer because the first result is uncertain. This app makes
   no payout/refund request.
4. After external confirmation, use an authenticated, auditable operator database
   session (record the actual operator/ticket in `application_name` and reason) to
   call service-only `ownpath_billing_command('refund_confirm', jsonb)` with
   `id`, `reference`, `reason`, and explicit `revoke: true/false`. Record supporting
   evidence outside CV/JD storage. The operation requires an accepted payment,
   records timestamp/session actor/application/reference and rejects a different
   second transfer reference. Repeat the same confirmation idempotently.
5. Revocation is explicit; it never deletes CVs/history or resets another period.
   Future already-bought periods keep their purchased dates. Do not fabricate a
   refund confirmation to resolve a pending request. Actual execution is NOT RUN.

## Verification and identities

Evidence directory: `.factory/evidence/OWNPATH-BILLING-20261021/`.
`baseline/inventory.json` preserves 69 pre-edit files. `change-inventory.json`
records exact task paths/hashes and preservation comparison. `production-build.json`
and `demo-build.json` contain complete built-source inventories, SHA-256 identities,
build IDs and whether the isolated demo transformations were used. Production
builds use OFF and no fake transport. Tests/screenshots use synthetic inputs only.

Commands:

```sh
npm test
npm run lint
npm run typecheck
node --test e2e/billing/database.test.mjs
node scripts/ownpath-billing-demo.mjs --build-only
node e2e/billing/browser.mjs
node e2e/billing/recovery.mjs ownpath_billing_demo_<pid>
node e2e/billing/retry.mjs ownpath_billing_demo_<pid>
```

The browser commands require the running isolated demo. The recovery test advances
only local retry metadata to exercise faults without waiting through every backoff;
it does not grant a period directly. Recovery/retry tests send the launcher's local
SIGUSR1 operator signal to restart only its application child while the disposable
database/provider remain available. Database tests use real local PostgreSQL roles
and separate connections, not mocked locks. Expiry time travel changes synthetic
records only with a local PostgreSQL operator; the application cannot do this.

Final counts/build IDs and exact remaining verification caveats are recorded in the
billing checkpoint in `COMPLETION_HANDOFF.md`; logs and JSON are the authority.
Review is a bounded **self-review**, not independent approval. Prior preview/Classic
artifacts are historical only where source identity differs; new billing browser
evidence covers real extraction, quota-backed fixture AI, save and export. Live AI
quality/cost, actual money/refunds, hosted scheduler/migrations and public opening
are not verified by a local fake.
