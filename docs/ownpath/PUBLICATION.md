# OwnPath complete release-candidate publication

Owner-authorized publication of `feat/ownpath-demo-rc` to
`EnzoReacher/EXE`, with a pull request targeting `main`. This record describes the
candidate being published; the PR and GitHub commit/check pages are authoritative
for the published SHA and exact-head CI result. No merge, deployment or hosted
migration is part of this publication.

## Included candidate

- Current **CV + JD → Scan → Explain → Prompt → Rewrite → complete editable CV**
  journey, responsive editorial workbench and landing/Auth pages.
- Optional saved CVs, revision-aware editing/renaming, copy, TXT and complete
  Unicode print/PDF output; earlier saved formats remain viewable.
- Profile & Security: optional display name, verified read-only email, initials,
  acknowledged save/Cancel, password access, independent eye controls and local
  sign-out, with identity/session-switch protections.
- Shared pending feedback, reduced-motion support, keyboard drawer/dialog focus,
  safe example replacement, waiting cancellation and late-response protection.
- Reliability repairs to retained clients, atomic draft revisions, acknowledged
  mutations, corrected deletion-impact explanations, serial polling and durable
  per-link public-review RPC limits. Retired Next APIs remain retired.
- Application tests, synthetic browser fixtures/configurations, local-only
  PostgreSQL/RLS/concurrency reproduction scripts, all three new schema/reliability
  migrations, sanitized configuration and setup/evidence documentation.

## Reused valid verification

The interaction candidate's SHA-256 manifest binds the existing local evidence
to its application files. Publication changes documentation only; application
source and tested behavior are preserved. Existing gates are reused rather than
repeated without cause:

| Gate | Result |
| --- | --- |
| Retained automated suite | 913 tests / 77 files passed |
| Compiled interaction journeys | 8 passed |
| Compiled Scan/Rewrite/export journeys | 6 passed |
| Compiled Account journeys | 7 passed |
| Compiled password/native clipboard journeys | 3 passed |
| Lint | No errors; one existing dependency warning |
| Typecheck | Passed |
| Production build | Passed |

`AuthPanel`'s existing warning is at the session effect: the effect references
`initialUser` but depends on `initialUser?.id` and `accountView`. The tested behavior
reinitializes by identity/view rather than every metadata object replacement.
This publication does not blindly add the whole object as a dependency or suppress
the warning; doing so would require deliberate session/subscription regression
verification. See [interaction evidence](INTERACTION_POLISH_EVIDENCE.md) and
[reliability evidence](RELIABILITY_REPAIR_EVIDENCE.md) for scope and limitations.

The 24 compiled journeys use fictional loopback Auth/REST and controlled AI
responses. **Live OpenAI acceptance is NOT RUN.** No claim of hosted metadata
persistence, Auth hooks/policies, email delivery, live provider quality/latency/cost,
Safari/Firefox or real-device acceptance follows from these local checks.

## Migration status

These migrations are included and **NOT hosted-applied**:

- `supabase/migrations/20261020_legacy_draft_revision.sql`
- `supabase/migrations/20261020_review_rpc_submission_limit.sql`

Local disposable-database checks do not establish hosted application. Separate
authorization is required to review/apply them to the intended project and refresh
its PostgREST schema cache if necessary. Direct authenticated legacy draft UPDATE
remains revoked by the revision migration; callers must use its atomic RPC.

`20261019_ownpath_cv_profiles_versions.sql` is also included. The existing setup
record reports the owner's prior application of that schema; it was not applied
again during this publication.

## Local-only exclusions

Selective staging excludes private `.env*` files (only `.env.example` is included),
credentials, real CV/user data, dependencies/build products, raw traces,
`.factory/` evidence/backups and `.opencode/` local agent/profile configuration.
Excluded files are preserved locally. Sanitized human-readable evidence summaries
and reproducible test sources are included; local archives and machine paths are
not application dependencies.

Exact staged-diff/secret checks and publication metadata are retained locally in
`.factory/evidence/OWNPATH-PUBLISH-20261020/`. GitHub Quality CI is inspected against
the actual pushed HEAD. Earlier branch-filtered legacy acceptance workflows are
not represented as checks of this branch unless they actually run for that SHA.
