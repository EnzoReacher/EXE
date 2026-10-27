# OwnPath manual acceptance worksheet

## Tonight: one owner test session (current integration candidate)

Start from this worktree. Keep the three environments separate; never enter a real
password, CV or bank transfer in a fictional preview. Commands are current package
scripts; an occupied port is a reason to stop and inspect, not kill another server.

| Environment | Command | Working URL | Account/data and limits |
|---|---|---|---|
| Normal app | `npm run dev -- --hostname 127.0.0.1 --port 4317` | http://127.0.0.1:4317 | Owner-configured **real Supabase**. Real test account only here. AI currently disabled; billing OFF. Hosted signup/recovery/schema acceptance still needed. |
| Scan preview | `npm run preview:local` | http://127.0.0.2:4327 | Fictional account opens automatically. Fixed sales AI only; saves in disposable memory. AI quota/payments are **not** simulated here. |
| Billing preview | `npm run preview:billing` | http://127.0.0.3:4347/sign-in | Fictional Auth, fixed sales AI, real **disposable local PostgreSQL** quotas/Free/Pro and fake payOS. Nothing is hosted or actually paid. |

Previews build private copies (allow a short build), need installed dependencies
and Chromium; Billing additionally needs local Docker `supabase_db_EXE`. They never
copy private env files or replace normal `.next`. Use the external URLs above, not
internal 4329/4349 app ports. Ctrl+C removes only that launcher's resources; saved
preview work is lost. You can run both previews together in separate tabs.

### Sample and exact scenario

In either preview, expand **Sample account, CV and exact instructions**. Sign in,
when asked, with **`fictional@example.test` / `fictional-preview-only`**. Do not
invent a real account: default fictional signup returns no session, honestly. The
automated signup-with-session scenario is only a test fixture, not real signup.

Download **synthetic PDF** or **synthetic DOCX** there. Direct links are
`/__preview/samples/sales-cv.pdf` and `sales-cv.docx` on that preview's origin.
Both contain the existing fictional Alex Morgan sales CV. Paste this exact JD:

```text
Required: Help customers select products.
Required: Maintain accurate stock records.
Preferred: Negotiate supplier contracts.
Preferred: Use accounting software.
```

Exact Rewrite instruction, with **English** selected:
`Keep it concise. Preserve dates and attribution.`

Only that CV/JD/instruction and the untouched extracted Rewrite base are simulated.
Arbitrary input, another language or rewriting an already edited base must give a
clear fixed-scenario error, never pretend an AI analyzed it. Edit **after** Rewrite.

### Ordered checklist (use Billing preview for the complete combined session)

1. **Landing/Auth:** visit `/` then Sign in with the fictional sample. Expect `/app`
   only after session verification. There is one compact fictional/no-payment notice.
   Real signup/newest emailed recovery link belong to a separate normal-app session
   after owner setup; never change Confirm email to make a preview succeed.
2. **Upload:** download and select PDF (try DOCX on a second pass). Expect extraction
   success, no automatic Scan. Expand **Review extracted text**; it is editable.
   Leave the supplied text unchanged for this fixed scenario. Paste the exact JD.
3. **Scan → Explain:** click **Scan CV** once. See supported/unclear/not-found
   findings. Open **View source & detail**. Supplier negotiation must remain someone
   else's work, not Alex's achievement. No automatic Rewrite.
4. **Prompt → Rewrite:** enter the exact instruction above and click **Rewrite CV**.
   Expect the complete Classic CV, customer-service/stock-record wording improved,
   dates and “My manager negotiated supplier contracts, not me.” unchanged.
5. **Edit/export:** edit the complete CV; Copy text/TXT and Print / Save as PDF must
   contain the edited text, not model notes. Check legible Unicode, page boundaries,
   keyboard focus and a narrow phone layout. No export consumes AI quota.
6. **Optional save:** expand **Save this CV (optional)**, name it and Save CV. Wait
   for confirmation; reload/reopen from **Saved CVs**, rename/edit/save again and
   visit **Account**. Unsaved content is not automatically persisted.
7. **Free limits (Billing only):** Account shows Free 3 Scans/1 Rewrite/month and
   3 saved versions. Repeat Scan deliberately until the fourth is refused; or use
   the saved-version limit. Existing CVs/exports remain usable. Billing's PostgreSQL
   tests cover expiry/last-slot races; Scan preview does not prove AI quotas.
8. **Purchase while a draft is open:** click **Free / Pro plans ↗**; create one
   illustrative VND 79,000 order and open hosted checkout separately. **Never make
   a real transfer.** On the labelled fake provider choose **Simulate verified
   payment**, return and Check payment. Account shows Pro 30/15/30. The original
   workspace CV/JD/editor must still be there. Return/cancel query text is not proof.
9. **Renewal/recovery:** buy another 30 days. Current expiry/usage stay unchanged;
   Account shows a purchased next period. Optionally choose **Pay without callback**:
   the local runner recovers it after backoff (usually a minute or more). Refresh
   Account; do not create a replacement purchase just because verification is slow.
10. **Reopen/failures:** close/reopen a tab before stopping the launcher: saved CVs
    and Pro remain. Failed/lost verification or a second click must not duplicate
    the entitlement. Unsupported AI input must retain your text. If a completed
    AI result cannot be recovered, a deliberate new-request action is required.

**Record a failure:** environment/URL, step, expected versus actual message, time,
browser/viewport, and a screenshot using only the synthetic fixture. No passwords,
tokens, env contents or personal CVs. Keep the draft/tab open if it helps reproduce.

**Postponed, not green from a fake:** current normal-build real signup/recovery/email,
hosted direct A/B ownership enforcement and new migrations, hosted scheduler/webhook,
real merchant/price/payment acceptance, refunds and live AI cost/quality. Live sales
stay disabled. Exact setup gates: [BILLING_SETUP_EVIDENCE.md](BILLING_SETUP_EVIDENCE.md).
Current engineering identity/results: [COMPLETION_HANDOFF.md](COMPLETION_HANDOFF.md).

---

## Earlier owner-hosted worksheet (2026-10-20; historical)

Branch `feat/ownpath-demo-rc`, HEAD `7adbd6b77085318be43d55bff382d74b499e6350`,
plus the preserved uncommitted candidate. Current local/mock evidence is in
[CV_WORKSPACE_EVIDENCE.md](CV_WORKSPACE_EVIDENCE.md). The older worksheet below
describes historical Translator/Factory checks and does not define this workspace.

### Bounded retained-feature repair (2026-10-20)

[RELIABILITY_REPAIR_EVIDENCE.md](RELIABILITY_REPAIR_EVIDENCE.md) records the
current byte baseline, finding dispositions, local PostgreSQL/PostgREST results
and migration/setup boundaries. Legacy intake/analysis/expert Next APIs remain
retired (404); their direct pages are still reachable. No endpoint was restored.
Two retained migrations are **conditional legacy repairs, NOT APPLICABLE to the
inspected hosted schema**:
`20261020_legacy_draft_revision.sql` and
`20261020_review_rpc_submission_limit.sql`. Owner preflight found their legacy
tables/RPCs absent. Do not create them or run all SQL. Current product requires
the already-applied profile/version migration only. Preserve the current
`/app` Scan/Rewrite and Account acceptance below; the repairs do not replace it.

**Owner-reported setup, not complete acceptance:** existing migration applied;
both CV tables exist and report RLS enabled; Confirm email disabled; real signup
reached `/app`. No hosted writes/settings changes or paid AI calls were performed
by this verification. Do not apply the migration again.

Run `pnpm dev --hostname 127.0.0.1 --port 4317` with the intended local settings,
or use the existing worktree server on that port. Use synthetic text/accounts only;
record pass/fail and error category without credentials, tokens or clipboard values.

### Short hosted sequence (not yet accepted)

1. **Auth:** landing loads signed out. With an owner-created test account, register
   or sign in → directly `/app`, no success/account stop. Logout → `/`; direct `/app`
   and saved APIs reject signed-out access. Sign in again. Test invalid credentials
   and provider/network failure: recoverable error, no protected redirect. Verify a
   newest password-recovery link in the requesting browser reaches `/reset-password`,
   can update the password only with verified identity, then sign in normally.
2. **AI disabled:** `/app` opens Scan & Rewrite directly. Upload a synthetic PDF/DOCX
   and paste the required JD. Click Scan: configuration error, inputs retained,
   no fabricated findings. No profile/approval prerequisite. Run the controlled
   browser fixture for the complete new journey without paid calls.
3. **Earlier saved work:** Saved CVs → earlier version and expandable earlier
   profiles. Verify names/dates/Unicode/lines; old records remain unchanged.
4. **New saved versions:** after the controlled or authorized AI journey, edit the
   complete CV, name it under **Save this CV (optional)**, Save CV → confirmed
   success. Reopen through Saved CVs, edit/save/reload. Copy/TXT must match the
   edited text. Print / Save as PDF must contain only the CV, legible Unicode and
   all final lines on actual printed pages. Offline/denied/conflicting saves keep
   edits; success after editing changes to “Current edits are not saved.”
5. **Live AI only after separate authorization/configuration:** Scan produces
   demonstrated/unclear/not-found groups with source excerpts, actual JD references,
   reasons and next steps. It must not rewrite. Enter instructions and explicitly
   Rewrite: a complete editable CV, with no sentence approval or save prerequisite.
   Check missing skills, other-person ownership, negation, numbers and unsupported
   seniority requests. Changing source/JD invalidates the scan; changing inputs,
   instructions or manual edits while pending must block stale results. Failed
   regeneration keeps the last usable draft. No factual-accuracy guarantee follows
   from a successful response. Live model quality remains an owner-run gate.
6. **Two accounts — visibility:** in separate browser profiles, owner creates/uses
   synthetic A and B. A saves a uniquely named synthetic profile/version. B must not
   list/reopen it; switching accounts clears A's rendered workspace. A still sees
   unchanged data. This visibility check **does not prove direct ownership enforcement**.

### Separate technical hosted ownership gate

Owner/authorized tester uses normal A/B authenticated sessions and the public
publishable key, **never service-role credentials**, against synthetic records:

- As B, `GET /api/cv-review/saved?id=<A-version-id>` → **404**.
- As B, `PATCH /api/cv-review/saved` with A's ID and current revision → **409**;
  A's record must remain unchanged. As B, `DELETE` of A's ID may return idempotent
  **200**, but must leave A's record intact. Reopen as A to verify no mutation.
- B direct Supabase REST queries on `ownpath_experience_profiles` and
  `ownpath_cv_versions` filtered to A's IDs → **no rows**. Cross-owner version
  update/delete must affect **zero rows**; cross-owner profile delete zero rows;
  profile updates are forbidden even to its owner. A forged insert with A's
  `owner_id` must be denied by RLS for both tables. Anonymous reads/writes denied.
- Distinguish true empty lists from schema/configuration/network failures. Retain
  only status/row-count/unchanged-record observations, not session headers or raw CVs.

Local SQL/RLS and server-owner-predicate tests passed; hosted equivalents above
remain **NOT RUN**, separately from owner-reported registration and table existence.

### Earlier compact synthetic text and required JD

```text
Nguyễn Minh (fictional)
Experience
Accounts assistant, Cedar Co | 2024–2025
Checked invoices and matched receipts to the monthly ledger.
I did not approve payments.
The manager negotiated supplier contracts, not me.
Education
Accounting diploma, 2023
Skills
Excel
```

JD (synthetic): `Accounts assistant: reconcile invoices and receipts;
maintain accurate monthly ledgers. Supplier negotiation certification preferred.`

Additional synthetic Sales, Education, Operations, Technology and Entry-level/
ambiguous-date fixtures: `src/lib/cv-review/examples.ts`. Current Scan requires a JD;
these older texts are not the fixed preview scenario used in tonight's checklist.

---

## Historical worksheet (preserved)

Current automated candidate evidence: independent build PASS, browser 10/10,
retired-API 119 checks / 17 patterns and 21 visual captures; detailed reviewed
results in `.factory/evidence/DEMO-RC-001/qa-final/QA_REPORT.md`. Full retained suite
is **NOT GREEN**: 504 pass / 1 environmental failure / 505 tests (root-contained
TMPDIR conflicts with the private CLI Git-root safety guard). Final CSS-only action
spacing polish still needs QA rebuild/limited visual smoke. These automated results
do not mark any owner/device/AT/manual rows below PASS.

Prepared 2026-10-12 for checklist A06 and C07–C10. **Not executed on the owner machine or physical devices.** Automated Chromium/CI evidence is in STATUS and does not close these manual items.

Use [HANDOVER](HANDOVER.md) to fetch a separate clean worktree and start only your own loopback app. Use the fictional demo in [DEMO_SCRIPT](DEMO_SCRIPT.md); no personal CV/JD. Do not kill another app's server, reset a local DB or paste settings/keys into reports. Install/verify Factory only with the actual local OpenCode version; existing differing configs require manual review, not overwrite.

## Factory A06

```bash
opencode --version
node scripts/setup-ownpath-factory.mjs
node scripts/setup-ownpath-factory.mjs --write
node scripts/verify-ownpath-factory.mjs
opencode
```

Select `ownpath-lead`; inspect four commands and roles. The self-check captures debug JSON and prints fixed PASS/failure codes only. It runs `--pure`; installed plugin/MCP/provider behavior is not tested. It does not execute model tasks, tool requests, permission prompts or delegation. V2 runtime self-check refuses to claim verification; installer templates alone do not prove V2 runtime support. If generated files differ, preserve them and review the diff.

Before launching a writer, inspect actual global/provider/MCP permissions and the current diff yourself. Verify that Auditor/QA are read-only, Engineer editing is limited to issue scope, unknown shell commands prompt and private files are denied by the intended rules. Do not probe real secrets to test rules; use synthetic harmless files in a separate disposable checkout. Mark A06 complete only after actual owner-machine configuration and workflow inspection; a Work fixture PASS is A05 evidence only.

## C07: physical mobile keyboard and layout

- [ ] Record device/browser, tested branch/SHA and actual date.
- [ ] Open Intake; focus both inputs, type/edit and dismiss the keyboard; active field/actions remain reachable.
- [ ] Load fictional example, follow clarification and fact confirmation with touch; no horizontal overflow or trapped scrolling.
- [ ] Edit an English bullet while keyboard is visible; sources, approval and regenerate remain reachable.
- [ ] Review/TXT/forget session work; no unexpected persistent input after clear/reload.

## C08: zoom and keyboard navigation

- [ ] At actual browser zoom 200%, each screen remains readable; controls/text do not overlap or require horizontal scrolling.
- [ ] From a fresh session, use Tab/Shift+Tab and Enter/Space through intake, clarification, facts, edit, approval and review.
- [ ] Focus order follows reading order; focus is visible; no keyboard trap.
- [ ] Heading focus moves after screen transitions; back navigation keeps relevant input; textarea editing does not accidentally advance screens.

## C09: screen reader

- [ ] Record actual reader/browser combination (for example the team's available reader), not an emulated substitute.
- [ ] Inputs/questions/checkboxes have understandable labels; selected/approved state is announced.
- [ ] New screen heading and validation/error/loading messages are perceivable; dynamic changes do not silently strand focus.
- [ ] Source facts, JD relevance and edited/unverified wording are distinguishable while reading.

## C10: owner walkthrough, errors and copy fallback

- [ ] Empty/short/irrelevant inputs give recoverable guidance; skip never creates an answer.
- [ ] With only React supplied, JD REST API does not become a personal claim.
- [ ] Edit invalidates approval; regenerate keeps the edit and resets acceptance; rejected/unapproved output is absent from Review/TXT.
- [ ] Deny clipboard permission or use a browser context that rejects copy; feedback offers manual selection and accepted textarea content remains available.
- [ ] Copy/TXT/forget are deliberate actions; heading focus and clear/reload behavior work.
- [ ] Owner completes the fictional flow and records pass/fail per item with limitations; no external AI or DB-save claim in the demo.

## Record actual outcomes

### DEMO-RC-001 additional owner checks — all NOT RUN

- [ ] At 320/390/1440px inspect the intake panels/counters, stepper, fact selection, provenance, empty state and review; record screenshots with synthetic data only.
- [ ] Unchanged intake round trip keeps answers, selected facts, edits, rejections and acceptance; Return to existing bullets does not regenerate.
- [ ] Invalid intake preserves previous downstream work. Changed valid project/JD, answer or selected facts revoke stale export and keep wording visibly detached with no current source/relevance IDs. Repeating change/regenerate does not lose wording or duplicate control IDs.
- [ ] No-op answers/fact review preserve approval; regenerate always requires explicit acceptance. Detached wording is a user claim, not current evidence-backed output.
- [ ] Clear during pending generation; stale success/failure must not resurrect anything or end a newer request's loading state. Retry current failure without losing edits.
- [ ] Run all three `demoScenarios` from fixtures; unsupported requirements offer Edit JD / Clarify contribution and never announce a full match. Sufficient input still requires fact confirmation.
- [ ] Review TXT Blob/download and clipboard sinks: only current accepted non-rejected text; clipboard denial supports manual selection.
- [ ] Review actual no-store headers/network. Privacy claim concerns Translator inputs/drafts and no AI/DB submission, not zero app traffic: unchanged middleware can verify/refresh an existing configured session and update cookies. Do not weaken auth to make a network test pass.
- [ ] After generating with REST selected, clarify, uncheck REST and return to existing bullets: the gap lists REST from the current selection and approval stays revoked.
- [ ] A React-only result explains why only one grounded suggestion is available and offers Add contribution details; detached retained wording never counts toward the 2–3-bullet aim. Zero fresh suggestions still shows a recovery explanation when retained wording exists.
- [ ] Invalid project/JD displays only the corresponding field error, with label/helper/error associations and `aria-invalid`; correcting/retrying clears that field’s error without losing input or the previous valid session. Verify short/over-limit/control-character text and unrelated JD role.

Manual results remain NOT RUN until a named reviewer performs and records them. Automated component evidence is not owner, assistive-technology, physical-device or release acceptance.

| Item | Result (PASS / FAIL / NOT RUN) | Date / environment / SHA | Observation and reproducible steps | Follow-up |
|---|---|---|---|---|
| A06 | NOT RUN | — | Owner machine unavailable in Work | Owner-local execution |
| C07 | NOT RUN | — | No physical-device result supplied | Physical phone |
| C08 | NOT RUN | — | No manual zoom/tab walkthrough supplied | Actual browser zoom/keyboard |
| C09 | NOT RUN | — | No screen-reader result supplied | Actual reader |
| C10 | NOT RUN | — | No owner walkthrough supplied | Owner fictional task |

These rows intentionally remain NOT RUN. When executed, preserve failures, exact source checkpoint and reproduction steps; provide consent-safe text observations, not raw CV/JD/screenshots containing personal data. Report findings to the issue owner for fixes and focused retest. No manual pass automatically authorizes research, a paid provider or release.
> Historical Translator acceptance. The current complete-CV workflow and local
> verification gates are documented in [CV_WORKSPACE_SETUP.md](CV_WORKSPACE_SETUP.md)
> and [CV_WORKSPACE_EVIDENCE.md](CV_WORKSPACE_EVIDENCE.md).
