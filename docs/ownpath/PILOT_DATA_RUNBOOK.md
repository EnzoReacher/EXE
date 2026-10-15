# Private pilot data tool — preparation only

`scripts/ownpath-pilot.mjs` turns structured, human-coded observations into a **private aggregate draft** under [PILOT_PROTOCOL v1](PILOT_PROTOCOL.md). It does not conduct a study, score output text, verify consent, establish anonymity, approve research or update the evidence register. E02/E03 remain open until actual consented sessions and human analysis occur.

## Start a private worksheet

Use an owner-controlled private directory outside every Git worktree. Run from the project directory:

```bash
mkdir -m 700 -p "$HOME/ownpath-pilot-private"
node scripts/ownpath-pilot.mjs --init --output "$HOME/ownpath-pilot-private/batch.json"
```

The new JSON is labelled `template`, contains an unfilled `P___` session shape with two planned S1 slots, and has null observations/consent. It is not a participant record. The analyzer refuses it. Remove that shape if no session happened; copy/fill it only for actual retained, eligible, consented sessions. Do not prefill zeros where observations are missing. On an existing output path, the command refuses to overwrite anything.

Before collection confirm rubric, consent/withdrawal/retention and allocation with the owner/team. Keep names/contact mapping, consent records, outputs, scoring notes and explanations separately in private storage. This JSON accepts no raw bullet, CV, transcript, quotation, account or contact fields. A pseudonymous code and aggregate counts can still identify people in a small cohort; privacy review remains necessary.

## Batch and session fields

| Field | Meaning |
|---|---|
| `schema_version`, `protocol` | Exactly `1`, `ownpath-pilot-v1-2026-10-12`; changing the protocol requires a new dated contract before that batch. |
| `data_kind` | `collected` for actual owner-supplied observations, `synthetic` for engineering fixtures. `template` is deliberately rejected. Declaration is not verification of provenance. |
| `code_sha` | Full lowercase 40-character checkpoint frozen for this batch. Do not pool changed versions. |
| `collection_start`, `collection_end` | Valid ordered `YYYY-MM-DD` dates of that batch. |
| `withdrawals_excluded`, `ineligible_excluded` | Counts handled according to actual consent/retention. Do not retain withdrawn personal rows merely to fill this input. Missing/rejected sessions cannot be inferred by this tool. |
| `limitations` | Unique controlled categories: `convenience_sample`, `known_vocabulary`, `task_asymmetry`, `blinding_limited`, `allocation_deviation`, `technical_interruption`, `other_private_notes`. Describe details separately; built-in caveats remain even if omitted here. |
| `sessions` | At most 1,000 retained session records. An empty array produces null/not-assessed statistics, never target success. |

Each session has exactly `participant_code` (`P001`–`P9999`, unique), `enrollment_index` (unique positive integer, actual order), `sequence` (`S1`–`S4`), `allocation_deviation` (boolean), `eligible` and `consent_to_retained_anonymous_notes` (both must be true), and `conditions` (two slots). These declarations do not prove consent, eligibility or complete enrollment. Enrollment gaps can remain after consent-required deletions; do not renumber retained people to hide allocation changes.

Normal sequence cycles S1/S2/S3/S4 by enrollment index. A differing actual sequence needs `allocation_deviation: true`, with explanation in private notes. Actual slot mapping must still match the recorded sequence:

| Sequence | Slot 1 | Slot 2 |
|---|---|---|
| S1 | OwnPath A | Baseline B |
| S2 | Baseline A | OwnPath B |
| S3 | OwnPath B | Baseline A |
| S4 | Baseline B | OwnPath A |

## Condition fields

Each condition has exactly the fields below. Copy the generated condition shape; when attempted, replace every required null with the actual observation or human coding. A `not_attempted` slot stays explicit: keep only `slot`, `tool`, `card`, `status`, with **all other values null**. It is excluded from attempted-task denominators but remains a missing slot/incomplete pair. Never drop an attempted failure or replace it with a successful retry.

| Fields | Allowed values / recording |
|---|---|
| `slot`, `tool`, `card` | Slot 1/2, `ownpath`/`baseline`, A/B according to the table. |
| `tool_family`, `tool_version` | OwnPath `local_template`; baseline `chatgpt`, `cv_builder` or `other`. Actual version/access descriptor, 1–100 bounded characters (`A–Z`, digits, spaces, `._()/+-`), kept private and omitted from aggregate output. This bounded metadata exception cannot guarantee rejection of a name or phone-like string; manually exclude identifiers. Record exact date/access limitations separately as required by the protocol. |
| `status` | `submitted`, `time_cap`, `stopped`, `not_attempted`. Submitted means the participant selected final wording, not that it passed accuracy review. |
| `elapsed_seconds`, `interruption_seconds` | Whole seconds 0–600; interruption ≤ elapsed. `time_cap` must be 600. Interruptions stay in elapsed time; nothing is silently subtracted. |
| `wording_edits`, `regenerate_reprompt` | Distinct wording-revision and regenerate/re-prompt counts, separately. |
| `prompt_answers`, `fact_requests`, `procedural_help` | Prompt/clarification-answer count, factual-sheet requests, procedural coaching/rescue count. Fact access is not assistance; coaching is. |
| `final_bullets` | Submitted: 1–3; otherwise 0. Partial/generated candidates are not submitted final output. |
| `claims` | Exactly `{supported, contradicted, not_supplied, ambiguous, pending}` integer counts. Human reviewers code atomic claims against the task sheet. Submitted total >0; otherwise all zero. No automatic text/semantic scoring. |
| `reviewers`, `review_blinding`, `unresolved_disagreements` | 0–2 final-output reviewers; `not_performed` when 0, otherwise `blinded`, `partial`, `not_blinded`. If 0, all claims must be pending and relevance null. Review count does not prove independent review. Preserve disputes until actually adjudicated; no agreement percentage inferred. |
| `relevance` | Human 1–5 rating or null if missing. A relevance score does not repair unsupported claims. If two reviewers differ, record the unresolved count and settle the final score only by the agreed adjudication process. |
| `trust`, `reuse` | Identical protocol questions: trust 1–5 or null; reuse `yes`, `no`, `unsure` or null. Missing values stay visible. These are subjective. |
| `safety_review_complete`, `safety_findings` | Boolean and exactly `{unsupported_generated, jd_only_generated, stale_accepted, cross_session_leakage}` observed counts. Include problematic generated candidates even if edited away from final wording. Zero counts without actual review do not establish safety. |

Interaction, claim, safety, dispute and exclusion counts are whole integers 0–10,000; bullet/reviewer/slot/time/rating fields use their narrower limits above. A non-submitted condition has zero final claims/bullets/reviewers/disputes and null relevance, while its attempted interactions, safety observations and optionally subjective answers are retained. Unknown fields, duplicate codes/indexes, mismatched slots, out-of-range numbers and inconsistent statuses are rejected with fixed codes. Error output contains no input values, paths or pseudonyms.

## Create a draft and review it

```bash
node scripts/ownpath-pilot.mjs --file "$HOME/ownpath-pilot-private/batch.json" --output "$HOME/ownpath-pilot-private/aggregate-draft.json"
```

Input/output must be `.json`, outside Git; input is a regular file ≤1 MiB. Symlinks are refused. New output uses exclusive creation and Unix mode 0600. The CLI prints only a fixed success/error code, never metrics. Restrictive file permissions do not establish privacy on every OS/storage service; the owner remains responsible for the private folder and retention.

The draft reports attempted/stopped/capped/not-attempted and pending-review counts, comparator-family distribution, final claims, generated safety findings, assistance versus factual access, missing ratings, self-reported review/blinding counts, allocation/deviations and exclusions. Baseline may mix ChatGPT, CV builder and other workarounds; do not describe the combined result as one fixed tool comparison. Usable completion requires submitted output with reviewed supported claims, no contradicted/not-supplied/ambiguous/pending claim and no unresolved disagreement. Assisted usable completion remains distinct from unassisted success. Completion time is summarized only for usable completed tasks, with failures and pending reviews still visible.

Formative checks implement the frozen 80% unassisted attempted-OwnPath criterion, submitted-output relevance median ≥3 and completed-time median ≤480s. Unknown final review yields `pending_review`; empty denominators yield `not_assessed`. Ratings have their own displayed denominator. Flags are descriptive, not release approval; observed safety findings can block the affected flow even when a usability target says `met`.

Paired differences use **within-person OwnPath minus baseline**, then median/range of those differences, only when both conditions are usable completed. They are not the difference of separate group medians. Incomplete pairs and pairs receiving procedural help remain explicit. Different cards, narrow vocabulary, sampling/order and blinding limits prevent a superiority/population claim. Individual differences, codes and version strings are omitted from the aggregate, but small combinations remain private pending manual anonymity review.

Human review must check missing enrollment, consent/withdrawal handling, scoring/facts, disagreements, source SHA, collection/tool conditions and any safety issue. Keep raw JSON and this draft outside Git. Only a reviewed, anonymity-safe summary goes into the existing [session log](../M10_RESEARCH_SESSION_LOG.md) and [CP2 register](../CP2_EVIDENCE_REGISTER.md), using actual dated evidence and reviewer status. The tool never writes those records or fills approvals. Actual E02/E03 study/analysis, manual checks and release decisions remain pending.
