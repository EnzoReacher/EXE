# OwnPath interaction polish — 20 October 2026

## Candidate and preservation

One writer, on `feat/ownpath-demo-rc`, starting at
`7adbd6b77085318be43d55bff382d74b499e6350`. The existing extensive uncommitted
work was preserved. Local history and the earlier Account/reliability/password
evidence show no newer publication of that candidate. This follow-up is also
uncommitted and unpublished; no push, deployment or hosted migration occurred.

The baseline archive, hashes and status are under
`.factory/evidence/OWNPATH-INTERACTION-20261020/baseline/`. Earlier browser evidence
was archived before rerunning journeys. Current rerun artifacts are retained in
this task's evidence directory; the earlier evidence paths are restored afterward.

## Findings and changes

| Journey | Concrete issue | Repair |
| --- | --- | --- |
| Shared controls | Abrupt state changes and generic Auth waiting text; variable action-label widths | Lightweight CSS tokens (140/190/240ms), restrained color/pressed feedback, reusable accessible pending labels/spinners and width reservation that can wrap at narrow widths |
| Navigation | Sidebar route waits have no local indication | Installed Next 16.3.7 `useLinkStatus` supplies actual pending-link feedback; fresh-document Auth navigation remains in place |
| Mobile workspace | Background remained scrollable while drawer was modal | Scroll lock with cleanup, background inertness, Escape, focus wrap/restoration, immediately inert closing drawer, responsive cleanup and transform/opacity open/close |
| Public navigation | Escape on the mobile menu toggle itself did not dismiss the menu | Header-level Escape handling; native FAQ disclosure keyboard behavior retained, restrained opening feedback |
| Scan inputs | Fictional examples only checked CV content before replacing both inputs | Cancel-first labeled native modal also protects JD-only work, existing draft and instructions; insertion closes the menu, announces the update and focuses the CV without forced scrolling |
| Scan/Rewrite | Completion always moved focus, including when the user had moved elsewhere | Completion announces the result and only focuses its heading if the initiating focus is still current; no delayed response may reclaim focus after invalidation |
| Scan/Rewrite waiting | No explicit way to stop waiting | Honest pending text, duplicate prevention, local fetch abort and response epoch guards; “Stop waiting” explicitly says the server may continue and its result is ignored |
| Instructions | Chips appended text without clearly returning control to the editable field | Preserve existing instructions, append the starter and focus the instruction field without scrolling |
| Form validation | Scan validation had no field-level association | Submit-time first-invalid focus, `aria-invalid` and linked error description for CV/JD; editing clears obsolete validation feedback |
| Saved CVs | Browser confirmation, unlabelled mutation wait, focus lost with a removed row | Cancel-first modal, per-row acknowledged deletion feedback, duplicate lock, retained neighboring DOM rows, next-row/heading focus, failure preservation and session-invalidated response guards |
| Saved CV recovery | Unbounded read/mutation wait | Bounded requests and abortable list loading; expired private scope clears records and provides an explicit sign-in/reload recovery path |
| Save/rename | Short changing action text; prerequisites not persistently connected to control | Pending label and spinner, associated persistent save state; server acknowledgement still determines saved state and later edits remain unsaved |
| Account | Save waiting presentation differed from other actions | Shared stable pending label; existing acknowledged snapshots, Cancel, session guards and unsaved-navigation warnings retained |
| Auth | Generic “Please wait…” and unchanged resend text during requests | Operation-specific sign-in/signup/reset/verification/resend labels and indicators; password values, independent eye controls, native autofill/clipboard and secure navigation retained |
| Copy/export | No immediate clipboard wait, no concise confirmed action label, no observable download/print feedback | Copy lock/pending → actual success → “Copied” → original label, live feedback and honest denial; TXT says download requested, Print says print requested and cannot confirm saved output |
| Rendering | Complete CV preview and print HTML rebuilt on unrelated parent renders | Memoized document component and text-dependent print HTML; no provider/API contract change |
| Narrow composer | A 200% CSS-zoom stress check reproduced Rewrite-button overflow | Container-width-based control stacking without changing the outer workbench layout |

No animation dependency was present or added. The installed Next guides for client
components and `useLinkStatus` were read before implementation. Native HTML
details/dialog and local SVG icons are reused. Native-dialog reverse Tab could
leave the button cycle in Chromium; explicit first/last action wrapping was added
and verified. A retained password journey caught reservation-related signup button
overflow at 320px; wrapping within the button's available width fixes it.

Motion is restricted to color/border/shadow transitions, small opacity/transform
reveals and a small spinner. There is no animation-driven navigation delay,
body-text animation, percentage/progress fabrication, expensive blur or persistent
`will-change`. Reduced motion disables these effects and smooth scrolling while
retaining immediate labels and state changes. Disclosures retain native expanded
state and unrestricted long-content height; closing disclosures remains immediate.

## Rendering evidence

`node .factory/evidence/OWNPATH-INTERACTION-20261020/profile-preview.mjs` compares
the archived baseline with the candidate, instrumenting only full preview and
print-HTML function-entry counts. For a synthetic 202-line CV, initial render plus
20 unrelated parent edits produced:

| Full processing passes | Baseline | Candidate |
| --- | ---: | ---: |
| CV body | 21 | 1 |
| Print HTML | 21 | 1 |

The final CV line remains present. The compiled browser also verifies that an
unrelated instruction edit keeps the existing print-frame document. This is
evidence of avoided repeated work, **not a wall-clock speedup measurement**.
There is no claim that CSS or memoization reduces network or provider latency.
No speculative architecture change, profiler trace containing user data or full
page-remount refactor was needed.

## Verification

All application traffic used fictional loopback Auth/REST and controlled AI
responses. Paid model calls and real credentials were not used.

- Retained Vitest suite: **913 tests / 77 files passed**.
- New compiled interaction journeys: **8 passed**.
- Retained compiled core Scan/Rewrite/export journeys: **6 passed**.
- Retained compiled Account journeys: **7 passed**.
- Retained compiled password/native clipboard journeys: **3 passed**.
- Synthetic before/after render-count diagnostic: **passed**.
- ESLint: **no errors**; the existing AuthPanel `initialUser` dependency warning
  remains (line 109 after this change).
- Typecheck and production build: **passed**.

Interaction coverage includes delayed scan/Auth/save/delete requests, repeated
clicks, actual clipboard acknowledgement and denial, scan network failure and
recovery, rewrite failure/recovery, manual edits versus late generation, later
edits during acknowledged save, cancel-first dialog focus, Escape, keyboard-only
drawer cycling/restoration, background scroll cleanup, navigation without a stuck
backdrop, private-scope invalidation/reload recovery, long CV/JD, narrow layouts,
reduced motion, 200% CSS-zoom stress, native password copy/paste and independent
visibility controls. Core journeys also exercise real local save/reopen/revision
conflict and complete Unicode print/PDF/TXT output.

Before and after workbench screenshots were inspected at **1440, 390 and 320px**.
Additional screenshots cover long inputs, drawer, findings, confirmation and
waiting states. Screenshot-only animation finishing is used for settled visual
inspection; functional tests do not wait on exact animation durations. The existing
full-page screenshot workaround hides the offscreen skip link only when unfocused.

Reproduction, with the fictional fixture and compiled app running on 4387/4386:

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm exec playwright test --config=e2e/interaction.config.mts
pnpm exec playwright test --config=e2e/workbench-visual.config.mts scan-rewrite.spec.ts
pnpm exec playwright test --config=e2e/account-profile.config.mts
OWNPATH_TEST_URL=http://127.0.0.1:4386 pnpm exec playwright test --config=e2e/auth-password.config.mts
```

Production build uses the same fictional environment as the existing evidence:
`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:4387`, fictional publishable key,
site/local origin `http://127.0.0.1:4386`, local OpenAI disabled, empty OpenAI key
and model. No hosted setup, metadata persistence, email delivery, schema migration
or provider performance acceptance is implied. Chromium was exercised; real-device,
Safari/Firefox, assistive-technology speech and browser-native zoom acceptance are
still unverified. The zoom check is explicitly CSS zoom, not a native-browser zoom
claim. Native dialog support is required by the touched confirmations.

## Scoped inventory

Modified baseline files (13):

- `src/app/app/workspace.css`
- `src/app/auth/auth-page.tsx`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/ownpath/account-navigation.tsx`
- `src/components/ownpath/account-profile.tsx`
- `src/components/ownpath/auth-panel.tsx`
- `src/components/ownpath/cv-document.tsx`
- `src/components/ownpath/ownpath.module.css`
- `src/components/ownpath/public-shell.tsx`
- `src/components/ownpath/saved-cvs.tsx`
- `src/components/ownpath/scan-rewrite.tsx`
- `src/components/ownpath/workspace-shell.tsx`

Added: `src/app/interactions.css`,
`src/components/ownpath/{interaction-controls,confirmation-dialog}.tsx`,
`e2e/interaction.{config.mts,spec.ts}` and this evidence document. Baseline
preservation checks report no missing files and 251 byte-identical baseline files;
package/lock/config, provider/domain/API code and migrations are unchanged.
