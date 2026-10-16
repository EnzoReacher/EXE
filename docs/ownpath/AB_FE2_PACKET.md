# FE2 pickup packet — pricing/billing and explicit history, 16 October 2026

**Prepared for the existing human owner; not sent, acknowledged or delivered.** Start from verified stage `fd0644b9f9785ad5b0c6109828445713a66191a8` or deliberately reconcile your preserved work. DTO freeze4269e82; durable billing41ef853. Read AGENTS.md, installed Next guides, AB_EXECUTION_LEDGER and ACCOUNTS_BILLING_CONTRACTS. No published FE branch was observed; private Translator progress remains unknown.

## Worktree and ownership

Inspect status/branches/worktrees before creating/reusing `feat/ownpath-billing-ui` in a separate worktree. Record full baseline. Exclusive: `src/app/pricing/**`, `src/app/checkout/**`, `src/app/account/billing/**`, `src/components/accounts-billing/**`, colocated tests/styles. `src/app/experience-translator/**` is yours **only for reviewed explicit save/history/restore connection**. No FE1 auth/account entry, shared `account/layout.tsx`, global styles/nav/proxy, backend/API/root tooling or core type edits. Existing accessibility labels and domain behavior are retained.

## Imports and billing behavior

- DTOs/`API_PATHS` from `contracts.ts`; `accountsRequest`/`AccountAuthError` from `client-auth.ts`; parsers and **`restoreSnapshot`** from `contracts.validation.ts`. Import paths are under `src/lib/accounts-billing/`. Use the existing helper's same-origin/CSRF transport; never passwords/UID/customer/Price/amount/returnURL in mutation bodies.
- GET plans is a discriminated available/unavailable union. Available amount is integer minor units from configured sandbox Price; render with USD/month and prominent sandbox label. Unavailable means no invented price/CTA success. Free retains local Translator/copy/TXT and needs no card. No cosmetic local-generation paywall.
- POST checkout body `{planId:'pro',operationId}`; POST portal `{operationId}`. Generate UUID once per explicit logical action, keep it through ambiguous network retries. Disable duplicate submits/navigation. OPERATION_PENDING means pending, OPERATION_CONFLICT needs deliberate recovery; do not silently choose another key. ALREADY_SUBSCRIBED routes to trusted management. Only backend-approved hosted URLs are returned.
- `/checkout/return` and `/checkout/cancel` never grant Pro. GET billing status with bounded polling, a clear stop/retry state and cleanup on unmount. Display pending/stale/unavailable distinctly; use server entitlement/capabilities and expiry, never `success` query/client flags. Portal return is `/account/billing`. Provider/account IDs remain private.
- Gate is default-off; UI must handle unavailable catalog without asking to activate live payments. Actual Stripe is unconfigured. Response fixtures can support isolated UI work; they are not external payment or server authorization proof.

## Explicit history and mandatory restore

Save only after disclosure and explicit action, never mount/reload autosave. Validate snapshot/version, title and128KiB UTF-8 bound. GET history uses limit1–50/default20 and opaque nextCursor; reject cross-owner assumptions. Keep operation ID/revision on retries. REVISION_CONFLICT preserves local unsaved work and offers deliberate reload/manual copy. Server quota/capabilities prevail; Free/unverified/expired cannot write, verified owners can read/delete after downgrade.

For every fetched snapshot call `restoreSnapshot(unknown)`. It rebuilds all facts **unconfirmed**, emits detached `wordingDrafts` with `provenance:'untrusted_saved_wording'`, and invariant `reviewRequired:true`. It does not emit accepted/rejected core candidates. Show drafts as text outside generated authority. Renew source/fact confirmation, regenerate, then require explicit edit action to reapply a draft with edited provenance and warnings, then explicit acceptance before export. **Never auto-attach historical wording by ID** or restore accepted/export state. Restore never autosaves or upgrades tier. Submit this adapter/UI design for FE2 + backend/domain read-only review before enabling it.

## Tests and delivery

Cover unavailable/available catalog, no-card Free, double-click/multitab/uncertain retry key, pending/conflict/cancel/expired/429/outage, return-before-webhook/no optimistic Pro, owned portal, explicit disclosure/no autosave, paging/quota/downgrade read-delete, revision conflict retaining unsaved input, hostile wording/forged accepted flags/unknown schema and renewed confirmation/regeneration/edit/acceptance. Keep guest privacy/grounding/offsets/edit-regeneration invalidation/in-flight clear/TXT/clipboard unchanged. Include keyboard/focus/mobile/long text, accessible loading/error states and canceled polling cleanup.

Available commands: `pnpm install --frozen-lockfile`, `pnpm exec vitest run <your-scoped-test-paths>`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check`, `node scripts/check-ownpath-ownership.mjs billing-ui <full-starting-SHA>`. Existing guest suite runs against a coordinator-owned compiled server. New separate authenticated transport acceptance does not equal your UI acceptance. All service/browser scopes must be owned/isolated and cleaned; no owner-service reuse.

Return full branch/worktree/baseline/delivery SHA, exact paths and ownership, review/command/time/test/count/skips/log evidence, restore-gate review, root/config/domain requests, unsolved manual/device checks and rollback (revert only your scoped commits). Coordinator integrates reviewed slices and shared shell after both owners deliver; no shared-status edits, automatic messages/merge/deploy.
