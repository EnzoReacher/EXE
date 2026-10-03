# M11A — Credential-gated CV versions

**Date:** 2026-10-03

**Branch:** `codex/exe-web-app-m11a-credentialed-cv-versions`

**Base:** Published M10.6 `5dd5fbebf688aeafe20ecc91cb55838bdc5d851e`.

## Authorization and boundaries

M11A is an **owner-directed technical prototype**, explicitly approved for implementation. This is not CP2 validation, validated demand, institutional authentication, product-market selection, privacy approval, or release approval. CP2 and broader M11 product validation remain pending. Nothing is merged to main or deployed; owner approval is required before either.

Only fictional files/accounts may be used. No external AI, OCR, skill inference, issuer lookup, external credential API, URL fetching, scraping, payments or document export occurs. Existing M3 drafts and public-token review links are unchanged. Review-link possession is never expert authority.

## Owner workflow

1. Sign in using the existing assessment workspace; open `/credential-versions` (also linked from Saved work).
2. Upload/select a parsed source CV. Optionally upload a private PDF/DOCX portfolio. Portfolio-only uploads cannot create a CV version.
3. Upload one private PDF/JPG/PNG certificate or degree, at most 5 MiB, with matching extension, MIME type and signature. Filenames are at most 120 characters without path/control characters. Portfolio DOCX validation reuses the existing archive-marker guard; credential files are not parsed or OCRed.
4. Propose one bounded skill label (2–80 characters) and exact proposed CV statement (2–300 characters). Choose an active team-approved expert other than yourself. Save a draft, then submit it separately.
5. The source CV/version snapshot, wording, expert and evidence references are fixed at creation. No new skill is appended by upload, filename, draft save, or submission. Needs-information/rejected reviews remain historical; revised proof or wording needs a **new claim**, not a silent edit of the reviewed submission.
6. After expert approval only, create one idempotent immutable **candidate** version. It starts from the latest active accepted version, or from the parsed original CV when no active version exists; no M3 draft is modified. Only the exact approved statement is appended under “Approved additional skills.” The approving expert must still be active and team-approved at creation. No proficiency, years, achievements, titles or metrics are inferred or rewritten.
7. Compare the preserved before snapshot with the after snapshot, explicitly confirm acceptance or reject it. Candidates are read-only: changing wording requires a new expert-reviewed claim. Only owner acceptance makes a version active. Older accepted versions become historical/superseded; their text and original acceptance timestamps do not change. Rejected candidates remain historical.
8. Withdraw an individual unaccepted claim without deleting shared evidence. Claims used in historically accepted versions require the evidence-withdrawal flow instead.

If another version was accepted since claim creation, candidate creation/acceptance is denied rather than losing intervening text. Submit a fresh claim against the current base. Source deletion continues to cascade derived records, preserving existing deletion behavior.

## Expert workflow and authority

`/expert/credential-reviews` is an authenticated, team-approved-only route. Non-experts and inactive experts see a neutral unavailable response. There is no role registration/activation UI.

The queue contains assigned submitted claims only, not account identities, document filenames/paths, raw CV text, unrelated CVs, drafts, jobs or other claims. Selected detail exposes exact proposed wording, skill and the first 2,000 characters of the frozen source context. Only selected proof/portfolio can be downloaded through `/api/credential-versions/evidence/[claim]?kind=credential|portfolio`; requests recheck authentication and assignment. These routes stream private bytes with no-store/nosniff/sandbox/download headers, not public or signed object URLs.

Open the authenticated sandboxed private proof preview or download, read the submitted proof and wording, provide a bounded explanation (2–1,000 characters), explicitly acknowledge review, and choose approve/request more information/reject. The preview uses a protected application route, never a public object URL. Only the selected **active authenticated expert**, never the claim owner, can record one immutable decision. Assignment completion, withdrawal or expert deactivation removes further expert evidence access. Approval does not accept a candidate on the owner's behalf.

User-facing approval wording is exactly:

> Approved by a team-approved expert after reviewing submitted proof.

It must never be represented as “officially institution-verified.” An expert's review is a human assessment of submitted proof, not issuer authenticity, skill proficiency, or hiring verification.

## Data model and access controls

Migration `20261006_m11a_credential_versions.sql` introduces the tables below. Additive migration `20261007_m11a_review_completeness.sql` completes explicit expert approval metadata, lifecycle dates, individual withdrawal and active-expert/marked-section candidate creation:

| Record | Purpose |
|---|---|
| `portfolio_documents` | Owner-scoped PDF/DOCX metadata and withdrawal tombstone |
| `credential_documents` | Owner-scoped certificate/degree metadata and withdrawal tombstone |
| `team_expert_profiles` | Separate opaque profile ID, authenticated reviewer ID, bounded display name/specialty, approval status/date, active state and lifecycle dates |
| `credential_skill_claims` | Owner/source/evidence/assignment, exact wording, frozen base and lifecycle |
| `credential_expert_decisions` | One checked immutable expert decision per submission |
| `cv_versions` | Immutable content, numbering, parent and candidate/accepted/superseded/rejected/evidence-withdrawn state |
| `cv_version_skill_claims` | Cumulative exact claim/decision provenance, inherited by descendants |

All tables use RLS. Lifecycle writes are revoked from ordinary and anonymous clients and happen only through explicitly granted authenticated security-definer functions with an empty search path and identity/ownership/state checks. The version trigger prevents content/base/number/creation or historical acceptance timestamp edits. Owner table reads are owner-scoped; experts have no table access to other owners. Expert access is through narrow assignment RPCs and Storage policies. A unique active-version index and source/claim locks serialize version and decision transitions. Ordinary users cannot administer expert profiles or forge approvals/version content/active status.

`portfolio-private` and `credential-private` are private 5 MiB MIME-restricted buckets. Paths use owner UUID plus random UUID and bounded extension; no overwrite policy exists. Deletion is blocked until the registered evidence is withdrawn. Lists return explicit safe DTOs, never raw source/proof contents, Storage paths, account IDs, configuration, or public object URLs. Unexpected/database errors are normalized.

### Evidence withdrawal and deletion

The owner can withdraw evidence and delete the private object, including for unaccepted claims. Withdrawal marks every dependent claim withdrawn and every version containing that claim—including descendants—`evidence_withdrawn`. Such a version is **not active or currently approved**, even if historically accepted. Text, exact decision and original dates remain historical truth; versions are not silently rewritten. Portfolio withdrawal uses the same conservative rule because selected support was part of the reviewed submission. Shared evidence withdrawal affects all its claims and is disclosed before confirmation.

If Storage removal fails, withdrawal still persists and the UI tells the owner to retry file deletion. Metadata tombstones retain provenance; the bytes are removed separately. No rollback makes evidence appear current again. Original CV deletion retains existing cascades; team must separately review backup/retention before real data use.

### Expert-role administration (pending policy approval)

Only trusted database administration may create/deactivate `team_expert_profiles` after the team authorizes an existing authenticated account. Activation requires `approval_status='approved'` and a recorded `approved_at`; revocation must also deactivate the profile. These fields are writable only by trusted administration. There is no self-service role assignment, hard-coded real expert, seeded production identity or public verification badge. An owner/team policy for qualifications, authorization, revocation, audit and conflicts of interest remains pending before real expert enrollment. Admin privileges/keys must never enter browser code or `.env.local`.

The local acceptance helper uses `docker exec ... psql` only to provision and remove **temporary fictional** expert fixtures in the already-running local `supabase_db_EXE`. This is test administration, not a product feature or approval of any real expert. It never starts or resets the stack. Do not start a duplicate merely because port `54322` is occupied.

## Verification and pending owner action

Actual checks and limitations are recorded in `M11A_CREDENTIAL_GATED_CV_VERSIONING_ACCEPTANCE.md`. Automated/integration tests are not manual usability/accessibility findings, CP2 evidence or privacy approval.

Before a manual fictional-data session:

```bash
pnpm review:verify
pnpm dev
```

Use the fictional DOCX in `docs/demo/fixtures/`; use only synthetic certificate/portfolio fixtures. Complete `M10_2_OWNER_REVIEW.md` plus the M11A owner/expert forms, downloads, rejected/needs-information outcomes, candidate acceptance/rejection, version history and withdrawal flows. Record actual date, viewport width/height, keyboard actions, issues and retests. Real browser/mobile/screen-reader/accessibility review remains pending. CP2 research and evidence-based product decisions remain pending. No merge, deployment, PR or release approval is authorized.
