# Authenticated profile → tailored CV workspace

> **Navigation guidance superseded — 25 October 2026.** The owner confirms the
> accepted product is the redesigned **Scan CV / Rewrite CV / Saved CVs** workspace.
> The profile/Tailor-first sidebar and Overview entry below were an unwanted
> regression, not the current product direction. Retained Auth/session improvements
> remain; do not use this historical record to restore legacy navigation. See
> [WORKSPACE_NAVIGATION.md](WORKSPACE_NAVIGATION.md) for the selective recovery.

This owner-requested update supersedes the anonymous-first flow and the later
Scan/Rewrite-first navigation. It continues the existing implementation; it does
not reset accepted work or change provider credentials, billing policies or hosted
schema. Baseline: branch `feat/ownpath-demo-rc`, HEAD
`6af57521674915511cddd8c561bb5793a1d18ec1`, plus the dirty candidate recorded under
`.factory/evidence/OWNPATH-AUTH-WORKSPACE-20261025/baseline/` (449 public files).

## Implementation checklist

- [x] Public landing remains public for both signed-in and anonymous visitors.
- [x] Authenticated `/app` layout: Overview, My experience profile, Tailor my CV,
  My CVs, Account and security. Desktop sidebar and mobile modal drawer reused.
- [x] Server-side page/API verification; exact intended-return allowlist.
- [x] Neutral signup confirmation screen; password recovery retains its destination.
- [x] Reuse editable profiles, optional JD, source-backed decisions and complete TXT.
- [x] Actual saved-data onboarding/loading/error states, rename/delete/reopen.
- [x] Owner-bound, memory-only recovery after expiry; explicit logout discards drafts.
- [ ] Final compiled browser/screenshots, retained suite and final handoff.

## Routes and retained work

`/cv-review` and `/experience-translator` redirect to `/app`, which requires Auth.
The five sidebar links are the primary product; neither a guest workspace nor a
second public editing mode is created. Existing schema-v2 saved CVs retain access
to their existing editor at `/app/rewrite`; existing `/app/scan` compatibility is
preserved without primary navigation. These compatibility components, provider
adapters, upload/template/billing implementation and their unrelated dirty changes
are not deleted. Main profile/Tailor flows use the existing schema-v1 contract.

## Privacy, expiry and model calls

No CV content is written to browser storage or URLs. The sidebar preference is
still one non-sensitive boolean. If an experience draft is interrupted by expiry,
it is hidden and can be resumed for 30 minutes while the original page remains
open. Sign in in a new tab, then choose **Verify account and resume**. The server
must return the same owner before the draft is shown. Explicit sign-out, an owner
switch, closing/reloading the original page, or expiry discards recovery. In-flight
AI operations are not silently resumed. Earlier Scan/Rewrite drafts are cleared on
expiry rather than imported into a different data contract.

Manual profile creation sends nothing to AI. Optional AI section organization and
the Tailor review use the existing server-only OpenAI adapter, one provider attempt
per bounded operation, explicit consent, nested validation, and the existing usage
reservation/acknowledgement boundary. Organization reserves a scan operation;
Tailor review reserves a rewrite operation. Failed/unverified provider outcomes
remain recoverable and do not silently call a different provider or insert a
fictional result. Accept/edit/export/save do not call a model.

The restored review endpoint still requires the legacy explicit numeric-loopback
OpenAI configuration. A previously configured Claude Scan/Rewrite provider is not
assumed to configure this endpoint. No live quality/latency/cost acceptance is
implied. Source references and deterministic guards do not prove semantic truth.

## Owner setup and manual journey

Reuse Supabase public URL/publishable key, trusted site URL and the existing
`/auth/callback` allowlist. Either signup-with-session or email-confirmation signup
is supported; email/SMTP delivery needs real owner configuration. Recovery callbacks
must carry the existing exact `/reset-password` destination.

Existing setup/migrations remain in `CV_WORKSPACE_SETUP.md`. Profiles/versions
require `20261019_ownpath_cv_profiles_versions.sql`. Existing save/usage infrastructure
also expects its installed usage/billing schema; missing setup yields a recoverable
error, not a fake successful save. No hosted migration was applied in this task.

Start with `pnpm dev --hostname 127.0.0.1 --port 4406`, or use the repository's
documented isolated preview instructions. Use only synthetic data for verification.
Visit `/` → Get started/Sign in → Overview → Add your first CV → paste experience →
Review text myself → Use this profile → optionally Save profile → Tailor my CV →
optional JD + language + consent → Propose improvements → Accept/Edit/Dismiss →
complete preview → name and Save → My CVs → open, rename, copy or download TXT.
Use **Keep original CV** to test the complete export without an AI provider.

For controlled browser checks, build an isolated copy with fictional Supabase
`http://127.0.0.1:4407`, site URL `http://127.0.0.1:4406`, and no AI keys, then run:

```sh
OWNPATH_VISUAL_BUILD_DIR=/path/to/isolated-build pnpm exec playwright test --config=e2e/auth-workspace.config.mts
pnpm test:ownpath:rls
```

The browser fixture is synthetic Auth/PostgREST, not live Supabase or email. Its
controlled review responses test UI integration, not live OpenAI grounding. The
RLS command uses only fixed local `supabase_db_EXE` and rolls back its transaction.

Current primary intake/export: text and TXT. Older upload/print/template support is
preserved for compatible historical versions, not newly advertised on the landing.
