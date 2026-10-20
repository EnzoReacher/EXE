# Run the OwnPath CV workspace

## Current Scan & Rewrite journey

`/app` requires a pasted CV and target JD. Consent → **Scan CV** → explained
findings → rewriting instructions → **Rewrite CV** → complete editable CV.
There is no profile-confirmation or per-sentence approval prerequisite. Copy,
TXT, **Print / Save as PDF**, and optional saving never call AI. The sidebar has
Scan & Rewrite, Saved CVs and Account. Old profile/tailor/Translator routes lead
to `/app`; earlier saved profiles and versions remain viewable.

New saves use `schemaVersion: 2` in the existing version table's JSON payload:
original CV/JD, validated scan, instructions, language, complete edited document,
title and change notes. This payload format needs no additional schema migration.
The separate reliability migrations below are included but **NOT hosted-applied**:

- `20261020_legacy_draft_revision.sql`
- `20261020_review_rpc_submission_limit.sql`

See [reliability setup boundaries](RELIABILITY_REPAIR_EVIDENCE.md#owner-setup--remaining-gates)
before any separately authorized application. Publication does not apply them.
Reopened versions retain
revision-checked updates; initial save retries retain their snapshot ID.

## Owner setup

1. Install dependencies with `pnpm install --frozen-lockfile`.
2. Preserve the owner's existing `.env.local`. For a fresh installation only, copy
   `.env.example` and set the Supabase URL/publishable key and `NEXT_PUBLIC_SITE_URL`.
   Never use a service-role key in this application.
3. The owner has already applied
   **`supabase/migrations/20261019_ownpath_cv_profiles_versions.sql`** and confirmed
   both tables exist with RLS enabled. **Do not apply it again to that hosted project.**
   New independent local databases need the existing migration, not a new schema.
4. The owner has disabled **Confirm email** in the Supabase dashboard for immediate
   signup sessions. Application code does not modify provider settings. Keep PKCE
   and the exact recovery callback allowlist, including
   `http://127.0.0.1:4317/auth/callback?next=%2Freset-password` for this origin.
   Verified signup/signin go directly to `/app` with a new document; recovery goes
   to `/reset-password`; logout returns to `/`. A signup response without a session
   produces a configuration error rather than a protected-content redirect or
   confirmation claim.
5. Set `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:4317` locally, then run:

   ```sh
   pnpm dev --hostname 127.0.0.1 --port 4317
   ```

   Open `http://127.0.0.1:4317`. If this worktree's dev server already owns that
   port, use it; do not start a second server or stop someone else's process.

Missing tables produce a recoverable setup message; temporary retrieval errors
are not shown as empty accounts. New profile revisions are immutable rows.
Saved CV updates use owner identity plus an expected integer revision; conflicts
require reopening before retry. Version deletion does not delete its profile.

## Optional OpenAI configuration

Reuse the existing integration settings:

```dotenv
OWNPATH_OPENAI_LOCAL_ENABLED=true
OWNPATH_OPENAI_LOCAL_ORIGIN=http://127.0.0.1:4317
OPENAI_API_KEY=<your-server-only-key>
OPENAI_MODEL=<your-approved-Responses-strict-JSON-schema-model>
```

The inherited provider gate is **numeric-loopback HTTP only**, with an explicit
port and origin match. The model is supplied by the owner, never hardcoded.
Hosted provider enablement is outside this locally verified candidate. Do not
enable paid calls until live use and a bounded budget are separately authorized.
Without configuration, Scan returns a recoverable error and keeps both inputs.
Existing saved CVs can still be opened, edited, exported and saved without AI.

Required variable names from `.env.example`/current code:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
`NEXT_PUBLIC_SITE_URL` for Auth/storage. Optional AI uses
`OWNPATH_OPENAI_LOCAL_ENABLED`, `OWNPATH_OPENAI_LOCAL_ORIGIN`, `OPENAI_API_KEY`,
and `OPENAI_MODEL`. Never share key values or use service-role credentials.
For this task leave AI disabled. The owner finding “OpenAI is not configured”
matches the disabled/missing configuration boundary; it is recoverable.
Use an existing saved CV to test editing/storage without AI. The controlled
browser fixture below exercises the new complete journey without paid calls.
Live AI requires an owner-approved model, explicit paid-use/budget authorization,
matching loopback origin, and a separate live quality/latency/cost acceptance run.

Scan and Rewrite are separate explicit operations, each with one bounded
provider invocation. The reused transport can retry a transient request once.
Scan sends CV blocks and required JD; Rewrite also sends the current edited
base, original reference, validated scan, instructions and language.
Likely name lines, Contact-labelled sections and recognizable email/phone/URL/address
lines are excluded and retained in the final document. This conservative filter
is not complete anonymization: inspect other personal details before consenting.
Provider output is bounded/validated, not a guarantee that claims are true.

Limits: 24,000 CV/current-document characters, 500 source lines, 18,000 JD
characters, 4,000 instruction characters, 6,000 per AI replacement, 300 KB saved payload.
Requests time out after 45 seconds server-side/55 seconds client-side; existing
provider retries are bounded to two attempts. Failed/oversized inputs remain
editable; no content is silently shortened or replaced with demo results.

## Verification

For the authenticated visual candidate, after starting the existing fictional
fixture and compiled app described below, run:

```sh
pnpm exec playwright test --config=e2e/workbench-visual.config.mts
```

This includes the retained core journeys and visual/state/keyboard checks at
1440, 1024, 390 and 320px. Artifacts are written to
`.factory/evidence/OWNPATH-VISUAL-20261020/`. Result fixtures are test-only;
there is no production mock switch. See the evidence document for inspected
screenshots, print/PDF results and the focused UI verification scope.

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm test:ownpath:rls
```

RLS checks use the existing **local** Docker container `supabase_db_EXE`, create
the schema transactionally if absent, assert ownership/privileges, then roll back
schema and fictional data. They accept no hosted URL. This is actual PostgreSQL
policy evidence, not a mock.

### Compiled mocked browser demo (no paid calls)

Terminal 1: `node e2e/ownpath-fixture.mjs` (fictional Auth/REST on 4387).
Build with explicit fictional settings, overriding any private local file:

```sh
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:4387 \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=fictional-local-test-key \
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:4386 \
OWNPATH_OPENAI_LOCAL_ENABLED=false pnpm build
```

Start with the same four environment settings using
`pnpm start --hostname 127.0.0.1 --port 4386`, then run
`pnpm test:ownpath:browser`. This test-only fixture is not imported by the app;
Playwright intercepts Scan/Rewrite and blocks other external traffic; missing
configuration and owner-scoped saving exercise real app endpoints. The six
journeys cover core/edit/copy/TXT/save/reopen/conflict/print, configuration,
protected routes, long printing, verified signup and earlier saved formats.
Evidence goes under `.factory/evidence/OWNPATH-SCAN-REWRITE-20261020/`.
Rebuild with your intended environment before running a non-fixture application.

## Deliberate release limits

- Text intake only; TXT and formatted browser **Print / Save as PDF** export.
  No direct PDF download, DOCX or uploads. Browser print determines page count.
- CV wording can be English or Vietnamese. Untouched sections keep their original
  language; this release does not promise full-document translation.
- Explicit negation/uncertainty/other-person attribution detected by the guard is
  retained verbatim, including across languages. This conservative first slice
  checks exact source references/numbers and preserves unmodified lines, but does
  not establish semantic entailment for arbitrary model prose. Live quality still
  needs acceptance. Factual corrections can be made in the whole-text editor.
- Unsaved drafts live only in the mounted page. Browser reload/full navigation
  warns and loses unsaved work; navigating to another app page also loses unsaved
  work. No CV is placed in persistent browser storage or
  URLs. Expired-session recovery uses sign-in in another tab. Changing accounts
  clears the rendered workspace and draft before opening the new account.
- Saved lists currently display the latest 50 profiles/versions. Exact owned-ID
  reopening works independently of that list.
- Hosted Supabase acceptance and live OpenAI output quality/connectivity remain
  owner-run gates. The locally mocked demo is not production-readiness evidence.
