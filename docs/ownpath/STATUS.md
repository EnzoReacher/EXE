# OwnPath implementation status — 2026-10-12

Synthetic engineering preparation and first vertical slice completed. **Not a production release, AI-provider deployment, owner research approval or completed course checkpoint.**

**Published review checkpoint:** `21845b1e3cdf89be9fdcee04d3a6754bbdada0e7` on `feat/ownpath-experience-translator`, [draft PR #1](https://github.com/EnzoReacher/EXE/pull/1), based on cumulative M17. The owner explicitly approved remote branch publication and draft PR on 2026-10-12. Its Git tree exactly matches tested local snapshot `c7edaaea3c113e1b321f880c75b9bf88d1f3337e` (`49e5c79514ba19ae84015cfdeb9b96b0caab001e`); implementation test checkpoint was `074bde4eaae0c59e8acd59efd5f5022134e57295`. The original local history is preserved on `checkpoint/ownpath-experience-translator-local`. Initial automatic approval rejection is historical; after explicit approval, Git CLI publication lacked credentials, so the authenticated GitHub connection published the verified tree. No merge/deploy, research or provider approval was supplied. Later documentation-only commits may advance branch HEAD; PR checks report the exact current SHA.

## Observed repository state / base decision

- Repository: `EnzoReacher/EXE`, default branch `main` at `d956118e3b89eb1fdcfd10fb48a45ba150fec20a`; main is the older documentation foundation, not the cumulative app.
- Fresh `git fetch origin`, connector repo/branch queries and local branch/history inspection confirmed cumulative `codex/exe-m17-survey-readiness` at **`ae2527633733fc5081a96ecb2c16e09081a8c878`**. It contains M18 `ec563c8666cc5ddae14949586b542334a096750e` and later survey/status work. This is the selected base, not an assumed M18 HEAD.
- New isolated worktree `/workspace/scratch/beb51ea3bd99/EXE`, branch **`feat/ownpath-experience-translator`**. Original clean M17 checkout was not switched; original dirty M15 snapshot and its modified/untracked files were not changed.
- Pre-change GitHub Quality run [37427631042](https://github.com/EnzoReacher/EXE/actions/runs/37427631042) passed on M17 `ae25276`. Historical CI is not proof of this feature's acceptance. New Quality runs [push](https://github.com/EnzoReacher/EXE/actions/runs/38197145020) and [draft PR](https://github.com/EnzoReacher/EXE/actions/runs/38197173911) were observed running on published checkpoint `21845b1`; terminal results and current-head checks are reported in PR #1/final handoff.
- Eight existing migrations retained unchanged. No DB/Storage/RLS/Auth API modifications. Existing exact-excerpt and credential/export acceptance rules preserved.
- Installed stack: Next 16.3.7, React 19.2.8, TypeScript 5.9.3, Supabase JS 2.117.2/SSR 0.12.7, pnpm 11.25.0, Vitest 5.0.2, Playwright 1.61.1. Read installed Next docs for client boundaries/forms/pages/headers before coding. Actual PostgreSQL server and owner OpenCode versions were not available.

## Delivered

1. OwnPath branding, primary Translator landing/demo route, existing private features retained.
2. `/experience-translator`: bounded project/JD → selected questions/skip → exact-source personal fact confirmation → 0–3 English local-template bullets → source/JD relevance → edit/reject/regenerate → individual acceptance → copy/local TXT → clear. No CV prerequisite, database save, external provider or URL fetching.
3. Provenance/schema/template guards, negation/actor/instruction constraints, contextual technology links, frozen adapter inputs, timeout/abort/bounded retry, stable regeneration. Edited text is human wording, with approval invalidated; detached edits retained without current provenance.
4. PRD/frozen scope/persona/JTBD, ADR/reuse/contracts/threat model/data relationships, seven Mermaid diagrams (four in FLOWS, two in ARCHITECTURE, Gantt in BACKLOG), dependency issues/estimates/rollback/gates, research instruments, alternative source observations, test plan, demo/pitch and handoff.
5. Version-aware Factory installer: four roles and four commands, V1/V2 templates, no overwrite of differing configs/AGENTS, symlink refusal, dry-run/idempotency, read-only reviewers, restricted writer, env/PEM read denial, grep disabled, shell approval for executing writable scripts. **Prepared, not installed in OpenCode here.**

## Fresh validation

| Check actually executed | Result / boundary |
|---|---|
| `pnpm install --frozen-lockfile` | Passed; dependency lock unchanged. Initial offline attempt failed due absent cached metadata, then normal installation passed supply-chain policy. |
| Pre-change `pnpm test`, `pnpm lint` | Passed: 349 tests / 48 files; lint clean. |
| Final `pnpm test` | **Passed: 403 tests / 51 files** (54 new tests). Includes old unit/integration/component regression. No external model calls. |
| Independent QA targeted Vitest | **Passed: 54 tests / 3 files**, read-only reviewer; no unresolved blocker in synthetic scope. |
| `pnpm lint`, `pnpm typecheck` | Passed. Fresh build additionally completed TypeScript checks. |
| `pnpm build` | Passed; `/experience-translator` built, existing routes retained. Build output is not a deployment. |
| Translator Playwright `--list` | Config/test discovery passed for four viewport cases; no browser body executed. Existing reporter's 'passed' listing output is not browser acceptance. |
| CP2 collected-register validator | Passed structural checks: 9 rows, 0 owner-reviewed, 9 pending. |
| Source-log validator with explicit file | Passed completeness checks; 2 new provisional official-page observations, original publication metadata unknown, not new register evidence. |
| `node --check scripts/setup-ownpath-factory.mjs`, `git diff --check` | Passed. |
| `node scripts/setup-ownpath-factory.mjs` | Controlled exit 1: OpenCode absent, no configuration activated/written. Installer behavior covered by tests. |
| `pnpm test:translator:browser` | **Not run**: no Chromium installation/approved browser surface. Four loopback-only desktop/mobile tests implemented. |
| `pnpm test:e2e:local`, `pnpm test:supabase:local` | **Not run**: no Docker/local Supabase/browser available; no migration or policy changed. Historical backend passes are not current passes. |
| Physical mobile keyboard / screen reader / manual owner walkthrough | Not performed. |
| Feature GitHub Actions / draft PR | Draft PR #1 created after explicit owner approval. Quality push/PR runs started for the verified published snapshot; inspect current-head checks for terminal results. Backend/browser workflow is not automatically triggered on this feature branch. |

Initial lint found one unescaped JSX apostrophe; corrected. Adversarial QA exposed actor/curly-negation/authoring/technology/reference/error-target/React.js and stale-edit defects that initial tests missed. All were fixed with regressions before final green results. The final fixture result is not a guarantee of universal semantic correctness.

## Research / gates

| Gate | State |
|---|---|
| A Repo audit | Observed, complete for accessible repo/CI/source; local owner runtime unseen |
| B Scope/research | Owner handoff supplies planning direction and synthetic authorization; formal CP2/production approval remains pending |
| C Architecture/design | Documented proposed design, synthetic in-memory implementation; owner design acceptance pending |
| D Controlled feature tests | Passed in synthetic fixtures; no unsupported claims in that tested set |
| E Independent QA/security | Synthetic code review passed; browser/mobile and real-stack acceptance outstanding |
| F Release | Draft review branch only; owner merge/deploy decision absent |

Existing CP2 register: nine public-source rows, zero owner-reviewed; no recorded real TU/EX/SV results. New Rezi/Teal public-page observations are provisional source-log items, not participant evidence or approval. No audio transcript supplied/verified. Actual owner signature/date fields in M10 remain blank. No recruitment messages sent.

## Material limits and next task

- Narrow deterministic grammar may omit genuine facts or produce fewer bullets. Templates provide no general AI translation or arbitrary-model semantic verification. Do not advertise an AI model that has not been approved/wired.
- Inputs/edits remain in React memory. Clipboard/TXT are user actions; reload/clear discards session. Supabase proxy can refresh existing Auth on navigation if configured, but does not receive project/JD input. Production retention/backup remains unreviewed.
- OP-00/01/03 planning + OP-04–10 synthetic slice are prepared/implemented; OP-11 code checks/review passed with browser/backend limits. OP-02 real research/alternative trials, OP-12 actual usability and OP-14 provider remain pending. OP-13 synthetic demo/handoff ready; real release blocked.
- Next: **OP-11 owner-local browser/Factory acceptance**, then actual user research/course decision. Use HANDOVER and AI_FACTORY_RUNBOOK exact commands. Preserve existing local worktrees; no main merge, deployment, paid model connection or real data introduced by this work.
