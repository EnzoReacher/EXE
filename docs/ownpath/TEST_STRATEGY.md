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
| TC12 | No shared/persisted prototype state | No DB/API/localStorage design + independent mount test; existing RLS needs real-stack run |
| TC13 | Accepted-only local TXT; clear removes memory | Component/review tests; production retention still pending |
| TC14 | Timeout bounded; stable candidates without duplicate save | Adapter + regeneration tests; no prototype persistence |
| TC15 | Mobile widths, keyboard, labels, focus, states | Component controls; actual Playwright desktop/mobile test when browser available |

Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, CP2 structural checks, `git diff --check`. New prototype component interaction tests exercise intake→interview→generation→review, not a real browser. Existing `test:e2e:local` and `test:supabase:local` require a configured disposable loopback stack and browser; record not run when absent. Do not copy historical passes into current acceptance. No migration was added.

Manual visual/accessibility checklist: 320/375/768/1440px, 200% zoom, mobile keyboard, tab order, labels, heading focus after transitions, reading/editing sources, clipboard denial, error retry, reset; collect actual results. Existing backend tests protect private flows separately. Any future persistence must add two-user/anonymous denial, idempotency and deletion cascades before real data.

`e2e/translator.spec.ts` implements four real-browser viewport journeys, keyboard approval, edit invalidation/regeneration, accepted-only TXT, no form network writes and reset/reload. It needs an already running disposable loopback app and an existing Chromium installation; it starts no server/containers and downloads no browser. Run `pnpm build`, then `pnpm start --hostname 127.0.0.1 --port 3000` in a separate terminal; then `pnpm test:translator:browser`. `OWNPATH_TEST_URL` can select another loopback port; hosted URLs are refused. Emulated mobile layout does not replace a physical mobile keyboard check. Browser acceptance is pending until this command is actually run in a suitable environment.

Independent reviewer checks facts, negation, ambiguous ownership, template meaning, edited provenance labels, duplicate/regeneration behavior, no network input transfer, and Factory permissions. User self-approval remains required even when automated checks pass.
