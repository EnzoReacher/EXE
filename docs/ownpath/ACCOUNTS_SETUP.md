# Local accounts setup and external gates

Use Node 24, pnpm 11.25, Java 21+ on PATH; run `pnpm install --frozen-lockfile` then `pnpm test:accounts:emulators`. SDKs at this checkpoint: Firebase web 13.0.0, Admin 14.5.0, CLI 15.34.0, rules-unit-testing 6.0.0, Stripe 23.0.0. Dependency lifecycle scripts remain explicitly disabled; frozen install and real emulator invocation were tested under that policy.

The harness launches its own demo-only Auth/Firestore services on five selected loopback ports in an isolated `/tmp/opencode/ownpathaccounts-*` directory. It passes an allowlisted environment, refuses cloud credentials/projects/remote emulator hosts, uses no existing emulator/reset/import/export, removes owned data in `finally`, and verifies all ports can be rebound afterward. Firebase CLI's generated demo project configuration is accepted only with exact expected demo-derived values. The CLI may download its emulator JAR to the ordinary Firebase emulator cache. No deployment command is part of this setup.

First local attempt reported missing Java. Execution then used a disposable Temurin 21 JRE downloaded to `/tmp/opencode/ownpath-jre21`; no global Java/system/package configuration changed. First actual service invocation exposed the CLI-injected `FIREBASE_CONFIG` and failed the overly broad credential guard; the guard was corrected to validate the exact demo configuration. A subsequent actual Auth/Firestore run passed two synthetic identities, Admin database read/write, and 24 anonymous/owner/other-user direct-client deny checks. That result alone does not prove server repository authorization or cloud IAM.

## Application configuration

Accounts default to disabled. Use only explicit loopback emulator mode for synthetic local development, standard Auth/Firestore emulator host variables, a `demo-ownpath-*` project, and the trusted application origin. See the contracts/backend configuration for the exact client adapter settings. Never set cloud Admin credentials in the test harness. Private account/billing/session responses are no-store. Existing Supabase runtime consumers remain staged and isolated pending reviewed frontend removal; do not deploy this partial candidate.

## Missing external acceptance

- No non-production Firebase project, deployment region, least-privilege Admin IAM, email-enumeration/password policy, authorized domains/action URLs, mail deliverability, backup/restore or retention/TTL policy has been configured or verified. Choose region from confirmed deployment/data requirements. Cloud setup requires its own authorized access and evidence.
- No Stripe test secret, expected account, monthly Pro test Price/product or signed webhook secret is supplied. Actual test-card Checkout, Portal, renewal/cancel/refund/dispute and provider-to-Firestore reconciliation acceptance remains BLOCKED. Deterministic tests are labeled separately. Live mode stays rejected.
- FE1 and FE2 deliveries/acknowledgment, legacy page/caller retirement, one-identity entry cutover, combined authenticated browser flows and manual device/accessibility checks remain separate owner tasks.

Rollback: revert only the scoped stage commits in reverse order. Existing Supabase records/migrations and other worktrees/profiles remain intact. No merge/deploy/live enablement is part of this handoff.
