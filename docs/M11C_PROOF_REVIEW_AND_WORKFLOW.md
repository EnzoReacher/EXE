# M11C — Private proof review and credential workflow

**Date:** 2026-10-04
**Branch:** codex/exe-web-app-m11c-proof-review
**Exact published baseline:** e15d9584fa67230024ed21cc6258f29a1353726b (M11B.1)
**Status:** Implemented; isolated rendering/code checks passed; local Supabase integration and owner acceptance pending.

The owner requested direct development in ChatGPT after M11B.1. This stage improves the existing owner-directed prototype. It creates no research evidence, real expert approval, role administration, pricing decision or release approval.

## Delivered behavior

| Area | Result |
|---|---|
| Private proof view | JPG/PNG are displayed in a controlled, script-free HTML document instead of a native image document. PDFs receive clear authenticated-download guidance. |
| Download usability | Fixed private filenames have the appropriate PDF, JPG, PNG or DOCX extension. Original filenames, storage paths and account/expert metadata are not exposed in the response filename. |
| Expert assignments | Opening another claim clears the previous explanation, decision and proof acknowledgement. The default remains request-more-information; every claim requires a new acknowledgement. |
| Owner guidance | Five-step instructions, real saved-state counts, prerequisite messages and links to workspace sections. Counts are workflow counts, not skill or hiring scores. |
| Multiple CVs | Owner-only source CV labels and source/next-step filters distinguish histories whose version numbering restarts at 1. Filters do not mutate data. |
| Revised claims | Needs-information/rejected wording can be copied into a new proposal. An expert must be selected again; no save or submission occurs automatically. The original record remains unchanged. |
| Stale panels | Owner refresh closes loaded snapshots and confirmations. Expert refresh closes the active review. Missing or mismatched detail responses never create actionable review panels. |
| Recovery | Safe, allowlisted error messages distinguish partial evidence deletion and saved actions whose refresh failed. Retry loading does not repeat a mutation. Failed refresh hides stale private lists. |
| Keyboard navigation | Named filters, section anchors, review-heading focus, close-review focus restoration, confirmation cancellation and focused error messages. |

Source-CV identity/filename was added only to the authenticated owner DTO. The expert queue/detail projection is unchanged. Database migrations, RLS, Storage policy, expert authority, immutable text, acceptance, withdrawal and export-provenance contracts are unchanged.

## Proof security

The existing evidence-path RPC and private Storage download still authorize every request before rendering. Owners and assigned, currently authorized experts use the same boundary. No public/signed URL, document conversion service, OCR or external viewer is used.

The protected HTML allows only fixed CSS by hash and raster data URLs. It keeps the sandbox without script/same-origin permissions, default-src none, base-uri none, form-action none and frame-ancestors none; responses also use no-store, nosniff, no-referrer and noindex/nofollow. Only allowlisted MIME types with matching signatures, non-empty bytes and the existing 5 MiB bound enter the renderer. Uploaded HTML/SVG and mismatched types fail closed; bytes are base64 encoded rather than interpolated as markup. Downloads remain attachments.

PDFs are deliberately reviewed through the private download in an external document viewer. This stage does not provide an embedded PDF viewer, generated PDF, issuer authentication or a proof-validity badge.

A displayed or downloaded copy cannot be recalled. Withdrawal denies future requests under the existing lifecycle; reviewers are instructed to close the view after review.

## Browser regressions and limits

Two additional commands are separate from ordinary unit tests, verification and CI:

    pnpm test:proof-preview
    pnpm build
    pnpm test:workspace-ui

Both need already available Chromium compatible with Playwright, never install a browser and never contact Supabase. The optional PROOF_BROWSER_EXECUTABLE setting selects an explicitly installed local executable; normal usage can use the existing Playwright cache.

The proof test serves fixed/generated synthetic rasters and a synthetic PDF marker from a temporary loopback server using the production renderer/headers. It tests decoded images, large portrait PNG/JPG scaling at 320/375/768/1024/1440px, opaque-origin storage denial, no active document viewer and PDF guidance. This is rendering compatibility, not authenticated integration or human review.

The UI test copies only the existing production build/package metadata into an owned temporary directory, links installed dependencies and starts its own loopback production server on an available port. It forwards an explicit tooling environment allowlist and copies no environment file or source document. Intercepted fictional workspace responses exercise keyboard validation, source/next-step filters, narrow action bounds and stale candidate refresh. No backend mutation, authentication or expert approval is performed. A fresh build is required after source changes.

Both use fixed-content reporting and disable screenshots, traces and videos; owned temporary output/server resources are cleaned up on ordinary completion. SIGKILL or machine failure can prevent cleanup. They do not replace the genuine-authentication M11B.1 suite.

### Sandbox diagnostic

An isolated reproduction traced the sandbox SecurityError to Playwright 1.61.1's injected service-worker blocking script reading navigator.serviceWorker in an opaque origin (installed coreBundle.js). It was not evidence that the product should gain same-origin privileges.

The script-free proof regression uses a JavaScript-disabled browser context without that injected shim. Application contexts in the genuine local suite still block service workers. Its added proof-rendering check uses a separate JavaScript-disabled context with the assigned synthetic expert's genuine cookies, validates the sandbox response and restricts networking to the app origin. No product security header is relaxed and no browser error is silently ignored.

The ordinary native-image behavior originally reported in M11B.1 remains historical. M11C supplies a controlled view and records the narrower diagnostic actually reproduced here.

## Resume on the owner's existing local stack

From a clean project checkout, fetch/switch to this review branch and install with the committed lockfile. Reuse the already-running EXE stack; do not reset it or start a duplicate.

    pnpm install --frozen-lockfile
    pnpm review:verify
    pnpm test:e2e:local
    pnpm test:proof-preview
    pnpm test:workspace-ui

Run the browser commands after verification/build succeeds. Keep only the existing stack's public loopback settings in the untracked local configuration. Do not copy the ChatGPT test-machine executable path to another machine.

Record the actual results, then complete the M11A owner checklist and M11B print/document-editor review using fictional data. Check two different CV histories, a second expert assignment, new acknowledgement, PDF guidance/download, rejected-claim revision, withdrawal and stale panels. Include date, routes, viewports, keyboard actions, issue and retest results; unperformed activities stay unperformed.

**Next stage:** M11C.1 integrated acceptance and owner-review fixes. Expert enrollment/privacy/backup/retention policies and CP2 evidence review remain separate gates before real data or broader product decisions. Merge/deployment/release still require explicit owner approval.

References: [MDN sandbox](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/sandbox), [MDN data URLs](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/data), repository-installed Next.js route/client-component guides, and the [actual M11C results](M11C_ACCEPTANCE.md).
