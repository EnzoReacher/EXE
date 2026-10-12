# OwnPath handoff

Published branch: `feat/ownpath-experience-translator`; [draft PR #1](https://github.com/EnzoReacher/EXE/pull/1); audited base `ae2527633733fc5081a96ecb2c16e09081a8c878`. Initial published checkpoint `21845b1e3cdf89be9fdcee04d3a6754bbdada0e7` has the exact tree of local snapshot `c7edaaea3c113e1b321f880c75b9bf88d1f3337e`; code was tested at `074bde4eaae0c59e8acd59efd5f5022134e57295`. Original local history is preserved under `checkpoint/ownpath-experience-translator-local`. Owner approved publication/draft PR on 2026-10-12; no merge/deployment/research/provider decision is implied. Follow current PR HEAD/checks for documentation follow-ups. [STATUS](STATUS.md) records code changes, actual checks and gates; [BACKLOG](BACKLOG.md) records dependencies/file ownership.

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
opencode
```

Select `ownpath-lead`. Verify four discovered agents, four commands and actual loaded permissions; then `/ownpath-audit`, `/ownpath-build OP-11`, `/ownpath-verify`. Installer selects version from the actual local CLI, refuses differing config and does not choose/charge a provider. [Runbook](../ai-factory/AI_FACTORY_RUNBOOK.md) explains shell approvals and limits. OpenCode is not installed in Work, so successful owner-local runtime acceptance remains required.

## Browser acceptance (existing Chromium required)

Stop only the server you started above. Build/start in one terminal; run tests in another:

```bash
pnpm build
pnpm start --hostname 127.0.0.1 --port 3000
```

```bash
pnpm test:translator:browser
```

Tests are loopback-only, fictional and do not start containers or download browsers. Report actual pass/fail; do not treat component tests as browser acceptance. Existing real-stack journeys/policy suite need a configured disposable Supabase stack and established scripts; reuse running local infrastructure without reset or duplicate containers. No migration is needed for Translator.

## Decisions only the owner/team can complete

Actual CP2 evidence review and course/deadline requirements; consented user-study execution; browser/Factory/manual acceptance; real-data privacy/retention; approved provider/model/budget if wanted; final merge/deploy decision. These are not silently approved by this prototype. Continue synthetic fixes independently while collecting those records; do not fabricate interviews, signatures or mentor transcripts.
