# M15 — Complete private workspace and backend acceptance

Date: 2026-10-06. Branch: `codex/exe-web-app-m15-complete-workspace`.

The owner authorized completing the documented engineering work without waiting for stage approvals. The website remains on its review branch; no merge or deployment occurred. Research results and manual owner acceptance are recorded only when observed.

## Delivered behavior

- Shared navigation connects assessment, saved work, credential CV versions, opportunities, and assigned expert reviews. Sign out clears the local Supabase session and replaces the page so private client/router state is discarded.
- An existing CV can be reused when saving another target job. A completed upload is visible immediately and is retained if job persistence fails. Retry saves the job without uploading the CV again.
- A replacement checks ownership before upload. An unreadable replacement stays available for retry while the previous CV remains available. Storage uses the validated format's canonical MIME type.
- Target jobs can be copied into the intake form to prepare a new job without changing historical reports. After loading, focus moves to the role field. Confirmed deletion removes the selected job's reports, roadmap, drafts, review links, feedback, and opportunities through existing database cascades, while preserving CV files and credential versions.
- Migration `20261008_m15_atomic_next_steps.sql` creates an authenticated SECURITY INVOKER RPC. It locks the completed owned run and commits roadmap, draft and exact finding provenance together. Errors roll back all writes. Concurrent/repeated requests return the same draft; retries preserve existing edits and acceptance. Old orphan roadmap rows are replaced transactionally only when no draft exists.
- Private workspace responses receive no-store/noindex headers. Existing owner RLS, private buckets, expert assignment, acceptance and withdrawal checks remain enforced.
- Disposable GitHub CI installs a local Supabase stack and Chromium, runs the engineering gate, database policies, actual synthetic browser journeys, proof rendering and UI checks, and stops its own stack.
- A new genuine backend/browser core journey covers intake, report, roadmap, acceptance, selected review and feedback, revocation, opportunity tracking, cross-owner/anonymous denial, job copy/deletion cascades, five viewport widths and sign out.

## Screenshot Markdown coverage

| Document | Engineering outcome / remaining human work |
|---|---|
| `M14_VISUAL_DESIGN_SYSTEM.md` | Public visual system already implemented; shared private navigation added in M15. Owner visual review remains available for testing. |
| `OPPORTUNITY_CURATION_STANDARD.md` | Private tracking implemented; the empty curated-source contract is intentional. Real source approval requires evidence and team review. |
| `OPPORTUNITY_LINKS_DESIGN.md` | Private save/edit/status/delete flow implemented; tested without fetching external URLs. |
| `OWNER_REVIEW_M7.md` | Automated acceptance expanded; the owner's manual checklist remains for their test session. |
| `PHASE_PROMPTS.md` | Engineering phases are implemented. Research, interview outreach and course sign-off require actual input/results. |
| `PRIVATE_REVIEW_DESIGN.md` | Hashed, expiring, revocable selected-report links and feedback implemented; browser and policy suites exercise them. |
| `PROJECT_MASTER_REPORT.md` | Updated with M15 changes and actual observed verification results. |
| `PROJECT_SCOPE_AND_PLAN.md` | Required CV/JD/report/roadmap/draft/history/privacy flow is implemented. Payments, marketplaces, crawling and mobile apps remain explicitly deferred scope. |
| `RELEASE_CANDIDATE_ACCEPTANCE.md` | Historical M7 evidence preserved; current acceptance is recorded in this M15 handoff. |
| `SURVEY_TEMPLATE.md` | Complete research instrument; no fabricated responses or completed surveys. |
| `TARGET_USER_INTERVIEW_GUIDE.md` | Complete interview guide; no interviews conducted or invented. |

## Local update and testing

In the existing EXE checkout:

```sh
git fetch origin
git switch codex/exe-web-app-m15-complete-workspace
git pull --ff-only
pnpm install --frozen-lockfile
pnpm dlx supabase db push --local
pnpm review:verify
pnpm test:e2e:local
pnpm test:proof-preview
pnpm test:workspace-ui
pnpm dev
```

If the branch does not exist locally, use `git switch --track -c codex/exe-web-app-m15-complete-workspace origin/codex/exe-web-app-m15-complete-workspace` once. Reuse the existing local Supabase stack. Apply the additive migration with `db push --local`; do not reset the database or create duplicate containers. Keep local configuration private and use fictional fixtures. The app is at `http://127.0.0.1:3000` with the repository's standard setup.

The database-policy command additionally needs the local public Supabase URL/key in `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`: `pnpm test:supabase:local`. Disposable CI supplies those settings itself. No service-role credential is required by application endpoints or these policy checks.

## Owner test sequence

1. Create/sign in to a local test account. Upload the fictional demo DOCX and save a JD with labeled requirements.
2. Create the report, open next steps, update roadmap progress, edit/save/review/accept the draft, then reopen from saved work.
3. Create a private selected review link, open it in a separate signed-out browser, submit feedback, and revoke it.
4. Reuse the same CV for another target job. Copy/edit a job to make a new record, then test confirmed job deletion.
5. Save/edit/status-track/delete a fictional opportunity reference.
6. In CV versions, submit synthetic proof to an assigned team-approved test expert, review the exact proposed wording, accept the candidate and export DOCX/TXT or print. Expert approval and owner acceptance are distinct actions.
7. Sign out, refresh and check that private API data requires sign-in. Check narrow screens and keyboard focus.

## Verification record

**PASS — observed on 2026-10-06.** Verified implementation: `79a375da4c905c0a2c7790a55dff3fd90614bf00`. These checks ran against the real application and a disposable loopback Supabase stack in GitHub CI, rather than the owner's computer.

| Check | Observed result |
|---|---|
| [Quality run 37397936335](https://github.com/EnzoReacher/EXE/actions/runs/37397936335) | 331 tests in 43 files; lint, typecheck, production build, required script syntax, CP2 collected-mode structural validation and whitespace checks passed. |
| [Combined acceptance run 37397936139](https://github.com/EnzoReacher/EXE/actions/runs/37397936139) | All six commands passed: `review:verify`, `test:supabase:local`, `test:e2e:local`, `test:proof-preview`, `test:workspace-ui`, `cp2:validate`. Disposable stack shutdown passed. |
| Genuine database acceptance | M1–M6b RLS, private Storage, review/feedback/opportunities and cascades; M11A assignment, immutable versions, acceptance and withdrawal; M15 rollback, concurrent retry, exact provenance, accepted-draft preservation and owner isolation passed. |
| Genuine backend/browser journeys | All three passed: landing/signup/signin/persistent sessions and denial; CV/job/report/roadmap/acceptance/private review/opportunities/copy/deletion/signout; credential proof/expert decision/owner acceptance/DOCX/TXT/print/withdrawal. |
| Protected proof rendering | Image rendering, PNG/JPEG scaling at five widths and private PDF download guidance passed. |
| Fixture UI regression | Keyboard validation/source filters, five-width layout and stale-candidate closure passed. This isolated fixture check is distinct from the genuine backend journeys. |
| Synthetic cleanup | Current-run accounts and private objects were deleted and cleanup verified. Screenshots, traces and videos were disabled. |
| CP2 structural check | Nine collected source rows are structurally complete; zero are owner-reviewed and nine remain pending. This is not research or course acceptance. |

Verification exposed and corrected browser-harness temporary-directory/module loading, stale control/message selectors, the signup redirect query matcher, an alert-locator collision and job-copy focus timing. Browser journeys now use isolated accounts, wait for asynchronous actions and verify focus after the form is enabled. The final successful runs above cover these corrections.

Local standalone script syntax, browser-spec collection and whitespace checks also passed. Docker and a complete dependency installation were unavailable in this execution workspace, so full engineering/backend/browser execution was performed in CI. The final documentation publication records this tested implementation without changing application code.

## Remaining decisions

The current matcher/composer is deterministic and local; no external AI provider was selected. Actual surveys, interviews, public-source approval, target segment, pricing, manual owner/assistive-technology review, real expert administration and production privacy/retention review need real evidence or owner/team decisions. These are not marked completed by code tests. No real customer data was used or deployment performed.
