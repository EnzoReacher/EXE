# OwnPath — Experience Translator

Current direction: owner-authorized core-only reduction, 2026-10-15. Keep one useful Experience Translator journey; remove unnecessary legacy runtime features after dependency/ownership audit. One to three supporting capabilities is a ceiling, not a feature quota. This supersedes older instructions to preserve every old product route. Formal research/production approval remains pending in [the existing decision record](../M10_PRODUCT_DIRECTION_DECISION.md).

**Turn Your Experience Into Career Value.**

You have the experience. OwnPath helps you show its value.

## Persona and job to be done

Final-year IT student or recent graduate applying for Frontend Developer Intern. They have coursework, team or personal projects, but struggle to identify their own contribution and describe it for a job application. When I have one real project and one JD, help me express my actual work in English without inventing experience or learning how to prompt a general chatbot.

## Frozen scope

One project text, one pasted Frontend Intern JD, bounded intake, requirement/fact extraction, 0 questions when sufficient or 2–4 selected questions when incomplete, skip, user fact confirmation, matching, up to 3 English bullets, source excerpts and unverified labels, edit/reject/regenerate, per-bullet approval, copy. Desktop/mobile and readable loading/empty/error states.

Prototype output is deterministic and supports a small vocabulary of frontend actions and technologies in Vietnamese/English. Unknown descriptions fall back to clarification, never invented translation. Inputs and edits stay in React memory; closing/reloading clears them. Only explicitly accepted text can be copied/downloaded as TXT. No database save or existing credential/export integration.

Deferred: external model, paid APIs, real user data, persistence/export to CV, production launch. Excluded: Career GPS, NextMove, ProofLoop/ProofSprint, RealityLab, SkillPassport, mentors, job board, scraping, career chatbot, hiring probability, subscriptions, all industries, native mobile, Factory dashboard.

The retained capabilities are guided intake/fact confirmation, JD-relevant grounded drafting, and review/accepted-only output. CV upload/parsing, generic assessment/scoring, roadmap, opportunities, saved-work, expert/share/credential flows and full-document export are scheduled for actual source removal. Auth/Supabase may be removed only after their consumers are retired. No new server, database, login or provider is required. Applied migrations and historical research/evidence remain preserved. [BACKLOG](BACKLOG.md) records the staged inventory and frontend ownership boundaries; the first extraction slice does not itself retire those routes.

## Acceptance

- Project information supplies all claims; JD supplies relevance only.
- No inferred metrics, team leadership, Git workflow, responsive work, production deployment or company employment.
- Every generated bullet has confirmed personal facts with exact input excerpts. A user confirmation means self-report, not independent verification.
- Wrong IDs, unsupported combinations, malformed adapter output and changed wording are refused by the template validator.
- Editing invalidates approval; regeneration preserves edits and labels them as user wording requiring fresh review. Original provenance applies to the original generated wording only.
- Missing JD evidence is described as not found in supplied facts, never lack of ability.
- Skip does not create answers. Insufficient information may produce 0–1 bullets with a concrete next step.
- No private content is logged, fetched from repository links, uploaded or sent to any external model.

## Four screens / wireframe specification

| Screen | Primary action | Information / recovery |
|---|---|---|
| Intake | Continue with one project/JD | Labeled textareas, fictional golden-example button, length guidance, inline error; no CV required |
| Interview | Review facts | 2–4 missing-info questions, optional answers and skip; fact checkboxes show original source; back preserves intake |
| Bullets | Review accepted wording | Editable candidates, source excerpts, JD relevance, missing-evidence summary, approve/reject; controlled regenerate preserves edits |
| Review | Copy accepted bullets | Accepted current wording only, clipboard error/manual selection, TXT download, forget session |

## Value hypotheses, not claims

Student-first, interview-first, JD-aware and fact-grounded may reduce prompting and unsupported claims compared with today's workaround. No measured time saving, superiority, willingness to pay or market demand is asserted. Test using [research plan](RESEARCH_PLAN.md).

Success for controlled engineering fixtures: zero unsupported facts. Success for usability study: fewer unsupported claims and lower time/edit effort with acceptable relevance, measured against baseline; thresholds must be agreed before recruitment. This is not a universal guarantee of truth.
