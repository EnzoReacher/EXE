# FE1 pickup packet — auth/account, 16 October 2026

**Prepared for the existing human owner; not sent, acknowledged or delivered.** Backend/source baseline `fd0644b9f9785ad5b0c6109828445713a66191a8`; frozen DTOs4269e82, latest billing source41ef853. Read AGENTS.md, installed Next guides, AB_EXECUTION_LEDGER and ACCOUNTS_BILLING_CONTRACTS first. Current stage is a draft backend candidate; old Supabase entry remains isolated pending your reviewed replacement and coordinated retirement.

## Worktree and ownership

Inspect your actual local work, branches and worktrees. Reuse a suitable existing branch; otherwise create `feat/ownpath-auth-ui` in a separate worktree from the verified stage checkpoint. Record full baseline SHA; do not reset/stash other work or cherry-pick blindly. No FE branch was observed remotely at preparation; that does not establish your private status.

Exclusive source: `src/app/sign-in/**`, `sign-up/**`, `auth/**`, `forgot-password/**`, `reset-password/**`, `verify-email/**`, **`src/app/account/page.tsx`**, `src/components/accounts-auth/**` with colocated tests/styles. Shared `account/layout.tsx`, navigation, `src/proxy.ts`, global styles, root dependencies/config, backend/API and pricing/billing/Translator are reserved. Ask for a scoped integration patch when one is needed. Do not remove Supabase data/migrations or map users by email.

## Imports and exact flow

- `import type` account/session/error DTOs from `src/lib/accounts-billing/contracts.ts`; use exported `API_PATHS`.
- Client methods and safe errors: `createAccountsAuthAdapter`, `AccountAuthError`, `accountsRequest` from `client-auth.ts`. Adapter accepts sanitized public FirebaseOptions and explicit HTTP loopback Auth emulator URL for a `demo-` project only. Root composition/config injection remains a coordinator dependency; do not invent cloud fallback or expose server credentials. Local synthetic options use the harness's actual project/port, not a guessed fixed service.
- `accountsRequest` obtains GET CSRF before browser mutations and singleflights bootstrap; do not send passwords through it. SDK adapter owns official Firebase credential/password/action operations and memory-only cleanup. Cookie is app session authority. No app storage of tokens/passwords; no argument logging.
- Register: confirmation match + official `passwordPolicy`; submit once; handle `{session,verificationEmail}` independently. `phase:'identity_created_session_pending'` means identity already exists: recover by login/session retry, never repeatedly register/delete. `setup:'profile_pending'` requires profile repair/retry, distinct from `verificationEmail:'pending'`.
- Login/verification refresh/resend require credentials per frozen adapter. After applying VERIFY_EMAIL, refresh provider identity and exchange a new session before privileged access. Show limited account state for unverified users. Wrong/disabled/revoked/expired sessions use neutral errors and preserve recoverable UI input appropriately.
- `/auth/action` parses provider `mode`/`oobCode` as untrusted data, dispatches only matching official action methods; invalid/expired/used codes recover accessibly. Check/reset password through `checkPasswordReset`/`completePasswordReset`; reset request uses neutral `{requested:true}`. Do not retain action tokens in app state longer than needed or log them.
- Current/all logout are distinct. All-session revocation may return RECENT_AUTH_REQUIRED: reauthenticate/exchange then explicitly retry; do not claim current logout revoked every device.
- Fetch `/api/account` for trusted profile, verification/capabilities and setup. PATCH permits displayName only. Handle API error union with safe copy, 429 delay and bounded explicit retry; no raw provider exception text.
- Safe `next` must be validated **server-side** using existing `safeNext` from `server-security.ts` (server-only; do not import into a client component). Approved local paths only, fallback `/account`, never `/assessment`. Forward a validated destination to client navigation. Guest `/experience-translator` stays available.

## Required tests and review return

W5 integration note: policy lookup failures without a recognized SDK code now return safe `UNAVAILABLE`, not `INVALID_CREDENTIALS` (reviewed repair). The installed emulator/SDK policy path is being tested as **unavailable**, not as configured password enforcement. Do not silently replace an unavailable policy with invented local requirements or claim cloud password-policy parity. Official adapter signup/action/reset execution is separate from delivered UI and real email. Use the current W5 evidence before asserting browser coverage.

Cover signup/duplicate submits/password-policy+confirmation, identity-created/profile/mail pending separately, neutral credentials/reset responses, verification refresh, resend failure, action-code mismatch/expiry/reuse, throttling, reauth/current+all logout, session expiry/revocation, safe-next bypasses, keyboard/focus/labels/mobile/long errors, and no password persistence. Use synthetic identities and fixture responses; label mocked UI tests separately from actual Firebase evidence. Do not weaken guest browser privacy guards.

Commands available now: `pnpm install --frozen-lockfile`, `pnpm exec vitest run <your-scoped-test-paths>`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check`, `node scripts/check-ownpath-ownership.mjs auth-ui <full-starting-SHA>`. Serialize build/type generation within your worktree. Root CI/emulator/browser commands are coordinator-owned. Include command/time/source/count/skips/log and review limits; never count a skipped service test as pass.

Return: branch/worktree/baseline/full delivery SHA, changed-file list and ownership result, source review + test evidence, configuration requests, exact legacy imports/callers to retire, accessibility/manual gaps and rollback (revert only your slice). Coordinator composes layout/proxy/shared navigation only after both reviewed UI deliveries. No automatic team messages/merge/deploy. You do not edit shared STATUS/HANDOVER.
