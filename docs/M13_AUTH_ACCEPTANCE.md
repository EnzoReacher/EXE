# M13 — Local landing and account acceptance

## Current acceptance — M15, 2026-10-06

**PASS.** Implementation `79a375da4c905c0a2c7790a55dff3fd90614bf00` passed the genuine account journey in [combined run 37397936139](https://github.com/EnzoReacher/EXE/actions/runs/37397936139) against a disposable loopback Supabase stack in CI. Landing navigation, five-width bounds, confirmation-mismatch announcement/focus, synthetic signup, session persistence/reload, generic wrong-password/unknown-account failures, fresh signin and anonymous denial all passed. No external browser requests or uncaught page errors were observed; current-run accounts/private objects were cleaned up and verified. Manual owner review and real email confirmation/delivery remain separate.

Use [the current M15 branch, additive migration and testing handoff](M15_COMPLETE_WORKSPACE.md). The original M13 instructions and engineering evidence below are historical.

**Purpose:** Verify M12's public entry and Supabase email/password flow against the owner's already-running local Supabase stack. This is synthetic local acceptance, not owner usability review, production readiness, or release approval.

## Run on the feature branch

From the EXE checkout, update to the feature branch:

    git fetch origin
    git switch codex/exe-web-app-m13-auth-browser-acceptance
    git pull --ff-only
    pnpm install --frozen-lockfile
    pnpm review:verify
    pnpm test:e2e:local
    pnpm cp2:validate

If the local M13 branch does not exist, create its tracking branch once:

    git switch --track -c codex/exe-web-app-m13-auth-browser-acceptance origin/codex/exe-web-app-m13-auth-browser-acceptance

Keep the existing local Supabase project running. M13 has no migration, seed, reset, container lifecycle, database policy, bucket, or user-data change. The browser harness starts only its own temporary Next.js process and uses the current run's synthetic example.invalid accounts. It never contacts hosted Supabase and permits only the configured loopback application/Supabase origins.

## Local configuration

The harness accepts only these local public settings in root .env.local:

    NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable key or local anon key>
    NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000

The site URL must be an HTTP loopback origin allowed by the local Supabase Auth redirect list. The repository's local config uses 127.0.0.1:3000 for the email callback while the isolated browser app defaults to 127.0.0.1:3111; local email confirmations are disabled so automated sign-up returns a test session. No private Supabase key is allowed. Values are never printed.

## Historical M13 engineering verification

GitHub Quality passed for implementation commit 5efd0f7e9fef5f4905eccecf08d292d98bab62d7 in [run 37329809259](https://github.com/EnzoReacher/EXE/actions/runs/37329809259): 321 tests across 41 files, lint, typecheck (including the new Playwright TypeScript), production build, required script syntax checks, collected-mode CP2 validation, and git diff --check. The original M13 workflow did not run the browser journey; M15 now runs it with its own disposable Supabase stack. CP2 validation reports 9 collected source rows, 0 owner-reviewed and 9 pending; this does not approve evidence or claims.

## Journeys covered

- The landing page renders its main message and fictional example; sign-in and sign-up links reach the correct pages.
- Landing and sign-up layouts do not overflow at 320, 375, 768, 1024, or 1440 pixels.
- Password confirmation mismatch is announced, marked invalid, and receives focus before any account request.
- The sign-up form creates one unique synthetic local account, returns to the private workspace, and keeps its session through reload.
- Wrong-password sign-in and unknown-account sign-in produce the same generic message.
- A fresh browser context can sign in with the new account; private CV and job APIs remain available after reload.
- Anonymous CV and job API access is denied.
- The run attempts no browser request outside the app/Supabase loopback origins and emits no uncaught page errors.
- The harness removes the current-run synthetic candidate and existing owner/expert/ordinary/unassigned fixtures, verifies account/object cleanup, shuts down only its own processes, and deletes only its unique temporary directory.

The Playwright reporter emits fixed step names, safe assertion codes, and source locations; it does not print email addresses, passwords, response bodies, access tokens, or document contents. Screenshots, traces, and videos remain disabled.

## Acceptance and limits

A green pnpm test:e2e:local is evidence of automated synthetic behavior only. It is not a manual visual, keyboard, screen-reader, or usability review; it does not verify email delivery/confirmation because local confirmations are disabled; and it does not approve any owner review, CP2 evidence, pricing, product claims, real-CV use, merge, deployment, or release. Record actual local output in the master report only after it is supplied or observed. On any cleanup error, stop and investigate the current synthetic run before retrying.
