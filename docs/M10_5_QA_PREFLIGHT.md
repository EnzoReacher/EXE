# M10.5 — Local Owner-Review Preflight

**Status:** Engineering-only preparation. Owner browser review, CP2 evidence, M11 selection, merge, and deployment remain pending.

## Purpose

`pnpm review:preflight` makes tomorrow's fictional-data owner review safer and easier to begin. It runs locally without network requests or writes and intentionally does not inspect a CV, job description, research record, or browser session.

## What it checks

- `.env.local` is present, readable, and at most 64 KiB.
- The app's two required public browser settings exist: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- The URL is an HTTP loopback URL (`localhost`, `127.0.0.1`, or `::1`), rather than a hosted Supabase environment.
- No service-role, secret, database, private-key, or access-token setting appears in that local browser configuration.
- The fictional Aria Vale DOCX fixture is a bounded DOCX/ZIP file and the M10.2 owner-review checklist exists.

It never prints configuration values. A failed preflight gives only a safe category-level explanation.

## Run it

```bash
pnpm review:preflight
```

For a deliberately named local file only:

```bash
pnpm review:preflight -- --config path/to/.env.local
```

On pass, start the app with `pnpm dev`, use the fictional fixture in `docs/demo/fixtures/`, and complete `docs/M10_2_OWNER_REVIEW.md`. On failure, correct only the reported configuration category; do not copy secrets into chat or Git.

## Boundaries

- This is not evidence of a completed M7/M10.2 review.
- This is not a security or privacy approval for real CVs.
- This is not CP2 research evidence or a pricing/competitor/market claim.
- No product feature is selected; M11 stays blocked until reviewed CP2 evidence and an owner/team decision exist.
- No merge to `main`, deployment, or public release is authorized.
