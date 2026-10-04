# M11B.1 — Local browser acceptance harness

**Date:** 2026-10-04

**Branch:** `codex/exe-web-app-m11b1-browser-acceptance`

**Exact published M11B base:** `64b0dc9e0c138ae31ed0eda102a783f0db9137b5`

Engineering/test tooling for fictional local data. Automated decisions are synthetic fixtures, not human expert approvals, owner-review evidence, CP2 evidence, or release approval. Product approval wording remains **“Approved by a team-approved expert after reviewing submitted proof.”** This does not authenticate a certificate with its issuer.

## Requirements and command

- Linux, Node 24, pnpm 11.25.0, installed project dependencies, `cp` supporting `--reflink=auto`, and writable `/tmp/opencode` with room for a temporary copy of installed dependencies/application/browser output.
- The existing local Supabase stack must already be running. The harness uses only its loopback public Auth/Storage/API endpoints and fixture SQL via `docker exec -i supabase_db_EXE psql`. Docker access and `psql` inside that existing container are required. It never starts, stops, resets, migrates, or configures containers/Supabase.
- Existing M1–M11A migrations, including `20261006` and `20261007`, and private buckets must already be applied. Do not reapply CREATE migrations or reset the database to run this suite.
- Local Auth signup must yield sessions for temporary `example.invalid` accounts; confirmation-required signup is a blocker, not a reason to add an auth bypass.
- Untracked `.env.local` must contain only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from that local stack. Public publishable keys or local `anon` JWTs are allowed; service-role/secret keys are rejected. `.env`, `.env.development` and `.env.development.local` are blocked to avoid extra Next environment settings. No secret is required.
- Cached Chromium compatible with **`@playwright/test` 1.61.1** (revision 1228), with its native libraries, must already exist. No browser installation/download occurs in this command. Missing cache/library failures stop before fixtures/server creation; arrange the compatible local browser explicitly, then retry. The dependency is pinned because Vitest/jsdom cannot exercise real browser downloads, focus, layout or local auth, and this version matches the available cache.
- Default application URL: `http://127.0.0.1:3111`. Optionally set `E2E_APP_URL` to another free HTTP loopback origin. Confirm the parsed hostname is exactly `127.0.0.1`, `localhost`, or `[::1]`; no username/password, path other than `/`, query or fragment. HTTPS, `0.0.0.0`, hosted origins and lookalike hostnames fail closed. Supabase follows the same origin rules. An occupied app port is a blocker; the suite does not reuse or terminate someone else's server.

```bash
pnpm test:e2e:local
```

This command is separate from `pnpm test`, `pnpm review:verify`, and CI. Ordinary checks never start browsers, a web server, or Supabase. The harness checks configuration/cache/local health, copies the real app and installed dependencies to a unique `/tmp/opencode/exe-browser-*` directory, provisions synthetic fixtures, starts its own loopback Next.js **Turbopack development server**, runs one sequential browser journey, stops its own process group, verifies cleanup, and removes its temporary directory. No product routes or authentication code are substituted. Next configuration and source are copied intact; server caches/logs also stay temporary. Dependency copying preserves pnpm relative links and requests copy-on-write when supported.

## Automated fictional flow

1. Provision unique owner, active team-approved assigned expert, ordinary user, and a second active **unassigned expert**. Emails use a per-run UUID and `example.invalid`; passwords are ephemeral in process memory/environment and never reported.
2. Real keyboard sign-in from `/assessment`; open the real owner workspace. Check invalid claim submission announces an error, focuses the first invalid field, and creates no claim.
3. Generate synthetic DOCX CV and PNG proof in memory; upload through the real UI. No portfolio is needed for this required-proof journey.
4. Use keyboard selection/text/buttons to choose source/proof/expert, propose bounded long synthetic skill/wording, save and submit. Confirm pending review has no version/export.
5. Non-expert UI is unavailable; unassigned expert queue is empty. Both are denied selected claim, evidence and decision requests. Anonymous private endpoints deny access.
6. Assigned expert sees only the fixture claim, downloads/reads synthetic PNG bytes, and records a clearly synthetic automated exact-wording decision with acknowledgement. Approval alone creates/accepts no version.
7. Owner creates a candidate, checks candidate DOCX/print rejection, reviews the immutable snapshot and explicitly confirms acceptance. Accepted controls become available.
8. Download DOCX/TXT via browser events, read bytes in memory and delete temporary downloads. TXT equals the saved snapshot exactly; DOCX text has the same logical wording and the exact approved statement. Inspect DOCX ZIP parts for forbidden proof/expert/account/path/token/decision metadata. Attachment filenames are constrained to safe characters.
9. Open authenticated private print view; check exact saved text, accessible print action and visible focus. This is browser **Print / Save as PDF**, not a generated PDF download. The suite does not open the OS print dialog or produce a PDF.
10. Cross-owner export and print return the same neutral unavailable response as missing resources; anonymous export/print are denied.
11. Withdraw/delete proof through the owner UI; fresh export/print fail. A previously loaded stale download action announces safe unavailability. Downloads already made are not recalled.

## Basic browser usability and privacy

- Accessible labels/roles identify key owner/expert controls; keyboard text entry, selection, checkbox acknowledgement and action activation are exercised. Native file chooser automation supplies in-memory synthetic bytes.
- Announced invalid-form failure, first-invalid focus, visible primary-action focus, no uncaught app-page errors, and no attempted non-loopback browser request.
- Check page overflow and visible action bounds at **320, 375, 768, 1024 and 1440px**, including long synthetic labels, wording and filenames; owner/expert/version controls and print text are checked at relevant states.
- Browser HTTP/WebSocket interception permits only the exact configured app/Supabase origins; service workers are blocked. Node fixture HTTP calls reject other origins and redirects. Child environments are explicitly restricted to local public settings/tool paths; no inherited private credentials are forwarded.
- No screenshots, traces, videos, raw error dumps or fixture-content test logs. The focused reporter emits fixed steps, sanitized assertion codes and source-line numbers only. Server output is suppressed. Browser download files and Next caches are temporary and removed; no generated personal documents enter Git/public directories.

These checks are not a screen-reader evaluation, full accessibility audit, visual design judgment, owner usability finding, external-editor fidelity review or print-pagination review. They do not complete any manual checklist.

## Cleanup boundaries

Cleanup knows only accounts generated in the current process. It withdraws this run's registered evidence, lists/removes only those new account prefixes in `cv-private`, `credential-private`, and `portfolio-private` (including upload-orphan objects), verifies no objects remain, then deletes only the exact generated auth ID/email pairs, owner first, and verifies absence. Account cascades remove fixture metadata/claims/decisions/versions/expert profiles. No table truncation, unrelated ID deletion or stack reset.

Success, caught failures, SIGINT and SIGTERM use the same cleanup and owned-process shutdown. Cleanup failure is a failing suite result, never a pass. SIGKILL, machine failure or an unreachable local stack can prevent completion; investigate locally using only the affected run's identifiers before retrying. Identifiers/private paths are not dumped to reports. Temporary directories are deleted only by the invocation that created them.

## Observed regression and remaining gates

The browser journey found horizontal overflow at 320px from credential-workspace grid/fieldset intrinsic widths. The narrow fix scopes `minmax(0, 1fr)` tracks and `min-inline-size: 0` fieldsets to `.credential-workspace`; it changes no lifecycle/authority/schema. Real-browser width assertions pass with long fixture values.

Chromium's native image preview raised a sandbox/opaque-origin `SecurityError`. Proof security headers were preserved; the suite uses the existing private **download** review path and verifies actual bytes. Native inline-preview compatibility remains a manual follow-up. An isolated Webpack experiment returned CV upload HTTP 500; the final harness uses the normal Turbopack server and passed uploads. This is not a claim of Webpack support.

**Still pending:** M11A manual owner/browser/accessibility review; M11B actual print/PDF pagination and external document-editor review; expert-role/privacy/backup/retention policy approvals; CP2 collection/review and broader product validation; owner approval for merge/deployment/release. No PR, merge, deployment or live app publication occurs. See the [actual acceptance record](M11B_1_LOCAL_BROWSER_ACCEPTANCE_ACCEPTANCE.md).
