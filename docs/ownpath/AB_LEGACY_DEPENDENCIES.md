# AB-00 legacy entry/caller audit

Observed at stage baseline `e5119961570c52f4e5c3d9ef3647650d1de08d67`. This is the integration dependency inventory; no frontend changes are included.

- `src/app/sign-in/page.tsx` and `sign-up/page.tsx` share `auth/auth-page.tsx`. It calls Supabase `getCurrentUser`, redirects to `/assessment`, imports `assessment/auth-controls`. FE1 replaces these entry flows and their scoped tests using the frozen Firebase adapter/contracts.
- `src/app/auth/callback/route.ts` exchanges a Supabase code and redirects to `/assessment`; its test expects that old behavior. FE1/integration must review removal/replacement alongside Firebase action-code handling. New Firebase session APIs do not reinterpret Supabase cookies or map users by email.
- `src/app/assessment/{page,auth-controls,assessment-form}.tsx`, `src/components/workspace-header.tsx` and `src/proxy.ts` retain old identity/navigation dependencies. Shell retirement and proxy cutover require coordinated integration after frontend delivery.
- Retired API browser callers remain in `analysis/[id]/analysis-status.tsx`, `analysis/[id]/next-steps/next-steps-workspace.tsx`, `analysis/[id]/review-links.tsx`, `assessment/assessment-form.tsx`, `credential-versions/{workspace,export-controls}.tsx`, `opportunities/opportunities-workspace.tsx`, `review/[token]/review-feedback-form.tsx`, `saved-work/saved-work-list.tsx`.
- Existing credential print/repository consumers remain ownership-protected under old identity. Preserve them until reviewed page retirement; Firebase identity cannot authorize old records.

The new backend can be reviewed independently, but a deployable combined candidate needs reviewed frontend removal plus new entry/navigation integration and one documented new-account authority. Existing PR #2 remains staged and retains its original base. No legacy runtime/package/migration/data cleanup is inferred from AB-00 or from a green build.
