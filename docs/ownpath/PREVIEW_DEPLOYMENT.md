# Preview preparation — not deployed

## Compatible target

Use one Node.js 22 LTS server/container behind an HTTPS reverse proxy (or a
provider that explicitly supports Next.js **16.3.7** Node runtime and Proxy).
Installed Next deployment guidance confirms `next start` supports this app's
dynamic Server Components, Route Handlers and Proxy. **Not** static export,
static-only hosting or an unverified edge adapter. No new provider SDK is needed.
Extraction admission is process-local (two children per instance); size/deadline
limits apply independently on each instance. AI reservations now use atomic
PostgreSQL RPCs, but the inherited numeric-loopback AI guard remains unchanged.
Use a full repository/dependency installation: child parser scripts are not
verified in standalone/serverless output. Node 22 LTS must support `child_process`.
Configure the ingress to reject bodies above 5 MiB, enforce upload time/connection
limits and bound container memory/PIDs. A host with a lower cap (for example a
4.5 MB function limit) does NOT meet the advertised 5 MiB support: use a compatible
Node target, not an undocumented client-limit reduction. No hosting target has
been provisioned or accepted here. Next Proxy's 5 MiB + 1 buffer is not an ingress
rejection; the route explicitly rejects over-limit bytes before parsing.

Commands, from this repository with the intended preview environment configured:

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start --hostname 0.0.0.0 --port 3000
```

The broad listen address is for an **AI-disabled**, firewalled preview container,
not an authorized way to expose the local AI gate. Forward only through HTTPS.
Do not reuse the test build: public environment settings are baked into the bundle.
The browser fixture is test-only and must never be started on the preview host.

## Origin and Auth configuration (owner action, not performed)

Choose a **single stable owner-controlled HTTPS preview origin**, no path/query.
The actual preview hostname is not supplied and remains a setup gate. Let `O`
mean that exact origin; `https://ownpath-preview.example` is a reserved illustrative
origin only, not a deployed service. Set the following exact settings once `O`
is chosen (do not use wildcards or untrusted forwarded-host values):

- App `NEXT_PUBLIC_SITE_URL`: `O`.
- Supabase Auth **Site URL**: `O`.
- Supabase Auth **Redirect URLs**: `O/auth/callback` and
  `O/auth/callback?next=%2Freset-password`.
- For the illustrative origin, those paths expand to
  `https://ownpath-preview.example/auth/callback` and
  `https://ownpath-preview.example/auth/callback?next=%2Freset-password`.
- Keep PKCE code exchange through `/auth/callback`. Recovery must return to
  `/reset-password` in the browser that requested the link. Don't bypass verified
  identity checks. Current immediate signup expects **Confirm email disabled**;
  if an owner intentionally requires confirmation, accept the current explicit
  no-session configuration error rather than claiming this journey is certified.
- Test password recovery/mail delivery under the chosen provider settings; local
  controlled tests do not certify hosted mail, Auth hooks or password policies.

Required variable **names only**: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`.
No service-role key, database URL or real tokens belong in app browser settings,
source, screenshots, logs or this checklist. Preserve private local configuration.

## Database setup

Required current-product migration:
`supabase/migrations/20261019_ownpath_cv_profiles_versions.sql` (Supabase Auth
schema/roles prerequisite). Owner reports it already applied hosted with basic
save/reopen observed: **do not apply again**. Verify RLS/privileges using the
two-account checklist below; table presence alone is not sufficient acceptance.
No migration is needed for `templateId` in the existing JSON payload.

New current-product AI prerequisite, **NOT applied hosted**:
`supabase/migrations/20261021_ownpath_ai_reservations.sql`. Owner review/application
is needed before even local paid Scan/Rewrite; missing RPCs fail closed. It adds
private usage/policy tables and session-derived atomic reserve/secret-ticket finish
RPCs. No service-role key is introduced. Defaults: 12 requests/rolling hour/owner,
one in-flight; unknown outcomes hold five minutes and still count. These are count
controls, not exact spending limits. Two unresolved unknowns block further AI until
an operator verifies/reconciles terminal outcomes; expiry cannot accumulate unlimited
uncertain jobs across quota windows. Never reset/delete request IDs to recover.
Hosted RPC/grant/concurrency acceptance remains
unexecuted; local PostgreSQL evidence is not hosted Supabase acceptance.

`20261020_legacy_draft_revision.sql` and
`20261020_review_rpc_submission_limit.sql` are **NOT APPLICABLE** to the inspected
hosted schema: legacy tables and RPCs are absent. Retain history; don't create
legacy tables or run the whole SQL directory. Repairs are conditional on an
existing legacy subsystem and separate authorization.

## AI limitation — deliberately unchanged

`src/lib/experience-translator/server/openai.ts:configuration` requires an explicit
numeric-loopback **HTTP** origin with port. `requestcontrols.ts:requestBody` checks
Host/Origin/same-origin; `scan-rewrite/server.ts` also checks the trusted site origin.
A hosted HTTPS origin cannot satisfy that gate, even if an API key is supplied.
Setting a loopback origin on a hosted server is not a supported workaround.

Keep AI disabled and its credentials absent for preview. Optional future variable
names are `OWNPATH_OPENAI_LOCAL_ENABLED`, `OWNPATH_OPENAI_LOCAL_ORIGIN`,
`OPENAI_API_KEY`, `OPENAI_MODEL`; they do **not** enable hosted AI safely today.
Any remote-provider change requires separate security/budget/operations approval,
distributed controls if needed, and live acceptance. No production mock fallback.
Scan/Rewrite must show configuration feedback and preserve inputs. Auth, account,
navigation and existing synthetic saved CV editing/export/storage can be tested.
**Live OpenAI acceptance: NOT RUN.**

## HTTPS and private responses

Terminate TLS at the trusted proxy, preserve the canonical origin and cookies,
and prevent public access to the underlying HTTP port. Verify session-cookie
behavior under HTTPS and that auth redirects never fall back to another host.
Do not cache authenticated responses or Set-Cookie at a CDN. Preserve the app's
`private, no-store, max-age=0` headers for APIs/workspace and Supabase session
refresh headers; avoid cache-everything rules. Auth pages and personalized landing
are dynamic: do not cache their HTML/RSC across users. Keep security/no-referrer
headers; verify production responses at the proxy, not just local Next output.
No CV content or tokens in access/error logs. Use synthetic data only until owner
acceptance and retention/operations decisions are complete.

## Owner-run hosted ownership checklist — NOT EXECUTED

Use two owner-created **synthetic** accounts in separate browser profiles. Do not
send tokens in chat. Test only on an explicitly authorized project/environment.

1. A signs in and opens its own synthetic saved CV (or runs Scan/Rewrite later
   under separate AI authorization). Edit and save it; observe **CV saved.** and
   record its record ID locally. Reload, sign out/in and reopen; compare text/title.
   For AI-disabled setup with no saved CV, use DevTools Network's authenticated
   `/api/cv-review/saved` POST with a synthetic schema-v2 payload copied from
   `e2e/completion.spec.ts` (including a locally generated UUID), not a real CV.
2. A renames it, saves and reopens; then makes an unsaved edit in a second tab.
   Save from the first tab, then try the stale second tab: conflict, edits retained.
3. B must not list A's CV or open `/app/cvs/<A-record-id>`; inspect both the UI and
   `/api/cv-review/saved?id=<A-record-id>` response in B's browser.
4. In B's **own** DevTools/REST client using only B's session and project publishable
   key, request `/rest/v1/ownpath_cv_versions?id=eq.<A-record-id>&select=*`.
   Expect no record (typically `[]`). PATCH a harmless synthetic title and DELETE
   that ID with `Prefer: return=representation`; expect denial or zero returned
   rows, **never a mutated record**. Repeat for any linked experience-profile row.
   Do not use service-role credentials. Keep tokens local; never screenshot headers.
5. Recheck A: text/title/revision and record must be unchanged after B's attempts.
   Test account switching/logout clears the previous workspace and late responses.
   A can delete its own synthetic version; B still cannot access it.
6. Save/cancel display name, reload/re-login, independent password visibility,
   verified password change/recovery, and logout. Record actual PASS/FAIL and
   neutral error categories only. No hosted gate is PASS until executed.
