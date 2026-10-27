# Run the OwnPath CV workspace

## Current Scan & Rewrite journey

`/app` starts with a compact PDF/DOCX upload and a pasted target JD. Extraction
fills a collapsed **Review extracted text** editor without AI or saving; opening it
is optional. Existing saved text remains editable, and extraction errors offer an
explicit manual-correction path. **Scan CV** → first-live-send confirmation → explained
findings → rewriting instructions → **Rewrite CV** → complete editable CV.
There is no profile-confirmation or per-sentence approval prerequisite. Copy,
TXT, **Print / Save as PDF**, and optional saving never call AI. The sidebar has
Scan & Rewrite, Saved CVs and Account. Old profile/tailor/Translator routes lead
to `/app`; earlier saved profiles and versions remain viewable.

New saves use `schemaVersion: 2` in the existing version table's JSON payload:
original CV/JD, validated scan, instructions, language, complete edited document,
title, `templateId` and change notes. Classic is the only available template;
legacy/missing identifiers use Classic. Content and Scan/Rewrite contracts do not
depend on presentation. This payload format needs no additional schema migration.
The separate reliability migrations below are **conditional legacy repairs, NOT
APPLICABLE to the inspected hosted schema**:

- `20261020_legacy_draft_revision.sql`
- `20261020_review_rpc_submission_limit.sql`

Owner preflight found `public.cv_drafts`, `public.analysis_runs`,
`public.review_shares`, `public.expert_reviews` and relevant legacy RPCs absent.
Do not run these files there, create legacy tables, or apply the entire historical
migration directory. Retain history; review repairs only for a database containing
that legacy subsystem. Required current-product setup is step 3 below.
Reopened versions retain
revision-checked updates; initial save retries retain their snapshot ID.

## Owner setup

### Keyless isolated local preview

From this worktree, with installed dependencies and the cached Playwright Chromium:

```sh
pnpm preview:local
```

Open **http://127.0.0.2:4327** once the command prints “Local preview ready”. No
OpenAI key, hosted Supabase setup, owner password or quota migration is needed.
`127.0.0.2` is a separate loopback host: the owner's `127.0.0.1:4317` cookies are not
sent to it. The existing 4317 server is not used or stopped.

The command reserves/checks preview ports **4327/4328 on 127.0.0.2** and the private
application port **4329 on 127.0.0.1**, refusing occupied ports without killing them.
It copies only application source/configuration into a fresh directory under
`/tmp/opencode/ownpath-local-preview-*`, links installed dependencies, and creates a
separate **production build** there. No private env files, normal `.next`, local
profiles, hosted credentials or permanent user uploads are copied. Three Auth
cookie-option insertions apply only to that disposable copy to give it a dedicated
`ownpath-local-preview-auth` namespace. Child environment is explicitly synthetic;
OpenAI is disabled and its key/model are empty. No dependency download occurs.

A loopback-only gateway supplies exact fixed Scan/Rewrite responses **outside the
product**, while extraction and save/reopen use actual application handlers against
the fictional Auth/in-memory REST fixture. The compiled app itself has no mock
provider or preview switch; its direct AI endpoint still fails truthfully when
OpenAI is absent. Normal auth, quota and provider guards are unchanged. The gateway
substitutes transmission metadata only for its own simulated requests; the normal
disclosure endpoint always identifies OpenAI/external transmission. The persistent
amber **Local preview · Simulated AI · Fictional data** strip is outside the
workspace/print document. A preview-only CSP restricts browser connections to the
preview and fictional Auth origins. Production frame/security headers are unchanged.

Use **Samples & instructions** in that strip, or these local files:

```text
.factory/evidence/OWNPATH-PREVIEW-20261021/samples/sales-cv.pdf
.factory/evidence/OWNPATH-PREVIEW-20261021/samples/sales-cv.docx
.factory/evidence/OWNPATH-PREVIEW-20261021/samples/target-job.txt
.factory/evidence/OWNPATH-PREVIEW-20261021/samples/rewrite-instruction.txt
```

1. Upload either supplied CV through **Select file**. Wait for actual extraction;
   **Review extracted text** is optional. Do not change the source for this fixed scenario.
2. Copy/paste the exact JD (the strip has a Copy JD action):

   ```text
   Required: Help customers select products.
   Required: Maintain accurate stock records.
   Preferred: Negotiate supplier contracts.
   Preferred: Use accounting software.
   ```

3. **Scan CV**. Expand source details: supported customer service, unclear stock-record
   support, excluded manager-owned negotiation and software not demonstrated.
4. Enter exactly **`Keep it concise. Preserve dates and attribution.`**, leave English,
   and choose **Rewrite CV**. Two wording changes preserve all sections/dates/facts.
5. Edit the complete Classic CV, copy/TXT, **Print / Save as PDF**, optionally save
   and reopen. Storage is isolated in memory and resets when the command stops.

Known limits: **one fixed sales scenario**, two actual extraction snapshots (PDF and
DOCX), exact JD/instruction/English/Scan/base. Other inputs, modified Rewrite bases
or translation requests return a helpful mismatch error, not fabricated success.
This is not model-quality, latency/cost or hosted security evidence. Use fictional
data only. After manual output edits, exports/save still work, but another simulated
Rewrite may be unsupported. Ctrl+C closes only owned preview services/process groups
and removes the private build; generated synthetic sample/evidence files remain.

Recovery/delay/malformed/late-reply controls exist only in the browser test harness,
not the normal preview screen or production routes:

```sh
pnpm exec playwright test --config=e2e/owner-preview.config.mts
```

### Normal Auth/storage setup (not required for the isolated preview)

1. Install dependencies with `pnpm install --frozen-lockfile`.
2. Preserve the owner's existing `.env.local`. For a fresh installation only, copy
   `.env.example` and set the Supabase URL/publishable key and `NEXT_PUBLIC_SITE_URL`.
   Never use a service-role key in this application.
3. The owner has already applied
   **`supabase/migrations/20261019_ownpath_cv_profiles_versions.sql`** and confirmed
   both tables exist with RLS enabled. **Do not apply it again to that hosted project.**
   Basic owner save/reopen was manually observed; full hosted ownership enforcement
   remains owner-run. New independent local databases need this migration (and
   Supabase Auth roles/schema), not the unrelated legacy migration chain.
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

The normal workspace has one Scan action, not a permanent consent checkbox. Its
short disclosure opens accurate details. Before the first external Scan/Rewrite in
an open workspace, a native accessible **Send / Cancel** dialog names OpenAI and the
CV/JD/current-draft/instruction purpose. Cancel sends no AI request. Acknowledgement
lives only in component memory, ends on close/remount/sign-out, and is compared with
fresh provider/purpose/transmission metadata before every operation. No persistent
blanket flag is stored. The isolated preview explicitly says no external model is
contacted and does not request transmission consent for simulated responses.

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
provider attempt and no automatic retries. Before provider work, the current
product requires `20261021_ownpath_ai_reservations.sql` (owner-run, NOT applied
hosted here). Missing quota RPCs fail closed; extraction/Auth/Account stay usable.
This additive migration is separate from the conditional legacy repairs above.
Default per verified owner: 12 actions per rolling hour, one pending/unknown
operation. Settings live in the server-only `ownpath_ai_policy` row; a trusted
database operator may configure its window/count/concurrency within SQL bounds.
Reservations are atomic across instances, retain duplicate IDs permanently, and
store no CV/JD, filenames or provider output. Completed/failed attempts still count.
Uncertain remote outcomes hold admission for five minutes; local timeout is NOT
confirmed remote cancellation or a billing stop. Expiry permits a later *new* ID,
never replay of an old ID. A count quota is not a money budget or a guarantee
that an uncertain remote job has stopped; repeated unknowns still consume quota.
To avoid accumulating uncertain remote work across windows, two unresolved unknown
outcomes (configurable `unresolved_limit`) stop new AI requests until trusted owner
reconciliation. Expiry alone never erases that cumulative safety bound. Independent
editing/extraction/export remain available. A database operator may mark an old
unknown `completed`/`failed` **only after verifying its remote terminal outcome**;
retain its row/request ID and original timestamp. Do not delete rows, reset quotas,
or infer cancellation from a timeout. If termination cannot be established, keep AI
blocked, with the explicit owner-reconciliation message rather than silent retries.
The inherited process-local backstop (12 starts/minute, two active) remains an
additional throttle, not the distributed quota or an exact spending limit. The
retired `/api/cv-review/organize` and `/review` endpoints return authenticated 410
instead of providing alternate paid paths. Earlier saved records remain readable.
Scan sends CV blocks and required JD; Rewrite also sends the current edited
base, original reference, validated scan, instructions and language.
Likely name lines, Contact-labelled sections and recognizable email/phone/URL/address
lines are excluded and retained in the final document. This conservative filter
is not complete anonymization: inspect other personal details before consenting.
Provider output is bounded/validated, not a guarantee that claims are true.

Limits: 24,000 CV/current-document characters, 500 source lines, 18,000 JD
characters, 4,000 instruction characters, 6,000 per AI replacement, 300 KB saved payload.
Requests time out after 45 seconds server-side/55 seconds client-side. Failed/oversized inputs remain
editable; no content is silently shortened or replaced with demo results.

## Upload resource/privacy boundary

- PDF and DOCX only, **5 MiB (5,242,880 bytes)**; no DOC, OCR/images or encryption.
- Raw binary POST, not unbounded multipart parsing. Both declared length and
  streamed bytes checked; body read deadline 10s. Next Proxy buffers at most
  **5 MiB + 1 byte** so truncation cannot disguise an oversized request as valid.
- PDF: signature plus actual parser, at most 20 pages. DOCX: bounded central ZIP
  directory, at most 256 entries, 4 MiB per uncompressed entry, 16 MiB aggregate,
  bounded actual inflate/CRC and required Word package/content type. No macros,
  path extraction, XML entities or external resource following. Mammoth raw text
  deliberately loses list markers/formatting; the editable text is authoritative.
- Output at most 24,000 characters and 500 lines, never silently truncated. Empty,
  image-only, corrupt and encrypted documents fail with paste/replace recovery.
- A fresh child Node process per extraction, killed with SIGKILL after 12s or
  cancellation; admission released only after process close. Two children per app
  instance; each has a 128 MiB V8 **old-space** limit. Young-space/native allocations
  are additional: this is **not a total heap or OS/native RSS ceiling**.
  Parent/child use memory only, no temporary files, original storage, filename
  paths, HTML rendering or AI. The child inherits no application credentials.
- Deploy only on a full Node server with this repository's `scripts/` and installed
  dependencies available to `next start`. Not verified for standalone/serverless
  packaging or Edge. Use host/container memory/PID/connection limits for aggregate
  native-memory protection; process isolation is not an OS filesystem sandbox.
- Explicit Save can persist normalized text/results through existing owner storage;
  selecting a file sends bytes to the app server for transient extraction only.

## Verification

New intake checks (synthetic only):

```sh
node scripts/check-cv-intake.mjs
node scripts/check-ai-reservations.mjs
pnpm exec playwright test --config=e2e/intake.config.mts
```

Parser checks create fictional fixtures under `.factory/evidence/OWNPATH-INTAKE-20261021/`.
They require Playwright Chromium and Python PyMuPDF for the encrypted fixture.
Quota checks create and drop a dedicated new synthetic database in the fixed local
`supabase_db_EXE` container; refuse an existing database and never accept a hosted URL.

Historical Classic/landing checks use the separate 4386/4387 fixture in a disposable
application copy (not the 4327 owner preview). Retain their unchanged evidence; do
not compile fictional settings into this worktree's normal `.next`. Their commands:

```sh
pnpm exec playwright test --config=e2e/completion.config.mts
node scripts/check-classic-pdfs.mjs
```

The PDF checker requires Poppler (`pdfinfo`, `pdffonts`, `pdftotext`); browser tests
write only synthetic PDFs/expected text under
`.factory/evidence/OWNPATH-COMPLETION-20261020/`. Use `pdftoppm` to render the pages
for actual visual review too; programmatic checks do not certify visual quality.
See [completion evidence and remaining gates](COMPLETION_HANDOFF.md) and the
[prepared preview plan/hosted owner checklist](PREVIEW_DEPLOYMENT.md).

Historical authenticated visual checks likewise require that separately isolated
4386/4387 fixture, not the current owner preview:

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

### Current compiled mocked walkthrough (no paid calls)

Use **`pnpm preview:local`** and the 4327 owner-preview instructions above. The
command handles its own fictional services, production compilation and cleanup in
an isolated source copy. Then run `pnpm exec playwright test --config=e2e/owner-preview.config.mts`
for affected acceptance. Do not use the older manual fictional `pnpm build` recipe
in the owner's worktree: it overwrites normal `.next` and is superseded for this
walkthrough. Earlier 4386/4387 tests remain test-only source/evidence, not an alternate
production demo mode; their broader compiled suites were not rerun in this task.

## Deliberate release limits

- PDF/DOCX-first intake with editable review/manual recovery; TXT and **Print / Save as PDF**
  export. No direct PDF download or DOCX export. Browser print determines page count.
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
