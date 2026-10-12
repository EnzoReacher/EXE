# OwnPath handoff

Published branch: `feat/ownpath-experience-translator`; [draft PR #1](https://github.com/EnzoReacher/EXE/pull/1), based on cumulative M17 `ae2527633733fc5081a96ecb2c16e09081a8c878`. **Automated acceptance checkpoint is `c89fc32b28ca015f0ffbf5c60ee5d70709295e43`**, tree `cd4a7ef9eba13bf2d533bbc367acd4e576293e30`: 417 tests / 53 files, lint/types/build, seven compiled Translator cases / 30 steps (four widths plus keyboard-only, injected clipboard failure and long-source layout) and disposable Supabase/legacy regression all passed. See [acceptance run](https://github.com/EnzoReacher/EXE/actions/runs/38216785533) and [STATUS](STATUS.md) for exact Quality runs and boundaries. Documentation-only follow-ups may advance HEAD. Original worktrees/local histories are preserved. Owner approved branch publication/draft PR; merge, deployment, research and provider decisions remain separate. [BACKLOG](BACKLOG.md) records issue dependencies/file ownership.

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
