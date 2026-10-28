# Normal application: Supabase / billing summary readiness

Prepared 2026-10-22. **No hosted migration, grant, settings change, user write,
payment or AI operation was performed.** This is not live-sales acceptance.

## Diagnosis and its limits

Normal `.env.local` targets `https://dvobeatqjgzydivbvifn.supabase.co` and normal
site `http://127.0.0.1:4317`, not either fictional preview. The public Supabase
URL/key are present. Billing mode is unset (therefore `OFF`); service-role,
merchant price and runner secret are absent. No secret values are recorded here.

Read-only requests to that **configured normal project**, with its public key and
no user session, produced:

| Probe | Result | Meaning |
| --- | --- | --- |
| `rpc/ownpath_billing_summary`, empty parameters | 404 `PGRST202` | Required summary function is absent from the exposed schema cache. |
| `ownpath_ai_requests`, `ownpath_ai_policy`, `ownpath_orders`, `SELECT … LIMIT 0` | 404 `PGRST205` | Reservation/billing relations are also absent from that cache. |
| `ownpath_experience_profiles`, `ownpath_cv_versions`, `SELECT id LIMIT 0` | 401 `42501` | Baseline tables exist and correctly deny anonymous table access. |

**Classification: incomplete database/schema readiness, not a reproduced UI/code
defect.** The known pending 20261021/20261022 migrations explain the missing
surface. Public-API diagnostics alone cannot distinguish physically absent SQL
objects from an unusually stale PostgREST cache: the owner's catalog inventory
below settles that before any DDL. Do not blindly reapply a migration to fix a cache.

The summary handler verifies the user, then calls the no-argument RPC using the
cookie-bound Supabase client. An RPC/setup error deliberately returns 503 without
a guessed plan. No session returns 401 instead. `OFF` and missing payment/service
keys **do not block summary reads**; those keys are not used in this branch.
The anonymous table denial is expected, **not** a reason to grant `anon` access
despite PostgREST's generic GRANT hint. Profile verification can work while billing
schema is incomplete.

No normal server was listening on 4317 during inspection, and no real user's
credentials/session were accessed. An authenticated normal-app 503 was therefore
not replayed end-to-end. Upstream missing-RPC evidence and focused handler tests
establish the failure path; actual hosted SQL contents/privileges and post-setup
authenticated behavior still need the owner's checks.

Evidence: `.factory/evidence/OWNPATH-NORMAL-BILLING-READINESS-20261022/`.

## 1. Owner prerequisites and inventory — read-only first

1. Confirm the intended project hostname above against the normal application's
   effective build-time public URL/key. The key must belong to that project.
   Never paste a service-role key, JWT, database password or CV into diagnostics.
2. Use the intended project's SQL editor with an authorized migration/admin role.
   Have a current backup and a maintenance/rollback owner. Ordinary browser
   `authenticated` credentials cannot install this schema.
3. Supabase prerequisites: `auth.users`, `auth.uid()`, `gen_random_uuid()` and
   `anon`, `authenticated`, `service_role` roles; the `public` schema must be
   exposed by the project's Data API. Do not create imitation Auth objects hosted.
4. Run **only the read-only inventory**:
   [`supabase/diagnostics/ownpath_billing_readiness.sql`](../../supabase/diagnostics/ownpath_billing_readiness.sql).
   It reads catalogs, column definitions, policies, triggers and grants; it does
   not read CV contents, create users or modify entitlements. `ROLLBACK` ends it.
5. Compare definitions to the exact migration files below. Optional CLI history
   is not conclusive if previous SQL was applied manually. Record file hashes
   and actual objects. If tables/functions/columns are partially installed or
   differ from these files, **stop and review that drift**; do not reset data,
   drop/recreate tables or conceal differences with `IF NOT EXISTS`.

## 2. Exact applicable migration sequence — owner action, not executed here

Apply only missing, reviewed current-product files, in this dependency order:

| File | Apply condition / expected result |
| --- | --- |
| `supabase/migrations/20261019_ownpath_cv_profiles_versions.sql` | Baseline only if genuinely absent. Both baseline tables are already visible in this project; **do not reapply** if their definitions match. Expect `id`, `owner_id`, `name`, `revision`, `payload`, timestamps, owner RLS and restricted version-column updates. |
| `supabase/migrations/20261021_ownpath_ai_reservations.sql` | If its reservation/policy tables and reservation/finish RPCs are absent. Creates `ownpath_ai_requests`, singleton `ownpath_ai_policy`, three-argument reserve and finish contracts. |
| `supabase/migrations/20261022_ownpath_billing.sql` | After the preceding prerequisites match, if this billing migration is absent. Creates financial/support tables, summary/support/command/plan functions, four-argument digest-bound reservations, saved-slot and immutable-financial triggers. |

For the presently observed surface, **20261021 then 20261022 are the expected
pending files**, subject to the catalog check. These scripts are not generally
rerunnable. The latter two already contain `BEGIN`/`COMMIT`: execute each complete
file, stop on error, and verify success before continuing. A failed transaction
must be rolled back, not continued statement-by-statement. The baseline file
does not contain a transaction; if it is needed on a truly empty project, apply
it as one transaction rather than leaving partial baseline tables.

Prefer the SQL editor in the confirmed project. If the owner instead uses psql,
use a private, correctly scoped libpq service/passfile, not credentials committed
to this repository. Prepared commands for the **two pending files only**:

```sh
PGSERVICE=ownpath_owner psql -X -v ON_ERROR_STOP=1 -f supabase/migrations/20261021_ownpath_ai_reservations.sql
PGSERVICE=ownpath_owner psql -X -v ON_ERROR_STOP=1 -f supabase/migrations/20261022_ownpath_billing.sql
```

Do **not** run a blanket historical `supabase db push`. In particular,
`20261020_legacy_draft_revision.sql` and
`20261020_review_rpc_submission_limit.sql` are conditional legacy repairs, not
prerequisites for this product. Do not recreate retired tables/RPCs to run them.

Migration 20261022 backfills period labels/end dates on existing reservation
rows; it retains their request IDs/states and does not rerun AI. Its saved-slot
trigger applies to new versions, not retroactive deletion of existing CVs.
Its catalog snapshot is Free **3 Scans / 1 Rewrite / 3 saved versions**, version
`2026-10-draft-1`; do not change limits or purchased records as a setup repair.
Both `billing_allow_fake` and `billing_live_accepted` default to **false**.
**Keep both false on the normal hosted project.**

## 3. Post-migration database and schema-cache checks

Re-run the read-only inventory. Required outcomes:

- All eight current-product tables are present with RLS enabled. Baseline CV
  tables have authenticated owner policies; browser roles have no direct grants
  on reservation/policy/financial/support tables. Anonymous CV-table reads stay
  denied. Never grant broad table access to fix the summary.
- `ownpath_billing_summary()` and
  `ownpath_billing_support_request(uuid,uuid,text,text)` are executable by
  `authenticated`, not `anon`/`PUBLIC`; they derive ownership from `auth.uid()`.
- Four-argument `ownpath_reserve_ai(text,text,text,text)` and three-argument
  `ownpath_finish_ai(text,text,text)` are authenticated-only. The old three-argument
  reserve overload deliberately rejects the old contract after 20261022.
- `ownpath_billing_command(text,jsonb)` is service-role-only, not a browser RPC.
  Security-definer functions must retain their trusted owner and empty
  `search_path`; do not replace them with caller-chosen owner/plan parameters.
- `ownpath_saved_slot` exists on CV inserts, plus all four financial immutable
  triggers. Financial history has no browser write path.

Only once these objects exist, inspect the actual singleton row (read-only):

```sql
begin read only;
select singleton, window_seconds, request_limit, concurrency_limit,
       unresolved_limit, billing_catalog_version, billing_free,
       billing_allow_fake, billing_live_accepted
from public.ownpath_ai_policy;
rollback;
```

Expect exactly one policy row, the reviewed catalog snapshot, and both billing
flags false. Do not create fake Pro orders/periods hosted to test the menu.

If SQL objects and privileges are correct but REST still returns `PGRST202` or
`PGRST205`, check Data API exposure and refresh **only** the schema cache. The
owner may issue `NOTIFY pgrst, 'reload schema';` after their reviewed setup;
this notification was **not** issued by the agent. Do not rerun DDL for this case.
If RPC now returns `42501`, compare function/schema privileges to the migration,
not the anonymous-table hint. If a dependency column/function is missing, finish
the reviewed dependency chain rather than loosening permissions.

An optional SQL-role check, using the owner's existing Auth UUID, is read-only:

```sql
begin read only;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"REPLACE_WITH_EXISTING_OWNER_AUTH_UUID","role":"authenticated"}', true);
select public.ownpath_billing_summary();
rollback;
```

This verifies SQL grants/shape/ownership selection, **not** real Auth cookies or
JWT validation. Use only a real chosen test account; do not insert an Auth user.

## 4. Normal application configuration and authenticated check

For plan display with purchases disabled:

```text
NEXT_PUBLIC_SUPABASE_URL=<this normal Supabase project's HTTPS URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<its public/publishable key>
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:4317  # normal local app; HTTPS on an intended hosted app
OWNPATH_BILLING_MODE=OFF
```

Set the matching normal `/auth/callback` in that project's Site URL/redirect
allow-list. Keep existing callback validation and confirmation policy; this
schema repair does not require changing them. `NEXT_PUBLIC_*` values are embedded
at build time: the owner must rebuild the intended normal app when changing them.
Never copy the preview's `.3:4348` Auth URL, fictional keys, special preview cookie
or callback transform into normal configuration.

With a real sign-in in that normal app, inspect Network for
`GET /api/billing/summary`:

- **200:** SQL-derived `plan`, quota/usage/period and owned transaction data;
  `mode: OFF`, `enabled: false`. Refresh usage/plan updates the shared menu label.
  Free is legitimate only if the database actually returns it, not as a fallback.
- **401:** user verification/session failed; check sign-in, proxy cookie refresh,
  matching project/public key and cookie origin. A service key cannot repair a
  browser session. Do not copy fictional-preview sessions into the normal app.
- **503:** RPC/setup/configuration/shape still unavailable; inspect SQL catalog,
  Data API error codes and server configuration. Keep the plan unavailable until
  confirmed. Do not substitute zero usage or assume Free/Pro.

The normal server was not started/restarted by this investigation. After setup,
the owner's authenticated normal-browser check remains required. Do not use Scan,
Rewrite, checkout, reconciliation or webhook POSTs as plan-readiness probes.

## 5. Payment readiness is separate and remains closed

`SUPABASE_SERVICE_ROLE_KEY` (matching this project, server-only) is required by
financial command/status/recheck paths, **not** by summary. Future payment setup
also needs server-only `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, a
separately reviewed live `OWNPATH_PRO_PRICE_VND`, runner secret/scheduler, webhook
verification, support destination and operational recovery ownership. None were
configured/tested hosted here. Never prefix secrets with `NEXT_PUBLIC_`.

Leave normal `OWNPATH_BILLING_MODE=OFF`, database acceptance flags false, and
`liveAcceptance` in `src/lib/billing/config.ts` unchanged. Do not copy the
illustrative 79,000 VND preview price into live configuration. Merchant keys or
an environment flag alone intentionally cannot open sales. Hosted AI guards,
model keys, transport, costs/privacy and live-sales acceptance are separate gates.

The isolated `http://127.0.0.3:4347` preview proves local SQL/fixture UI contracts,
not normal-project Auth/schema/payment readiness. Its database and cookie namespace
remain separate; its existing data and running services were not changed here.
