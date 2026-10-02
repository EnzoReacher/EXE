# M10.3 Owner Handoff

## Start with private drafts

```bash
mkdir -p research/private docs/evidence/private
```

Both paths are ignored; keep raw contact/recruitment material separately, preferably outside the checkout in owner-controlled storage. Do not force-add ignored files. Follow `M10_3_RESEARCH_DATA_BOUNDARY.md` for manual anonymization and suspected accidental-commit handling. Tools do not strip personal data or prove anonymity.

## Process actual evidence

1. Confirm instructor questions and collect evidence through the M8 guides. No script collects surveys/interviews or fetches competitor sources.
2. Manually construct an **anonymous aggregate copy**, not a platform respondent export, using `M10_3_SURVEY_IMPORT_SCHEMA.md`.
3. Validate and summarize locally:

   ```bash
   pnpm cp2:survey:validate -- --file research/private/cp2-survey-aggregate.csv
   pnpm cp2:survey:summarize -- --file research/private/cp2-survey-aggregate.csv --output docs/evidence/private/survey-draft.md
   ```

   JSON uses the same row schema. Output must be a new file; default summary output is stdout. On sensitive detection, manually remove private material from a separate draft, never let an automated script silently rewrite the raw export. No cell values are printed on rejection.
4. Record exact public source facts and contexts with `M10_3_PUBLIC_SOURCE_LOG_SCHEMA.md`, initially in ignored drafts. Validate without fetching:

   ```bash
   pnpm cp2:sources:validate -- --file docs/evidence/private/cp2-public-source-log.md
   ```

5. Review the actual data and sources as an owner/team. Copy only manually checked anonymous aggregates, interview/expert paraphrases and complete public-source records into trackable `docs/evidence/`. Generated summaries are drafts, not evidence approval. Check the full staged diff before committing.
6. Assign stable evidence IDs, record real dates and limitations/bias, and enter observations in `CP2_EVIDENCE_REGISTER.md`. Mark review status truthfully. Run `pnpm cp2:validate:collected` after real evidence exists; it checks structure/sensitive patterns only.
7. Follow `M10_3_EVIDENCE_ANALYSIS_GUIDE.md` for observation/interpretation/decision separation and actual hypothesis classifications.

## Conditions still unmet

CP2 needs confirmed course requirements and actual reviewed survey/expert/target-user and market/competitor/value/pricing evidence. Target segment/job family remain open; no price/competitor/market/privacy/ease claim is unlocked.

M11 additionally requires the completed M9/M10 product-direction decision, actual limitation/bias/hypothesis review, evidence-linked selection and explicit owner/team approval. M7 and M10.2 browser/keyboard checklists remain pending. Complete those using fictional app data only; research tooling does not approve real CV use, release, course acceptance or deployment.

For toolkit smoke checks only use `scripts/fixtures/cp2-research/`; their synthetic dates/counts/domains are never real findings. Exit 0 means structure only; 1 incomplete/malformed/unsupported claim; 2 sensitive content; 3 usage error.

**No merge to main. No deployment. Owner approval is required.**
