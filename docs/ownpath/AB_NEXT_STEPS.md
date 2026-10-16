# Accounts candidate — ordered continuation

Baseline **86bc9e24f76d3cec19d8aa0b1df7823d36c22c0e**, 16 October 2026. Follow dependencies rather than treating every unchecked backlog item as immediately executable. [FLOWS](FLOWS.md) visualizes the same sequence. Historical plans remain requirements; [AB_EVIDENCE](AB_EVIDENCE.md) holds measured current results.

Team branch policy and the verified GitHub historical-branch archive are in [BRANCH_OWNERSHIP](BRANCH_OWNERSHIP.md). The lead alone merges into `main`; the three draft OwnPath PRs keep their dependency bases until predecessors are integrated. Proposed FE1/FE2 personal branch names remain unconfirmed.

| Order | Work | Current owner / prerequisite | Completion evidence |
|---|---|---|---|
| 1 | Preserve checkpoint and freeze ownership/contracts | Coordinator; clean stage86bc9e2, safe fetch, no observed FE branch | Ledger + actual state; original checkout/local profiles preserved |
| 2 | Close independent official browser SDK acceptance | Coordinator W5-I; existing owned emulator/compiled app harness | Actual signup/duplicate, safe policy unavailability (not enforcement), verification refresh, reset/action handling, sampled memory cleanup, initiating-context logout and explicitly injected outage recovery; separate read-only QA |
| 3a | Auth/account UI | Human FE1; [pickup packet](AB_FE1_PACKET.md) | Reviewed full-SHA delivery + scoped tests/accessibility/config requests; no acknowledgment inferred |
| 3b | Pricing/billing/history UI | Human FE2; [pickup packet](AB_FE2_PACKET.md) | Reviewed full-SHA delivery; explicit save and renewed-review restore design/tests |
| 4 | Review deliveries, then compose one identity entry/shared shell | Coordinator after 3a+3b; exact new layout/proxy/legacy file card first | No remaining exposed old Auth redirects/retired API callers; preserved Supabase data and migrations |
| 5 | Combined local/emulator UI acceptance | Reviewed integration from4; owned services only | Auth/password/action/account, billing unavailable/fixtures, explicit consented history, restore-to-export, keyboard/mobile/input preservation; retained guest/privacy/probes |
| 6a | Actual Stripe sandbox exercise | Authorized operator after test settings/account/Price/webhook/Portal/endpoint supplied | Actual hosted Checkout/Portal and lifecycle/outage matrix, distinct from fake-provider cases |
| 6b | Firebase non-production cloud extension/configuration and recovery | Separate reviewed design/card before provisioning; project/region/IAM/mail/privacy/backup decisions | Actual cloud/mail/recovery evidence; measured RPO/RTO only after separate-target drill |
| 7 | Operational readiness | Explicit scheduler/worker/monitoring/retention ownership; reviewed deployment design | Exercised pending-receipt retry/reconciliation, alert and recovery; internal method alone insufficient |
| 8 | Final candidate handoff | Reviewed5 and available6/7 results, blockers explicit | Source/command/time/count/skip/review evidence, exact-head CI and rollback |

Steps6a/6b are separate authorized external lanes; neither is needed to prepare frontend work or deterministic fixtures. Missing access remains BLOCKED, never converted to PASS. Complete non-production candidate acceptance requires the relevant real integrations, not just their diagrams. Live activation/release/research/manual-device decisions remain separate owner gates; no merge/deploy/public tunnel or external messaging here.

## Human delivery receipt checklist

Receive the actual branch/worktree, full baseline and full delivery SHA, changed-file inventory, review disposition, commands/timestamps/counts/skips/logs, configuration dependencies and rollback. Read the complete incoming diff before choosing an integration method. Do not reset a person's worktree, infer an identity by email, or resolve incompatibilities by widening DTOs/casting away checks. Scope any required backend correction through one writer and RED/GREEN review.

## Minimal next inputs

1. Reviewed FE1 and FE2 deliveries or the existing human owners' actual branch references. Coordinator does not contact or impersonate them.
2. When ready for real sandbox acceptance, server-only configuration through the approved secret mechanism and an authorized isolated delivery target; do not paste secrets into docs/chat. Exact names/decisions: [AB_EXTERNAL_PACKET](AB_EXTERNAL_PACKET.md).
3. For cloud work, project/region/operator/policy choices plus reviewed runtime-extension design before executing external operations.

## Current execution

W5-I is complete locally:6browser cases/12steps (3transport+3SDK), actual21backend+24denials,542default tests with21explicit emulator skips, lint/types/install/build and guest7/30+119probes/cleanup pass. It uses test-only local module delivery for the installed SDK and actual adapter; app handlers remain real. Policy only proves safe unavailability, sampled memory checks are not continuous persistence audit, and this all-logout case only checks the initiating context. Complete-diff/source/log review found no blocker; reviewer ran no commands/tests. Source/failed attempts/limits in AB_EVIDENCE; final exact-head publication status on PR#3 after inspection. Next connection dependency is reviewed human FE1/FE2 delivery, not an implicit coordinator takeover. Rollback scoped test/docs and policy-repair commits, retaining data/reservations/profiles/human worktrees.

W6-I next independent acceptance gap: a second browser context must retain its own HttpOnly cookie yet fail after first-context SDK-initiated `logout("all")`. Actual same-owner second session is created through the owned Auth emulator and app cookie-exchange handler; not a second frontend SDK-login claim. Preserve original guest/privacy checks. Failed initial immediate revocation and exact-source rerun are tracked in [AB_EVIDENCE](AB_EVIDENCE.md). This work remains separate from the next blocked **human FE1/FE2 UI delivery** step; it does not change the order of integration dependencies.

W6-I is locally verified: the first browser's session cookie clears while the second browser's unchanged HttpOnly cookie is rejected by the real server with401/SESSION_EXPIRED, after bounded synchronization to the second emulator token's `auth_time` second. Actual7browser cases/15steps+21backend/24denials and owned cleanup passed; retained542default tests/21skips, lint/types/build/diff passed. The second token comes from the owned Auth emulator, not a second official SDK login flow. Independent read-only source and final-log review closed timing/cookie-absence findings without reviewer execution; exact-head hosted CI tracked in AB_EVIDENCE/PR#3 after publication. **FE1/FE2 delivery remains the next integration dependency.**

W6 published head48e58c6's four exact-head push/PR Quality/acceptance runs succeeded; PR#3 body holds the hosted links and bounded evidence. W7-I now exercises additional independent fake-provider/emulator recovery for a receipt committed without processing and an interrupted claim, scoped in AB_TASKS. It does not unlock the blocked operational scheduler or human UI/external lanes; final-source result belongs in AB_EVIDENCE after checks.
W7-I correction is locally verified: initially Pro account now proves dirty pending receipt immediately changes effective entitlement to Free and `SavedSessionRepository.create` fails `PRO_REQUIRED`, then fresh-service retry commits canonical cancellation; duplicate and interrupted-lease fencing remain covered. Exact corrected-source run PASS23backend+24denials and7browser/15steps with cleanup; full542 tests/23skips, lint/types pass. Independent read-only review found no further source issue; reviewer ran no commands/tests and did not inspect baseline Git diff. Prior cd1339c exact-head CI all passed; correction requires fresh exact-head CI. Fake provider and local retry are not actual Stripe or deployed worker acceptance. FE1/FE2 reviewed deliveries remain next composition dependency.
