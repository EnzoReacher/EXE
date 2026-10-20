# Reference review: F-Career Bridge QN

Reviewed the uploaded `f_career` source archive on 2026-10-15. This review compares its implementation patterns with the frozen OwnPath Experience Translator scope in [PRD](PRD.md) and [Architecture](ARCHITECTURE.md). It records adaptation decisions; it does not claim F-Career is production-ready or independently verified.

## What is useful for OwnPath

| F-Career pattern | OwnPath decision |
|---|---|
| Explicit request limits, per-user daily quotas, and per-IP throttling | Keep as a prerequisite for any future server-side AI/provider route. OP-14 already requires server validation, rate limits, auth/isolation, idempotency and timeout tests. Do not add API quotas to the current browser-only prototype. |
| Centralized AI provider wrapper and configurable timeout | Preserve the provider boundary as a future option only. Keep the deterministic local adapter until a provider, cost, consent and privacy decision is approved. |
| User-controlled deletion and owner-scoped access for stored CVs | Carry into any future persistence review. OwnPath currently stores no Translator session and must keep that claim accurate; do not add uploads or storage now. |
| A checked environment preflight and documented local setup | Reuse the idea if/when an approved provider or persistence layer introduces required secrets. The current Translator demo requires neither. |
| Admin/advisor review | OwnPath already uses a more specific per-bullet user confirmation and provenance review. Keep that user decision visible; do not treat user confirmation as independent verification. |

## What not to transplant

- CV upload and parsing, generic weighted fit scoring, JD libraries, job scraping, broad career roadmaps and account dashboards expand beyond OwnPath's approved one-project/one-pasted-JD workflow.
- The F-Career bullet prompt asks for quantifiable metrics “when possible.” OwnPath must continue to refuse inferred metrics, leadership, outcomes, employment or skills absent from the user's confirmed facts.
- F-Career's `sanitizeForPrompt` removes code fences/control characters and truncates text; this is input hygiene, not a complete prompt-injection defense. Do not copy a security claim based on this function alone.
- F-Career uses Google Gemini, Better Auth, PostgreSQL/Drizzle and filesystem uploads. These are stack choices for that app, not a reason to replace OwnPath's Next.js/Supabase architecture.
- Its README says automated unit/E2E tests are not present and its manual test plan results belong to a prior stack. OwnPath's existing automated tests and acceptance gates are stronger evidence for this prototype; retain them.

## Applied outcome

No product code, database migration, Auth behavior, provider configuration or environment secret was changed. The transferable safeguards are already represented in OwnPath's frozen scope, architecture and conditional OP-14 backlog. This review records why we are not copying features that conflict with those decisions. Revisit only if the owner/team approves a server-side provider, real-user data or persistence.
