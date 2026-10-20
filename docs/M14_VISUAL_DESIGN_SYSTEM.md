# M14 Visual Design System

**Status:** Implemented on the M14 feature branch; automated verification and owner visual review are tracked in [the master report](PROJECT_MASTER_REPORT.md).  
**Scope:** Public landing page and sign-in/sign-up entry routes, with a small shared color-token refresh. This is a visual pass; it does not change account behavior, data handling, routes, or product claims.

## Design intent

Make the first visit feel clear, calm, and trustworthy for someone preparing a job application. Keep the next action visible, show an example before asking for account creation, and explain what EXE does in plain language. Preserve the advisory boundary and the user's control over CV wording.

## Visual tokens

| Token | Value | Use |
|---|---|---|
| Ink | `#1b2f3a` | Main text |
| Navy | `#17384b` | Headings and brand |
| Teal | `#08756f` | Main action and active emphasis |
| Canvas | `#f5f8f7` | Quiet page background |
| Surface | `#ffffff` | Cards and form controls |
| Line | `#e1e9e7` | Boundaries and dividers |
| Muted | `#566d76` | Supporting text |
| Soft teal | `#e8f3f0` | Secondary surfaces and step markers |

The shared application typeface remains the existing system stack. No remote font, image, animation library, or third-party asset is introduced.

## Layout and components

- The landing content uses a centered maximum width of 1,160px with 24px side gutters on wide screens.
- The hero pairs a clear headline and two actions with a labeled fictional report preview. It stacks before the preview becomes cramped.
- The example report and three process cards use restrained borders, larger corner radii, and shallow shadows to group information without hiding caveats.
- The final call-to-action uses a soft teal/green background. It makes no price, competitor, hiring-success, or validation claim.
- Sign-in/sign-up keeps the form central, labels visible, inputs comfortably sized, and the privacy/prototype notice legible.
- At narrow widths, navigation wraps, actions stack, cards become one column, and evidence statuses move beneath their finding.
- Shared color tokens also refresh the existing workspace shell. M14 does not redesign its route layouts or alter its workflows.

## Interaction and accessibility

- Keyboard focus stays visible against both the pale page and white cards.
- Buttons and inputs retain at least 44px target height on the public and account entry surfaces.
- The small card hover lift is enabled only for a fine pointer. Reduced-motion preference removes hover movement and smooth scrolling.
- Text reflow must remain usable at 320px without horizontal page scrolling.
- The fictional sample and advisory limitations stay visible; decorative styles must not be mistaken for validation or verification badges.

## Out of scope

No new product feature, backend change, authentication change, CV-processing behavior, pricing tier, market comparison, testimonial, success statistic, or deployment. M14 does not close M13's owner-run local Supabase browser acceptance or any manual accessibility/release gate.

## Review record

- Owner visual review: **Not performed**.
- Browser/version, routes, viewport sizes, keyboard actions, observed issues, and retests: **Unknown / Not performed** until the owner supplies actual results.
- Production or real-user visual acceptance: **Not performed**.
