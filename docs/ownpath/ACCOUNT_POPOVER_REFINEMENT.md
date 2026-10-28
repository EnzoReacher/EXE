# Contained account popover

This refines the existing workspace navigation; Settings and account actions are
reused, not rebuilt.

- Retains the 264px desktop sidebar and 72px rail. No widening was necessary.
- Popover width derives from the sidebar/drawer's actual bounds with 12px insets.
  Its bottom sits 8px above the trigger. Viewport/visual-viewport bounds constrain
  its height; long content scrolls internally. Normal height avoids the logo;
  very short viewports prioritize a usable scroller. Overflow is not clipped to
  conceal incorrect panel sizing.
- Removes the redundant Account header. Identity uses the supplied display name
  only when distinct from the email; email appears once. Name/email use single-line
  ellipsis, with complete identity in accessible labels on both identity link and
  bottom trigger. Unknown plan remains unavailable, not Free.
- Keeps warm-white, 14px corners, 14px text, 42px action rows, consistent icon
  widths, and the separated verified Sign out action.
- A rail avatar activation expands and opens in one committed interaction before
  positioning/focus. Closing, light dismissal, keyboard exit or entering Settings
  restores the rail. Only explicit sidebar toggles write the saved preference;
  temporary expansion never writes storage. Temporary transitions snap to avoid
  painting a panel over an animating rail.
- Mobile retains the drawer and existing modal/scroll-lock coordination. Short
  navigation areas can scroll while retaining bottom account access.

## Changed files

- `src/components/ownpath/account-menu.tsx`
- `src/components/ownpath/workspace-shell.tsx`
- `src/app/app/workspace.css` (account styles, temporary sizing and short-height nav)
- `src/components/ownpath/account-menu.test.tsx`
- `src/components/ownpath/workspace-navigation.test.tsx`
- `e2e/account-popover.spec.ts`, `e2e/account-popover.config.mts` (new)
- This document and the refinement notice in `WORKSPACE_NAVIGATION.md`.

Browser checks use fictional identities and loopback fixtures only. The zoom
check uses an isolated Chromium profile and test-only extension calling the real
`chrome.tabs.setZoom(..., 2)` API, not CSS zoom or pinch scaling. Neither the owner's
browser profile nor its 4317 server is used or altered. The extension/profile are
temporary test artifacts under `/tmp/opencode/`, not an application integration.

## Results

- **20 unit tests / 3 files passed**: account menu, workspace shell and navigation.
  Covers identity deduplication, accessible names, verified/unknown/stale plan,
  logout verification, keyboard handling, storage failures and temporary expansion
  without preference writes or input-node replacement.
- **15 focused Chromium scenarios passed** at 1440/390/320px, with missing name,
  name equal to email and actual supplied name; unknown plan; rail restoration on
  Escape, outside click, trigger click and Settings; 360px height; and genuine
  200% browser zoom. Bounds assertions require 12px horizontal insets, an 8px trigger
  gap, no horizontal content overflow and reachable 40–44px actions. The final
  unknown-plan case also reran with the complete bounds assertions.
- Controlled pending Scan **and** Rewrite each completed exactly once after
  temporary account expansion/Settings, with no cancelled requests. The existing
  pending-workflow/manual-edit browser scenario also passed (one additional
  scenario, **16 distinct browser scenarios total**).
- Relevant ESLint, `pnpm typecheck`, `git diff --check`, and an isolated production
  build passed. The final source hashes match that isolated build. Fictional Auth,
  billing OFF, disabled live Claude and empty provider keys were isolated from the
  normal application; no `.env*` file was copied.
- Screenshots inspected: desktop and mobile identities, short-height scrolling,
  and top/bottom of the popover at real 200% zoom. An initial grid min-content
  overflow was caught and fixed with a bounded `minmax(0,1fr)` column, not hidden
  overflow. Sign out's reserved pending label was aligned with the other rows.

Artifacts: `/tmp/opencode/account-popover-results/`,
`account-popover-unknown-results/`, and `account-popover-build-{path.txt,result.json}`.
Unrelated provider/payment/database suites were not rerun. No live model/API calls,
hosted writes, migrations, additional agents, commits, push or deployment. The
owner's 4317 listener was preserved. Browser execution here covers Chromium;
no new cross-browser or assistive-technology audit is claimed.
