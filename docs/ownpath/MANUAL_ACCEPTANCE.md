# OwnPath manual acceptance worksheet

## Current `/app` candidate — owner-hosted check (2026-10-20)

Branch `feat/ownpath-demo-rc`, HEAD `7adbd6b77085318be43d55bff382d74b499e6350`,
plus the preserved uncommitted candidate. Current local/mock evidence is in
[CV_WORKSPACE_EVIDENCE.md](CV_WORKSPACE_EVIDENCE.md). The older worksheet below
describes historical Translator/Factory checks and does not define this workspace.

### Bounded retained-feature repair (2026-10-20)

[RELIABILITY_REPAIR_EVIDENCE.md](RELIABILITY_REPAIR_EVIDENCE.md) records the
current byte baseline, finding dispositions, local PostgreSQL/PostgREST results
and migration/setup boundaries. Legacy intake/analysis/expert Next APIs remain
retired (404); their direct pages are still reachable. No endpoint was restored.
Two new migrations are **local-tested, not hosted-applied**:
`20261020_legacy_draft_revision.sql` and
`20261020_review_rpc_submission_limit.sql`. Owner review/application and hosted
acceptance of those DB contracts remain separate gates. Preserve the current
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
2. **AI disabled:** `/app` opens Scan & Rewrite directly. Paste the fictional CV
   and required JD. Agree and click Scan: configuration error, inputs retained,
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

### Compact synthetic CV and optional JD

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

Optional JD (synthetic): `Accounts assistant: reconcile invoices and receipts;
maintain accurate monthly ledgers. Supplier negotiation certification preferred.`

Additional synthetic Sales, Education, Operations, Technology and Entry-level/
ambiguous-date fixtures: `src/lib/cv-review/examples.ts`. No JD is required.

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
