# M7 Owner Review — Internal Release Candidate

## Current testing handoff — 2026-10-06

Use the complete workspace on `codex/exe-web-app-m15-complete-workspace` and [M15 update, migration and test instructions](M15_COMPLETE_WORKSPACE.md) for the next owner test session. The M7 record below is historical; its manual checklist remains useful. Actual manual outcomes have not been recorded by automation.

**Historical M7 branch:** `codex/exe-web-app-m7`
**Baseline:** M6b commit `4527301`  
**Release state:** Ready for owner review only. No merge, production environment, deployment, or public release has occurred.

## A. What is complete

- **M0–M4:** responsive Next.js workspace; private authenticated CV/JD intake; PDF/DOCX validation and parsing; deterministic evidence reports; four evidence states with excerpts; roadmap; source-grounded editable draft; and private saved-work summaries.
- **M5:** fictional-only CP1 demonstration materials in `docs/demo/`, including fictional DOCX fixture, runbook, safety wording, environment checklist, and owner checklist.
- **M6a:** selected completed-report review links with one-time 256-bit token creation, SHA-256 hash storage, expiry, revocation, optional accepted draft, scoped advisory feedback, neutral unavailable states, and narrow anonymous RPC projection.
- **M6b:** private HTTPS opportunity-reference tracker with owner-only status updates and deletion; no fetching, scraping, vacancy verification, recommendation, job-board integration, or real curated sources. The future source contract is deliberately empty.
- **M7 release checks:** full route/data-boundary audit, browser hardening headers, API/review no-store policy, fictional-data acceptance record, and GitHub Actions quality workflow.
- **Automated checks:** `pnpm test` passed **54 tests in 11 files**; `pnpm lint`, `pnpm typecheck`, `pnpm build`, `node --check scripts/m1-local-policy-check.mjs`, and `git diff --check` passed.
- **Local acceptance:** `pnpm test:supabase:local` passed using temporary fictional local accounts. It verifies RLS/private Storage, unauthenticated and cross-user denial, review-token isolation/revocation/expiry, feedback isolation, opportunity isolation, and source-data cascades.
- **CI:** `.github/workflows/quality.yml` runs lockfile install, tests, lint, typecheck, build, script syntax, and whitespace checks on pushes and pull requests. It has no deploy step, secret, hosted database, or external provider.

## B. What the owner should review manually

Use **only** `docs/demo/` fictional data and a local environment.

1. **Core flow:** sign in locally; upload the fictional DOCX; save the fictional target job; create/open the evidence report; create roadmap/draft; edit, save, and accept the draft.
2. **Student/recent-graduate clarity:** assess whether instructions, privacy notices, advisory boundaries, and labels are understandable without implying skill verification, hiring likelihood, or a guaranteed outcome.
3. **Report language:** review supported, partly supported, unclear, and missing wording, evidence excerpt traceability, and the statement that absence of text is not absence of skill.
4. **Roadmap and draft usefulness:** verify actions feel tied to findings and that draft provenance/acceptance makes user responsibility clear.
5. **Saved work:** open report and next steps from history; inspect empty, loading, failed/retry, and long-title behavior.
6. **Opportunity tracker:** add/edit/status-update/delete a fictional HTTPS reference; check external-link disclosure, long URL/note wrapping, and empty/error states. Confirm the UI does not imply the link is verified, open, suitable, or matched.
7. **Private review link:** create a link, verify it exposes selected content only, submit fictional feedback, view it as owner, revoke it, and confirm the neutral unavailable state. Confirm no reviewer path links to owner workspace.
8. **Desktop and narrow mobile:** perform a connected-browser visual review for all routes above, including long text and controls at narrow width.
9. **Keyboard and focus:** tab through forms, controls, confirmation actions, and feedback form; verify focus is visibly maintained and all actions are reachable.
10. **Privacy notices:** confirm copy is accurate for the intended local/prototype state and makes no security certification or legal-compliance claim.

## C. Decisions still required

- Whether to select an external AI provider; do not connect one without approved privacy, consent, retention, cost, and output-evaluation decisions.
- Data-retention, deletion, and backup policy before any real CV is accepted.
- Target segment and job family after CP2 evidence.
- Pricing and value proposition after CP2 research; no pricing, lower-price, market, or competitor claims are approved now.
- Whether real curated opportunity sources should ever be enabled; requires CP2 support, source verification, documented team approval, and ongoing review.
- Whether to merge this branch.
- Whether to deploy after every release gate below is satisfied.

## D. Explicit release gate

Deployment requires **all** of the following:

- [ ] Owner approval.
- [ ] Fictional-data acceptance passed **and** the manual visual/keyboard follow-up is completed and recorded.
- [x] M1–M6b local Supabase acceptance passed, or any inability to run it explicitly reviewed.
- [ ] Privacy, data-retention, deletion, and backup decision recorded for real CVs.
- [ ] CP2 research claims clearly separated from assumptions.
- [ ] Final branch review completed.
- [ ] Explicit decision to merge and deploy.

Until every item is complete, the next action is owner review—not automatic release.
