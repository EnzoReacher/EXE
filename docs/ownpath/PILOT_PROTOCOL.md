# OwnPath pilot protocol — v1, defined 2026-10-12

Operational measurement plan for checklist E01 / OP-12. This is a completed preparation deliverable, not a completed study, participant result, instructor rubric or signed research approval. Owner's instruction to continue the proposed workflow authorizes preparing this protocol; formal course/research decisions remain open.

Use [RESEARCH_PLAN](RESEARCH_PLAN.md), the existing [session log](../M10_RESEARCH_SESSION_LOG.md), [evidence register](../CP2_EVIDENCE_REGISTER.md) and [data boundary](../M10_3_RESEARCH_DATA_BOUNDARY.md). Do not create a parallel evidence register. Record protocol changes with date before collection; never retroactively adjust criteria to improve results.

## Before any participant session

- Confirm course rubric/deadline and recruitment/retention decisions with owner/team. Proposed sample: 10–15 problem interviews; 5–8 usability participants, adjusted to actual course/recruitment constraints. No participant currently recorded.
- Recruit final-year/recent IT graduates considering Frontend Intern. Participation is voluntary; explain withdrawal. Separate contact/consent records from research notes in owner-controlled private storage. No names, accounts, full CVs or confidential employer applications in this exercise.
- Use fictional tasks below, not personal CV/JD text. Baseline is the participant's current ChatGPT prompting or CV builder; record tool/version/date/access limits. Do not send recruitment or instructor messages automatically.
- Explain: OwnPath is a deterministic prototype with limited phrase coverage; source links show self-reported facts, not independent verification. Do not describe it as faster, more accurate or AI live.
- Consent to anonymous notes is necessary; audio/screen recording needs separate specific consent and an approved retention policy. Default: no recording. Give the same brief instruction to both conditions.
- Choose the deployed/local checkpoint and freeze it for a batch. If a critical defect changes code, stop the affected batch, record the change and keep results separated by SHA.

Participant briefing, read neutrally: “This task uses fictional experience. Produce up to three truthful English CV bullets for the given job. You may use the stated facts, ask about the fact sheet, edit and reject wording. You may stop at any time. We are evaluating the tool, not your ability.” Do not show expected template wording.

## Task cards and factual answer sheets

Give intake text + JD to the participant at start. Keep the fact sheet with the facilitator; answer a factual question from it verbatim. If the prototype or baseline asks for information not supplied, say “not supplied; you may skip.” Record factual-sheet requests separately from procedural help. Reading the prescribed factual answer verbatim is standard information access, not facilitator rescue; hints about buttons/prompts, next steps, wording or approval are procedural coaching/rescue. Only the latter makes the task assisted for the 80% criterion. Both tools have access to the same facts; no coached prompts or additional facts only for OwnPath.

| Card | Intake shown to participant | Facts supplied on request | Not supplied / must not be invented |
|---|---|---|---|
| A | “Em làm website bán hàng bằng React trong nhóm 4 người.” | “Mình phụ trách product listing và tìm kiếm. Mình gọi REST API và xử lý lỗi.” Technologies: “React và JavaScript.” | Metrics, leadership, Git workflow, responsive work, real customers, employer, deployment or verified repo |
| B | “Em làm website danh sách sản phẩm bằng React trong nhóm 3 người.” | “Mình phụ trách product listing và tìm kiếm.” Technologies: “React và JavaScript.” “Mình chưa dùng REST API trong dự án này.” | Metrics, leadership, Git workflow, responsive work, customers, employer, deployment or verified repo; REST API explicitly not used |

Both cards use this fictional JD:

```text
Frontend Developer Intern
Requirements:
- React
- JavaScript
- REST API
- Git
- Responsive UI
```

Cards deliberately exercise a known narrow vocabulary and an absent/API-negation case. This is a guided formative pilot, not evidence of arbitrary-language generalization. Each participant gets a different card on the second tool to reduce memorization. The uneven REST fact, potential clarification/outcome question counts and number of candidate bullets change task difficulty; counterbalancing controls the planned allocation, not all bias. Add a separate optional natural-wording probe after both tasks; report it separately and do not substitute its results into the controlled paired comparison.

## Counterbalance task and tool order

Assign these four sequences cyclically by enrollment order, before seeing participant performance. Record actual allocation and deviations. With 5–8 people, imbalance may remain and must be reported.

| Sequence | First condition | Second condition |
|---|---|---|
| S1 | OwnPath A | Baseline B |
| S2 | Baseline A | OwnPath B |
| S3 | OwnPath B | Baseline A |
| S4 | Baseline B | OwnPath A |

Use a fresh session for each condition. Same instructions, same facilitator, same 10-minute task cap, same fact-sheet access. Start time when intake + JD is shown. Stop on a participant-selected final output or task cap/withdrawal. OwnPath accepted output is the Review textarea; baseline output is the participant-selected final text. Preserve failed conditions as failures. Do not replace failures with a later successful retry or exclude them from completion denominators.

Allow neutral reading of existing on-screen guidance; do not teach a better prompt only for baseline or walk the participant through OwnPath's golden answer. Record requested clarification and facilitator assistance. Time includes the normal prompting/questions/edits; technical interruptions are recorded separately, not silently subtracted. Withdrawal data is used only according to actual consent/retention decision.

## Measurement and scoring definitions

| Measure | Defined recording/scoring |
|---|---|
| Completion | Participant chooses at least one final bullet and all substantive claims in the submitted output are supported by the fact sheet; report failures/time caps separately |
| Time | Seconds from task reveal to submitted final wording; time cap = 600 seconds with censored/not-completed flag, not a normal completion time |
| Edit effort | Number of distinct wording-edit actions and regenerate/re-prompt actions; one continuous typing revision before the next interaction counts once; do not compare raw keystrokes |
| Prompt/help burden | Baseline prompt count, OwnPath clarification-answer count, factual-sheet request count and procedural coaching/rescue count; report separately because these interactions differ |
| Unsupported claims | Split substantive assertions into atomic claims; classify each as supported, contradicted, not supplied or ambiguous; any contradicted/not-supplied claim fails strict accuracy; ambiguous claims require adjudication and are not silently supported |
| JD relevance | 1 = mostly unrelated; 2 = limited relevance; 3 = some directly relevant work; 4 = clear relevant actions/tech; 5 = concise and clearly aligned without adding facts; relevance cannot repair an unsupported claim |
| Trust/reuse | Ask the identical neutral questions below after each tool, with the same anchors; record safe paraphrases with consent |

Default participant questions in Vietnamese, used unchanged after both tools: “Bạn tin rằng nội dung cuối phản ánh đúng dữ kiện của nhiệm vụ này ở mức nào?” Anchors: 1 = hoàn toàn không tin; 2 = ít tin; 3 = chưa chắc; 4 = khá tin; 5 = hoàn toàn tin. Then: “Với nhiệm vụ tương tự, bạn có chọn dùng lại công cụ này không?” Có / Không / Chưa chắc; follow only with neutral “Vì sao?” Use the same question language in both conditions; log any language assistance separately. These subjective ratings do not establish factual accuracy.

Blind quality review: remove condition labels and formatting cues where possible, label texts X/Y, and score against the corresponding fact sheet without seeing task times. Two reviewers score independently where available; preserve disagreements and adjudication. If only one reviewer is available, state it and do not claim independent/blinded agreement. Tool phrasing may still reveal condition; document that limitation.

## Prespecified pilot decisions

- **Engineering safety:** any unsupported generated substantive claim, claim sourced solely from JD, stale accepted wording or cross-session leakage is a blocking finding. Stop the affected demo flow, fix and verify; do not call the pilot “zero unsupported” if any submitted/generated candidate was observed unsupported. Distinguish generated from user-edited text in findings.
- **Usability task success:** an unassisted usable output within the 600-second cap. Prespecified formative targets: at least 80% of attempted OwnPath tasks complete without facilitator rescue; median relevance at least 3/5; median completed OwnPath task time at most 480 seconds. Use actual eligible, consented attempted-task denominators and report withdrawal/missing data separately. For 5/6/7/8 attempted tasks, the 80% target requires 4/5/6/7 successes. These are operational pilot targets, not observed results, statistical validation or course requirements. A failed target triggers investigation rather than a hidden denominator change.
- **Comparative signal:** report paired completed-task time/edit differences and counts of quality/completion outcomes. Do not convert this small convenience sample into significance, population demand or superiority. Do not invent a percentage improvement threshold or willingness-to-pay result.
- **Continue/fix/reconsider:** use actual findings. Meeting the formative targets with no unresolved safety blocker is a candidate to continue the narrow direction; missed targets/repeated confusion trigger prioritized fixes or reconsideration. Compare paired completed conditions descriptively: an effort advantage is not supported when OwnPath is slower or needs more editing. Record counts, missing evidence, disagreements and actual owner decision; meeting pilot targets is never an automatic release pass.

This defines E01's measurement/rubric before any study. It does not complete E02–E05, D03–D07 or release approval. Any owner change to criteria is recorded before that batch.

## Blank records and output boundary

Use one private working worksheet per actual consented session; do not commit respondent-level task outputs or pseudonymous timing records. Reuse existing TU/SV summary/evidence IDs only after actual collection. Empty fields below are templates, not evidence.

```text
Protocol version / code SHA:
Anonymous participant code (private mapping separate):
Broad eligibility category / consent status:
Actual date / assigned sequence / deviations:
Condition + task card + tool/version:
Completion / elapsed seconds / time-cap flag / interruption:
Wording edits / regenerate-reprompt / prompt-answer / factual-sheet request / procedural coaching-rescue counts:
Generated vs edited wording / unsupported claim categories:
Blind reviewer counts / relevance / disagreement handling:
Trust / reuse / consent-safe reasons:
Observed issue / interpretation / limitation:
Withdrawal or deletion action if applicable:
Owner review status:
```

For repo-safe results: aggregate denominators/counts, median/range of completed-task times, paired comparisons when both conditions completed, safe themes, documented failures and limitations. Keep incomplete pair counts visible. Suppress identifying small combinations; manual review is required. Update existing session log/register with genuine dated summaries and reviewer status; validators do not constitute research approval.

## Private recording and aggregate preparation tool

[PILOT_DATA_RUNBOOK](PILOT_DATA_RUNBOOK.md) documents `scripts/ownpath-pilot.mjs`: a blank, deliberately non-evidence worksheet and private structured-record validator/aggregate draft generator. It implements this frozen protocol's attempted-task denominators, failure/cap retention, separate fact access/coaching, human claim review and within-pair differences. It cannot collect observations or verify consent, completeness, scoring, blinding or anonymity. Synthetic fixtures remain labelled; no record/register/approval is auto-published. E02/E03 actual study and analysis remain open.
