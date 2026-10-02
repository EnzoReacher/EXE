# M10.3 Anonymous Survey Import Schema

The input is **aggregate category counts**, never one row per person. CSV uses a single header row; JSON uses an array of flat row objects with exactly the documented fields. UTF-8/BOM, CSV quoted commas/newlines and doubled quotes are supported. Maximum file size: 2 MiB. No raw platform export, contact/name column, free-text respondent answer, CV, recording or credential is allowed.

## Required fields on every category row

| Field | Format / rule |
|---|---|
| `data_kind` | `aggregate` for actual anonymous aggregates; `synthetic_aggregate` for software fixtures only |
| `collection_start`, `collection_end` | Valid ordered `YYYY-MM-DD` period; real dates for real evidence |
| `responses_started` | Non-negative integer; includes screened-out/incomplete starts |
| `responses_eligible` | Non-negative integer ≤ started |
| `responses_completed` | Non-negative integer ≤ eligible |
| `recruitment_channel` | `student_network`, `career_service`, `community`, `mixed`, `other_broad`; no actual group/contact names |
| `limitations` | 10–2,000 characters describing sampling/recruitment/bias/coverage constraints, not a conclusion |
| `question_id` | `Q1`–`Q9999`; preserve the actual questionnaire mapping outside respondent data |
| `question_type` | `single_choice` or `multiple_choice` |
| `response_label` | Broad anonymous snake_case category, ≤80 characters; no identifying or claim labels |
| `count` | Non-negative integer, ≤ number of completed respondents answering this question |
| `unanswered_count` | Completed respondents not answering this question; repeated consistently per question |
| `theme_category` (optional) | Already anonymized/coded broad snake_case category; no generated theme or quotation |

CSV counts use integer digits only; JSON counts may be integer numbers or digit strings. All file-level metadata/totals must be identical across rows. Each question needs unique response labels, consistent type and unanswered count. Single-choice counts plus unanswered must equal completed. Multi-select category counts each cannot exceed answered respondents, but their sum may exceed the denominator. Keep zero-count categories if needed; never infer absent questionnaire items. No percentages, respondent IDs or automatic hypothesis classification.

## Examples and fixtures

Use `scripts/fixtures/cp2-research/survey-valid.csv` or `survey-valid.json` for the exact schema. These contain explicitly synthetic counts, future fictional dates and broad categories. They are software tests, **not interviews or survey results**, and must never enter the register.

Safe category shape: `manual_reading`, `mentor_guidance`, `source_clarity`. Safe limitation shape: describe convenience recruitment, missing groups and question coverage without identifying people. Unsafe: respondent name/email/phone/address/account/employer/application columns; individual answers; identity-bearing free text; raw transcripts; claims such as validation/superiority. Negative test fixtures use only reserved-domain contact strings and a fictional reserved phone pattern.

To make a test fixture, copy the valid shape, retain `synthetic_aggregate`, use fictional values/categories and document the expected behavior in a test. Never relabel a fixture `aggregate`. For real evidence, manually construct an anonymous aggregate copy from actual counts in ignored/private storage; do not invent a sample size or fill missing answers with guessed values.

## Commands and results

```bash
pnpm cp2:survey:validate -- --file research/private/cp2-survey-aggregate.csv
pnpm cp2:survey:summarize -- --file research/private/cp2-survey-aggregate.csv
pnpm cp2:survey:summarize -- --file research/private/cp2-survey-aggregate.csv --output docs/evidence/private/survey-draft.md
```

Exit 0: structurally safe aggregate shape; 1: malformed/incomplete/unsupported claims; 2: sensitive patterns/fields detected; 3: usage error. No sensitive cell values are printed. Claim checks are deliberately conservative, including snake_case terms and negated claim wording: rephrase as neutral limitations, never remove a limitation merely to obtain a pass. Unknown columns are rejected. No automatic scrubbing, source upload or input rewrite occurs. Output files must be new Markdown paths; existing files are never overwritten. Anonymity, provenance, counts and research quality still require human review.
