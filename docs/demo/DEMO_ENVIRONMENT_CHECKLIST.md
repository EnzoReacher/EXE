# Local Demo Environment Checklist

This checklist is for the **local-only, fictional-data** CP1 Slot 8 demonstration. It does not configure a hosted project, use a service-role key, or authorize deployment.

## Before the demo

- [ ] Confirm Node with `node --version` (the checked baseline used **v24.19.0**; Next.js requires Node 18.17 or later).
- [ ] Confirm pnpm with `pnpm --version` (the repository pins **pnpm 11.25.0**).
- [ ] Run `pnpm install` if dependencies are not already installed.
- [ ] Confirm Docker is running: `docker info`.
- [ ] Confirm the local CLI is available: `pnpm dlx supabase --version`.
- [ ] Use only the local Supabase URL and publishable key printed by `pnpm dlx supabase status -o env`. Do not enter a production URL, service-role key, personal credential, or real document.

## Start the local stack and app

From the repository root:

```bash
pnpm dlx supabase start
set -a
eval "$(pnpm dlx supabase status -o env | grep -E '^(API_URL|PUBLISHABLE_KEY)=')"
set +a
NEXT_PUBLIC_SUPABASE_URL="$API_URL" \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY" \
pnpm dev
```

Open the local URL printed by Next.js (normally `http://localhost:3000`). On a fresh local stack, `supabase start` applies the committed migrations in `supabase/migrations/`. Confirm migration state when troubleshooting with:

```bash
pnpm dlx supabase migration list
```

## Create and use one fictional account

1. Open `/assessment`.
2. In the sign-in box, enter a fictional email such as `aria.demo@example.test`.
3. Choose a new demo-only password of at least eight characters. Do not reuse a personal password and do not put it in this repository or presentation slides.
4. Choose **Create account**, then **Sign in** if the local stack asks for it. Local Supabase normally accepts the temporary account without any real email inbox.
5. Check that the workspace says it is private before uploading the fictional fixture.

## Run the demo data flow

- [ ] Upload [`fixtures/aria-vale-fictional-cv.docx`](fixtures/aria-vale-fictional-cv.docx).
- [ ] Paste the role, company, and job description from [`FICTIONAL_DEMO_DATA.md`](FICTIONAL_DEMO_DATA.md).
- [ ] Save private intake and wait for the CV status **Processed**.
- [ ] Create the evidence report, then create next steps and the draft.
- [ ] Open `/saved-work` to confirm the private return-to-work index is present.

## Verify private storage without exposing data

1. Run `pnpm dlx supabase status` and open only the local Studio URL it reports.
2. In Storage, confirm the `cv-private` bucket is marked non-public and the uploaded object is under the signed-in fictional user's ID path.
3. Do **not** display the object, browser network requests, auth tokens, environment variables, or Studio credentials during the presentation.
4. For an automated ownership and private-storage verification, run the fictional-only command in the next section.

## Commands to run before presenting

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
node --check scripts/m1-local-policy-check.mjs
git diff --check
SUPABASE_URL="$API_URL" SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY" pnpm test:supabase:local
```

The last command creates only temporary fictional local accounts and content. Run it after exporting `API_URL` and `PUBLISHABLE_KEY` as shown above.

## Reset only local fictional demo data

> **Warning:** this resets the local Docker Supabase database and local storage for this repository. It is appropriate only for the fictional local demo stack; never run it against a hosted project.

```bash
pnpm dlx supabase db reset
pnpm dlx supabase start
```

Then repeat the start steps and create a new fictional account. To remove only the current fictional demo records instead, use the app's **Delete CV** control; it deletes the CV, extracted text, and derived reports while keeping the saved target job.

## If the local stack fails

1. Check Docker is running with `docker info`.
2. Inspect local services with `pnpm dlx supabase status` and logs with `pnpm dlx supabase logs`.
3. Stop and restart the local stack: `pnpm dlx supabase stop`, then `pnpm dlx supabase start`.
4. If migrations are inconsistent, use the local-only reset above and retry with fictional data.
5. If recovery will take too long, use the failure plan in [`CP1_SLOT8_DEMO_RUNBOOK.md`](CP1_SLOT8_DEMO_RUNBOOK.md). State clearly that the static walkthrough is not a live private-data demonstration.
