# M10.3 Research Operations Acceptance

Date: 2026-10-02
Branch: `codex/exe-web-app-m10-3-research-ops`
Base: `bd347432cd49aa6e47342261f39082c00fea2cdf`
Status: local research toolkit implemented and verified; no collected research evidence. Owner evidence/privacy/release review remains pending.

## Incremental record

| Date | Workstream | Files changed | Result / checks run | Remaining owner action | CP2 / M11 status changed? |
|---|---|---|---|---|---|
| 2026-10-02 | A | `.gitignore`, data-boundary document, plan/acceptance | Exact clean baseline verified; two root-anchored ignored directories defined | Manually separate raw identity/contact material, anonymize copies and inspect before Git | No: evidence pending / blocked |
| 2026-10-02 | B | Survey validator, standard-library shared parser/safety helper, package command | CSV/JSON aggregate metadata, count/denominator, category, sensitive and unsupported-claim checks implemented; synthetic CSV CLI smoke passed | Prepare anonymized aggregate copy; manually review labels and sampling limitations | No |
| 2026-10-02 | C | Survey summarizer and package command | Deterministic count-only Markdown with warning, unanswered/incomplete counts, supplied category themes, limitations and pending decisions; synthetic stdout smoke passed | Review generated draft; explicit new output only, no automatic register import | No |
| 2026-10-02 | D | Public-source log validator and package command | Strict complete source records with HTTPS/dates/region/currency/context/facts/limitations/review status; synthetic source smoke passed; no network requests | Check actual source accuracy/currency and retain human interpretation separately | No |
| 2026-10-02 | F | `scripts/fixtures/cp2-research/` | Nine fictional survey/source inputs plus fixture explanation; no real evidence, price or participant | Never use fixtures as evidence-register entries | No |
| 2026-10-02 | G (targeted) | `scripts/cp2-research.test.mjs` | 58 focused tests passed: CLI codes, malformed input, sensitive fields/non-disclosure, aggregate counts, neutral summaries, no overwrite, source/pricing completeness and narrow ignore boundary | Full integrated quality gate still to run | No |
| 2026-10-02 | E | Survey/source schemas and evidence analysis guide | Defined exact fields, denominators, quoted CSV/JSON rules, source context and collect/anonymize/validate/summarize/human-review sequence; added snake_case unsupported-claim regression | Confirm instructor requirements, manually inspect anonymity and actual facts | No |
| 2026-10-02 | G (integrated) | Scripts/tests/package commands plus existing project checks | Initially 174 tests in 23 files passed; final review added malformed JSON-type rejection coverage, then 175 tests in 23 files passed (60 research-tool tests). Lint and affected syntax/synthetic survey checks rerun and passed; typecheck/build, all five requested syntax checks, template validator, source CLI and diff checks passed. Local Supabase acceptance passed with two temporary fictional users | Tool success does not establish anonymity, research quality, source truth, CP2/course acceptance or approval | No |
| 2026-10-02 | H | Owner handoff, README, master report, current/build/decision/checkpoint trackers and M10 execution status | Recorded research operations preparation, actual checks and unchanged gates; no application code or evidence rows changed | Supply actual consent-safe evidence and record human review; complete M7/M10.2 fictional browser review | No |

## Final verification

| Command | Actual result |
|---|---|
| `pnpm test` | Passed: final 175 tests in 23 files |
| `pnpm lint` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm build` | Passed; existing job-seeker routes/workflow unchanged |
| `node --check scripts/m1-local-policy-check.mjs` | Passed |
| `node --check scripts/validate-cp2-evidence.mjs` | Passed |
| `node --check scripts/validate-cp2-survey.mjs` | Passed |
| `node --check scripts/summarize-cp2-survey.mjs` | Passed |
| `node --check scripts/validate-cp2-source-log.mjs` | Passed |
| `pnpm cp2:validate` | Passed template mode; reports evidence pending |
| `pnpm cp2:survey:validate -- --file scripts/fixtures/cp2-research/survey-valid.csv` | Passed synthetic aggregate structure only |
| `pnpm cp2:survey:summarize -- --file scripts/fixtures/cp2-research/survey-valid.csv` | Passed; neutral synthetic draft to stdout |
| `pnpm cp2:sources:validate -- --file scripts/fixtures/cp2-research/source-valid.md` | Passed synthetic metadata only; no URL fetched |
| `git diff --check` | Passed |
| `pnpm test:supabase:local` | Passed local Docker Supabase with temporary fictional users/content only |
| Narrow ignore boundary | Verified both private paths ignored and reviewed/public evidence paths trackable; executable regression test passed |

No required command was unavailable. Real-evidence collected mode was not applicable; no actual evidence was provided. Existing M7/M10.2 connected-browser manual reviews remain pending, not newly performed by this scripts-only stage.

## Limits and privacy review

Standard-library scripts perform no network calls or uploads and never modify inputs. Summary output requires an explicit new Markdown path when writing; no overwrite. Negative fixtures contain only clearly marked reserved-domain email and fictional reserved phone strings, not real identity/contact details. All counts, dates and source facts are synthetic tests outside the evidence register; no company price, market fact or participant was researched or invented as evidence.

Full staged diff reviewed (31 files). Application source, Supabase schema/migrations, CP2 register and M10 product-direction decision remain unchanged from the requested baseline. Private directories contain no staged files; staged content contains documentation, script code and labeled fictional test inputs only. No real personal research data, CVs, raw exports, recordings, credentials or production configuration are included.

Pattern checks cannot detect every personal name, confidential free-text phrase, disguised identifier or misleading count. Conservative checks may reject benign text, large phone-shaped numbers and even negated claim wording. Human anonymization/source/quality/denominator review is mandatory. Source attribution syntax is not proof of factual accuracy; source dates may be explicitly not_stated. No automatic hypothesis classification, recommendation, source fetching or approval. Owner must verify currency, provenance, relevant source dates and course sufficiency.

CP2 remains **Evidence collection pending**, target segment/job family open, price/competitor/market/privacy/ease claims blocked, M11 blocked. No real CV or raw research/credential files added. No merge or deployment occurred.
