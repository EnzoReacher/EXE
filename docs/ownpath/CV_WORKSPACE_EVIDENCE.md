# OwnPath CV workspace — resumed candidate evidence

The subsequent authenticated Account/Profile extension is documented in
[ACCOUNT_PROFILE_EVIDENCE.md](ACCOUNT_PROFILE_EVIDENCE.md). Its scoped baseline
preserves the visual candidate below and its unchanged Scan/Rewrite/print evidence.

## Authenticated visual redesign — 2026-10-20

The approved Scan/Rewrite journey now uses an editorial CV workbench: warm
off-white canvas, 232px forest-green sidebar, white input cards, teal actions,
pale-teal composer and responsive paper preview. The existing local font stack
and CSS line-icon primitives are reused. No remote assets or dependencies added.

**Preservation:** the pre-redesign scoped archive and hashes are at
`.factory/evidence/OWNPATH-VISUAL-20261020/baseline/` (89 files). No baseline file
is missing. Provider, grounding, Auth implementation, storage API/schema and
the `printDocument` renderer are unchanged. The mobile drawer retains its focus
trap and now returns focus after the top bar becomes interactive again.

**Final candidate checks:**

- **55 relevant UI tests / 4 files pass** (Scan/Rewrite, shell, retained saved
  workspace behavior and Auth controls). The previous 872-test core/backend
  evidence below is reused; unchanged backend checks were not rerun.
- **10 compiled-browser checks pass**: six retained functional journeys and four
  visual/state/keyboard journeys at **1440, 1024, 390 and 320px**.
- **2 native password clipboard/Show–Hide browser regressions pass**.
- **Typecheck, lint and production build pass**. Explicit fictional loopback
  settings and disabled OpenAI were used; controlled responses exist only in tests.
- Copy/TXT exactness, save/reopen, conflict recovery, verified signup/signin,
  legacy saved formats, source disclosures and editable instruction starters work.
- Real printed PDFs remain **1 A4 page** for the short fixture and **3 A4 pages**
  for the long fixture. All four rendered pages were inspected. Vietnamese text,
  ownership/negation, all 90 long-fixture responsibilities and the final marker
  survive extraction; no clipping or extra blank pages was observed.

**Screenshot inspection:** input (empty/filled/long), findings, source details,
rewrite composer, complete CV, unsaved/saved edits, saved-list/metadata/loading/
empty/error, account and loading/configuration/recoverable-error states were
captured. Main/content widths do not overflow at any tested width. Scan stays
within a 900px-high desktop viewport; compact layouts stack the composer, and
mobile CV text wraps without forcing an A4 screen width. Long finding titles,
Vietnamese text and saved titles/timestamps remain readable. Mobile drawer
Tab/Shift-Tab wrapping, Escape and trigger focus return pass at 390/320px.

Artifacts: `.factory/evidence/OWNPATH-VISUAL-20261020/` contains logs, actual PDFs,
extracted PDF text, individual screenshots and four-width inspection sheets.
Run `pnpm exec playwright test --config=e2e/workbench-visual.config.mts` using the
existing fictional Auth/REST fixture and compiled app setup.

**Limits:** Chromium desktop emulation is the inspected browser/device evidence.
Role/company are displayed only when already supplied in a saved payload, never
inferred. Earlier read-only formats offer Open CV; version-2 drafts offer Open &
rename. PDF remains honestly labelled **Print / Save as PDF**, using browser print.
No commit, push, deployment, hosted migration or paid product API call occurred.

## Scan & Rewrite candidate — 2026-10-20

The current `/app` replaces the profile-first workflow with explicit
**Scan → Explain → Prompt → Rewrite**, a complete whole-text editor and formatted
preview. Optional save/reopen, TXT/copy and **Print / Save as PDF** follow the core
journey and never call AI. Auth and the server-only provider transport are reused.

- Durable pre-rebuild baseline:
  `.factory/evidence/OWNPATH-SCAN-REWRITE-20261020/baseline/` (283 scoped files,
  archive + SHA-256 manifest). Existing uncommitted work remains the base.
- Retained Vitest suite: **872 tests / 73 files pass**. Includes exact source/JD
  checks, private-line/number/attribution/negation protection, nested saved-payload
  validation, duplicate requests, stale responses, session invalidation, failed
  regeneration and save acknowledgements/retry identity.
- **Lint, TypeScript and production build pass.** Build uses explicit fictional
  loopback Supabase settings and disabled OpenAI; no paid calls or private CVs.
- Compiled browser evidence: **6 journeys pass**: core journey, exact copy/TXT, optional save/reopen,
  revision-conflict recovery, disabled-provider errors, protected routes, immediate
  verified signup, earlier saved formats and multi-page printing. Run with
  `pnpm test:ownpath:browser`; obsolete profile-first journeys are no longer in
  this default browser configuration.
- Native password copy/paste and Show/Hide browser regression: **2 pass**.
- Local PostgreSQL/RLS rollback check: **pass**; no schema changes or hosted writes.
- Actual PDFs: `core-cv.pdf` is **1 A4 page**; `long-cv.pdf` is **3 A4 pages**.
  Extracted text includes Nguyễn An, Vietnamese accents, all 90 long-fixture
  responsibilities and the final content marker. All four rasterized PDF pages
  were visually inspected: no clipping or blank extra pages. Desktop/mobile
  screenshots and PDFs are under the same Scan/Rewrite evidence directory.

**Boundaries:** AI responses are controlled fixtures, not live-model quality
evidence. Exact quotes/numbers and explicit ambiguity guards do not establish
semantic entailment for arbitrary generated wording. Detected negation and
other-person work stay verbatim. Hosted ownership/Auth/recovery and live model
quality remain owner acceptance gates. New version-2 JSON payloads reuse existing
owner-scoped tables and revision checks; old saved records remain viewable.
No commit, push, deployment, hosted migration or real-record deletion was made.

## Historical profile-first candidate (superseded below)

## Current candidate verification — 2026-10-20

Baseline: `/tmp/opencode/ownpath-candidate-baseline-20261020/` (282 scoped
source/config/docs files, SHA-256 manifest and archive; no private environment).
Branch `feat/ownpath-demo-rc`, HEAD `7adbd6b77085318be43d55bff382d74b499e6350`.
Existing uncommitted work is preserved. One writer; no agent team.

- **Already verified:** current retained suite, focused repairs, compiled mocked
  browser journeys, native clipboard regression, image inspection, lint, types,
  production build and local SQL/RLS (details below).
- **Still requires verification:** hosted persistence/direct ownership enforcement,
  complete real-provider Auth/recovery, actual password-manager extension behavior,
  live model correctness/latency/cost and physical-device/assistive-technology checks.
- **Confirmed defects / repairs:** three bounded workspace repairs below. Four
  new regression cases failed before repair, then passed. Affected UI checks were
  rerun against the repaired candidate; historical reports remain historical.
- **Owner-only:** hosted migration already applied, both tables/RLS enabled,
  Confirm email disabled, and real registration reached workspace (owner report).
  Hosted persistence, direct two-owner enforcement, complete Auth/recovery and live
  model quality remain unverified. No remote mutation or paid calls authorized.
- **Configuration:** observed “OpenAI is not configured” is the expected disabled
  provider boundary, not evidence that manual profile storage is unavailable.

### External six-finding audit disposition

Diagnostic source/config: `.factory/evidence/OWNPATH-VERIFY-20261020/`.
Run `pnpm exec vitest run --config=.factory/evidence/OWNPATH-VERIFY-20261020/probes.config.mts`.
These characterization probes document defects; they are not assertions that the
legacy behavior is acceptable or product regressions fixed in this task.

| Finding | Actual implementation, reproduction and classification |
|---|---|
| **A — stale `deleteCv`** | **Confirmed; unrelated retained route, deferred.** `assessment-form.tsx:deleteCv`, called by `/assessment`. Delayed DELETE plus `exe:workspace-signed-in` refresh `[A,B] → [A,C]` resurrects B and loses C when A completes. Selection becomes stale B. Focus correctly returns to the persistent CV heading, so a setter-only change would not settle selection consistency. No workspace `/app` caller; legacy `/api/intake/*` handlers are absent. |
| **B — non-JSON `readResponse`** | **Confirmed error-feedback defect; unrelated retained route, deferred.** `/analysis/[id]/review-links.tsx`, mounted only by the retained report page. Both HTML 502 and malformed JSON are caught by create/load handlers; no uncaught crash or fake link success was reproduced. Create shows a raw parser error instead of useful HTTP recovery. Analogous current-workspace behavior was reproduced and repaired below; no empty-object success fallback. Legacy review-share API handler is absent. |
| **C — retry 202/polling** | **Reported retry defect not reproduced; insufficient end-to-end evidence for this candidate.** `RetryAnalysis` refreshes after 202; the report parent replaces it with `AnalysisStatus` when the run becomes processing. That new component polls repeated processing responses and stops/refreshes on completion/failure; unmount clears its timer. Refresh does not itself remount unaffected client state (Next 16 guide confirms). A narrower **exhausted-polling refresh defect is confirmed**, retained-only: after 20 polls, clicking Refresh with the same mounted processing component/router does not restart its timer. The legacy `/api/analysis/*` handlers are absent, so no working 202 legacy API acceptance is claimed. |
| **D — Replace cancel** | **Confirmed; unrelated retained route, deferred.** `/assessment` enters replace mode and focuses the file input, keeps the original listed, but has no cancel button. It is not the text-only workspace profile editor. A future repair must clear replacement/file state without removing the old CV and return focus to its Replace trigger. |
| **E — 12 requirements** | **Confirmed cap; out of current workspace scope.** Fifteen explicit legacy requirements yield twelve; explicit limit 30 yields fifteen. Used by retained local analysis and the retired Translator engine. Current `cv-review` and `/app` do not import this extractor. Workspace sends the complete bounded JD (18,000 chars; oversize rejected); mapping arrays over 30 are rejected, not silently sliced. Neither the mock review nor current AI contract establishes complete JD coverage. |
| **F — double extraction** | **Defect not reproduced.** Legacy local provider needs extraction to construct findings; workflow separately owns the expected requirement set to validate arbitrary custom providers. A custom provider matching SQL succeeds; Python substituted for SQL is rejected. Deterministic repeated work is not evidence of incorrect output; removing workflow extraction would weaken its provider contract. No current-workspace caller. |

All retained-only repairs remain follow-ups. No legacy product files were edited.

### Confirmed current-workspace repairs

Only production file changed in this task: `src/components/ownpath/workspace-pages.tsx`.

1. **Stale profile-save claim:** save → edit a line retained “Profile snapshot saved”.
   Now success is tied to the acknowledged submitted snapshot; later edits explicitly
   say they are not saved. A retry reuses the snapshot ID; a new revision gets a new ID.
2. **HTML/malformed workspace HTTP errors:** raw `response.json()` failures exposed
   parser snippets and lost HTTP context. Now parsing failure gives a sanitized
   recoverable message with status, retains work, and never substitutes success data.
   Valid JSON API errors keep their useful application message. Network/timeouts are
   also recoverable. Invalid list shape is an error, not an empty account.
3. **Unacknowledged save success:** HTTP 200 `{}` previously showed “CV version saved”.
   POST now requires `saved:true` and the submitted ID; PATCH requires `saved:true`
   and the next revision; DELETE requires `deleted:true` before success UI is shown.

Additional checks exercise failed manual save/retry, same-event duplicate locks,
immutable snapshot IDs, missing AI configuration/manual fallback, clipboard/export
failure and direct ownership predicates. Existing tests cover repeated source
locations, source/JD/language invalidation, nested malformed output, unresolved bulk
changes and Unicode. Six industry/stage fixtures remain in `src/lib/cv-review/examples.ts`.
Controlled safe provider responses preserve attribution/negation and map missing
JD skills as missing; this is **not** a semantic guarantee about arbitrary live
model output. Structural validation, exact source references and number invariance
do not prove factual entailment. All ordinary semantic rewrites require human review.

### Current results and test-count reconciliation

| Check | Current result / exact scope |
|---|---|
| Retained suite `pnpm test` | **844 passed, 69 files**, one complete run on repaired production code; no test failures. jsdom emits its expected document-navigation-not-implemented diagnostic in account-switch testing; real document navigation is checked separately in Chromium. |
| Repair-focused tests | **41 passed** across workspace-pages, CV server and saved-route tests; four regressions were observed red before repair. |
| External audit probes | **9 passed** characterization checks, separate from retained-suite count. Initial probe harness needed an explicit `server-only` test alias; not a product failure. |
| `pnpm lint` | **Pass** repository scope. |
| `pnpm typecheck` | **Pass** after fixing a test-only throwing URL stub's static return type; first invocation caught that type error. |
| `pnpm build` | **Pass**, Next 16.3.7 production, explicit fictional loopback Auth variables, AI disabled and key/model overridden empty. No provider calls. Only subsequent changes were test annotations/selectors and documentation. |
| Compiled mocked browser | **5 passed**: unauthenticated protection; JD decisions/save/reopen/export; verified signup/signin direct document `/app` navigation with cookie presence; failed verification stays put; no-AI manual profile save/retry/reload/re-login/history/version CRUD/conflict recovery. |
| Native password browser | **2 passed** on the compiled candidate: masked source copy restriction vs accepted native paste, and keyboard Show/Hide → copy/paste path. No installed manager-extension acceptance claimed. |
| Visuals | Inspected actual 1440px desktop and 390px mobile landing/workspace/version/drawer captures; readable, no horizontal mobile overflow. A loading-only capture was replaced with one explicitly awaiting the saved row. |
| Local PostgreSQL/RLS | **Pass**, expanded assertions in `supabase/tests/ownpath_cv_ownership.sql`, via fixed local `supabase_db_EXE` container and rolled-back transaction. Authenticated A/B/anon roles: owned CRUD, cross-owner read/update/delete denial, forged-owner insert denial for both tables, immutable profile update denial, owner-transfer denial, stale expected-revision predicate, anonymous read/write denial. Local privileged connection bootstraps roles/schema only; assertions execute as authenticated/anon. No hosted or service-role bypass. |
| Independent bounded review | **No actionable findings**, read-only review limited to the HTTP/acknowledgement/snapshot repairs and related tests. No broad audit or second writer. |
| Preservation / whitespace | **Pass**: 271/282 baseline files byte-identical; 11 intended changes, one new browser-test file, zero unexpected changes. Evidence/probe files are under the current verification directory. `git diff --check` passed. No resets/stashes/cleanup or sibling edits. |

The external 349/48 claim is not evidence for this candidate: `STATUS.md:208`
explicitly records **349 tests / 48 files as a historical pre-change baseline**.
No exact external audit SHA/command was supplied, so its precise scope cannot be
reconstructed. The prior resumed candidate recorded 816/68, then one additional
editor regression (817). Subsequent password/Auth navigation regressions added 11
(828). This task adds 16 workspace/server/persistence tests, yielding **844/69**.
No tests were removed to obtain the result. Nine legacy diagnostic probes are extra.

Reused evidence: unchanged Auth/callback/password regression definitions, existing
industry fixtures, model adapter timeout/rate-limit/structured-output/consent tests,
review/final-document tests and the compiled JD journey. They were included in the
current full run/browser checks rather than represented as hosted proof. Initial
browser failures were locator ambiguities after Show/Hide and text-content-inclusive
implicit labels; role/exact-name selectors were corrected without weakening expected
behavior. The rerun passes do not establish a product repair for those test failures.

Logs and current screenshots: `.factory/evidence/OWNPATH-VERIFY-20261020/`.
No real credentials/CVs, clipboard contents, provider keys or document request bodies
are evidence. Browser Auth sessions use synthetic values; clipboard checks return
booleans. External traffic is blocked or fulfilled by the fictional local boundary.

**Hosted status:** owner-reported schema/RLS-enabled/Confirm-email-disabled and real
registration success accepted as context. Hosted read/write persistence and direct
ownership enforcement are **NOT RUN** here. Do not reapply the migration. Paid/live
OpenAI is **NOT RUN / not authorized**. Missing configuration correctly preserves
manual review; model choice and budget require owner decisions.

Current owner checklist and synthetic CV/JD are at the top of
`MANUAL_ACCEPTANCE.md`; exact start/configuration instructions are in
`CV_WORKSPACE_SETUP.md`. **Locally verified candidate; no production-readiness claim.**

Final working-tree state: **68 short-status entries, zero staged changes**, including
the pre-existing candidate work. Branch/HEAD unchanged; no commit/push/merge/deploy.
Only this task's fictional fixture/compiled servers (4387/4386) were stopped after
verification. The existing worktree dev server on **127.0.0.1:4317** was preserved.

---

## Earlier resumed candidate (historical evidence)

## Repository and preservation

- Actual root: `/home/enzoreacher/EXE-ownpath-demo-rc`.
- Branch: `feat/ownpath-demo-rc`.
- HEAD: `7adbd6b77085318be43d55bff382d74b499e6350` (unchanged).
- Work remains uncommitted and unstaged. No reset, stash, clean, push, deployment,
  sibling-worktree edits or hosted migration was performed.
- Fresh baseline: `.factory/evidence/OWNPATH-RESUME-20261019/baseline/`.
  212 source/configuration/context files, with copies and SHA-256 hashes; no private
  environment files, tokens or generated dependencies. The pre-existing missing
  `/tmp` backup was not used.
- Preservation comparison: 168 baseline files byte-identical, 44 intentionally
  modified/retired in product scope, zero unexpected changes. This includes
  unchanged legacy engine/provider/security work and unrelated application routes.
  Detailed record: `preservation.json` in the same evidence directory.

## Delivered journey and changed areas

Landing → signup/check-email or signin → server-verified `/app` → editable
experience profile → optional JD → proposed wording/mapping → decisions → complete
preview → explicit named save → My CVs → owned reopen/edit/rename → copy/TXT.
Owned deletion is confirmed and isolated from profiles/other versions.

- `src/app/app/`: overview, profile, tailoring, saved list/detail and account routes;
  server identity checks, request-time rendering and private cache headers.
- `src/components/ownpath/workspace-{shell,pages}.tsx`: persistent draft context,
  desktop/mobile navigation, input/review/final/save/reopen UI, expired-session
  recovery, account-switch cleanup and unsaved-editor navigation warnings.
- `src/lib/cv-review/`: original source/revision data, nested response validation,
  stable-block decisions, narrow punctuation/case-only bulk eligibility, exact
  final text, explicit consent/contact exclusion and bounded AI requests.
- `src/app/api/cv-review/`: verified-user organization/review and owner-scoped
  snapshot CRUD. PATCH uses expected revision atomically; saves recompute final text.
- Landing, shared public navigation and Auth destinations now lead to the workspace.
  PKCE, verified identity, confirmation/resend and recovery protections are retained.
- Legacy questionnaire/mode-selector UI removed; legacy pages intentionally
  redirect to protected tailoring. Old prepare/generate APIs return HTTP 410.
  Superseded UI/browser expectations were replaced; reusable engine/provider and
  unrelated application tests remain.
- Migration, real local SQL assertions, fictional test-only Auth/REST fixture,
  mocked compiled journey and current setup guidance added.

## Verification results

| Gate | Result | Scope |
| --- | --- | --- |
| Retained full Vitest suite | **816 passed, 68 files** | Existing protections plus profile, review, persistence and workspace tests |
| Final editor-focused recheck | **8 passed** | After final leave-warning/keyed editor change; includes one newly added regression beyond the full run |
| ESLint | **Pass** | Final repository lint, no warnings/errors |
| TypeScript | **Pass** | Final application, route and test types |
| Production build | **Pass** | Next 16.3.7; explicit fictional public Auth configuration; OpenAI disabled |
| Compiled Playwright | **2 passed** | Protected routes/API denial plus full mocked authenticated journey |
| Desktop/mobile screenshot inspection | **Pass** | Actual images inspected at 1440px desktop and 390px mobile; no horizontal mobile overflow |
| Real local PostgreSQL/RLS | **Pass** | New migration + synthetic A/B/anonymous assertions inside a rolled-back transaction |
| `git diff --check` | **Pass** | Whitespace/conflict hygiene |
| Scoped baseline comparison | **Pass** | No unexpected modifications |

Unit/component coverage includes all six synthetic industries/stages (sales,
accounting, education, operations, technology and entry-level), no JD, uncertain
dates, repeated source text, conflicting changes, malformed nested output,
consent, duplicate submission, accept/edit/dismiss/undo/bulk undo, stale JD/profile/
language, preservation of untouched sections and single-paragraph source input.
Save tests distinguish missing schema and temporary failure, verify server-selected
owner/revision predicates, and reject stale snapshots.

The compiled journey exercises fictional signup/check-email, safe signin fallback,
overview, consented mocked organization/review, profile save, decisions, version
save, owned reopen, untouched-line manual editing, rename, mobile drawer/Escape,
logout and denied subsequent access. **Actual clipboard contents and downloaded
UTF-8 TXT bytes equal the complete final preview string.**

The local SQL test exercises actual grants/RLS: own read/insert/update/delete,
cross-user read/update/delete denial, forged-owner insert denial, owner-transfer
denial, stale revision predicate, anonymous denial and profile preservation when
deleting a CV. All schema/data changes are rolled back; local setup remains an
explicit owner action. HTTP fixtures are not represented as policy proof.

## Independent review

One bounded read-only independent candidate review found a late AI-response race
across navigation. Requests now abort on unmount, invalidate their generation and
apply only to the exact submitted shared draft. The reviewer confirmed that fix
by inspection. The regression test was then strengthened to retain a shared
provider while the old editor unmounts and a new source is entered.

Bulk undo also preserves subsequent manual edits. Reordered word bags are not
bulk-eligible because reordering can change attribution or negation.

## Evidence and remaining gates

Durable check logs and screenshots:
`.factory/evidence/OWNPATH-RESUME-20261019/{checks,screenshots}/`.

- **Mocked model verification:** run. Exercises contracts and decisions, not actual
  model factual reliability, industry quality or full-document translation.
- **Local database verification:** run on actual local PostgreSQL, transactional.
- **Hosted Supabase/Auth acceptance:** not run. Owner must apply
  `supabase/migrations/20261019_ownpath_cv_profiles_versions.sql`, configure callback
  origins and exercise real users/confirmation/recovery and cross-user operations.
- **Live OpenAI connectivity/output quality/latency/cost:** not run. Paid use needs
  separate authorization and budget. The inherited provider is loopback-only and
  requires owner-supplied model configuration; no new model was guessed.

Release limits and exact start/demo commands are in `CV_WORKSPACE_SETUP.md`.
In particular, unsaved drafts are memory-only, exports are TXT only, unchanged
sections retain their original language, and saved lists show the latest 50 rows.
The current `.next` build uses fictional test Auth settings; rebuild for intended
runtime settings before using `pnpm start` outside the compiled fixture demo.

**Status: locally verified candidate, not a production-readiness claim.**
