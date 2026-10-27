# Unified workspace navigation

## Authoritative product scope — 25 October 2026

The accepted navigation is **Scan CV / Rewrite CV / Saved CVs**, with existing
account/settings access. `/app` presents Scan as a rendering alias, not an Overview
or profile wizard. One layout-owned ScanRewrite instance stays mounted across
Scan, Rewrite, Saved CVs and Account so navigation does not discard unsaved inputs,
accepted findings or manual edits. `/app/scan` and `/app/rewrite` remain direct routes.
Do not reintroduce the profile/Tailor-first sidebar from `AUTH_WORKSPACE_UPDATE.md`;
that navigation guidance is superseded. Historical routes/data remain available;
this recovery does not roll back their Auth/session improvements or migrate data.

Recovery production delta: `src/components/ownpath/workspace-shell.tsx`,
`src/app/app/page.tsx`, and Saved CVs navigation links/title in
`src/components/ownpath/saved-cvs.tsx`. The authenticated layout needs no change.
Source/rendering behavior was compared against the preserved reduced-interface
snapshot under `.factory/evidence/OWNPATH-AUTH-WORKSPACE-20261025/baseline/files/`.
Current pre-recovery files, status and protected design hashes are backed up under
`.factory/evidence/OWNPATH-NAV-RECOVERY-20261025/baseline/`. No blanket snapshot copy.

### Recovery verification actually executed

- **296 focused tests / 22 files passed**: shell/navigation, page guards, account,
  Auth, billing UI, Scan/Rewrite, provider/grounding/usage and offline diagnostics.
  The updated navigation assertions require the exact three destinations, absence
  of legacy labels, and the same mounted source nodes across `/app`, Scan, Rewrite,
  Saved CVs and Account. Existing session-expiry/resume/logout checks pass unchanged.
- **25 compiled Chromium checks passed**, retries disabled: `/app` renders Scan,
  correct sidebar/active links, real PDF/DOCX extraction, explicit consent, accepted
  Scan and input/manual-edit retention through Rewrite/Saved CVs/Settings, current
  edited base, pending requests, safe malformed/truncated/HTTP/acknowledgement
  failures, anonymous route/API protection, account/settings and 1440/390/320px
  layouts. Screenshots at all three sizes inspected; no horizontal overflow.
  Auth/provider responses are fictional and external traffic blocked; extraction
  uses the actual authenticated route/parser. No live inference dispatched.
- Whole-repository lint: **zero warnings/errors**; nonincremental typecheck and
  diff whitespace pass. Production `next build --webpack` passes in an isolated
  credential-free copy, build **`7p701X-v5JtgXxMSfKtfX`**. Its entire production
  source inventory still matches the current worktree after verification.
- Full retained suite was also run: final attempt **1224 passed / 1 failed**
  (1225 tests, 102 files). The failure is the unrelated existing credential-version
  keyboard-retry case in `src/app/credential-versions/workspace.test.tsx`; all
  **16 tests in that file pass separately**. It was not edited or weakened, and
  this is not reported as a green full-suite gate. An earlier full run caught a
  settings-close test reading scroll lock before effect cleanup; it now waits for
  the same required unlocked state and passes. Initial new browser expectations
  were corrected to test labelled links rather than decorative raw glyph text,
  and the existing layout/page guards' bounded sign-in destinations; production
  authentication was not changed to satisfy tests.

The five protected files (`scan-rewrite.tsx`, `workspace.css`, `ownpath.module.css`,
`cv-document.tsx`, `scan-findings.tsx`) retain their pre-recovery SHA-256 hashes.
`src/app/app/layout.tsx`, provider/model, usage controls, billing/schema, extraction,
and previous Scan/Rewrite repairs were not changed. No conflicting task controlled
by this session remained; no external production-source changes were detected
between the isolated build and final comparison. Owner server PIDs 17052/17069 on
4317 remain unchanged; no restart or `.next` replacement. Open
**http://127.0.0.1:4317/app** using normal dev hot reload. Export any existing unsaved
work before a manual browser reload, if one is needed to replace a stale client.

Logs: `/tmp/opencode/ownpath-nav-{focused-suite-verified,suite-verified,unrelated-test,lint-clean,typecheck-verified,build,browser-verified}.log`.
Build/source inventory: `/tmp/opencode/ownpath-nav-build.json`.
Screenshots/results: `/tmp/opencode/ownpath-nav-recovery-browser-results/`.
Reproduction (after creating fictional samples with the existing `createSamples`
helper under `/tmp/opencode/ownpath-nav-samples`):

```sh
OWNPATH_VISUAL_BUILD_DIR=/tmp/opencode/ownpath-nav-recovery-build-ctkRMo pnpm exec playwright test --config=e2e/reduced-navigation.config.mts
```

**Live status unchanged from 25 October 2026:** one terminal Scan accepted (HTTP
200/end_turn); one Rewrite using that accepted Scan rejected (HTTP 400,
`invalid_request_error`, request `req_011CgNbaoKMrU7XGkPi2vPCc`, no useful parameter
or schema path). No additional paid calls in navigation recovery. This remains
terminal-only evidence, not authenticated real-provider web finalization. Prior
unknown web usage/billing outcomes still require operator reconciliation; no hold,
allowance or historical reservation was cleared or relabelled.

Current account sizing/identity/temporary-rail behavior is refined in
[ACCOUNT_POPOVER_REFINEMENT.md](ACCOUNT_POPOVER_REFINEMENT.md). The original 320px
popover description and screenshots below are historical verification, not the
current sizing rule. Settings and usage behavior remain unchanged.

## Behavior

- Desktop sidebar: 264px expanded / 72px rail. The only preference is the boolean
  `ownpath:sidebar-collapsed` in localStorage. Reads happen in the hydration layout
  effect before the hydrated paint; blocked storage falls back to expanded.
  Navigation remains functional if reads or writes throw. Mobile ignores the rail
  styling and retains the existing overlay drawer at the 760px breakpoint.
- The same ScanRewrite instance remains mounted. No navigation, AI operation,
  save, quota change or cancellation is attached to the sidebar/settings controls.
- Account popover: viewport-bounded 320px warm-white panel, full identity, verified
  plan destination, Profile, Usage, Plan & billing, Security and verified sign-out.
  Unknown plans have no guessed upgrade/manage action. Configured support remains
  in billing, not in the compact popover.
- Settings: native modal with explicit keyboard wrapping, native background
  inertness, shared reference-counted scroll locks and visible focus restoration.
  Its Profile/Security content reuses AccountProfile/AuthPanel; sections hide rather
  than reset profile edits. Cancel-first discard confirmation concerns settings
  only. An unacknowledged profile save cannot be dismissed mid-save.
- The direct Account page and existing anchors remain available, with an added
  Usage section. Modal IDs are prefixed to avoid collisions with the direct page.
  Profile discard guards register independently, so closing a dialog cannot erase
  the direct page's guard. Opening/closing Settings does not add history entries.
- Scan/Rewrite no longer render the routine top usage strip. Contextual usage
  sits beside Scan, Rewrite and Save, with Settings → Usage actions. Successful
  operations retain existing shared-summary invalidation.
- Usage reads the shell's existing authenticated summary, never a second polling
  loop. Refresh preserves previously verified values with stale/error feedback;
  authentication failures and session-end events still clear private data.
  Initial loading/failure is not represented as Free or zero allowance. Dates use
  explicit ICT / Asia/Ho_Chi_Minh / UTC+07:00. Saved capacity is not an AI counter.

## Changed files (this task only)

Under `src/components/ownpath/`:

- `workspace-shell.tsx`, `account-menu.tsx`, `workspace-session.tsx`
- `settings-dialog.tsx`, `workspace-settings-context.ts`, `modal-scroll.ts` (new)
- `usage-panel.tsx` (new), `use-plan-summary.ts`, `scan-rewrite.tsx`
- `account-profile.tsx`, `auth-panel.tsx`, `billing-panel.tsx`
- `account-menu.test.tsx`, `workspace-navigation.test.tsx` (new)

Other files:

- `src/app/app/workspace.css`
- `src/app/app/account/page.tsx`
- `e2e/workspace-navigation.spec.ts`, `e2e/workspace-navigation.config.mts` (new)
- `e2e/workspace-visual-pass.spec.ts` (updated expected layout/usage placement)
- This document.

## Verification

- **108 unit tests / 8 files passed**: workspace navigation, account menu,
  ScanRewrite, AccountProfile, shell, billing UI, AuthPanel and workspace pages.
- **8 focused Chromium scenarios passed**: expanded/collapsed account access,
  1440/390/320px layouts, long identity, populated forms and Pro transactions,
  keyboard containment, cancel-first confirmation, usage failure/recovery,
  pending Scan preservation, rewrite instructions/manual edits/attachment label,
  saved-capacity navigation, retained preference/routes/reload, breakpoint cleanup,
  direct Account anchors/unique IDs, failed profile saves, billing OFF and both
  normal/reduced motion.
- **7 existing workspace visual/interaction scenarios passed**, including branding,
  active navigation, mobile focus, upload, consent and route-state preservation.
- Relevant ESLint, `pnpm typecheck`, and `git diff --check` passed.
- Isolated `next build --webpack` passed. No `.env*` files were copied; fictional
  loopback Auth settings, empty provider/service keys, disabled live Claude and
  billing OFF were used. Browser API/AI responses were controlled synthetic data.
  Fixture processes were owned by Playwright, not the owner's port 4317 server.
- Screenshots inspected: expanded/collapsed desktop, 320/390px account/settings,
  populated billing and stale usage. Artifacts are local under
  `/tmp/opencode/navigation-browser-results` and
  `/tmp/opencode/workspace-visual-results`. Build location/result/log are recorded
  in `/tmp/opencode/navigation-build-{path.txt,result.json}` and
  `/tmp/opencode/navigation-build.log`.

Earlier broad provider/payment/database evidence was reused rather than rerunning
unrelated suites. Claude's pinned model/configuration, server validation, consent
and accounting implementation were not changed. No live AI/payment calls, hosted
writes, credentials changes, migrations, new services, agents, commits, pushes or
deployment were performed. The owner's 4317 listener was not restarted or stopped.

## Remaining verification limits

No known failing check in this scope. Browser execution covers Chromium, not a
new Safari/Firefox or assistive-technology audit. Hosted Auth/payment behavior and
real Claude availability/quality remain outside these controlled offline checks.
