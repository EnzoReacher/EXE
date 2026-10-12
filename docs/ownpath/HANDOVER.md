# OwnPath handoff

Local branch: `feat/ownpath-experience-translator`; audited base `ae2527633733fc5081a96ecb2c16e09081a8c878`; tested code commit `074bde4eaae0c59e8acd59efd5f5022134e57295`. GitHub push was blocked by automatic approval review, so no remote feature branch, PR or feature CI is claimed. The accompanying patch can be reviewed/applied locally while remote publication awaits explicit confirmation. [STATUS](STATUS.md) records code changes, actual checks and gates; [BACKLOG](BACKLOG.md) records dependencies/file ownership.

## Apply the local handoff before remote publication

Extract `OwnPath_Translator_2026-10-12.zip`; follow its `README_APPLY.md`. Create a separate worktree at the exact audited base and run `git apply --check` before applying `OwnPath_Translator.patch`; preserve current modified/untracked work. The patch contains only this branch's changes, no dependencies, environment settings or Git credentials.

## Bring the review branch to the development machine (after authorized publication)

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
