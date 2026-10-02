# M10.3 Public Source Log Schema

Use a strict UTF-8 Markdown record log, maximum 2 MiB. This is a completeness check, **not factual verification**. No URL is fetched. Preserve the exact source-supported observation and record interpretation separately in the evidence-review template.

First lines:

```text
# CP2 public source log
data_kind: source_log
```

For synthetic tests only use `data_kind: synthetic_source_log`; all synthetic source URLs must use `.test`/`.invalid`. Reserved URLs cannot masquerade as real evidence. Blank/example/fictional records cannot be presented as collected source evidence.

Each record starts with `## CM-001` (unique nonzero ID), followed by **one `- field: value` line per required field**. No multiline/freeform commentary, duplicate fields or unknown keys. Put long paraphrases on one line. Blank lines are allowed.

| Required field | Rule |
|---|---|
| `evidence_id` | Must match its heading, stable `CM-###` or longer number; not `CM-000` |
| `source_category` | `competitor`, `alternative`, `pricing`, `privacy`, `market`, `other` |
| `source_quality` | `official_primary` (official claim, not independent proof), `third_party`, `unclear` |
| `source_url` | Exact complete HTTPS public source URL; no credentials/private identifying query parameters |
| `date_accessed` | Actual valid `YYYY-MM-DD` access date |
| `source_date` | Publication/update date, not later than access; `not_stated` only when source gives no date |
| `region` | Actual geographic applicability or broad/global scope; not a guess |
| `currency` | Three-letter code for pricing/competitor records; other records may use `not_applicable` |
| `plan_access_context` | Named plan/tier and access/account/free/paid restrictions when relevant |
| `billing_context` | Billing cadence, commitment and conversion conditions; non-pricing may use `not_applicable` |
| `tax_promotion_caveat` | State taxes, promotional period/eligibility, regional ambiguity, or detailed unavailability caveat; non-pricing may use `not_applicable` |
| `supported_fact` | Start `The source states/lists/reports/describes/discloses ...` (or page/document equivalents); precise attributed fact only |
| `limitation` | ≥15 characters stating uncertainty, coverage/comparability and what this source does not establish |
| `owner_review_status` | `pending` or `reviewed_YYYY-MM-DD`; actual human review only, never auto-filled |

Pricing **and competitor** records require meaningful region, currency, plan/access, billing and tax/promotion context. If a price is unavailable, describe that precisely rather than inventing it or using a blank placeholder. Source date `not_stated` is permitted; access date is always required. A complete context does not establish a comparable total cost or authorize an EXE price.

Use `scripts/fixtures/cp2-research/source-valid.md` for a fully marked synthetic shape. The XTS currency and fictional source facts there are tests, not real pricing or desk research.

## Comparison/privacy rules

- Distinguish official self-descriptions from third-party analysis; keep disagreement and unknown scope visible.
- Record exact plan, billing, tax, promotion, region, currency and access terms before comparing prices. Do not infer EXE is cheaper/better from one source.
- Quote/paraphrase privacy policy wording with date and scope; a policy statement is not evidence of operational compliance or privacy superiority.
- Unsupported validation, market-readiness, affordability, ease, safety, privacy or competitor-superiority wording is blocked, including attributed slogans and negations containing blocked terms. Record narrower observable facts and limitations instead.
- Interpretation phrases or recommendations in `supported_fact` are rejected. Attribution syntax cannot prove a statement is accurate: owner/team must inspect the actual source.
- Never include personal data, application/employer identifiers, credentials, recordings or private URL tokens. Plain personal names hidden in free text cannot all be detected; manual inspection is mandatory.

```bash
pnpm cp2:sources:validate -- --file docs/evidence/cp2-public-source-log.md
```

Exit codes match survey tooling: 0 completeness only; 1 incomplete/malformed/unsupported claim; 2 sensitive content; 3 usage. Diagnostics identify record numbers/categories, not source cell values. Scripts never rewrite input or approve a review/claim.
