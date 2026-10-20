# M7 Release-Candidate Fictional-Data Acceptance

**Date:** 2026-10-02  
**Scope:** Local-only, fictional data. This document is acceptance evidence for the internal M7 branch; it is not permission to use real CVs or deploy.

## Current continuation

M15 on 2026-10-06 passed 331 engineering tests, genuine database policies, all three backend/browser journeys, proof/UI rendering and cleanup in CI run `37397936139`. The results below remain the historical M7 record. Use [M15 completion and acceptance](M15_COMPLETE_WORKSPACE.md) for current changes, additive migration and testing instructions. The owner's manual release review remains separate from synthetic automation.

## Result

**PASS with one explicitly recorded manual-owner follow-up.** The automated local acceptance used two temporary fictional accounts and the fictional records in `scripts/m1-local-policy-check.mjs`. The end-to-end screen flow is documented in `docs/demo/` using `docs/demo/fixtures/aria-vale-fictional-cv.docx`. No personal data, hosted project, screenshot, or external opportunity URL was used.

The connected desktop-browser service was unavailable in this workspace, so an owner must still complete the interactive desktop/narrow-mobile and keyboard visual review before approving a release. Static responsive rules, focus rules, and the local routes were inspected; this is **not** a substitute for that owner review.

## Checklist and evidence

| # | Check | Status | Evidence / final outcome |
|---:|---|---|---|
| 1 | Sign in with a fictional local account | Pass | The local suite creates temporary `@example.test` users A and B and verifies authenticated owner paths. |
| 2 | Upload a fictional PDF/DOCX CV | Pass | `docs/demo/fixtures/aria-vale-fictional-cv.docx` is a valid fictional DOCX; local suite verifies private fictional PDF object upload and owner-only Storage access. |
| 3 | Valid parsing and parsing-failure path | Pass | Parser unit tests cover PDF/DOCX and malformed/empty failures; intake repository test verifies a retryable failed-deletion state. Demo runbook specifies valid processing and recovery messaging. |
| 4 | Save a fictional target job and opportunity link | Pass | Local suite saves fictional target jobs and HTTPS opportunity references; validation tests cover accepted/rejected opportunity input. |
| 5 | Create M2 evidence report | Pass | Local suite creates owner-scoped completed runs; demo fixture/runbook exercises report creation. |
| 6 | Supported, partly supported, unclear, missing labels | Pass | `FICTIONAL_DEMO_DATA.md` defines all four expected fixture outcomes; M2 analysis tests cover deterministic finding behavior. |
| 7 | Evidence excerpts remain traceable | Pass | Local suite saves fictional source positions/excerpts; report UI identifies excerpt positions; M2 tests cover evidence generation. |
| 8 | Create M3 roadmap and source-grounded draft | Pass | Local suite creates roadmap, draft, and provenance records; generator tests pass. |
| 9 | Edit, save, and accept a draft | Pass | Local suite accepts a fictional draft and verifies that editing clears acceptance and revokes an included share. |
| 10 | Saved-work reopens correct report/draft | Pass | Saved-work DTO tests scope summaries to the matching run and handle empty state; route links were source-inspected. |
| 11 | Create a private review link | Pass | Local suite creates a link for a completed report and accepted fictional draft, and verifies SHA-256 hash storage rather than raw-token storage. |
| 12 | Reviewer sees selected content only | Pass | Local review-RPC check returns only role/company/findings/selected accepted draft; it excludes owner ID, raw JD, and CV-library metadata. |
| 13 | Submit fictional reviewer feedback | Pass | Local suite submits fictional feedback anonymously through the narrow RPC and verifies idempotency. |
| 14 | Owner reads feedback | Pass | Local suite verifies owner-only feedback visibility and cross-user denial. |
| 15 | Revoke review link and confirm unavailable | Pass | Local suite verifies revoked token read is `null` and feedback submission returns `false`; route uses neutral unavailable response. |
| 16 | Opportunity status updates | Pass | Local suite updates a fictional link from `saved` to `preparing`; owner-only update policy is verified. |
| 17 | Delete source CV and derived data becomes unavailable | Pass | Local suite deletes fictional Storage object/row and verifies removal of report, excerpts, roadmap, draft, provenance, share, feedback, and public-review access. |
| 18 | Desktop and narrow mobile layouts | Follow-up | Static CSS inspection confirms responsive breakpoints at 1120px, 900px, and 680px including opportunity/review layouts. Connected-browser visual review was unavailable; owner must complete it. |
| 19 | Keyboard navigation and visible focus | Follow-up | Global `:focus-visible` styling and input focus styling are present. Connected-browser keyboard traversal was unavailable; owner must complete it. |
| 20 | Empty, loading, retry, expired/revoked, and error states | Pass | Source and unit/local checks cover saved-work empty, report retry/failure, neutral expired/revoked review responses, validation errors, and private-route unauthenticated response. |

## Failures and fixes

| Finding | Resolution | Rerun result |
|---|---|---|
| Private-page no-store behavior needed explicit confirmation during M7 audit. | Added configuration-level no-store headers for API/review routes and retained dynamic/no-store handling for the tokenized page. | Production build and 53 unit tests passed. Local server header probe confirmed API no-store plus browser hardening headers. |
| Connected desktop browser unavailable for interactive visual/keyboard testing. | No code defect inferred. Documented as owner-release follow-up rather than claiming a completed manual visual pass. | Static responsive/focus inspection passed; owner review remains required. |

## Required owner follow-up

Use only the fictional demo pack to test `/assessment`, `/analysis/[id]`, `/analysis/[id]/next-steps`, `/saved-work`, `/opportunities`, and `/review/[token]` on desktop and a narrow viewport. Confirm focus order/visibility, loading and retry messages, long text, empty/error states, external-link disclosure, review revocation, and no disclosure of private workspace content from the reviewer page.
