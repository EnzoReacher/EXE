# Signup password clipboard check

## Reproduced cause

Reproduced against the current worktree in a fresh headless Chromium browser via
Playwright, before and after the change:

1. Cleared the test browser's clipboard, typed a synthetic password with keyboard
   events, selected it with Ctrl+A, and attempted Ctrl+C while it was masked.
   The clipboard remained empty. Ctrl+V into confirmation left it empty.
2. Wrote a known synthetic value to the isolated browser clipboard, then used
   Ctrl+V in each password field. Both accepted it and retained it after an
   unrelated controlled-field render.

The reproduced failure is **source copying**, not destination paste rejection.
Chromium restricts native copying from `type="password"` inputs. This observation
is browser-specific; it does not establish behavior in every browser or extension.
The application has no copy/paste/cut prevention handlers. Its submit handler's
`preventDefault()` prevents form navigation, not clipboard operations.

## Fix

- Separate, keyboard-accessible Show/Hide buttons for password and confirmation,
  initially masked, with action names and `aria-controls`. Buttons do not submit.
- Guidance explains that copying a hidden password may be browser-blocked.
- Existing native paste remains available. No clipboard-reading application code
  or custom copy shortcut was introduced.
- Retained stable input IDs/names and `new-password` / `current-password`
  autocomplete hints. Read native form values before validation/submission and
  synchronize all field values during edits/toggles, accommodating managers that
  fill controls without React change events.
- Validation, matching, duplicate-submit locking, verified-session checks,
  recovery authorization, neutral errors, and existing Auth boundaries retained.

## Checks

- Browser: **2 tests passed**, using native keyboard typing, selection, copy and
  paste. Show → select/copy → paste into confirmation works; Hide preserves
  entries. Mismatches are rejected; matching pasted values reach the intercepted
  synthetic Auth boundary and display the confirmation screen.
- Focused Vitest: **60 tests passed** across auth panel, validation, redirect,
  and callback tests. Includes paste/mismatch/toggle behavior and native-value
  autofill contract tests with no change events.
- Targeted ESLint and TypeScript checks passed.

Autofill contract tests simulate a manager's native value writes. An installed
third-party password-manager extension was not exercised; this is not a claim of
extension-specific end-to-end verification.

All browser contexts were fresh and headless; their clipboard was seeded before
use and cleared afterward. External requests were blocked or fulfilled locally.
No owner clipboard, credentials, or live signup was used. No password/clipboard
contents, screenshots, videos, traces, or request bodies were saved as evidence;
value checks report booleans only.

To repeat with the worktree dev server running:

```sh
OWNPATH_TEST_URL=http://127.0.0.1:4317 pnpm exec playwright test --config=e2e/auth-password.config.mts
pnpm exec vitest run src/components/ownpath/auth-panel.test.tsx src/lib/supabase/auth-validation.test.ts src/lib/supabase/auth-redirect.test.ts src/app/auth/callback/route.test.ts
pnpm exec eslint src/components/ownpath/auth-panel.tsx src/components/ownpath/auth-panel.test.tsx e2e/auth-password.spec.ts e2e/auth-password.config.mts
pnpm typecheck
```
