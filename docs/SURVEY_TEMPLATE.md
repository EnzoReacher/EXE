# Survey Template — CP2 Preparation

## Internal owner status panel — exclude from participant form

**Status: draft only; launch approval and platform review not recorded.** No survey results are recorded in the repository. Unknown counts are not zero. Complete actual fields only; this document is not launch authorization.

| Owner field | Actual status / record |
|---|---|
| Wording version / owner reviewer role / approval date | Pending |
| Launch approval / approving role / date | Pending |
| Intended audience / eligibility / job-family scope | Pending owner selection |
| Recruitment-channel category / sampling limitations | Pending; use broad categories, no group names or contacts |
| Platform / reviewed settings / settings review role and date | Not selected or reviewed in this record |
| Anonymity or confidentiality wording / known identification risks | Pending actual platform and recruitment review |
| Planned collection start / close | Not set |
| Actual collection start / close | Not recorded |
| Responses started / eligible / completed | Not recorded / not recorded / not recorded |
| Survey evidence ID / aggregate location | Not assigned / no actual aggregate recorded |
| Owner/team evidence review role / date / status | Pending |
| Instructor requirement clarification / applicable collection target | Pending; confirm course counts and options, do not substitute a pilot sample |

### Pre-launch owner checks — all pending

- [ ] Review neutral question wording and the exact fictional walkthrough shown; no suggested price, benefit/outcome promise, preferred answer or claim of superiority.
- [ ] Approve participant consent, voluntary participation, optional questions, screening exits, stop behavior and submission behavior in the actual platform.
- [ ] Inspect email/account/login collection, IP/device metadata, analytics, cookies, timestamps, unique links, recruitment tracking, integrations, access roles, provider retention and partial-response saving. Disable unnecessary identification where possible and record remaining limits privately.
- [ ] Assess whether broad demographic combinations, free text or recruitment can identify someone. Remove unnecessary questions and avoid publishing small identifying groups.
- [ ] Finalize accurate participant-facing data handling: what is collected, who can access it, how long it is retained, use in course/project summaries, and whether a submitted response can be located for withdrawal. Do not promise deletion or anonymity that settings/processes cannot deliver.
- [ ] Use “anonymous” only if actual platform and recruitment review supports it. Otherwise explain confidentiality limits and any identifying metadata clearly; do not collect identities in the questionnaire or commit them to Git.
- [ ] Test decline/skip/stop and final submit with synthetic input in an owner-controlled draft; document actual observations and settings review. No test or launch has occurred through this template edit.
- [ ] Record owner/team wording **and** platform approval before launch; instructor clarification remains required where course rules are ambiguous.

### Non-identifying collection and closeout log — internal only

Keep names, contacts, individual answers, exact respondent timestamps, private form links and raw exports outside Git. Use role labels and broad channel categories only. Record events only after they actually occur; a blank row is not an event.

| Actual event date | Wave / wording version | Event (approval, opening, check, closing, aggregate review) | Responsible role | Broad channel / platform category | Started / eligible / completed | Issue or settings change / limitations | Evidence ID / review status / next action |
|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |

At closeout, record actual collection dates and count definitions, excluded/incomplete responses, missing answers, recruitment/coverage bias, safe aggregate review and evidence-review outcome. Do not put launch approval or collection counts in the register as research findings. See [aggregate handoff](#aggregate-summary-fields--internal-only).

## Participant-facing draft — owner must finalize before launch

Copy only this section through the completion message into the form. Exclude all internal panels, logs and aggregate instructions. Bracketed handling fields below must be replaced with truthful, reviewed wording before participants see the form.

## Participant introduction and consent

> We are researching how job seekers tailor an existing CV to a specific job description. Taking part is voluntary. Do not provide your name, email, phone number, employer name, CV, job-application content, account details, or other personal/confidential information. You may skip any research question or stop at any time without penalty. [Explain actual platform/recruitment data collection and anonymity or confidentiality limits, authorized access, retention and whether partial answers are saved when you stop.] Responses will be summarized in aggregate for a student project and may guide project decisions; participation does not guarantee a product, service, job outcome or payment. [Explain actual post-submission withdrawal options or why an unidentifiable response cannot be located.]

Consent choice, separate from research question numbering:
- I have read the information and agree to take part → continue to screening.
- I do not agree → end without proceeding to research questions.

Research questions are optional. “Prefer not to say” is an explicit answer; leaving a question blank is a skipped answer. Consent and eligibility routing can end the survey without requiring disclosure. [State the actual final-submit step and stop/partial-save behavior; do not claim closing the page deletes responses unless verified.]

## Screening

1. Are you currently applying, or planning to apply soon, for a role using an existing CV?
   - Yes, currently applying
   - Yes, planning to apply soon
   - No / Prefer not to say / skipped → end survey politely without further research questions
2. In the last 12 months, have you tailored a CV for a specific job description?
   - Yes / No / Prefer not to say
3. Broad job-search stage (optional): student / recent graduate / early-career professional / other / prefer not to say

## Current workflow and pain points

4. Which methods do you currently use to tailor a CV? Select all that apply.
   - Read job description manually
   - Use a document/template
   - Ask a mentor/career service
   - Use an online CV or writing tool
   - Reuse a prior application
   - Other method (optional text; no identifying details)
   - I do not tailor a CV
   - Not sure / Prefer not to say

   Choose “I do not tailor a CV,” “Not sure” or “Prefer not to say” alone.
5. Which parts, if any, do you find difficult? Select up to three.
   - Identifying relevant requirements
   - Knowing whether my CV shows evidence
   - Deciding what to improve
   - Writing truthful tailored wording
   - Keeping track of applications/materials
   - Getting feedback
   - Privacy concerns
   - Other (optional text; no identifying details)
   - None of these / Not sure / Prefer not to say (choose one of these alone)
6. About how much time do you usually spend tailoring for one role? Choose a range.
   - Under 15 minutes / 15–30 / 31–60 / 61–120 / Over 120 / I do not tailor a CV / Not sure / Prefer not to say

## Simple ratings

Use a 1–5 scale: 1 = strongly disagree, 2 = disagree, 3 = neither, 4 = agree, 5 = strongly agree; include “Not sure,” “Not applicable,” and “Prefer not to say.” Any item may be skipped.

7. I can tell which parts of my CV support a specific job requirement.
8. I know what to improve after reading a job description.
9. Showing source evidence affects how much I trust CV advice.
10. I am concerned about how CV-related data is handled by online tools.

## Fictional EXE workflow reactions

Show only the fictional demo description/screens. State: “This is a prototype walkthrough, not a promise of results.”

Rate expected usefulness from the description only: 1 = not at all useful, 2 = slightly useful, 3 = moderately useful, 4 = very useful, 5 = extremely useful; also offer “Not sure,” “Not applicable,” and “Prefer not to say.” Skip this section if no walkthrough was viewed. These answers describe expectations, not demonstrated usability or saved effort.

11. Seeing requirement-by-requirement evidence and caveats.
12. Receiving a gap-linked action roadmap.
13. Reviewing a source-grounded CV draft before using it.
14. Returning to saved work for a role.
15. Sharing selected material through a revocable private review link.
16. Privately tracking a job link found independently.

17. What, if anything, seems confusing, concerning, or unnecessary about this workflow? Optional text; no identifying details.
18. What, if anything, would you change about the workflow? Optional text; no identifying details.

## Neutral value and willingness-to-pay questions

19. What, if anything, would a tool need to do for you to consider it valuable? Optional text; no identifying details.
20. Which access or payment model, if any, would you consider for a tool that met your needs? Choose one.
   - Free only
   - Free basic use with optional paid features
   - One-time payment might be acceptable
   - Subscription might be acceptable
   - I would not use/pay for a tool like this
   - Not sure / Prefer not to say
21. What conditions would affect your decision to use or pay for it? Optional text; no identifying details.

Do not include a suggested price, state that EXE is affordable/cheaper, or frame one response as correct.

## Completion message

> Thank you. Your feedback will be reviewed in aggregate with other responses under the data-handling terms explained above. Participation does not create an EXE account or a service commitment. Please do not send personal documents in response to it.

For declined consent or a screening exit:

> Thank you for your time. You do not need to answer any further questions. Please do not send personal documents.

## Aggregate summary fields — internal only

Do not publish raw responses with identifiers. For each survey wave, record:

```text
Survey evidence ID: SV-___
Collection dates:
Recruitment channel category:
Responses started / eligible / completed:
Question-level response counts and distributions:
Common anonymous themes (with no identifying text):
Limitations, missing data, and sampling bias:
Related hypotheses:
Owner review status:
```

The template and empty summary fields are not survey evidence.

### Aggregate format and commands

Follow [M10.3 survey import schema](M10_3_SURVEY_IMPORT_SCHEMA.md). Manually create a reviewed aggregate copy in ignored/private storage; never pass a raw platform export to these tools. Use CSV with one header or JSON flat objects, repeating all required metadata on every category row: `data_kind`, `collection_start`, `collection_end`, `responses_started`, `responses_eligible`, `responses_completed`, `recruitment_channel`, `limitations`, `question_id`, `question_type`, `response_label`, `count`, `unanswered_count`; `theme_category` is optional. No additional owner-panel fields belong in the machine input.

- Use `aggregate` only for actual manually anonymized counts. Software fixtures retain `synthetic_aggregate` and never receive collected evidence IDs.
- Maintain a safe questionnaire version/map: Q1–Q21 correspond to numbered questions above; consent is separate. Q4/Q5 are `multiple_choice`; Q1–Q3, Q6–Q16 and Q20 are `single_choice`. Optional text in Q17–Q19/Q21 (and “other” text) is not imported verbatim; any manually coded categories need a documented coding rule/type. No automatic theme inference.
- The schema's question denominator is **completed eligible responses**, not all starts. Screening/dropout totals belong in file metadata and the safe closeout summary. If Q1 is included, its category counts describe completed respondents only; never fold screened-out people into that distribution. Define “started,” “eligible” and “completed” against actual platform behavior, excluding declined consent from research; keep any operational count distinction explicit.
- For completed respondents, skipped/not-shown questions count as unanswered; an explicit “Prefer not to say,” “Not applicable” or “Not sure” is a response category. Single-choice category totals plus unanswered must equal completed. Multi-select categories each cannot exceed answered respondents; their sum may exceed the denominator. Preserve zero-count categories and all included-question mappings. Missing questions are not inferred by the validator; owner must check coverage, exclusive choices and Q5's three-selection maximum against the questionnaire.
- Keep identical metadata across one wave/file, real ordered collection dates, completed ≤ eligible ≤ started, broad recruitment categories and stated sampling limitations. These tools check structure, not anonymity, consent, accurate counts or product value. Confidential raw collection may be converted to a manually anonymized aggregate; do not relabel the original collection anonymous.

For actual owner-supplied aggregate data only (paths are examples, not existing evidence):

```sh
pnpm cp2:survey:validate -- --file research/private/cp2-survey-aggregate.csv
pnpm cp2:survey:summarize -- --file research/private/cp2-survey-aggregate.csv
pnpm cp2:survey:summarize -- --file research/private/cp2-survey-aggregate.csv --output docs/evidence/private/survey-draft.md
```

Use `.json` for equivalent JSON input. The output directory must already exist and the output file must be new; summarization never overwrites an existing draft. Review the safe summary and limitations as owner/team before adding an actual SV evidence row. Launch approval, summary generation and structural validation do not approve M18 implementation.
