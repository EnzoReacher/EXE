# M8 Owner Execution Checklist

**Use only fictional demo data for M7 app review.** Keep participant identities, contacts, CVs, applications, recordings, and confidential information out of this repository.

## 1. M7 browser review using fictional data

### Desktop and narrow mobile

- [ ] Open `/`, `/assessment`, `/analysis/[id]`, `/analysis/[id]/next-steps`, `/saved-work`, `/opportunities`, and `/review/[token]` with the fictional demo pack.
- [ ] On desktop, check readable layout, long role/company/title/URL/note wrapping, loading/empty/error/retry states, and clear privacy/advisory language.
- [ ] At a narrow mobile width, check navigation, forms, action buttons, review URL display, opportunity status controls, and delete confirmation without clipping or unreachable actions.
- [ ] Confirm status labels do not rely only on colour.

### Keyboard-only navigation

- [ ] Use Tab, Shift+Tab, Enter, Space, and Escape where relevant; do not use a mouse for this pass.
- [ ] Confirm visible focus on navigation, inputs, selects, buttons, draft editor, review-link actions, and delete confirmation.
- [ ] Confirm logical order, no keyboard traps, and accessible form error/retry messages.

### Permission and privacy checks

- [ ] Create a fictional review link for selected content only; confirm reviewer cannot edit owner work or reach owner workspace.
- [ ] Submit fictional reviewer feedback; confirm only owner sees it.
- [ ] Revoke the link; confirm it reaches neutral unavailable state.
- [ ] Confirm saved work opens the correct fictional report/draft and does not show source CV/JD text in summary lists.
- [ ] Add/edit/status-update/delete a fictional HTTPS opportunity link; confirm external-link disclosure and no claim that it is open, verified, recommended, or a CV match.

Record outcome in the M7 owner package; do not mark a check passed unless it was actually performed.

## 2. Recruit CP2 participants ethically

- [ ] Confirm target participants are job seekers actively applying with an existing CV.
- [ ] Use an appropriate invitation channel and store contact details outside this repository.
- [ ] Explain voluntary participation, ability to skip/stop, anonymous note handling, and no promised job/product outcome.
- [ ] State clearly: no full CVs, personal contacts, live application material, credentials, confidential employer information, or recordings in committed files.
- [ ] Use the fictional walkthrough unless a separate approved privacy process exists.
- [ ] Aim for at least 5 target-user interviews, 2 expert interviews, and 20 anonymous survey responses where practical; document limitations.

## 3. Record and review anonymous findings

- [ ] Use the interview guides and survey template without leading participants toward a product conclusion or price.
- [ ] Assign anonymous IDs and enter summaries in `CP2_EVIDENCE_REGISTER.md` only after collection.
- [ ] Record source/date, what was actually observed or stated, related hypothesis, signal direction, and limitations.
- [ ] Keep raw identity/contact information and recordings outside Git; do not commit raw data.
- [ ] Cite current public sources before recording competitor/pricing facts.
- [ ] Review evidence with the team and record what claim, assumption, feature direction, or question changes.

## 4. Checkpoint and release gates

### CP1

- [ ] Complete M5 fictional demo rehearsal.
- [ ] Complete owner desktop/narrow-mobile and keyboard review.
- [ ] Collect required team/course evidence before marking CP1 complete.

### CP2

- [ ] Research plan executed and limitations recorded.
- [ ] At least 5 target-user interviews recorded anonymously.
- [ ] At least 2 career/recruitment expert interviews recorded anonymously.
- [ ] At least 20 survey responses where practical, or documented limitation/course alternative.
- [ ] Competitor/pricing evidence has current cited sources.
- [ ] Owner/team review records whether hypotheses are supported, neutral, or contradicted.
- [ ] Do not mark CP2 complete until the course’s actual evidence requirement is met and reviewed.

### Privacy and retention review

- [ ] Decide and document handling, deletion, backup, retention, access, and incident expectations before accepting real CVs in an app environment.
- [ ] Confirm no production credentials, real CVs, application material, or participant data is committed.

### Explicit release approval

- [ ] Owner approval recorded.
- [ ] Final branch review completed.
- [ ] Any research claims separate evidence from assumptions.
- [ ] **No merge to main and no deployment without owner approval.**
