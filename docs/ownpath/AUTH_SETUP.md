# OwnPath account setup — engineering preview

> Historical Auth implementation record. For the current protected Scan → Explain
> → Prompt → Rewrite workspace and Profile & Security page, use
> [CV workspace setup](CV_WORKSPACE_SETUP.md), [Account evidence](ACCOUNT_PROFILE_EVIDENCE.md)
> and [publication status](PUBLICATION.md). Earlier anonymous-Translator/account
> descriptions below do not supersede those current routes or acceptance results.

**OWNPATH-POST-SIGNUP-001:** signup continuation/account-navigation changes are
frozen for review, not yet independently accepted. The prior acceptance below
applies to the previous candidate, not automatically to this delta.

OWNPATH-LANDING-AUTH-001. Independent QA and focused Auth Security **PASS within
mocked/local compiled scope** (2026-10-19); live provider acceptance remains NOT RUN.
Review records: `.factory/evidence/OWNPATH-LANDING-AUTH-001/qa/`. The
Translator stays anonymous and has no automatic account save/history feature.
Accounts use the existing Supabase email/password Auth provider, not a new database
schema, service-role key or migration. Use fictional accounts only. Production,
real-user/privacy, live account and mail delivery approval are separate gates.

## Owner configuration (never send credentials in chat)

Use the existing placeholders in `.env.example`, provisioning locally yourself:

- `NEXT_PUBLIC_SUPABASE_URL`: the intended Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: **public publishable** key only. Never
  use a service-role/secret/admin key here. These values are shipped to browsers.
- `NEXT_PUBLIC_SITE_URL`: exact trusted application origin, no path/query/hash.
  HTTPS is required except local loopback HTTP. Production callbacks fail closed
  if this is absent/invalid; no Host/forwarded-header origin inference.

Do not enable OpenAI or modify its settings to test Auth. Nothing here authorizes
live paid calls, remote migration, deployment or reading private environment files.
The public variables are build-time settings: rebuild when switching them. No
production bypass or public mock switch is implemented.

In Supabase Auth URL configuration, set the Site URL and explicitly allow the
callback for each authorized exact origin:

```text
http://127.0.0.1:3000/auth/callback
http://127.0.0.1:3000/auth/callback?next=%2Fapp
http://127.0.0.1:3000/auth/callback?next=%2Freset-password
```

Replace the origin with the actual owned local port or approved HTTPS origin;
match redirect-query handling in your Supabase allowlist without opening arbitrary
domains. Avoid broad production wildcards. Keep email/password signup enabled and
**disable Confirm email in the Supabase dashboard**, as chosen by the owner for
signup without email confirmation. Application code does not change this setting.
Configure approved SMTP, sender and email templates for recovery; leave recovery
links intact so they redirect back with a **PKCE code**. SMTP delivery, provider
rate limits, CAPTCHA/abuse configuration and actual dashboard allowlist behavior
have **not** been validated by mocks. No email delivery is promised.

## Actual routes and behavior

| Route | Behavior |
|---|---|
| `/` | Project/JD landing, account-free Translator CTA, fictional example and FAQ |
| `/sign-up` | Email, 12–128-character new password and confirmation; a returned session must pass `getUser` before a new-document redirect directly to `/app`; no session shows a provider-configuration error on the form |
| `/sign-in` | Existing email/password, no new-password minimum applied to old accounts; a returned session must pass `getUser` before a new-document redirect directly to `/app`, regardless of `next` |
| `/forgot-password` | Neutral reset-email request; does not disclose account existence |
| `/auth/callback` | Exchange code against cookie-held PKCE verifier, then verify user via Auth; default to `/app` for missing/unsafe/ambiguous `next`; allowlisted workspace routes and `/reset-password` remain allowed; preserve cookies and remove code/query |
| `/reset-password` | Server-verified authenticated user required to show an editable reset form, then browser `getUser` again immediately before `updateUser` |
| `/account` | Provider-verified session/email, local-browser logout and account/Translator links, no invented private CV workspace/history |

Start signup/resend/reset and open the **newest** email link in the same browser
and origin. The SDK stores the PKCE verifier in that browser's cookies; other
browsers, expired links or mismatched origins may fail safely. This preview uses
the SDK's default PKCE flow, not its experimental multi-flow redirect options.
Resending may replace the usable pending verifier. An already signed-in user may
also change their password through `/reset-password`; the route's name or query
alone never grants a session. The provider may demand reauthentication or enforce
a stronger password policy; errors remain recoverable.

The app does not change provider confirmation settings. Signup and signin require
a returned session and a successful `getUser` identity check before navigating
directly to `/app` using `window.location.replace`. The fresh document sends the
persisted session cookies to the server-rendered workspace. There is no success or
account-screen stop. Verification failure stays on the existing form with a
recoverable error; Retry verification retries `getUser`, not signup/signin.
Signout invalidates in-flight checks so stale verification cannot redirect.

Without a returned signup session, passwords are cleared and the form explains
the provider-configuration requirement: the owner must disable Confirm email in
the Supabase dashboard. It also offers signin for existing accounts, since a
no-session response does not establish account existence. It does not claim email
confirmation, delivery, or authentication, or enter protected content. Signup and
resend callbacks target `/app`; recovery callbacks still target `/reset-password`.

Public and Translator headers verify identity via `getUser`, not an event payload.
While checking they show a checking hint, never a verified-account claim; verified
sessions show Your account, otherwise sign-in/create-account access. Auth events
are reverified outside the SDK callback; stale checks cannot restore a signed-out
header and subscriptions are cleaned up. Account-link prefetch is disabled so the
anonymous Translator journey does not make speculative Auth-page requests.

Explicit sign-out
uses local scope: it does not claim to revoke sessions on every device. A failed
sign-out is not displayed as success. The installed SDK can clear the local session
even when remote logout returns an error. The UI reverifies identity: it preserves
an actually verified active session, otherwise hides stale account identity and
explains that remote sign-out was not confirmed. It never restores old tokens to
simulate a preserved session. Auth itself uses session cookies even though
Translator inputs/drafts are not automatically sent to Supabase.

Missing public configuration displays exactly **Authentication is not configured.**
and disables provider actions, not fake success. Invalid/expired code exchange
returns a generic sign-in notice. Provider details, passwords and tokens are not
rendered or logged by this UI. Callback/Auth/account responses are no-store and
no-referrer; callback redirect locations do not retain credentials. Browser Auth
URL fragments are discarded and implicit-token auto-detection is disabled.
Upstream provider/access logs may still observe the required callback code: review
their redaction/retention before real users. Do not record request bodies/traces
with real credentials.

## Evidence boundary

See [LANDING_AUTH_EVIDENCE.md](LANDING_AUTH_EVIDENCE.md). SDK-boundary unit mocks and
an isolated fictional local HTTP stub exercise the UI and protocol, not hosted
Supabase, SMTP, email delivery, real session policies, adversarial deployment
security or physical-device/assistive-technology acceptance. No real credentials
are needed or requested. Keep live provider/email acceptance **NOT RUN** until
separately authorized and performed.
