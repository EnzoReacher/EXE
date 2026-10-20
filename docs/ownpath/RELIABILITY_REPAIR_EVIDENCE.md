# Bounded reliability/security repair — 2026-10-20

## Actual baseline

Worktree `/home/enzoreacher/EXE-ownpath-demo-rc`, branch
`feat/ownpath-demo-rc`, HEAD `7adbd6b77085318be43d55bff382d74b499e6350`.
HEAD is not the candidate: 300 scoped source/test/migration/document/config files
were archived and SHA-256 recorded before changes at
`.factory/evidence/OWNPATH-RELIABILITY-20261020/baseline/`, together with branch,
HEAD and full status. The completed UI and Account work is part of that baseline.

## Classification before patching

| Finding / current caller | Feature and reachability | Evidence / impact | Severity | Bounded disposition |
| --- | --- | --- | --- | --- |
| `intake/repository.replaceOwnedCv` | Legacy helper, **no current caller**; assessment page reachable but intake APIs absent | Helper calls `removeOwnedCv`; FK cascades require local reproduction. No production request currently invokes it. | High latent data loss | Preserve retirement; make reachable replacement mode non-destructive and cancelable; no endpoint restoration. |
| `assessment-form.deleteCv/deleteJob` | Retained legacy UI; DELETE APIs absent | Closure-based arrays/selections can overwrite a newer refresh in controlled delayed-response reproduction. Real delete currently 404. CV warning omits downstream data; JD warning incorrectly says credential versions always kept. | Medium UI; high misleading destructive copy | Functional reconciliation, request/session invalidation, verified acknowledgements and accurate FK-based warnings. |
| `analysis/[id]/review-links.readResponse` | Retained completed-report UI; share APIs absent | `response.json()` parser errors/internal `body.error` reach users; PATCH `{}` falsely revokes locally under a controlled response. | Medium | Sanitized operation-specific decoding and acknowledgement; preserve input and retired APIs. |
| `next-steps.updateDraftContent` / `cv_drafts` | Legacy Next write API absent; authenticated DB UPDATE privilege/RLS remains | Local catalog grants UPDATE; repository unconditionally replaces content without changing `version`; no increment trigger in migrations. | High lost-update risk | Atomic owner/record/expected-revision RPC, restrict direct updates, acknowledged revisions and explicit conflicts. No restored API. |
| `/api/review/[token]`, `submitPublicReview` | Next API absent (404); public review **read page and DB RPC** retained | No Next submission caller; DB uses 32-byte random token hashes, expiry/revocation and per-share submission-ID deduplication. Deduplication is not a rate limit. | Retired Next submission path | Verify retirement; no process-local limiter or restored handler. Direct RPC exposure documented separately. |
| `extractRequirements`, analysis provider/workflow | Legacy generation API absent; stored reports readable | Stops after 12 normalized unique requirements; double extraction independently validates custom-provider output. | Low coverage clarity | Disclose legacy cap near retained results; keep independent extraction/validation. New Scan has separate 30-finding contract. |
| `analysis-status` retry/poll | Retained legacy failed/processing report UI; API absent | Refresh need not remount; interval overlaps, exhausted refresh never restarts, retry 202 can strand failed view. | Medium | Bounded cancellable polling cycles and explicit retry acknowledgement; test 202 only as a controlled historical contract. |
| expert route → `m11a_expert_queue` → `CredentialWorkspace` | Server queue authorization retained; client API absent | Must not infer full operation from route/component existence. Trace SQL role/assignment checks; compiled queue fetch should fail recoverably at 404. | Unavailable legacy mutations | Preserve authorization/retirement, repair only a demonstrated client boundary defect. |
| review page `unstable_noStore` | Reachable private-token read page | Installed Next 16.3.7 docs mark deprecated since v15; page already force-dynamic and `/review/*` has private no-store headers. | Low | Remove redundant call only after preserving dynamic/no-store verification. |

## Final finding dispositions

1. **Confirmed but retired/unreachable — destructive replacement helper.**
   `replaceOwnedCv` has no current caller; none of the 17 legacy Next API patterns
   has a route handler. A compiled 119-request/all-method inventory returned 404
   (not the report's assumed 410). The old helper remains dormant, not restored
   or advertised as a working replacement service. Its `removeOwnedCv` call first
   removes storage then deletes the CV row. The isolated synthetic FK reproduction
   confirmed the cascades below. The still-reachable form now submits a new file
   **without `replaceCvId`**, retains both CVs, explains separate deletion and has
   **Cancel replacement** with cleared file/mode/error and trigger focus restoration.
   Controlled partial-failure tests keep the new upload and original CV when job
   save fails; real legacy saving is unavailable and is disclosed in the form.
   No destructive fallback exists in the reachable form.

   | Delete source | Verified downstream record deletion | Verified records kept |
   | --- | --- | --- |
   | CV | analysis runs → requirement findings, roadmap items; CV drafts → draft claims, review shares → expert feedback; credential skill claims → expert decisions and version/claim provenance; derived credential CV versions | target jobs, opportunity links, separate credential/portfolio document rows |
   | JD | analysis runs → findings, roadmaps, drafts → draft claims/shares → feedback; opportunity links | source CVs, credential claims/decisions/CV versions/provenance, separate proof document rows |

   Actual migration FKs were applied to a brand-new scratch DB, then each deletion
   was rolled back after assertions. The script does not claim that row cascades
   delete separate Storage objects: only `removeOwnedCv` explicitly removes the
   source CV object. Hosted owner data/storage were never touched. Warnings now
   match this verified map.

2. **Confirmed and fixed — stale assessment state.** Pre-fix delayed CV and JD
   deletion after refresh reintroduced B from `[A,B]`, losing refreshed C from
   `[A,C]` and selecting stale B. Functional list filtering and current selection
   reconciliation retain C and remove only the acknowledged ID. Load revisions
   ignore older loads; confirmed deletion tombstones filter subsequently arriving
   stale loads. Failures preserve the latest valid state. Owner/session scope and
   unmount guards reject late mutations; synchronous locks prevent duplicate
   submissions. Successful deletion focuses the persistent section heading.
   Tests also cover older pending loads, failed delayed delete, account switching,
   upload partial failure, cancellation and non-destructive upload payloads.
   Actual legacy DELETE requests still return 404; successful deletion paths are
   controlled-response component/browser reproductions, not hosted writes.

3. **Confirmed and fixed — review-link parsing and false success.** HTML 502/504,
   invalid JSON, JSON null, invalid success shapes, internal JSON error text and
   rejected networks produce sanitized recoverable failures. Expiry/include-draft
   choices remain. Lists validate renderable share/feedback shapes and dates;
   creation requires a 43-character base64url token and valid active share;
   revocation requires `{ revoked: true, shareId: requestedId }`. `{}` cannot
   announce a revoke. Session end/owner change/unmount ignore late replies; a
   keyed analysis scope prevents the previous report leaking into a new one.
   These are explicit retained-client contracts; absent API handlers were not
   recreated to satisfy them. Older `{}` acknowledgement callers are rejected.

4. **Confirmed and fixed locally; hosted setup deferred — draft lost updates.**
   The old schema grants direct authenticated UPDATE, has no version-increment
   trigger, and `updateDraftContent` does not increment version. Two concurrent
   synthetic same-revision UPDATEs both succeeded with revision still 1.
   `20261020_legacy_draft_revision.sql` revokes table and column UPDATE grants from
   PUBLIC/anon/authenticated and exposes one explicit security-definer RPC with
   empty search path, `auth.uid()` owner/record/analysis/expected-revision predicates,
   bounded integer/content inputs and atomic revision+content/acceptance update.
   `PT409` maps direct PostgREST conflicts to HTTP 409; the repository also maps
   it to `IntakeError(...,409)`. No read-version/unconditional-update or overwrite
   retry is used. Acceptance uses the same revision/content condition. Existing
   draft-change triggers still revoke accepted-draft shares when edits invalidate
   acceptance. RPC returns the acknowledged revision; repository and client verify
   it. Losing client edits remain editable/copyable; Save/Accept are disabled
   until an explicit confirmed **Reload saved draft**. Reload failure keeps edits.
   Legacy Next write endpoints remain absent. Old direct UPDATE callers now fail
   closed and require this RPC; trusted service-role administration is unchanged.
   Scratch DB tests proved exactly one winner (revision 2), one `PT409` loser,
   concurrent edit/accept exclusivity (revision 3), owner/anon/direct-update denial
   and invalid revisions 0, -1, NULL and integer max.

5. **Next submission route confirmed retired; direct RPC risk confirmed and fixed
   locally.** `/api/review/[token]` is 404 for all tested methods. However
   `submit_private_review` is granted to anon/authenticated in the retained DB.
   Its 32-byte random base64url token is stored only as SHA-256; read/submit checks
   expiry/revocation, and unique `(review_share_id,submission_id)` deduplicates a
   retry. It does **not** prevent a token holder generating many fresh IDs: the
   pre-fix 60th/61st concurrent submissions both inserted.
   `20261020_review_rpc_submission_limit.sql` locks the active share row before
   checking durable feedback rows and inserting, allowing 60 distinct submissions
   per rolling hour and 300/day/link. Acknowledged replay uses no extra quota;
   revoked links still reject replay. Input lengths/token format/null submission
   IDs fail before insertion. Concurrent boundary tests permit one 60th insert and
   reject the other; daily quota also rejects before insertion. An ephemeral
   **actual PostgREST v16.4** container against the scratch DB returned HTTP 429
   with positive `Retry-After` and a neutral error without token/private ID.
   No process-local limiter, untrusted forwarded-IP parsing, global request/IP
   quota or new Next submission handler was introduced. An invalid-token request
   still costs an indexed token lookup; network-wide limiting remains a deployment
   concern, not a protection this per-link quota claims to provide.

6. **Confirmed and fixed — legacy coverage disclosure; extraction refactor
   intentionally not performed.** The 12-normalized-distinct-requirement cap is
   in the legacy `job-description/requirements.ts` extractor, not new Scan.
   Retained reports now disclose the cap and incomplete coverage without inventing
   an extracted-total denominator. Legacy intake bounds JD at 30–15,000 characters;
   extractor empty-input behavior remains `[]`. New Scan independently bounds CV
   to 24,000 and JD to 18,000 characters, rejects empty input and provider lists
   over 30 findings, and requests coverage text; it never calls this extractor.
   New Scan source/provider/UI bytes were not changed. Generation and validation
   deliberately extract independently, and no requirement array is shared with a
   provider. Tests reject missing, invented, malformed and provider-mutated-JD
   requirements against the precomputed validation list. No new canonical-list
   provider API or incompatible legacy provider migration was introduced.

7. **Confirmed and fixed — polling lifecycle and 202 retry.** Original interval
   could overlap requests; exhausted Refresh only called `router.refresh()` and
   could never restart when the component remained mounted. Retry did not follow
   processing after a historical 202 acknowledgement. Serial bounded 20-attempt
   cycles now have cancellation, a per-request 10s timeout, terminal stop and an
   explicit restart cycle. Retry requires matching run ID/status, prevents duplicate
   POSTs and enters polling on acknowledged processing/202. Unit fake-timer tests
   verify same-mounted restart, eventual completed/failed, non-overlap and ignored
   late results. Browser fixture updates the saved run before terminal refresh.
   Actual legacy retry/poll HTTP endpoints remain retired; no working hosted
   analysis retry is claimed from a mocked 202.

8. **Authorization defect not reproduced; concrete expert-client defect fixed.**
   Server page calls `m11a_expert_queue`; it now also checks array acknowledgement.
   SQL requires an active approved expert (approval constraint), queue/detail
   restrict to assigned submitted non-owner claims, and decision/proof RPCs retain
   their corresponding checks. Scratch tests prove authorized queue/detail and
   unauthorized owner denial. `CredentialWorkspace` exists and has decision/proof
   flows, but its Next client APIs are absent: compiled browser tests show a
   recoverable unavailable/retry boundary, not a fully operating expert service.
   A controlled `[null]` queue previously reached render and could crash; invalid
   queue entries now fail recoverably. Touched async workspace actions also discard
   late results after session/owner invalidation. No expert API was restored.

9. **Confirmed redundant/deprecated and removed — `unstable_noStore`.** Package,
   lockfile and installed Next are 16.3.7. Installed
   `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/unstable_noStore.md`
   marks it deprecated since v15. Cache Components are not enabled; review page
   retains `dynamic="force-dynamic"`; build marks `/review/[token]` dynamic.
   Existing private no-store headers and noindex/no-referrer remain. Compiled
   browser review responses verify `Cache-Control: private, no-store...`.
   Auth routes/sessions and their no-store protections were not changed. No upgrade.

## Verification and boundaries

- Pre-fix UI regressions: 11 failures / 12 checks, including stale CV/JD selection,
  missing cancellation, parser/internal-text exposure, fake revocation and late URL.
  The malformed `{}` create case already failed safely and is not a claimed new bug.
- Final `pnpm test`: **911 passed / 77 files**. `pnpm lint`: no errors, one existing
  `auth-panel.tsx:101` dependency warning. `pnpm typecheck` and production build pass.
- Compiled Chromium: 5 retained-repair journeys (1440/390px); 6 unchanged core
  Scan/Rewrite/saved/print/auth journeys; 7 Account journeys (1440/390/320px).
  Separate retired inventory: **119 requests / 17 patterns / 7 methods**, all 404.
- Inspected affected report/review-error/draft-conflict/expert screenshots at
  desktop/mobile, assessment deletion focus/selection and retry terminal state.
  No horizontal page overflow in captured affected views. No CSS redesign.
- `node scripts/ownpath-reliability-local.mjs`: creates and drops its own scratch
  DB on fixed local container `supabase_db_EXE`, synthetic Auth/table rows only,
  applies migration files there, rolls back deletion reproductions and removes its
  temporary PostgREST container/login. It never copies existing rows or accepts a
  hosted URL. Production migrations were not applied to the existing local DB.
- Earlier core/Account source, styling, print/PDF and provider evidence is reused
  where byte-preserved; browser rechecks confirm the changed fixture did not break
  those journeys. Fixture responses and intercepted historical API contracts do
  not establish hosted persistence, hosted RLS or working retired Next APIs.
- Task fixture (4387) and compiled app (4386) were stopped after verification;
  the pre-existing user dev server on 4317 was preserved. Intentional SIGTERM
  shutdown can report exit 143; it is not a failed build/test. No scratch DB,
  temporary database login or disposable PostgREST container remains.
- Initial browser failures were wrong test selectors (report heading prefix and
  Retry loading links label); corrected to the actual accessible UI. A screenshot
  exposed enabled-looking conflict Save, which was disabled and reverified. The
  initial local SQL fixture needed approved expert timestamp to satisfy the actual
  approval constraint. These causes are documented rather than inferred from retry.

### Owner setup / remaining gates

The two **new** migration files above are additive; no applied history was edited.
An owner must separately review/apply them to the intended hosted project and
reload the PostgREST schema cache if their deployment does not do so automatically.
The draft RPC is incompatible with old direct table updates; keep those retired
and use the expected-revision RPC contract for any separately approved restoration.
Do not restore deleted Next endpoints as migration setup. Hosted migration state,
actual provider/Auth hooks/policies, additional browsers and real devices remain
unverified. No paid calls, hosted mutations, commits, pushes or deployment occurred.

## Exact candidate inventory

`preservation.json` in `.factory/evidence/OWNPATH-RELIABILITY-20261020/` contains
every changed/new scoped filename with before/after SHA-256 and preserved baseline
checks; `candidate-sha256.json` identifies the full scoped final candidate and
`status.txt` captures complete final Git status. There are **20 modified baseline
files and 11 new files**, with no baseline file missing:

```text
M docs/ownpath/MANUAL_ACCEPTANCE.md
M e2e/ownpath-fixture.mjs
M scripts/check-ownpath-retired-apis.mjs
M scripts/check-ownpath-retired-apis.test.mjs
M src/app/analysis/[id]/analysis-interactions.test.tsx
M src/app/analysis/[id]/analysis-status.tsx
M src/app/analysis/[id]/next-steps/next-steps-workspace.tsx
M src/app/analysis/[id]/next-steps/page.tsx
M src/app/analysis/[id]/page.tsx
M src/app/analysis/[id]/review-links.tsx
M src/app/assessment/assessment-form.tsx
M src/app/assessment/assessment.test.tsx
M src/app/assessment/page.tsx
M src/app/credential-versions/workspace.test.tsx
M src/app/credential-versions/workspace.tsx
M src/app/expert/credential-reviews/page.tsx
M src/app/review/[token]/page.test.tsx
M src/app/review/[token]/page.tsx
M src/lib/analysis/analysis.test.ts
M src/lib/next-steps/repository.ts
A docs/ownpath/RELIABILITY_REPAIR_EVIDENCE.md
A e2e/reliability.config.mts
A e2e/reliability.spec.ts
A scripts/ownpath-reliability-local.mjs
A src/app/analysis/[id]/analysis-status.test.tsx
A src/app/analysis/[id]/review-links-reliability.test.tsx
A src/app/assessment/assessment-reliability.test.tsx
A src/components/use-private-scope.ts
A src/lib/http/read-private-response.ts
A supabase/migrations/20261020_legacy_draft_revision.sql
A supabase/migrations/20261020_review_rpc_submission_limit.sql
```

`M/A` here means relative to this task's preserved baseline, not HEAD: several
modified baseline files were already untracked user work. The overall branch is
still substantially uncommitted at the same HEAD. Logs under this evidence folder
are copied from `/tmp/opencode/ownpath-reliability-*.log`. Reproduction commands:

```sh
pnpm test
pnpm lint
pnpm typecheck
node scripts/ownpath-reliability-local.mjs
# Use the fictional build/start environment recorded in ACCOUNT_PROFILE_EVIDENCE.md.
pnpm exec playwright test --config=e2e/reliability.config.mts
node scripts/check-ownpath-retired-apis.mjs http://127.0.0.1:4386
pnpm exec playwright test --config=e2e/ownpath.config.mts
pnpm exec playwright test --config=e2e/account-profile.config.mts
```
