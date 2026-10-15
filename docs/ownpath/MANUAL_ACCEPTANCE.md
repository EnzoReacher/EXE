# OwnPath manual acceptance worksheet

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

| Item | Result (PASS / FAIL / NOT RUN) | Date / environment / SHA | Observation and reproducible steps | Follow-up |
|---|---|---|---|---|
| A06 | NOT RUN | — | Owner machine unavailable in Work | Owner-local execution |
| C07 | NOT RUN | — | No physical-device result supplied | Physical phone |
| C08 | NOT RUN | — | No manual zoom/tab walkthrough supplied | Actual browser zoom/keyboard |
| C09 | NOT RUN | — | No screen-reader result supplied | Actual reader |
| C10 | NOT RUN | — | No owner walkthrough supplied | Owner fictional task |

These rows intentionally remain NOT RUN. When executed, preserve failures, exact source checkpoint and reproduction steps; provide consent-safe text observations, not raw CV/JD/screenshots containing personal data. Report findings to the issue owner for fixes and focused retest. No manual pass automatically authorizes research, a paid provider or release.
