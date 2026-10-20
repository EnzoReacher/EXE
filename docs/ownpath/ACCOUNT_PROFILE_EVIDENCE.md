# OwnPath Profile & Security — 2026-10-20

## Implemented

`/app/account` is the protected **Your account** workbench page. `/account`
redirects verified users there and anonymous users to sign-in. A text-only
initials avatar, acknowledged display name and verified session email lead into
Personal details, Security and a separate browser-local Sign out card. The
existing green shell, typography and controls are reused; desktop uses two
columns and mobile stacks the cards.

The optional display name is trimmed and limited to 80 characters on one line.
It is stored at `user_metadata.display_name` through the authenticated browser
SDK. The latest verified metadata is merged before updating; unrelated keys
are preserved. No table, migration, admin key or client-supplied ownership ID
was introduced. Display names render as text and are never authorization data
or applicant names in saved CVs. Email is read-only.

Save and Cancel operate on acknowledged snapshots. Concurrent/redundant saves
are locked, failed requests preserve the draft, and typing during a request
does not get overwritten or incorrectly marked saved. Sidebar identity changes
only after acknowledgement. Session epochs, owner checks and unmount guards
ignore stale checks/saves; expired-session errors clear identity even without
an SDK sign-out event. Account-switch events clear the old workspace before
opening the new one. Unsaved links and sign-out request confirmation; reload/
close uses `beforeunload`, and cancellable Back/Forward uses the Navigation API.

**Change password** links to the existing `/reset-password` implementation.
It retains native paste/password-manager values, independent Show/Hide,
12–128-character validation, confirmation, verified identity immediately before
update and clearing after success. A changed verified owner now also cancels
the password update. Provider reauthentication errors remain recoverable; no
recovery email is sent automatically. Sign-out reuses the existing
`scope: "local"` handler and truthful provider-failure re-verification.

## Verification

All Auth operations below used a synthetic loopback Auth/REST fixture. They
are **not evidence of hosted Supabase updates or email delivery**.

| Check | Result |
| --- | --- |
| Focused UI/routing regressions, 6 files | **73 passed** |
| New Account compiled-browser journeys | **7 passed** |
| Retained password native clipboard/Show–Hide checks | **2 passed** |
| Protected-route / verified-signup compiled smoke checks | **2 passed** |
| Lint / typecheck / production build | **Passed** |

The Account journeys cover load, read-only email, save/cancel, optional empty
name, metadata merge, recoverable errors, later edits during save, duplicate
submissions, sidebar acknowledgement, persistence across reload and sign-in,
explicit recovery, password update, local logout/error, expiry during a save,
link and Back cancellation, keyboard focus and mobile navigation. Unit tests
also cover account switching, ignored late responses, mismatched verified
owners, unmount, validation, unexpected SDK errors and scheduled refresh races.

Screenshots were inspected at **1440, 390 and 320px**, including initial, saved,
saving, error, no-name, long-name/email, mobile drawer and session-ended states.
Long synthetic names/emails wrap in summary/sidebar without horizontal page
overflow. Form fields retain native single-line scrolling. Status messages use
`role="status"`; recoverable errors use `role="alert"` with field description.
Cancel returns focus to the display-name field, and Escape returns mobile
drawer focus to its trigger. No password values are captured in screenshots.

## Artifacts and preservation

`.factory/evidence/OWNPATH-ACCOUNT-20261020/` contains the **114-file scoped
baseline archive/hashes**, check logs, screenshots and `preservation.json`.
No baseline file is missing. Previous visual work is retained, and
Scan/Rewrite, saved CV contents/APIs, print renderer and provider configuration
match the account-task baseline. Unchanged core/backend/PDF evidence remains
in `CV_WORKSPACE_EVIDENCE.md` and is reused.

Run the existing loopback fixture and compiled candidate as described in
`CV_WORKSPACE_SETUP.md`, then:

```sh
pnpm exec playwright test --config=e2e/account-profile.config.mts
OWNPATH_TEST_URL=http://127.0.0.1:4386 pnpm exec playwright test --config=e2e/auth-password.config.mts
```

## Remaining acceptance gates

- A hosted test account must confirm metadata persistence and any configured
  Auth hooks/policies, password reauthentication requirements and recovery
  email/callback delivery. No hosted mutation was attempted here.
- Browser evidence is headless Chromium with viewport emulation. Safari/Firefox
  and real-device acceptance remain live-browser gates, especially cancellable
  same-document history navigation on browsers without the Navigation API.

One writer; no paid product API call, hosted migration, commit, push or deployment.
