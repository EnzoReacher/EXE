# Private Review Links — M6a Design

## Scope

An authenticated report owner can create one private review link for one **completed** evidence report. The owner can optionally include that report's CV draft only when the draft is explicitly accepted. A link is not a profile, a CV library, a job board, a reviewer account, or a verified-expert service.

The reviewer sees only the selected target role, optional company, selected report findings and their report evidence excerpts, and—only if chosen—the accepted draft content. They can submit one or more short written feedback entries through that same active link.

## Token handling

The server generates a random 32-byte token with Node's cryptographic random generator. This provides 256 bits of entropy, exceeding the 128-bit minimum. The URL-safe raw token is returned to the owner **once**, immediately after creation, and is never stored in application state beyond the current create result.

Only a SHA-256 hexadecimal hash of the token is stored in `review_shares`. The raw token is neither persisted, logged, listed, nor returned by share-management APIs. Owners must create a new link if they lose it.

## Expiry and revocation

The owner chooses 24 hours, 7 days, or 30 days. Every reviewer content or feedback request validates the token hash, checks `expires_at > now()`, and checks that `revoked_at` is null. Revocation takes effect immediately. Invalid, expired, revoked, and deleted links all receive the same neutral unavailable result.

## Privacy model

The review tables retain owner-scoped RLS. Direct anonymous reads and writes are blocked. The only unauthenticated path is two narrowly scoped, security-definer database RPC functions:

- `public.get_private_review(token)` returns a single, deliberately shaped JSON response for an active token.
- `public.submit_private_review(token, name, role, feedback, submission_id)` validates the same active token and writes feedback only for that share.

Both functions use a fixed safe search path, schema-qualified object names, generic unavailable behavior, and do not list, search, enumerate, alter, or expose raw table records. No service-role key is used.

The unlisted reviewer page also emits `noindex, nofollow` metadata and private `no-store` cache headers. It is dynamically rendered so selected content is not statically generated or stored in an application page cache.

## Shared and never-shared data

**Shared by an active selected link:** target role, optional company, selected finding text/status/rationale/caveat, any evidence excerpt already part of that report, and optional accepted draft text.

**Never shared by a review link:** raw CV files, CV library, extracted full CV text, full job-description text, storage paths, owner/account identity, owner IDs, report/draft database IDs, other reports, other drafts, saved-work records, reviewer feedback from other shares, internal provider/version data, or access to editing controls.

## Deliberately excluded

M6a excludes reviewer verification, reviewer accounts, messaging, scheduling, marketplace/search features, payments, public pages, job-board integration, file uploads, rich text, and reviewer ability to change any report or draft.

## Remaining limits

Anyone with an active link can see the selected content, so owners must share only with someone they trust. Reviewer names and roles are self-supplied and not verified. Feedback is advice, not skill verification or a hiring prediction. This is a local prototype using fictional data; the required owner privacy/security and Supabase backup/retention review still precede real CV use.
