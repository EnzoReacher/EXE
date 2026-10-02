# M10.3 Evidence Analysis Guide

## Human-led sequence

1. **Collect:** confirm course requirements with the instructor and use the existing consent-safe guides. Owner controls recruitment and lawful source access; scripts collect nothing. Keep contacts/raw notes/exports separate in private-only storage. Fictional fixtures never count as research.
2. **Anonymize:** manually make safe summary/aggregate copies. Remove identities, distinctive details, CV/application content and credentials; document suppression/grouping and limitations. Do not rewrite raw files automatically or invent missing results.
3. **Validate:** use the survey/source CLI for their documented schemas, and the M9 evidence-register validator for interview/expert/register summaries. Correct failures manually; these are structure/pattern checks only.
4. **Summarize:** create a count-only survey draft with the warning and pending review placeholders. Review denominators, multi-select totals, missing questions/answers and coded categories; no machine-generated hypotheses or price/feature advice.
5. **Register:** manually enter only safe observations using stable real evidence IDs, actual collection/source dates, broad category, limitations/bias, source context and actual review status in `CP2_EVIDENCE_REGISTER.md`. Do not import synthetic fixtures or treat a generated draft as reviewed. Run `pnpm cp2:validate:collected` after actual entry.
6. **Review limitations:** owner/team inspect provenance, consent/anonymity, sample/recruitment bias, small categories, source quality/currentness, contradictions, response counts and uncertainty. A source-log pass did not verify the fact or fetch its URL.
7. **Classify hypotheses:** human review only: supported, partly supported, neutral, contradicted, insufficient evidence. Cite supporting and contradicting evidence IDs. Lack of evidence is not support or contradiction.
8. **Decide direction:** complete M9 review and `M10_PRODUCT_DIRECTION_DECISION.md` only with real evidence, anonymization, validator pass, reviewed limitations/classifications and an actual recorded owner/team decision. Keep target segment/job family/pricing open until decided.
9. **Select M11 only after approval:** use `M9_NEXT_FEATURE_SELECTION.md` only after the gates, including M7/M10.2 fictional browser/keyboard review, CP1 evidence and owner/team approval. Cite problem, segment, impact, workaround, criteria and privacy/trust consequences. No automatic feature selection.

## Keep three levels separate

- **Observation:** actual anonymous category count, participant paraphrase, or exact cited source fact, with evidence IDs/dates. No identifying quotes or fabricated conclusions.
- **Interpretation:** what the team believes it may mean, plus alternatives/contradictions and uncertainty.
- **Decision:** an actual retain/revise/narrow/remove/investigate/test action agreed by owner/team, with review date and follow-up. Tool output is not this decision.

## Course gate

The current tracker records more than 100 survey responses **or at least two qualified industry experts**, separately planned 5–10 target-customer video interviews, and competitor/market/value/pricing research with dated sources. M8 practical sample targets are not a substitute for this course record. The meaning of “hub”, supplier requirements and other instructor questions remains unresolved; record dated answers rather than guessing. Course acceptance and CP2 completion need actual reviewed evidence, not a validator success.

All price, market, competitor, validation, privacy-superiority and ease-of-use claims remain blocked until a precise claim has sufficient reviewed evidence and explicit approval. M11 remains blocked. No merge or deployment is authorized.
