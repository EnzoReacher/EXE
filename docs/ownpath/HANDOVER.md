# OwnPath handoff

## Current continuation — 15 October 2026

Owner decision supersedes old preserve-all-routes guidance: reduce the active app to the Experience Translator journey. Current personal branch `feat/ownpath-backend` starts at integration `d1ec1a076155b76a503693ff9fe411b933b62f8c`, in `/home/enzoreacher/EXE-ownpath-backend`; original `/home/enzoreacher/EXE` remains at clean M17 `ae25276`. New PRs target `feat/ownpath-experience-translator`. Existing PR #1 remains draft against `codex/exe-m17-survey-readiness`.

First implementation slice is published in [draft PR #2](https://github.com/EnzoReacher/EXE/pull/2), source `f3ed7ad`: move requirement extraction to `src/lib/job-description/`, migrate its existing three tests there and point both core and legacy consumers at the single implementation. Core public types/props/labels are unchanged. Legacy routes, Auth and packages remain active at this slice. [BACKLOG](BACKLOG.md) contains the keep/cut inventory, CF checklist and exact frontend coordination request; [ARCHITECTURE](ARCHITECTURE.md) freezes the current contract. Fresh execution evidence belongs in the current section of STATUS.

Teammate branches `feat/ownpath-ui-shell` and `feat/ownpath-translator-ui` are not published as of the audit; local-only work is unknown. Frontend owners must reconcile their current local work before the route/shell removal batch. No external team messages sent. Next safe backend work: audit/retire obsolete API handlers and tests in dependency batches while preserving modules still imported by frontend pages. Broad library/package/Auth removal follows the coordinated route patch.

Local OpenCode reports `v2.0.7`. No Factory generated files/settings were installed or changed and no delegation/independent review occurred in this slice. Earlier V1 configuration acceptance below is historical. Physical device, screen-reader, actual zoom, real clipboard denial and owner walkthrough remain pending.

## Historical published prototype handoff

Published branch: `feat/ownpath-experience-translator`; [draft PR #1](https://github.com/EnzoReacher/EXE/pull/1), based on cumulative M17 `ae2527633733fc5081a96ecb2c16e09081a8c878`. **Automated acceptance checkpoint is `d2979c6a8c074dabe245ba5fa79991d65ae6de93`**, tree `10b12995c74476b99cf5353367b07d52f190181d`: 429 tests / 54 files, lint/types/build, seven compiled Translator cases / 30 steps (four widths plus keyboard-only, injected clipboard failure and long-source layout) and disposable Supabase/legacy regression all passed. See [acceptance run](https://github.com/EnzoReacher/EXE/actions/runs/38219710485) and [STATUS](STATUS.md) for exact Quality runs and boundaries. Documentation-only follow-ups may advance HEAD. Original worktrees/local histories are preserved. Owner approved branch publication/draft PR; merge, deployment, research and provider decisions remain separate. [BACKLOG](BACKLOG.md) records issue dependencies/file ownership.

Reference review: [F-Career Bridge QN](REFERENCE_REVIEW_FCAREER.md) records reusable safeguards and scope decisions. No F-Career product code or stack was copied into the prototype.

## Earlier local patch handoff (optional)

The previously supplied `OwnPath_Translator_2026-10-12.zip` preserves the initial local snapshot and its historical publication-blocker note. Prefer the published branch below for current documentation. If using the archive offline, follow README_APPLY, start from the exact audited base and run `git apply --check`; preserve current modified/untracked work. The patch contains no dependencies, environment settings or Git credentials.

## Bring the published review branch to the development machine

```bash
cd ~/EXE
git status -sb
git fetch origin
git worktree add ../OwnPath-Translator feat/ownpath-experience-translator
cd ../OwnPath-Translator
pnpm install --frozen-lockfile
pnpm dev --hostname 127.0.0.1
```

Open `http://127.0.0.1:3000/experience-translator`. This fictional-data prototype does not require Supabase settings or sign-in. Any existing configured Auth proxy remains unchanged. If the branch is already checked out, use its existing worktree; if the port is in use, select a free port, do not kill another project's server. Keep real CV/JD data out of this demo.

## OpenCode setup / next issue

```bash
opencode --version
node scripts/setup-ownpath-factory.mjs
node scripts/setup-ownpath-factory.mjs --write
node scripts/verify-ownpath-factory.mjs
opencode
```

Select `ownpath-lead`. Inspect four discovered agents, four commands and actual loaded permissions; then `/ownpath-audit`, `/ownpath-scope`, and `/ownpath-build <authorized issue>` only when there is a concrete remaining issue. OP-11 automated acceptance is complete; do not restart it from an old handoff. Use `/ownpath-verify` for current evidence. Installer selects version from the actual local CLI, refuses differing config and does not choose/charge a provider. [Runbook](../ai-factory/AI_FACTORY_RUNBOOK.md) explains shell approvals and limits. Official OpenCode 1.18.35 was tested in an isolated scratch fixture: agent/command discovery and loaded permission rules passed without model calls. Owner-local global/MCP settings, real permission prompts/tool resource matching and V2 runtime remain unverified.

## Browser acceptance (existing Chromium required)

Stop only the server you started above. Build/start in one terminal; run tests in another:

```bash
pnpm build
pnpm start --hostname 127.0.0.1 --port 3000
```

```bash
pnpm test:translator:browser
```

Tests are loopback-only, fictional and do not start containers or download browsers. Current CI already passed the actual compiled browser bodies at four widths plus three focused cases; rerun locally only for relevant changes or manual investigation. Report actual pass/fail; do not treat component tests or `--list` as browser acceptance. Existing real-stack journeys/policy suite passed on disposable CI. Local repetition needs a configured disposable Supabase stack and established scripts; reuse running local infrastructure without reset or duplicate containers. No migration is needed for Translator.

## Decisions only the owner/team can complete

Actual CP2 evidence review and course/deadline requirements; consented user-study execution; physical mobile keyboard/screen-reader/zoom walkthrough and owner-local Factory settings/execution; real-data privacy/retention; approved provider/model/budget if wanted; final merge/deploy decision. These are not silently approved by this prototype. Continue synthetic fixes independently while collecting those records; do not fabricate interviews, signatures or mentor transcripts.

## CI and manual follow-up

Scoped code/test/config pushes automatically run compiled Translator plus the reusable backend acceptance workflow. Both jobs have separate temporary infrastructure and cleanup; no production settings/data or browser failure screenshots are uploaded. Legacy regression stays serial because it shares fictional actors. Exact source SHA/run evidence is in STATUS.

For manual checks, use the fictional demo at 200% zoom, a physical mobile keyboard and a screen reader; inspect tab order, labels, source disclosure, heading focus and clipboard-denial fallback. Record actual observations using RESEARCH_PLAN. These remain open even with green CI. Synthetic OP-13 demo/handoff is ready; actual OP-12 study and final release decision are not completed by automation.

The next owner-local actions are concrete in [MANUAL_ACCEPTANCE](MANUAL_ACCEPTANCE.md); its outcome rows remain NOT RUN until executed. [PILOT_PROTOCOL](PILOT_PROTOCOL.md) defines E01 task sheets/counterbalance/scoring and blank private worksheets; it supplies no participant outcomes.

## Resumed QA evidence

Question-specific Skip accessible names and scoped long-source wrapping are included in the tested source. Browser question-input selectors use exact labels to avoid matching named Skip controls. All seven cases share automatic traffic/input-sentinel/socket/page-error guards and passed actual compiled execution with cleanup. QA reviewed the selector correction read-only. Injected clipboard rejection is failure-path coverage; retain blank manual outcomes until actual owner/device checks. See TEST_STRATEGY and STATUS for source/run IDs and the first-run selector failure.

## Next workflow: actual sessions and private analysis

[PILOT_DATA_RUNBOOK](PILOT_DATA_RUNBOOK.md) makes E02/E03 execution preparation concrete: create a blank worksheet outside Git, record only actual eligible/retained observations after owner consent/rubric decisions, then generate a new private aggregate draft. Tool checks preserve attempted failures/time caps, explicit missing slots, pending claim review, comparator family mix, separate help/fact access, generated safety findings and within-pair differences. It does not conduct or approve a study. Review consent/completeness/scoring/anonymity before adding genuine summaries to existing CP2 records. No participants or outcomes have been added; manual/research/release gates remain open.

Private instrument preparation passed 12 focused tests and full 429/54 tests, lint/types/build, both Quality runs and compiled/backend/cleanup acceptance at `d2979c6` (exact source/tree/run IDs in STATUS). Template and private file/diagnostic behavior were exercised by actual CLI subprocess regression cases, not participant sessions. Preparing the instrument closes no actual-study gate.
