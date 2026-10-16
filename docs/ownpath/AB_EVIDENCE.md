# Accounts and sandbox subscriptions — execution evidence

## Preserved baseline and ownership

- Fixed stage start `e5119961570c52f4e5c3d9ef3647650d1de08d67`, upstream `origin/feat/ownpath-accounts-billing`, based on backend `7adbd6b77085318be43d55bff382d74b499e6350`.
- Started from clean M17 checkout `/home/enzoreacher/EXE` at `ae2527633733fc5081a96ecb2c16e09081a8c878`; created `/home/enzoreacher/EXE-ownpath-accounts-billing`. Existing backend checkout, eight untracked local profiles, original branches and PRs #1/#2 preserved. No stash/reset/force push/merge/deploy.
- Fresh fetch discovered stage planning branch. Baseline exact-head Quality [38846369870](https://github.com/EnzoReacher/EXE/actions/runs/38846369870) SUCCESS. No published auth/billing/frontend-owner branches were observed; local-only frontend progress remains unknown.
- Integration task cards: [AB_TASKS](AB_TASKS.md). Root tooling/config commit `e3893fa`, separate QA corrections `c32fc0a`; backend source is separately committed. No frontend-owned page/component/style/UI-test/core-type edits.

## Executed integration checks

Environment: Linux, Node 24.19.0, pnpm 11.25.0, Next 16.3.7, Firebase web13/Admin14.5/CLI15.34/rules-testing6, Stripe23; locked versions in the committed lockfile. No `.env` file other than example. Presence-only check found no ambient cloud Admin credentials, Firebase config/emulator hosts or Stripe secret/webhook/price/account settings.

| Check | Actual result and boundary |
|---|---|
| Frozen baseline install and full tests | PASS **486 tests / 53 files**, before runtime changes |
| Dependency installation | Packages installed; initial pnpm commands exited1 for unapproved lifecycle scripts. Explicit `allowBuilds:false` entries added for Firebase util/protobufjs/re2, preserving existing false policies; frozen reinstall PASS, Firebase CLI15.34 executable |
| Focused final tooling | PASS **29 tests / 5 files**, ownership/factory/verifier/retirement/harness; initial 4 verifier fixture failures after adding fifth role corrected without dropping assertions |
| Scoped tooling lint/diff | PASS |
| Actual Auth/Firestore emulators | PASS two synthetic Auth identities, Admin Firestore read/write, **24 direct-client deny checks** across anonymous/owner/other-user and profile/session/billing/event paths |
| Actual emulator failures/recovery | Missing system Java initially BLOCKED; isolated Temurin21 download resolved local runtime. First real launch rejected CLI-generated demo config; exact demo-derived allowlist fixed guard, rerun PASS |
| Owned emulator cleanup | PASS CLI shutdown, owned data directory removed, **all five ports rebound**; no owner service reset/reuse |
| Integration committed ownership | PASS23 paths at `e3893fa` against unchanged stage baseline; later scoped corrections checked separately |
| Factory dry run | PASS nine proposed profiles (five agents/four commands), no activation/write in this worktree |
| Actual V2 verifier | Explicit **FACTORY_V2_RUNTIME_NOT_VERIFIED**, exit1; no false runtime permission-parity PASS |
| Tooling-head remote Quality | At `c32fc0abe1689717224b9d2c026596b46db87859`, push38847512132 and PR38847542826 SUCCESS: measured **491 tests / 54 files**, lint/types/build/diff; five added tooling cases, baseline retained |

Logs used by QA are scoped local files under `/tmp/opencode/ab-{baseline-tests,tooling-tests,emulators}.log`. This durable summary records outcomes without publishing raw provider/debug logs. Actual emulator success is neither cloud acceptance nor server repository acceptance by itself.

## Separate tooling QA

Read-only reviewer session `ses_ebd2eb23bffeJzLHa0zZEz2O55` inspected source and supplied exact logs. It found missing temp-parent creation (P2), root catchall overlap (P2), and integration verifier permission mismatch (P3). Same integration writer fixed all three, added regressions, reran tooling/emulators. Re-review closed all three with no new actionable scoped finding. Reviewer independently analyzed source/logs; it executed **no shell/tests/services/Git/CI**. Backend runtime requires a separate full-diff QA pass.

AB-06-I extension was separately source-reviewed by the same read-only reviewer: no new actionable finding in the exact workflow/profile grants, actual Java21 emulator job, compiled guest-browser job, retired probes against the owned app copy, or bounded flagged backend test invocation. Reviewer explicitly did not claim that this future workflow/backend test had executed; final runtime/CI evidence is separate. Existing browser privacy/environment/copy guards remain intact.

## Contracts and account/persistence checkpoint

Frozen contract commit **`4269e828c613a9d91b6f04d385d5ddfe7795bb25`** supplies both FE owners' exact DTOs, paths, SDK adapter interface, operation/revision guards, error/capability states and task cards in [ACCOUNTS_BILLING_CONTRACTS](ACCOUNTS_BILLING_CONTRACTS.md). Reviewed CSRF prerequisite extends the route inventory with `GET /api/auth/csrf`; it is explicitly declared in the retirement checker/ownership matrix, not an old password endpoint. No FE acknowledgment or direct teammate message is claimed.

Account/source checkpoint **`15d8c6a058d1167b7906886057640af6ba410858`**: official client memory-only SDK adapter; strict emulator-only Admin configuration without ambient ADC; recent token/cookie/revocation/current-user validation; origin + cookie-bound CSRF; UID-idempotent profile repair; shared transactional abuse counters; validated transactional saved snapshots, operation dedupe/revisions/quota/cursors, and downgrade owner read/delete. Restored wording is explicitly untrusted, fact confirmation and acceptance are reset; FE2/domain integration review remains required.

| Account checkpoint check | Actual result |
|---|---|
| Backend deterministic tests | **24 passed**, separate from real provider execution |
| Full retained suite | **515 passed / 58 files**, **6 emulator cases / 1 file explicitly skipped** outside harness; no baseline assertions removed |
| Typecheck / backend ESLint / production build / diff | PASS; writer logs `ownpath-backend-{unit-types,build}-final.log` |
| Coordinator fresh actual emulator harness | PASS **6 backend integration cases** plus **24 direct-client denials** in `ab-account-emulators.log`; actual Auth ID-token/cookie/bootstrap/disabled/revoked identity and Firestore transaction behavior. New unique demo project/five ports/owned cleanup PASS |
| Persistence Pro test authority | **Server-only fixture**, not a payment-issued entitlement or actual Stripe acceptance |
| Coordinator focused tooling/harness + full lint | PASS **31 tests / 6 files** and full lint (`ab-tooling-tests.log`, `ab-account-lint.log`) |
| Coordinator compiled acceptance | Production build PASS; **7 Chromium cases / 30 named steps**, **119 retired API probes**, landing/Translator smoke and owned cleanup/port rebind PASS (`ab-account-compiled.log`). No browser-privacy guard changes or CI spoofing |
| Independent runtime QA | Read-only session `ses_ebd1f2bd6ffeblyziHg9WfPZwY`: no high auth bypass found; three medium correctness findings require fixes (key-order-sensitive dedupe hash, first-use CSRF race, fixed history quota). Same writer correcting before acceptance; reviewer ran no commands/tests |

The backend writer's attempted nested reviewer was rejected by the harness depth limit; it is not counted as review. Coordinator requested a separate read-only runtime QA session instead. Account-mode cloud deployment, real email and combined auth UI remain blocked/separate.

Published account/config checkpoint **`59d9540811081506e48457799b51b0e351d4e4e6`**: Quality push [38848858971](https://github.com/EnzoReacher/EXE/actions/runs/38848858971) and PR [38848864494](https://github.com/EnzoReacher/EXE/actions/runs/38848864494) SUCCESS. New actual acceptance push [38848859082](https://github.com/EnzoReacher/EXE/actions/runs/38848859082) SUCCESS: Java21 Auth/Firestore6 backend cases +24 client denies and cleanup/five-port rebind; independently hosted compiled guest browser7 cases/30 steps +119 API probes, build and cleanup. These executed CI jobs are separate from the read-only reviewer's source/log analysis; they do not close its three correctness findings. The initially used Java setup action reported deprecation, so the stage-owned workflow was advanced to its explicitly recommended v5 for subsequent runs.

## Account QA correction and re-review

Source **`9a56dc9`**, five backend/test files only. Same backend writer canonicalized nested object keys for operation hashes, singleflighted CSRF bootstrap and bounded retries to one **definitive403/CSRF_INVALID** with identical serialized body, and separated trusted read-quota policy from Pro write authorization. Invalid operation/cursor expiry/metadata fail closed. No DTO/core/frontend changes.

Actual RED: client3 failed/8 passed; repository2 failed/4 passed (cursor failure was downstream of incomplete setup, not a separate finding); quota3 failed/4 passed. GREEN: client11; backend28 across4 deterministic files; actual Firebase backend9 cases+24 rules denies; full519 across58 passing files with9 cases/1 file explicitly skipped outside the harness. Types/scoped lint/build/diff pass as executed by writer. Logs: `/tmp/opencode/ownpath-qa-{client,repository,quota}-red.log` and `ownpath-qa-{client,account,emulator,full,build}-green.log`.

Separate reviewer `ses_ebd1f2bd6ffeblyziHg9WfPZwY` re-read all5 source files and8 RED/GREEN logs: **all three findings closed, no new actionable account blocker**. It ran no commands/tests, did not independently verify Git or lint/diff. Real API all-session logout and stale-unverified-cookie/refreshed-exchange tests are present. Bootstrap failure→repair is a **mocked handler test**, not real Firestore outage; SDK cleanup failure proves sanitized reporting, **not** that identity cleared after `signOut` failure. Keep both limitations explicit. Billing integration must supply a read-quota callback from the same trusted policy as writes/capabilities. This QA approval is scoped to account/persistence source, not new billing modules, cloud or combined frontend.

## External acceptance and combined candidate

Actual Stripe sandbox execution remains BLOCKED: no test key/account/Price/product/webhook secret is supplied. No live payment is enabled. Firebase cloud IAM/region/policy/action URL/mail delivery/backup restore/retention remain unconfigured and unverified. Frontend owners must deliver reviewed auth/account and billing/save UI plus coordinated legacy caller retirement before combined one-identity browser acceptance. See [ACCOUNTS_SETUP](ACCOUNTS_SETUP.md) and [AB_LEGACY_DEPENDENCIES](AB_LEGACY_DEPENDENCIES.md).
