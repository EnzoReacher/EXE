# M10.2 Parallel Hardening Plan

**Date:** 2026-10-02
**Branch:** `codex/exe-web-app-m10-2-hardening`
**Base:** `4af832c0c44752872a84eee488e24eea038a89e1`

## Goal and scope

Harden the existing fictional-data internal prototype: clarify the current journey, improve keyboard/form accessibility, reduce narrow-screen overflow, make asynchronous outcomes truthful, and review privacy boundaries. This is engineering work authorized by the owner request, not an evidence-selected M11 feature.

## Coordinated workstreams

| Workstream | Scope | Ownership / coordination |
|---|---|---|
| A | Existing seven routes: overview, assessment, report, roadmap/draft, saved work, opportunities, reviewer | Independent route owners; existing information architecture |
| B | Skip link, labels/descriptions, field errors, focus, live status, keyboard controls | Shared layout/CSS owner plus route owners |
| C | 320, 375, 768, 1024px and wide desktop; long text and touch targets | Shared CSS owner; interactive review remains owner follow-up if browser unavailable |
| D | Lightweight status notice, shared styles/tokens, safe error fallback | Shared owner; no new UI library |
| E | All API/lib boundaries, headers, no-store, noindex, safe failures | Independent API owner; narrow verified fixes with tests |
| F | Meaningful component/API regressions, existing tests, build, CI and fictional local acceptance | Shared test configuration; per-area test ownership |
| G | Plan, incremental acceptance record, owner checklist and project trackers | Documentation owner |

## Excluded scope and risk boundaries

No payments, subscriptions, pricing screens, integrations, scraping, job alerts, social collection, external AI, analytics, real CVs/participants, production credentials/services, deployment steps, PR, merge, or M11 branch. No schema/RLS/Storage/token redesign absent a verified defect. All manual demonstrations and local acceptance use fictional data only. Preserve reviewer isolation, safe DTOs, no-store, hardening headers, and noindex/nofollow. Production CSP remains deferred pending an approved deployed-origin plan.

## Evidence rules

CP2 remains **Evidence collection pending**. No target segment, job family, price, competitor position, or M11 feature is selected. Hardening and passing tests unlock no price, market, competitor, validation, privacy-superiority, or ease-of-use claim. Instructor questions and owner approvals remain unresolved until actual answers/results exist.

## Acceptance criteria

- Current journey and evidence limits are explained without skill/hiring guarantees.
- Skip link reaches focusable main content on every primary route, including reviewer/fallback.
- Form labels, descriptions/errors and asynchronous announcements are connected; failed mutations do not report success.
- Long text wraps; controls have visible focus and usable touch targets; reduced motion is respected.
- API errors remain neutral, private cache rules and reviewer isolation remain intact.
- Meaningful regression tests plus test/lint/typecheck/build/script syntax/template validation/diff checks pass.
- Run local Supabase acceptance if available with temporary fictional users only.
- Record real browser results or exact outstanding owner viewport/keyboard checks; do not substitute source inspection for a browser pass.
- Review complete diff for personal data/secrets, commit requested message, push without force, and keep release/evidence gates blocked.
