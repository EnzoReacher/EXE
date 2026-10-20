# Test strategy and acceptance boundaries

All fixtures are fictional; deterministic adapter only. Fresh results are in STATUS; this plan itself is not a test result.

| Case | Required observation | Planned evidence |
|---|---|---|
| TC01 | Sufficient personal facts: no repeated questions | Engine test |
| TC02 | JD REST API absent in project: no API claim | Composer test |
| TC03 | Team work without personal contribution: ask | Engine attribution test |
| TC04 | No metrics: no percentages, leadership or invented impact | Golden fixture + negative tests |
| TC05 | Recognized Vietnamese project actions: English faithful wording | Golden fixture |
| TC06 | Weak overlap: bounded guidance, no forced match | Engine + component empty state |
| TC07 | Skipped answers do not become facts | Engine + component test |
| TC08 | Embedded JD/project instructions never produce facts | Injection fixtures |
| TC09 | Malformed JSON controlled error | Adapter test |
| TC10 | Existing ID with wrong claim meaning rejected | Recomposition guard tests |
| TC11 | Edited text survives regeneration; acceptance reset | Review state + component tests |
| TC12 | No shared/persisted prototype state | No DB/API/localStorage design + independent mount and sentinel/traffic browser checks; existing RLS verified separately on disposable CI stack |
| TC13 | Accepted-only local TXT; clear removes memory | Component/review tests; production retention still pending |
| TC14 | Timeout bounded; stable candidates without duplicate save | Adapter + regeneration tests; no prototype persistence |
| TC15 | Mobile widths, keyboard, labels, focus, states | Component controls + compiled Chromium journeys at four responsive widths; physical device/screen reader/zoom manual checks remain |

Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, CP2 structural checks, `git diff --check`. New prototype component interaction tests exercise intake→interview→generation→review, not a real browser. Existing `test:e2e:local` and `test:supabase:local` require a configured disposable loopback stack and browser; record not run when absent. Do not copy historical passes into current acceptance. No migration was added.

Manual visual/accessibility checklist: 320/375/768/1440px, 200% zoom, mobile keyboard, tab order, labels, heading focus after transitions, reading/editing sources, clipboard denial, error retry, reset; collect actual results. Existing backend tests protect private flows separately. Any future persistence must add two-user/anonymous denial, idempotency and deletion cascades before real data.

`e2e/translator.spec.ts` implements four responsive journeys and three focused real-browser cases: keyboard-only transitions, injected clipboard failure/manual selection, and narrow long-source layout. It also covers edit invalidation/regeneration, accepted-only TXT, no form network writes and reset/reload. It needs an already running disposable loopback app and an existing Chromium installation; it starts no server/containers and downloads no browser. Run `pnpm build`, then `pnpm start --hostname 127.0.0.1 --port 3000` in a separate terminal; then `pnpm test:translator:browser`. `OWNPATH_TEST_URL` can select another loopback port; hosted URLs are refused. Emulated mobile layout does not replace a physical mobile keyboard check. Current compiled Chromium browser acceptance passed seven cases / 30 named steps at `d2979c6a8c074dabe245ba5fa79991d65ae6de93`; see the exact run/checkpoint in STATUS. This does not establish physical device, 200% zoom or screen-reader acceptance.

Independent reviewer checks facts, negation, ambiguous ownership, template meaning, edited provenance labels, duplicate/regeneration behavior, no network input transfer, and Factory permissions. User self-approval remains required even when automated checks pass.

## Disposable CI acceptance

`.github/workflows/ownpath-acceptance.yml` triggers on scoped code/test/config pushes to the review branch. The Translator job installs Chromium only on its disposable GitHub runner, then `scripts/ci-ownpath-browser.mjs` copies unchanged source/dependencies into owned temporary storage, builds and starts a compiled loopback app. The harness rejects the managed Work container even if CI flags are supplied. App environment excludes project `.env` files, Supabase/provider settings and runner credentials. Screenshots, traces and video are disabled; temporary downloads/results/server are removed.

Each width executes intake, interview/fact confirmation, generated/edit/regenerate, accepted TXT bytes, clear/reload isolation. Every screen checks horizontal overflow. Exact-origin GET assets are allowlisted; unexpected/aborted requests and sockets still fail, source sentinel is checked in URL/body, and browser page errors fail. The no-store response is asserted. These are actual browser bodies, not `--list` discovery.

The second job reuses local backend acceptance on a separate disposable Supabase stack: engineering verification, real two-user/anonymous policy tests, legacy Auth/core/credential browser journeys, proof preview/workspace tests and CP2 structural validation. Retain legacy `workers: 1` and file ordering: some tests share fictional actors. M1 policy checks leave synthetic Auth accounts until stack teardown; do not claim per-test account cleanup. Startup/stop diagnostic logs stay temporary; cleanup runs even if stop fails. No production DB is contacted or migrated.

## Focused browser follow-up — actual compiled execution

The compiled suite passed seven cases / 30 named steps in [CI run 38219710485](https://github.com/EnzoReacher/EXE/actions/runs/38219710485), Translator job `114712738762`, source `d2979c6a8c074dabe245ba5fa79991d65ae6de93`: four existing widths plus (1) a keyboard-only journey using Tab/Shift+Tab/Enter/Space/keyboard text insertion with visible focus-outline assertions, targeted skip, fact selection and reject/restore/approval gating; (2) injected `navigator.clipboard.writeText` rejection with call count, preserved accepted text and manual text selection; (3) 320px long unbroken source and edited wording with source details open and review layout checks. Every case uses the same automatic exact-origin/sentinel/socket/page-error fixture. The app alert is scoped to `main`, separately from Next's framework route announcer.

The concrete UI fix gives each Skip button a unique accessible name containing its question while retaining its visible label. Component regression proves that skipping one answer preserves the other and invalidates fact review. The first run caught partial `getByLabel` queries matching both textarea and the newly named Skip button. Exact question-label queries resolved that test collision; the rerun executed every browser body successfully and cleaned the owned scope. Browser discovery and component tests alone are not execution evidence. Injected API rejection is failure-path coverage, not an actual browser/OS permission-denial result. None of these close C07–C10 physical/manual/screen-reader/zoom/owner gates.
