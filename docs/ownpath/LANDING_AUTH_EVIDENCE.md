# OwnPath landing/Auth — local engineering acceptance

## OWNPATH-POST-SIGNUP-001 — frozen delta, review pending (2026-10-19)

**Writer STOPPED/FROZEN for lead review.** Prior independent Landing/Auth acceptance
below remains historical; it does not automatically accept this new signup/header
delta. No reviewer was spawned by the writer. Configuration and behavior:
[AUTH_SETUP.md](AUTH_SETUP.md).

- A provider-returned signup session is independently checked through SDK `getUser`
  before a new-document redirect to `/experience-translator`. Failed verification
  remains recoverable without repeating signup or fabricating guest success.
- Confirmation-required signup replaces the form with focused **Check your email**,
  neutral eligibility messaging, email-only resend/retry, change-email focus and
  a guest Translator link. Password fields are cleared after successful signup.
- Verified confirmation callback defaults to Translator, with exact safe paths and
  recovery `/reset-password` retained. Code exchange, verified identity, cookie
  rotations/deletions and privacy headers remain intact.
- Public/Translator headers show Your account only after verification, handle
  logout/expiry/error/loading/stale-result cleanup and disclose no identity fields.
  Translator changes are limited to one import and its existing header render.

### Personally executed final evidence

All final gates passed through configured approval; no skipped cases:

| Gate | Result |
|---|---|
| Focused Auth/header/Translator tests |117/117 in11files before final presentation-only refinements |
| Full final suite |803/803 in62files (`wrap-full-suite.log`) |
| Lint / typecheck |Both exit0 (`wrap-lint`, `wrap-typecheck`) |
| Isolated unconfigured / fictional configured builds |Both exit0;151 public inputs,150 unchanged per snapshot plus generated `next-env.d.ts`; all151 root inputs unchanged |
| Configured signup/Auth compiled browser |12/12 (`browser-fixture-wrap`) |
| Truly unconfigured browser |4/4 (`browser-unconfigured-wrap`) |
| Retained Translator / mocked OpenAI browser |11/11 +10/10 (`retained-demo-wrap`, `retained-openai-wrap`) |
| Asset/API/privacy boundaries |16 served JS/CSS matches per build;119 retired HTTP checks/17 patterns;2 missing-OpenAI503/no-store routes;5 Auth-page privacy checks per build |

Final build IDs: unconfigured `E5bo4mG9-vlHccAEWXckf`, fictional configured
`h0xXQG7UIL-YyJIBhlG4K`. Evidence, commands, exits, scoped baseline/patch/hashes:
`.factory/evidence/OWNPATH-POST-SIGNUP-001/`. Private10-file pre-edit snapshot:
`.factory/backups/OWNPATH-POST-SIGNUP-001/`.

Initial retained Translator run failed11/11 on its unchanged request guard.
Observed automatic Next link prefetch to new sign-in/signup links caused requests
outside the account-free journey. Fixed by disabling prefetch on new account links,
not weakening that guard; final retained21 cases pass. Screenshot inspection also
found squeezed320px signed-in header text; wrapping was added only to the existing
header render. Final builds/gates were rerun after both production refinements.
Earlier failed/intermediate artifacts are retained, not substituted for final results.

Writer actually inspected pending-email screenshots at1440/390/320 and signed-in
Translator headers at desktop/mobile. The final wrapped320/390 views are readable;
no clipped actions or horizontal overflow observed. Keyboard/focus/menu/navigation
checks pass. This is synthetic Chromium/writer visual evidence, not AT/device or
owner acceptance.

All task-owned listeners on4381–4383 were cwd/PID-verified before SIGTERM and their
commands exited143. Browsers closed; final port-free evidence retained. Existing
4317/root `.next`, Factory correction/permissions, packages/schema, accepted OpenAI
logic and unrelated work remain untouched. No original diagnostic retry/probe,
agents, credentials/environment-file reads, installs, Git mutation or deployment.

**NOT RUN:** hosted Supabase signup/confirmation/email/SMTP, real-service PKCE and
session-policy acceptance, live OpenAI/cost, CI, owner/AT/device/privacy/release
checks. The fictional HTTP fixture does not deliver email or validate cryptography.
Walkthrough URLs after separately approved startup: configured app4381 plus stub4382,
unconfigured4383; all now stopped. See task RESULTS for exact configuration/startup.

## Independent review closure — 2026-10-19

Independent final QA and focused Auth Security both **PASS within mocked/local
compiled scope**. QA independently verified all27 frozen file hashes, patch,
preservation/build identities and retained screenshots; no product blocker found.
Reports: `.factory/evidence/OWNPATH-LANDING-AUTH-001/qa/{FINAL_REVIEW,AUTH_SECURITY_REVIEW}.md`.
The frozen Builder handoff below describes the pre-review state. Only this document
and AUTH_SETUP review-status text changed after review; product/test/build inputs
remain frozen. The original reviewed manifest is retained rather than rewritten.
The duplicate diagnostic submission remains a procedural deviation, not an accepted
retry or a runtime sandbox PASS. Hosted account/email/session and live OpenAI gates
remain **NOT RUN**. No release or deployment acceptance is implied.

## Current handoff — 2026-10-19

**FROZEN / writer STOPPED for lead-coordinated independent QA and focused Auth
Security. Not independently accepted or released.** Same writer session
`ses_eb061e458ffetKMalpRBvSdAlZ`, same baseline HEAD/branch below,27 scoped paths.
The earlier blocked checkpoint is retained below as history, not current status.

The two compiled failures are resolved. `SIGNED_OUT` could clear a recovery email
entered while a session check completed; it now clears password fields but preserves
email. The installed SDK removes local session state on some remote logout errors;
the UI now reverifies identity and truthfully reports whether a verified session
remains, without restoring stale tokens or claiming remote logout succeeded.
Unit tests cover both preserved and removed sessions. Browser synchronization now
waits for the recovery submit button to be enabled. A scoped reduced-motion rule
also overrides the document's inherited smooth scrolling on these public pages.

### Final personally executed checks

All checks used configured shell approval; all listed final exits are0, no skips.

| Gate | Result / retained evidence under `.factory/evidence/OWNPATH-LANDING-AUTH-001/builder/` |
|---|---|
| Focused Auth/landing |75/75 in9files (`resume-focused.log`) |
| Full final suite |791/791 in61files (`final-full-suite.log`) |
| Full lint / typecheck |Both pass (`final-lint.log`, `final-typecheck.log`) |
| Isolated final production builds |Both configurations pass (`build-{fixture,unconfigured}-final.log`) |
| Configured fictional Auth browser |7/7 (`browser-fixture-final.json`) |
| Truly unconfigured browser |4/4 (`browser-unconfigured-final.json`) |
| Retained Translator browser |11/11 (`retained-demo-final.json`) |
| Retained mocked OpenAI browser |10/10 (`retained-openai-final.json`), no live provider |
| Runtime binding / boundaries |16 served JS/CSS assets per build match disk;119 retired HTTP checks/17 patterns;2 missing-OpenAI routes return503/no-store;5 Auth page privacy-header checks per build |

Final unconfigured build ID `hO9IVw5Nbolou7g9eygJO`; configured fictional build ID
`wrpOjWECJIfiComKD7qii`. Each uses148 public inputs:147 unchanged after build, only
generated snapshot `next-env.d.ts` variance, all148 root inputs unchanged.
`final-build-binding.json` records identities and asset hashes. Public Auth settings
are compiled into bundles; the separate builds are intentional.

Compiled checks exercise signup/resend/reset request, validation/provider/network
recovery, login/session/account/logout, PKCE callback cookie persistence and code
removal, password update, expired callback and anonymous reset rejection. Both
configurations check navigation targets, keyboard/menu and1440/390/320 widths;
reduced-motion scrolling is asserted. Actual rendered screenshots were inspected
by this writer at those widths, including narrow signup, account, logout error
and unconfigured signup: no observed overlap or horizontal clipping. This is
writer visual inspection, not independent QA, physical-device or AT acceptance.

### Operational deviations and remaining gates

After the lead-approved two-path permission correction and supported reload, the
original diagnostic was permitted and exited0. **Writer error: it was submitted
twice, despite the one-retry authorization.** Both returned the same observation;
no further original diagnostic retry was made. Duplicate app/stub startup requests
also exited1. These are retained execution-control deviations, not passing gates
or proof of broad permission enforcement. Earlier denials remain historical facts.

Final owned listeners265110/4381,234568/4382 and265112/4383 were PID/cwd-verified
then sent SIGTERM; all three commands exited143. Port-free verification is retained
with final cleanup evidence. Playwright completed and diagnostic browsers closed.
Existing4317/root `.next` untouched. No agents/reviewers spawned by the writer.

Review the single `final-hashes.json` target and baseline-relative `final.patch`.
Preservation accounts explicitly for the approved permission correction rather
than claiming every old Factory hash is unchanged. No packages/schema/migrations,
accepted OpenAI/Translator bytes or unrelated dirty work were changed by this task.
Lead owns ledger updates and independent review dispatch.

**NOT RUN / not established:** hosted Supabase/account creation/email/SMTP,
real-service PKCE cryptography/session policies, live OpenAI, CI, owner/AT/device
privacy and release acceptance. Fictional stub tests do not establish these.
See [AUTH_SETUP.md](AUTH_SETUP.md) for exact owner configuration and limitations.
No credential/environment-file reads, installs, Git mutations or deployment.

## Historical blocked checkpoint (superseded)

OWNPATH-LANDING-AUTH-001,2026-10-19. **BLOCKED / STOPPED, not accepted or
review-ready.** Independent QA and focused Auth Security have not started.
Baseline HEAD `7adbd6b77085318be43d55bff382d74b499e6350` on
`feat/ownpath-demo-rc` plus preserved dirty/untracked work.

Implemented candidate: scoped teal/offwhite landing with account-free Translator
CTA, explicitly fictional before/after example, source/approval workflow, actual
Demo/OpenAI FAQ and responsive menu; dedicated Supabase signup/sign-in/resend/
forgot/reset/account/logout UI; server-verified reset session, PKCE callback cookie
preservation and exact return-path allowlist. No provider/schema/package changes.
See [AUTH_SETUP.md](AUTH_SETUP.md) for configuration and live-evidence limits.

## Personally executed evidence (not independent acceptance)

- Focused unit/component checks: **73/73 tests,9files,no skips**, exit0.
- Stable product candidate full suite:
  `env TMPDIR=/tmp COREPACK_ENABLE_NETWORK=0 pnpm test` —
  **789/789 tests,61files,no skips**, exit0. Full raw log retained.
- Full lint and typecheck: exit0 each.
- Two isolated production configurations of the same148public inputs: both exit0.
  No environment files copied, normal HOME/network-disabled Corepack, no installs.
  Each snapshot has147unchanged inputs and only generated `next-env.d.ts` variance;
  all148root inputs unchanged. Root `.next` untouched.
  Unconfigured build `uvM-TFyd2y-toYRmh45o0`; fictional local Auth fixture build
  `6hYtLyX6HvGhmS0OEMX9h`. Public Auth config is build-time, so separate bundles
  are necessary for real unconfigured versus configured-fixture UI.
- Unconfigured compiled run: three landing/link/menu/keyboard/viewport cases passed
  at1440/390/320; missing-config case failed on an ambiguous page-wide alert
  locator that also matched Next's route announcer. Locator scoped to main;
  **corrected unconfigured case not yet rerun**.
- Configured fictional HTTP-fixture run: initial3pass/3fail; corrected harness
  run **4pass/2fail,0skips**. All three landing cases and PKCE recovery callback/
  cookie persistence/password update pass. Remaining failures: reset-request status
  after signup/resend; account email visibility after failed logout. Causes are
  **unresolved**; no product-versus-harness conclusion or acceptance inferred.

## Retained failures and blocker

Initial focused run64pass/1fail (numeric-loopback redirect became localhost),
fixed by restoring only the same-port numeric-loopback equivalent, never arbitrary
Host headers. Original assertion preserved; focused suite then passed.
Initial scoped lint had one effect-initialization error and one cleanup-ref warning;
fixed with asynchronous initialization and captured epoch reference, no rule disabled.
Initial browser harness also used a changing submit-button name, nonexact password
label and manually malformed PKCE verifier cookie. Corrected without weakening
assertions: busy label checked, exact label used, installed SDK issues real local
verifier cookie. Original run logs retained; corrected PKCE case passes.

The configured permission layer rejected the next combined SDK-source/compiled-UI
diagnostic shell command with `permission.rejected: Permission denied: shell`.
No deny cause was supplied. No rephrased command, script, alternate tool or other
fallback was used to perform that denied operation. Writer stopped for the
configured approval/policy gate rather than bypassing it. Resume requires the lead
to resolve that exact gate and authorize bounded investigation of the two failures.

Exact logs, explicit exits, partial browser reports, fixture source, build manifests,
private-snapshot identity, scoped checkpoint diff and preservation:
`.factory/evidence/OWNPATH-LANDING-AUTH-001/builder/`.
Private verified pre-edit snapshot: `.factory/backups/OWNPATH-LANDING-AUTH-001/`.

## Not run / cleanup

Retained Translator11/OpenAI mocked-client10 browser reruns and final asset binding
have **not yet run in this task**. Earlier OpenAI743/independent acceptance remains
historical preserved evidence, not new Auth acceptance. Real Supabase, account
creation, SMTP/mail delivery, hosted session policies, live OpenAI, CI, manual
owner/AT/device/privacy/release checks: **NOT RUN/not established**.
Fictional fixture does not verify PKCE cryptography or email delivery.

Task-owned PIDs140765/4383,140964/4381 and141117/4382 were cwd-verified before
SIGTERM; all three background commands exited143. Browsers closed. Existing4317
was neither adopted nor stopped. No task agents spawned, no live credentials,
environment-value reads, Git mutations, remote migrations or deployment.
