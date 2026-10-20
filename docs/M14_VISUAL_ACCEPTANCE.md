# M14 Visual Acceptance Checklist

## Current automated continuation — M15, 2026-10-06

[Combined acceptance run 37397936139](https://github.com/EnzoReacher/EXE/actions/runs/37397936139) passed genuine landing/account/core/credential journeys, protected proof rendering and isolated workspace UI checks, including 320/375/768/1024/1440px bounds and exercised keyboard/focus behavior. See [M15 testing handoff](M15_COMPLETE_WORKSPACE.md). The owner's actual visual/usability/assistive-technology results remain unrecorded; the manual checklist below is retained for that session.

**Status:** Pending owner review. Fill only with actions actually performed.  
**Build:** M14 public landing and account-entry visual foundation.  
**Data:** Use the clearly fictional example only. Do not upload a real CV or enter real account credentials.

## Before reviewing

1. Update the local checkout to `codex/exe-web-app-m14-visual-foundation`.
2. Follow the repository's local setup and preflight instructions. Reuse the existing local Supabase stack; do not start a duplicate stack or reset/migrate the database for this visual review.
3. Run `pnpm run review:verify`. If the synthetic browser journey is being run, use `pnpm run test:e2e:local` and its existing-stack instructions.
4. Start the development app only after required checks pass.

## Record the actual session

| Field | Result |
|---|---|
| Review date | Not performed |
| Browser and version | Unknown |
| Device / operating system | Unknown |
| Reviewer | Owner |
| Routes actually opened | Not performed |
| Desktop viewport (width × height) | Not performed |
| Tablet viewport (width × height) | Not performed |
| Narrow mobile viewport (width × height) | Not performed |
| 320px reflow check | Not performed |
| Keyboard-only actions | Not performed |
| Zoom / text resize | Not performed |
| Screen-reader check | Not performed |
| Issues observed | Not performed |
| Retest and outcome | Not performed |

Do not copy the planned viewport list into the result fields as if it were performed.

## Visual and usability checks

- [ ] `/`: headline, description, primary and secondary actions are clear and usable.
- [ ] `/`: the fictional report is visibly labeled and its evidence caveat remains readable.
- [ ] `/`: “How it works,” the example, and the footer are readable and have no clipped content.
- [ ] `/sign-in`: labels, input borders, errors/notices, buttons, and prototype/privacy note are legible.
- [ ] `/sign-up`: confirmation/password guidance and the primary action fit without horizontal scrolling.
- [ ] Widths from 320px to desktop: navigation and content reflow; no overlap or horizontal page scroll.
- [ ] Keyboard: skip link, navigation, all links, buttons, and form fields show visible focus and follow a sensible order.
- [ ] Reduced motion: the page does not require animation to understand the workflow.
- [ ] Browser back/refresh does not disrupt account navigation or form behavior.

## Issues and retests

Add one issue per row. Use “None observed” only after the route and viewport were actually reviewed.

| Route / viewport | Action | Actual observation | Fix / retest result |
|---|---|---|---|
| Not performed | Not performed | Not performed | Not performed |

## Decision

- Owner visual/usability outcome: **Pending**
- Accessibility outcome: **Pending**
- Approval to merge: **Not granted by this checklist**
- Approval to deploy or go live: **Not granted by this checklist**

M14 styling and automated checks do not replace the still-pending M13 local Supabase authentication journey, CP2 review, privacy approval, or explicit release authorization.
