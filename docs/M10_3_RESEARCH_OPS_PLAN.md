# M10.3 Research Operations Plan

Date: 2026-10-02
Branch: `codex/exe-web-app-m10-3-research-ops`
Base: `bd347432cd49aa6e47342261f39082c00fea2cdf`

Prepare local-only data handling and analysis of owner-supplied CP2 evidence. No research is automatically collected; no product workflow, target segment, job family, price, claim or M11 feature is selected.

## Workstreams and acceptance

- A: narrow ignored private directories and manual anonymization/incident rules.
- B: Node-standard-library CSV/JSON aggregate survey validation with explicit file path, strict schema, sensitive/claim checks and exit codes 0/1/2/3.
- C: deterministic neutral Markdown summary, validated input only; stdout by default, explicit output path with no overwrite.
- D: complete Markdown source-log records, dates/HTTPS/region/currency/pricing context and fact/limitation/review separation; never fetch URLs.
- E: documented schemas, safe/unsafe examples and collect → anonymize → validate → summarize → human review sequence.
- F: explicitly marked synthetic fixtures using reserved domains; never evidence-register rows.
- G: meaningful CLI, parser, non-disclosure, immutability, summary and boundary tests plus existing quality/local fictional acceptance.
- H: incremental acceptance record, owner handoff and project tracker updates.

No new dependencies, network calls, AI, real CVs/participants, raw transcripts, credentials, payments, deployment, merge or M11 code. Validators only reject; they never silently sanitize private data or classify hypotheses. Human inspection remains required because pattern detection cannot guarantee anonymity or factual correctness.

CP2 and M11 gates remain unchanged. M7/M10.2 owner browser reviews and privacy/retention decisions remain pending. Confirm ambiguous course requirements with the instructor.
