# M15 follow-up — authenticated owner entry

Date: 2026-10-06. Branch: `codex/exe-m15-auth-handoff-fix`.
Base: `4f8bb429919a60eb6b50bd913ddc8ae4550a15ba`. Completed M15 work and its database migration are retained.

## Findings

The owner reported valid local Auth responses followed by a cleared form that stayed on standalone Sign in. This execution workspace has no running Supabase stack or Docker and cannot reach the owner's laptop. Its older source snapshot was left untouched; the follow-up checkout's complete base tree was verified against GitHub's M15 tree.

The browser helper already uses `@supabase/ssr` cookie persistence; the installed package awaits cookie writes before successful password sign-in resolves. M15 also already has a Next.js 16 `src/proxy.ts` session-refresh layer. A missing proxy or a need to substitute localStorage was not established.

Three application gaps were identified: standalone authentication issued `router.replace("/assessment")` immediately followed by `router.refresh()`, account-entry pages never checked an existing identity, and assessment unconditionally rendered another sign-in form. The first sequence combines navigation with a refresh of router state from before the authentication transition. The latter two gaps explain how authenticated owners can continue seeing misleading sign-in UI.

The regression-only [baseline run 37407419870](https://github.com/EnzoReacher/EXE/actions/runs/37407419870) ran unchanged M15 application code against disposable local Supabase and Chromium. Real Auth succeeded and navigation reached assessment, but the new regression failed with `SIGNED_IN_WORKSPACE_STILL_SHOWS_SIGNIN`. All original account/core/credential journeys passed; 331 unit tests, lint, typecheck, production build, and database policy checks also passed. This establishes the UI/coverage defect. The exact laptop URL stall was not reproduced on the clean runner, even with delayed router requests; a routing race remains an explanation for that reported symptom, rather than a proven observation from CI.

## Changes

- Successful standalone password sign-in or immediate-session signup replaces the document with `/assessment` after Supabase returns a session. This discards anonymous router state and sends the cookie on the first server request. Missing-session responses retain the form and generic failure message.
- Account-entry pages verify the request identity with Auth and redirect authenticated visitors to assessment. Request cookies are read even in builds without configuration, so these pages remain dynamic.
- Assessment verifies the owner before rendering and contains no sign-in form. Signed-out private-page requests redirect to Sign in. API endpoints retain their own authentication/ownership checks and JSON denial contracts.
- The existing proxy preserves refresh cache headers and cookie updates, including deletions on redirects. The public confirmation callback and selected public review links remain accessible.
- Regression coverage clicks the standalone button with cold and previously visited routes, delays real RSC requests, checks actual workspace content and auth cookies, calls private APIs immediately and after reload, revisits sign-in/sign-up, and checks sign-out, cookie removal and private-page/API denial. All accounts are generated synthetic fixtures and cleaned up; no owner credentials are stored.
- The follow-up branch runs the existing full disposable backend/browser acceptance workflow as well as Quality. Unit coverage checks document navigation, server identity verification, account-entry redirects, missing-session responses, and request/response cookie propagation.

No dependency, database, migration, RLS or Storage-policy change is required. Full results are available in GitHub Actions for this branch and the final engineering handoff. Genuine integration checks run in CI; they do not establish a reproduction on the owner's computer.

## Pull and retest

Stop the old development server, then run these commands in the existing checkout:

```sh
cd ~/EXE
git fetch origin
git switch codex/exe-m15-auth-handoff-fix
git pull --ff-only origin codex/exe-m15-auth-handoff-fix
pnpm install --frozen-lockfile
pnpm review:verify
pnpm test:e2e:local
pnpm dev
```

Reuse the existing Supabase stack and `.env.local`. No database reset or new migration is needed. Open `http://127.0.0.1:3000/sign-in`, sign in with a local test account, verify the assessment heading with no sign-in form, refresh, revisit Sign in, and sign out. After sign-out, assessment must return to Sign in and private APIs must return 401. Keep using the same hostname throughout the flow because Auth cookies are scoped to the application host.
