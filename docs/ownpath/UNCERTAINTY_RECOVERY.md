# Explicit local uncertainty recovery — 24 October 2026

## Scan readiness after “New request prepared”

The owner's screenshot does not expose the active React flag; it is not enough
to identify their exact runtime blocker. Inspection establishes that the Scan
button's actual disabled expression consists of `busy`, `checking`, `extracting`
and `uncertain`. Neither invalid CV/JD, missing consent nor quota is part of that
expression. Those are checked on explicit click/Send, with authoritative server
reservation limits still enforced. No owner gate or billing investigation was
repeated, and no new paid request was used to diagnose the screenshot.

The ordinary retained-CV sequence reproduces successfully with controlled data:
uncertain failure → acknowledgement → Prepare → pause marker removed, fresh
prepared ID retained → valid CV/JD unchanged → enabled Scan → renewed consent,
with zero additional inference calls until Send. Recovery clears busy/checking
and its local pause; it does not reset quota or silently cancel active extraction.

A separate confirmed lifecycle defect leaves exactly `extracting=true` in the
parent: CVUpload aborts/increments its extraction scope on unmount or source
change, but previously did not report `onProcessingChange(false)` in cleanup.
The aborted request's `finally` then skips its notification because the scope ID
changed. A child remount can therefore show “CV text retained” while the parent
still disables Scan. This is a reproduced code defect, not proof that a specific
remount occurred in the owner's session.

Fix: CVUpload reports no active extraction on mount, cleanup and session-end,
using the current listener. This releases stale ownership without discarding
retained text, requiring another upload, or bypassing a real ongoing extraction.
Late extraction replies remain invalidated. The regression failed before the
fix (last processing notification remained true) and passes after it.

Scan now derives its disabled state and adjacent accessible explanation from the
same flags. It names active Scan/Rewrite work, sharing/consent checking, attachment
extraction (including Cancel extraction), or the unresolved-request review action.
`data-blocked-by` contains only the fixed state category, never user data.
No guessed “quota ready” or provider-ready claim is made from input presence.

Focused verification: **73 tests / 4 files passed**, covering upload lifecycle,
the full retained-text recovery-to-consent flow, actionable extraction status,
identity preparation and unchanged server gates. **9 controlled Chromium checks**,
the isolated production build, relevant ESLint, non-incremental typecheck and diff
check passed. Controlled-browser/build evidence is retained in
`/tmp/opencode/recovery-readiness-{red,tests,lint,typecheck,build,browser}.log`;
the isolated build has disabled providers and fictional loopback Auth. The old
unknown database row and consumed allowance were not read or modified.

Next owner action: in the existing recovered Sales workspace, click **Scan CV
once** if enabled and stop at consent—do not Send yet. If it remains disabled,
report the new adjacent reason instead; do not upload again, reset storage or
repeat recovery merely to remove a different blocker. No historical inference
outcome can be inferred from the enabled/disabled button.

---

## Reachability repair after the owner screenshot

This section supersedes the initial recovery procedure below. The owner saw
Sales inputs and an enabled Scan button, but no pause/review action. We did not
inspect private browser data or infer an exact sequence from that screenshot.

Confirmed implementation defects:
- The initial implementation used `useState(false)` for uncertainty. A remount
  loses that state. Fast Refresh may remount when hook signatures change; opening
  a saved entry changes the shell's ScanRewrite key. Either can lose memory.
- The review action was rendered only when that memory-only state was true.
  Its confirmation also required the old in-memory identity, so merely restoring
  a pause without an identity was insufficient to make preparation work.
- Normal shell Scan/Rewrite/Settings navigation retains one ScanRewrite instance.
  Example insertion did not explicitly clear an existing pause. However, it
  cancelled an in-flight request and invalidated its response revision; if that
  happened before rejection arrived, no local pause was established. These are
  supported mechanisms, not a claim that any one caused the owner's screenshot.

Bounded repair:
- A tab-scoped boolean uncertainty marker survives remount/module reload.
  It contains no source text or billing claims; it is not a database state.
  A memory fallback works when storage is blocked. Storage cannot reconstruct a
  historical marker that was never written, so an explicit entry remains needed.
- **Review an unresolved request** is rendered even when no pause/identity is
  remembered. Selecting it reports known uncertainty locally, activates a pause
  and opens the same unchecked acknowledgement dialog. It does not fabricate a
  pending request or query/modify reservations. Cancel leaves that reported pause
  active; only explicit acknowledgement and Prepare release it.
- Recovery no longer requires an old identity. A fresh local prepared ID survives
  remount and is applied once to the next explicit request, even if its payload
  changes. An ID is not a pending/reserved request. Preparing still sends nothing.
- Existing markers survive example insertion and normal navigation. Cancelling
  or unmounting a dispatched request establishes a conservative local pause and
  ignores its late result. Cancellation before dispatch does not claim processing.
- Session-end privacy clearing removes the pause/preparation metadata along with
  existing local operation identities. Consent, revision checks, server limits,
  the previous unknown database row and consumed allowance remain unchanged.

Additional controlled tests cover no remembered identity, Cancel retaining the
reported pause, remount/module-state loss, preparation surviving module loss,
navigation, inserting examples both while paused and during a pending Scan,
late results, and actual rendered fallback/review dialogs on desktop and mobile.
Final checks: **173 tests / 12 files**, **9 Chromium scenarios**, relevant ESLint,
full non-incremental typecheck, isolated production build and diff check passed.
The 390px Sales screenshot and unchecked recovery modal were inspected: the
fallback entry is visible below View usage/example status, and Prepare is disabled
until acknowledgement. Keyboard Cancel restoration and remount persistence passed.
Artifacts are `/tmp/opencode/recovery-reachable-{tests,lint,typecheck,browser}.log`,
`/tmp/opencode/reachable-recovery-build-result.json`, and
`/tmp/opencode/reachable-recovery-browser-results/`. The build is isolated,
providers disabled, Auth fictional; browser responses are intercepted.

**One next owner action:** in the current Sales workspace, select
**Review an unresolved request**. If the persisted warning is already present,
the same entry is labelled **Review and continue**. The modal must open with
Cancel focused and an unchecked acknowledgement; preparing must remain disabled.
Do not click Scan/Send yet. No reload, storage clearing, new tab or sign-out is
needed to expose recovery. Do not interpret an enabled Scan button as evidence
that the previous request was reconciled. If this new fallback entry is absent,
report stale UI; do not send inference to test whether the code loaded.

---

This supersedes the “no supported recovery action” limitation in the earlier
Scan diagnosis. It does not reconcile any financial or reservation outcome.

## Behavior

- Uncertain Scan/Rewrite results still pause sending by default. One concise
  warning has a secondary **Review and continue** action.
- The native modal starts with Cancel focused. Its acknowledgement is unchecked;
  **Prepare a new request** stays disabled until checked. Cancel, Escape and
  backdrop dismissal retain the pause, source/attachment state and identity.
- Confirmation replaces only the local payload-to-request-ID mapping with a
  fresh UUID, invalidates previous completion revisions and aborts the old local
  controller. It does not fetch, reserve, finish, release or refund anything.
  Other payload identities remain unchanged. Re-entrant confirmation is guarded.
- Existing CV/JD, attachment, findings, rewrite instructions, output language,
  complete edited document and saving state are not replaced by recovery.
  Consent acknowledgements are invalidated; the next explicit Scan/Rewrite still
  verifies disclosure and requires Send for an external recipient.
- Session-end handling dismisses any review, invalidates old continuations and
  retains existing identity/consent privacy clearing. Unmount resolves pending
  confirmation as cancellation. No new source text enters browser storage.
- Authoritative server limits are unchanged. Client classification now recognizes
  the pre-dispatch `reconcile` gate so its real safe message is shown rather than
  incorrectly classifying that new request as a post-dispatch uncertainty.
- Previous unknown reservations and consumed allowance remain untouched. A
  confirmed review is acknowledgement of risk, **not financial reconciliation**.

## Verification executed

- **168 focused tests / 12 files passed**: Scan/Rewrite UI, navigation, domain,
  provider, reservation, identity, consent, diagnostics and saved contracts.
  New cases cover unchecked/Cancel/Escape preservation, distinct prepared ID with
  no send, repeated confirmation, renewed consent, real reconcile/busy/quota/plan
  errors, retained Rewrite edits/findings/instructions, old delayed results and
  session-end dismissal/identity clearing.
- **7 Chromium checks passed**, including recovery at 1440, 390 and 320px.
  Checks cover initial Cancel focus, keyboard cycling including disabled action,
  Escape focus restoration, acknowledgement, preparation-only behavior, preserved
  input, renewed Send consent, distinct sent IDs and authoritative gate display.
  Synthetic screenshots were captured; 320px dialog fit was inspected.
- Relevant ESLint, full non-incremental TypeScript check and isolated production
  `next build --webpack` passed. Build uses fictional loopback Auth, billing OFF
  and disabled providers; no `.env*` file is copied. Browser AI/extraction/billing
  endpoints are intercepted, and non-fixture external traffic is blocked.
- Artifacts: `/tmp/opencode/recovery-{tests,lint,typecheck,browser}.log`,
  `/tmp/opencode/uncertainty-recovery-build-result.json`, and
  `/tmp/opencode/claude-scan-browser-results/`.
- No owner server restart, paid call, hosted query/mutation, accounting change,
  migration, agent, commit, push or deployment was performed. Previously completed
  unrelated UI/account/browser evidence is reused, not rerun as live acceptance.

## One owner-triggered synthetic Scan — prepared, not executed

Owner supplied read-only preflight: clear; unresolved 1/2; rolling count 1/12;
active holds 0/1; Scan used 1/3. This permits trying a distinct request subject
to the authoritative send-time gates. The previous unknown and allowance remain.
No repeat preflight or dashboard investigation is required by this change.

1. Stay in the existing draft tab at `http://127.0.0.1:4317`. The existing dev
   server watches source changes. Wait for **Review and continue** beside the
   pause; do not reload, clear storage or open another tab to remove it. If code
   hot reload has lost the draft/pause, or the action is absent, stop and report
   that condition rather than interpreting disappearance as recovery. Do not
   restart/remount merely to regain sending. No current input is overwritten by
   the recovery action.
2. Confirm the intended test inputs are still the existing synthetic **Sales** CV
   and `Requirements:\nClear communication and accurate records.\nPreferred: supplier negotiation experience.`
   If other work is present, preserve it and stop instead of replacing it blindly.
3. Click **Review and continue**. Read the processing/charge warning, check
   **I understand the previous request remains unresolved.**, and select
   **Prepare a new request** once. This must only show the prepared status and
   enable deliberate actions; no Scan result or provider event should appear.
4. Click **Scan CV once**, verify consent identifies **Anthropic (Claude)** and
   the CV/JD content, then click **Send once**. Do not run Rewrite or retry.
   Pinned Haiku, thinking disabled, billing OFF and no fallback remain unchanged.
5. From the owner server terminal copy only the corresponding `ownpath.ai {…}`
   event: stage, outcome/code, provider HTTP status/request ID/stop reason,
   validation path/rule and reservation state. Do not share raw input/output,
   secrets or full logs. If a gate rejects, report that exact safe gate and stop.
6. On success verify original quotations, correct CV/JD provenance, preserved
   supplier-negotiation attribution/negation, missing-evidence wording and verified
   completion accounting. On uncertainty stop and preserve the new hold too.
   A successful controlled test/build does not establish live acceptance.
