# DBG-01 / DBG-02 / DBG-03 — debugging batch

## Fixed baseline and preservation

- Branch: `feat/ownpath-backend`, existing draft [PR #2](https://github.com/EnzoReacher/EXE/pull/2) against `feat/ownpath-experience-translator`.
- Found existing backend worktree at `7d7d4014aec2f2de52bd5fa4b7fe18ad4af1b778`; preserved eight untracked `.opencode/` agent/command profiles and the original M17 worktree.
- Fetched origin; divergence count was `0 1`; safely fast-forwarded to actual fixed task baseline **`c3d8ae9795c19506a33cc0d33c292878aa484bf4`**. Incoming commit contained debugging instructions only.
- Baseline exact-head Quality PR/push checks were successful (runs `38712669937` and `38712664302`).
- Read project instructions, PRD, architecture, team workflow, current backlog/status/handoff, and installed Next production-browser/type-generation guides. Reused installed dependencies and cached matching Chromium; no configuration installation.

## Task cards

| Card | Reproduction / expected correction | Permitted writer files | Verification / rollback |
|---|---|---|---|
| DBG-01 | `Mình làm danh sách sản phẩm bằng React và An làm tìm kiếm.` must not offer or compose An's search work as personal evidence. Conservative rejection with existing clarification is allowed. | `engine.ts`, colocated grounding regressions | RED before fix; absent search before confirmation and after composition; Vietnamese actor/separator variants, genuine first-person coordination, exact source offsets. Revert scoped source commit. |
| DBG-02 | `I built product listing using React or TypeScript.` must not become cumulative React-and-TypeScript facts or bullets. | Same engine/regression files | RED before fix; English/Vietnamese alternatives, JD-only relevance and conjunction/word-boundary positives. Revert scoped source commit. |
| DBG-03 | Shell must own explicit root page/layout colocated tests including `src/app/page.test.tsx`. | `scripts/check-ownpath-ownership.mjs` and its test | RED before fix; explicit allowance plus backend/Translator, frontend/API/types/config/workflow/traversal/profile denials. Revert scoped source commit. |

One `ownpath-engineer` implementation writer, read-only `ownpath-auditor`, and separate read-only `ownpath-qa` actually executed for this batch. Lead coordinated verification and documentation. **Final source: `55d29cc8cbba3fccbd7091755cbbc43ebef007d0`.** Later evidence/handoff commits are docs-only.

## Reproduction and bounded corrections

The writer ran these commands before the corresponding fixes (name-filtered skipped tests are not counted as executed):

```text
pnpm exec vitest run src/lib/experience-translator/hardening.test.ts -t DBG-01
  Test Files 1 failed; Tests 5 failed | 35 skipped (40)
  Original assertion: expected ['react', 'listing', 'search'] not to include 'search'.

pnpm exec vitest run src/lib/experience-translator/hardening.test.ts -t DBG-02
  Test Files 1 failed; Tests 5 failed | 1 passed | 34 skipped (40)
  Original assertion: expected personal React/TypeScript facts to equal [].
  Contextual alternative-answer control already passed before the fix.

pnpm exec vitest run scripts/check-ownpath-ownership.test.mjs -t DBG-03
  Test Files 1 failed; Tests 1 failed | 1 passed | 2 skipped (4)
  Root shell test allowance: expected false to be true.
```

Original exact outputs remain in local `/tmp/opencode/ownpath-dbg-01-red.log`, `ownpath-dbg-02-red.log`, `ownpath-dbg-03-red.log`. They contain synthetic fixtures only.

- DBG-01: reject supported mixed-actor coordinated clauses in English/Vietnamese without naming particular people; retain personal subjects, subjectless personal actions, lists and exact source linkage.
- DBG-02: reject personal excerpts containing alternative connectors between adjacent supported technology mentions. The guard is not applied to JD relevance and does not ban `or` substrings/unrelated prose.
- DBG-03: explicitly allow only root `page.test.tsx` and `layout.test.tsx` for shell; preserve the guard's other path/role exclusions.

Initial focused GREEN was 91 tests / 3 files; initial full suite 450 / 53, lint and typecheck passed. These preceded the QA test-fixture correction and are distinguished from final checks below.

### Separate QA correction and unrelated limitation

Read-only QA identified an invalid positive control: `I built product listing or search using React and TypeScript.` asserted both actions as supported. The same writer replaced it with affirmative listing/tool evidence followed by unrelated `for sorting or filtering`, retaining provenance checks. This corrects the test without expanding the runtime change.

**Open follow-up for the domain owner:** action alternatives such as `listing or search` remain a known bounded-grounding limitation; this batch handles technology alternatives only. Do not treat the removed positive assertion as a product guarantee or mark that separate limitation fixed. Later frontend/integration/Auth/package/factory/deployment tasks remain open.

## Compiled acceptance executed by Lead

Sanitized production build command (exit 0):

```text
env -i HOME="$HOME" PATH="$PATH" TMPDIR=/tmp/opencode NEXT_TELEMETRY_DISABLED=1 pnpm build
  Next.js 16.3.7; Compiled successfully; TypeScript complete; 11/11 static pages generated.
```

No root `.env` files other than the unused example were present. An external disposable runner invoked the existing browser package command directly, without invoking or bypassing the CI-only runner or setting CI variables. It used an explicit environment allowlist, an unused numeric-loopback port and the current checkout's compiled build. Matching cached Chromium was reused. `TMPDIR=/tmp/opencode` aligned the existing owned-temp validator with an alphanumeric generated directory suffix.

```text
Owned settings-free compiled server: http://127.0.0.1:33757
HTTP 200 / CTA smoke PASS: /
HTTP 200 / CTA smoke PASS: /experience-translator
Retired API acceptance PASS: 119 HTTP checks across 17 route patterns.
Browser suite result: passed. Screenshots/traces/videos disabled.
DBG compiled acceptance PASS
Owned server/browser/download/results scope cleaned in finally
```

Actual **seven Chromium cases / thirty named steps** executed: widths 320/375/768/1440 each completed intake, interview, generated/edit/regenerate, accepted TXT and clear/reload; keyboard completed four steps; injected clipboard rejection completed three; long-content completed three. Existing traffic/socket/page-error guards and golden exact wording remained intact. API source/build inventory and 17 × 7 actual HTTP probes passed. No UI/spec/config changes or browser installation were needed. Full exact local outputs: `/tmp/opencode/ownpath-dbg-build.log` and `/tmp/opencode/ownpath-dbg-acceptance.log`. No failed compiled launch occurred in this batch. Cleanup ran in `finally`; only owned server/browser/temp scope was stopped/removed. Execution logs and runner remain under `/tmp/opencode` as local debugging evidence, outside source commits.

This is automated synthetic acceptance. It establishes no physical-device, actual zoom/screen-reader, real clipboard permission, research, legacy authenticated API-flow, deployment or broader Factory-runtime result.

## Retained checks and ownership boundary

Lead's sanitized quality runner executed `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`, each exit 0. The full suite reports **450 tests / 53 files** (424 baseline + 24 grounding cases + 2 ownership cases). No prior assertions were removed. Following the QA fixture-only correction, both the affected suite and full retained suite were rerun successfully:

```text
pnpm exec vitest run src/lib/experience-translator/engine.test.ts src/lib/experience-translator/hardening.test.ts scripts/check-ownpath-ownership.test.mjs
  engine 43 PASS; hardening 44 PASS; ownership 4 PASS
  Test Files 3 passed; Tests 91 passed; exit 0

env -i HOME="$HOME" PATH="$PATH" TMPDIR=/tmp/opencode NEXT_TELEMETRY_DISABLED=1 pnpm test
  Test Files 53 passed; Tests 450 passed; exit 0

git diff --check
  exit 0
```

Exact post-QA logs: `/tmp/opencode/ownpath-dbg-focused-green-postQA.log` and `/tmp/opencode/ownpath-dbg-test-postQA.log`. The compiled acceptance runner invoked `node scripts/check-ownpath-retired-apis.mjs http://127.0.0.1:33757` and `pnpm test:translator:browser` with `OWNPATH_TEST_URL` and valid `OWNPATH_BROWSER_TEMP`; the external runner command was `TMPDIR=/tmp/opencode node /tmp/opencode/ownpath-dbg-acceptance.mjs`. Runtime engine/ownership SHA256 matched the compiled acceptance checkpoint after the fixture-only correction. No post-correction browser rerun is claimed.

Active-tree preflight against the fixed baseline reports **FAIL**, precisely for these preserved local paths:

```text
.opencode/agents/ownpath-auditor.md
.opencode/agents/ownpath-engineer.md
.opencode/agents/ownpath-lead.md
.opencode/agents/ownpath-qa.md
.opencode/commands/ownpath-audit.md
.opencode/commands/ownpath-build.md
.opencode/commands/ownpath-scope.md
.opencode/commands/ownpath-verify.md
```

Profile checksums still match the pre-implementation snapshot. The policy was not weakened and local profiles were not removed, ignored or committed. Separate clean detached source check at `55d29cc8cbba3fccbd7091755cbbc43ebef007d0` ran:

```text
node scripts/check-ownpath-ownership.mjs backend c3d8ae9795c19506a33cc0d33c292878aa484bf4
  Ownership PASS (backend): 4 changed/untracked paths within assigned boundaries.
```

The owned detached worktree was removed normally in `finally`. Complete implementation diff contains only the four permitted implementation/test files; remaining changes are canonical docs. Frontend, types, public interfaces/IDs/labels, adapter/review, Auth/packages/config/workflows/migrations were untouched.

## Actual independent review and recovery

Actual `ownpath-auditor` performed a read-only acceptance-prerequisite audit. Separate `ownpath-qa` reviewed the complete baseline diff, current four source/test files and exact execution logs supplied in a generated temporary in-repository review artifact (removed after review). Final QA returned **PASS on DBG-01/02/03**, no remaining scoped blocking finding, with the known action-alternative limitation explicitly retained. QA did not independently execute shell/tests, verify Git identities/hashes or rerun the browser. Lead's logs underpin those execution results.

Across the parent interruption, the original engineer invocation remained stalled. Lead interrupted only that owned child via the documented API (`interrupted: true`), then resumed the same writer synchronously for the final fixture correction. No global settings, service restart, new writer, factory installation or broader verifier work occurred. This recovery and the initial rejected fixture are failed/intermediate attempts, not concealed as first-try success.

## Publication / CI

Source checkpoint: **`55d29cc8cbba3fccbd7091755cbbc43ebef007d0`**. Canonical evidence/handoff updates are docs-only. Publication uses normal non-force push on the existing backend branch and maintains draft PR #2 against integration. Exact published-head Quality results are recorded on the PR and in the final documentation checkpoint; they are distinct from actual local compiled-browser execution.
