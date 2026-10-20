# M10.6 — Local Review Verification Runner

**Last reviewed:** 2026-10-03

**Branch:** `codex/exe-web-app-m10-6-review-verify`

**Status:** Engineering verification passed on 2026-10-03. Owner manual review has not been performed. CP2 evidence remains pending and broader M11 product validation remains blocked.

## Command and exact order

From the repository, with dependencies already installed:

```bash
pnpm review:verify
```

The runner executes these existing checks sequentially:

1. `pnpm review:preflight` — existing local-only configuration and fictional fixture/checklist guard.
2. `pnpm lint` — existing ESLint checks.
3. `pnpm typecheck` — existing TypeScript checks.
4. `pnpm test` — full existing automated regression suite, including injected runner tests.
5. `pnpm build` — local production compilation; this does not deploy the app.

Each step has a compact START/PASS/FAIL line and elapsed seconds on completion. Child terminal output is inherited so ordinary errors remain visible. The first failure stops subsequent checks and returns its non-zero exit status; process launch failures or signal termination return 1. A final engineering-only success summary appears only when all five checks pass. Timing is terminal-only; the runner creates no report file.

Implementation uses Node built-ins and shell-free `pnpm` on Linux/macOS. Next.js telemetry is disabled in child processes. The runner has no network client, Supabase/Docker command, installation step, or configuration-value logging. It does not read `.env.local` itself: the existing preflight checks it without echoing values. Existing tests use synthetic local fixtures; the existing preflight checks the fictional DOCX's presence/header. No real CV/JD/research data is inspected or changed. Build/typecheck can produce their normal ignored local artifacts.

## What this deliberately does not check

- Browser rendering, actual mobile viewports, keyboard interactions, zoom, screen-reader behavior, accessibility, usability outcomes, or completion of the actual owner checklist.
- Local Supabase availability, database/API/RLS/Storage integration, backup/retention, or privacy approval. Nothing starts, stops, resets, or modifies Docker/Supabase.
- Hosted Supabase, external AI, payments, job boards, or network services.
- Research quality, real CP2 evidence collection/review, pricing/competitor/market claims, product decisions, or M11 selection. `cp2:validate` is a separate engineering gate check, not part of this five-step runner.
- Owner approval, merge approval, or deployment approval.

A verification pass is **not evidence of manual owner review or CP2 completion**. M11 remains blocked by the documented [decision gate](M9_DECISION_GATE.md).

## Pending owner action — tomorrow's manual session

1. Configure `.env.local` with only the existing local stack's public loopback Supabase URL and publishable key, following [M10.5](M10_5_QA_PREFLIGHT.md). Do not put private credentials or hosted settings there; never paste configuration values into review records or Git.
2. If local Supabase is already running, use that existing stack. An occupied port `54322` is not a reason to start a duplicate instance. If setup is unavailable, record the limitation and resolve the existing local setup before the connected browser flow.
3. Run the safe manual sequence; start the app only after verification succeeds:

   ```bash
   pnpm review:verify
   pnpm dev
   ```

4. Use only `docs/demo/fixtures/aria-vale-fictional-cv.docx` and the associated fictional demo scenario with temporary local fictional accounts. No real CVs, JDs, applications, employer details, participant data, recordings, or external AI calls.
5. Complete the actual checklist in [M10_2_OWNER_REVIEW.md](M10_2_OWNER_REVIEW.md), including every route, viewport, keyboard, zoom, state, and assistive-technology item. Passing automated checks does not fill a checkbox.
6. Record only real results: actual session date, actual viewport width **and height**, actual keyboard actions/input method, actual issues, and actual retests. Mark unperformed activities as “Not performed”; retain unresolved limitations. Do not infer approvals or usability outcomes.

## Engineering handoff and blocked decisions

- **Completed engineering work:** small runner, package command, 10 focused deterministic tests, and owner documentation; actual command results are in [M10_6_REVIEW_VERIFY_ACCEPTANCE.md](M10_6_REVIEW_VERIFY_ACCEPTANCE.md).
- **Not performed:** manual browser/mobile/keyboard/screen-reader/accessibility review, privacy approval, real CP2 research/review, merge, deployment, or release approval.
- **Pending owner action:** tomorrow's fictional-data checklist, issues, and retests; rerun verification before the session.
- **Blocked decisions:** M11 product-feature selection and evidence-based claims; merge/deployment require explicit owner approval.

**No merge to main. No deployment. Owner approval required.**
