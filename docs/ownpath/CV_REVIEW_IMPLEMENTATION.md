# OwnPath resumed CV workspace

Branch `feat/ownpath-demo-rc`; starting HEAD `7adbd6b77085318be43d55bff382d74b499e6350`.
Fresh durable baseline: `.factory/evidence/OWNPATH-RESUME-20261019/baseline/`.
This includes source/configuration hashes and copies, excluding private environment
files and generated dependencies. The earlier missing `/tmp` backup is not used.

## Implementation checklist

- [x] A. Resume inspection, current-state baseline, preserve existing unrelated work.
- [x] B. Server-protected `/app` shell, desktop sidebar, keyboard/mobile drawer.
- [x] C. Text intake, optional AI section organization, editable/confirmed profile.
- [x] D. Structured AI review, optional JD mapping, individual decisions and narrow bulk acceptance.
- [x] E. Complete final preview, copy and byte-identical Unicode plain-text TXT.
- [x] F. Owner-scoped profiles, named snapshots, owned reopening/editing/rename/delete and revision checks.
- [x] G. Landing, Auth destinations, intentional protected legacy redirects and retired APIs.
- [x] H. Local candidate checks, independent bounded review, setup/evidence handoff.

Local candidate status is distinct from hosted and paid live acceptance. See
`CV_WORKSPACE_SETUP.md` and `CV_WORKSPACE_EVIDENCE.md` for exact commands and gates.

## Retired, reused and added

Retired the Translator questionnaire, fact checkboxes, mode selector, bullet-only
UI and the older public CV workspace. `/experience-translator` and `/cv-review`
redirect to `/app/tailor`, which requires verified server identity. The old
prepare/generate endpoints return HTTP 410 and never call a provider. Superseded
browser/UI tests were replaced by complete-CV journey and decision coverage;
the legacy browser command retains redirect/landing checks.

Reused Supabase Auth/PKCE, verified identity checks, recovery/resend controls,
OpenAI Responses/model configuration, bounded requests, request deduplication,
shared public styling, security headers and useful domain/security tests.
Historical engine/provider tests remain for those invariants; historical evidence
does not establish acceptance of the new routes.

Added the persistent in-memory workspace, editable stable-ID profiles, two-call
maximum pipeline (organize only when requested, then review), private-contact
exclusion, explicit consent, version APIs, RLS migration and local SQL assertions.
No provider call is used for decisions, saving, edits, copying or downloads.
