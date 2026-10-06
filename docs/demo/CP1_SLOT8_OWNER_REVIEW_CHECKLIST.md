# CP1 Slot 8 Owner Review Checklist

Complete this review before presenting or approving the M5 package. A checked item is not permission to merge or deploy.

**Current M17 handoff — 2026-10-06:** perform this fictional walkthrough on verified M16 `codex/exe-m16-pilot-readiness` (`ca4046010d23f1a4da0d21567e8e07e66eec9c7d`) or its documentation-only M17 descendant. Record actual branch/SHA, reviewer role/date, browser/device/input, observations and team/course evidence in the [existing review packet workflow](../evidence/CP2_GATE_RECONCILIATION_2026-10-05.md). Historical M5 package lineage remains available; no manual CP1 result is supplied by M16 automation.

## Demo scope and data

- [ ] The presentation uses only the Aria Vale fictional CV/JD pack or equally fictional, reviewed material.
- [ ] No real CV, job description, name, email, credential, interview data, screenshot, token, API key, or browser history is visible.
- [ ] The demo runs from the verified current feature line above, and its branch/SHA is recorded.
- [ ] The fictional local account works and is not a public authentication bypass.
- [ ] Uploading `docs/demo/fixtures/aria-vale-fictional-cv.docx` succeeds and reaches **Processed**.
- [ ] The fictional target job saves successfully.

## Core flow

- [ ] The evidence report creates successfully.
- [ ] The report visibly distinguishes this fixture's supported, unclear, and no-CV-text-found findings. Partly supported is another available state, but is not demonstrated by this fixture.
- [ ] At least one evidence excerpt and its traceability are shown.
- [ ] The presenter states that the report does not verify skills, predict hiring, or guarantee an outcome.
- [ ] The roadmap and source-grounded CV draft create successfully.
- [ ] The provenance list is visible and the presenter explains that the draft does not invent claims.
- [ ] Saved work works if it is included in the presentation.

## Quality and presentation

- [ ] `pnpm test` passes.
- [ ] `pnpm lint` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm build` passes.
- [ ] `node --check scripts/m1-local-policy-check.mjs` passes.
- [ ] `git diff --check` passes.
- [ ] `pnpm test:supabase:local` passes when the local stack is available, using temporary fictional data only.
- [ ] Home, assessment, report, next steps/draft, and saved work were reviewed at desktop and narrow mobile width.
- [ ] Long filenames and long role titles remain readable; loading, empty, and error states remain understandable.
- [ ] Keyboard focus is visible and status labels do not rely only on colour.
- [ ] All product, privacy, pricing, and market claims are accurate and bounded.
- [ ] The presenter has read the 3–5 minute runbook and knows the static-walkthrough failure plan.

## Release boundary

- [ ] No pull request was created, merged, or approved as part of this work.
- [ ] No deployment, publishing, payment feature, public demo bypass, or real-data test was performed.
- [ ] The owner understands that final privacy/security review, backup/retention review, CP2 research, and explicit owner approval remain required before merge or deployment.
