# AB-00 legacy entry/caller audit

Observed at stage baseline `e5119961570c52f4e5c3d9ef3647650d1de08d67`. This is the integration dependency inventory; no frontend changes are included.

- `src/app/sign-in/page.tsx` and `sign-up/page.tsx` share `auth/auth-page.tsx`. It calls Supabase `getCurrentUser`, redirects to `/assessment`, imports `assessment/auth-controls`. FE1 replaces these entry flows and their scoped tests using the frozen Firebase adapter/contracts.
- `src/app/auth/callback/route.ts` exchanges a Supabase code and redirects to `/assessment`; its test expects that old behavior. FE1/integration must review removal/replacement alongside Firebase action-code handling. New Firebase session APIs do not reinterpret Supabase cookies or map users by email.
- `src/app/assessment/{page,auth-controls,assessment-form}.tsx`, `src/components/workspace-header.tsx` and `src/proxy.ts` retain old identity/navigation dependencies. Shell retirement and proxy cutover require coordinated integration after frontend delivery.
- Retired API browser callers remain in `analysis/[id]/analysis-status.tsx`, `analysis/[id]/next-steps/next-steps-workspace.tsx`, `analysis/[id]/review-links.tsx`, `assessment/assessment-form.tsx`, `credential-versions/{workspace,export-controls}.tsx`, `opportunities/opportunities-workspace.tsx`, `review/[token]/review-feedback-form.tsx`, `saved-work/saved-work-list.tsx`.
- Existing credential print/repository consumers remain ownership-protected under old identity. Preserve them until reviewed page retirement; Firebase identity cannot authorize old records.

The new backend can be reviewed independently, but a deployable combined candidate needs reviewed frontend removal plus new entry/navigation integration and one documented new-account authority. Existing PR #2 remains staged and retains its original base. No legacy runtime/package/migration/data cleanup is inferred from AB-00 or from a green build.

## Continuation recheck — 16 October 2026

Fresh source search on continuationfd0644b (then isolated client repair integrated ase498a98) still finds the listed consumers: shared auth page imports Supabase `getCurrentUser` and assessment controls and redirects to `/assessment`; saved-work, analysis status/review-links/next-steps, credential workspace/export, opportunities and review-feedback retain retired API requests. This is a current source observation, not a newly passing legacy flow. Guest and account API suites do not establish these pages work.

Connection queue, blocked until reviewed frontend deliveries:

1. FE1 replaces only its auth/action/account entry roots and returns exact imports to remove; reviewed safe-next/server composition before entry navigation.
2. FE2 returns pricing/checkout/billing child and reviewed explicit restore adapter. Neither owns account layout/proxy/global navigation.
3. One later coordinator task enumerates exact shared layout/nav/proxy and legacy-page paths, assigns a single writer, and reviews transitive print/repository/Auth consumers before any deletion. The old shell retirement task is a dependency, not blanket permission to edit a human's existing work now.
4. Only after no runtime/build/test callers remain, decide obsolete libraries/packages/config/harness retirement in a separate bounded commit. Preserve Supabase data/migrations. Rerun retained guest/privacy + authenticated UI, negative APIs and both identity-isolation checks before combined readiness.

Current packets: [FE1](AB_FE1_PACKET.md), [FE2](AB_FE2_PACKET.md). No delivery/acknowledgment received and no frontend/source retirement performed in this continuation.
