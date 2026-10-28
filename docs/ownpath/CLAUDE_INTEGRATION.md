# Local Claude integration: Scan → Explain → Prompt → Rewrite

**Current owner procedure after the first live Scan failure:** use the
[one-Scan diagnostic retest](CLAUDE_SCAN_DIAGNOSIS.md), not the original two-call
acceptance sequence below, until the original failure and prior usage are reviewed.
That report distinguishes the still-unknown live root cause from the confirmed
reservation/acknowledgement defects repaired offline.

## Configuration and model decision

Official documentation checked on **2026-10-23**, without authenticated model
discovery or inference requests:

- [Messages API](https://platform.claude.com/docs/en/api/messages/create):
  `POST https://api.anthropic.com/v1/messages`, `x-api-key`,
  `anthropic-version: 2023-06-01`, top-level `system`, user-message data.
- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs):
  GA JSON output using `output_config.format: { type: "json_schema", schema }`.
  The support list includes `claude-haiku-4-5-20251001`; refusal and `max_tokens` stop
  reasons can still break the schema guarantee and must be rejected.
- [Haiku 4.5 model page](https://platform.claude.com/docs/en/models/haiku-4-5/overview):
  exact model ID **`claude-haiku-4-5-20251001`**, released October 15, 2025,
  currently listed as **active (legacy)**. Its documented 200K context/64K maximum
  output exceeds this app's smaller limits. This pinned snapshot is the owner's
  explicit choice for **both Scan and Rewrite**, superseding the initial Sonnet
  proposal. Haiku's lower price makes it suitable for an initial bounded test;
  factual quality and instruction fidelity still require real-output review.
- [Thinking configuration](https://platform.claude.com/docs/en/api/messages/create)
  supports `thinking: {type: "disabled"}`. Haiku 4.5 uses manual extended thinking,
  not adaptive thinking, and does **not** support `output_config.effort`.
  Requests explicitly disable thinking, omit budget/effort, and send no tools or
  sampling override. No model substitution is made if this snapshot is unavailable.

Only this verified Claude model is accepted by the new adapter. Account-specific
model availability, actual task quality, elapsed time and charges are **unverified**.
There is no claim that Haiku meets quality goals until the owner reviews real
outputs. A different model requires a deliberate capability/configuration update,
not silent substitution. The existing OpenAI adapter remains unchanged.
If the provider returns 404, the app reports unavailable selected-model access;
400 reports a rejected request requiring model/structured-output compatibility
review. Neither triggers fallback. The model is legacy, so the owner should
review availability again if the manual request fails; no live availability
probe was performed and no successor model is selected automatically.

## Local setup (owner action, not performed by automated checks)

Keep the existing `ANTHROPIC_API_KEY` only in uncommitted `.env.local`.
Do not prefix it with `NEXT_PUBLIC_`, paste it into chat, or put it in a shell
command, report or screenshot. The implementation task does not read its value.

Set/update these **non-secret** entries in `.env.local`:

```dotenv
OWNPATH_SCAN_PROVIDER=anthropic
OWNPATH_CLAUDE_LOCAL_ENABLED=true
OWNPATH_CLAUDE_LOCAL_ORIGIN=http://127.0.0.1:4317
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
OWNPATH_BILLING_MODE=OFF
```

Preserve existing Supabase/Auth settings. `NEXT_PUBLIC_SITE_URL` must already
match `http://127.0.0.1:4317` for the normal app's same-origin checks. If it does
not, deliberately update that public local setting and the existing Auth setup
before using AI; do not relax origin validation. Claude requires explicit opt-in,
the saved key, this exact model, a canonical numeric HTTP loopback origin with a
port, and billing OFF (unset also means OFF). An unknown provider fails closed.
Omitting `OWNPATH_SCAN_PROVIDER` retains the previous OpenAI configuration path.
Setting it to `openai` deliberately selects that preserved adapter; missing
Claude settings never trigger an OpenAI/model fallback.

In the terminal that owns the normal development server, stop **that server**
with Ctrl+C and restart it from this working tree:

```sh
cd /home/enzoreacher/EXE-ownpath-demo-rc
pnpm dev --hostname 127.0.0.1 --port 4317
```

Do not start a second server on the same port, bind to `0.0.0.0`, or expose the
paid endpoint through a public tunnel. No owner-server restart was performed
during implementation. For a production-mode local server, rebuild after config
changes; the isolated verification build is not the normal app and has no real key.

## Short owner test: exactly one synthetic Scan and one Rewrite

1. Open `http://127.0.0.1:4317/app/scan`, sign in through the existing Auth flow.
   Confirm the plan/usage service is available. Existing reservations/billing
   schema must be configured; OFF disables purchases, not the private usage reads
   or AI allowance. If setup/usage is unavailable, stop and follow the existing
   readiness documentation; do not bypass reservations or apply broad migrations.
2. Use **Try an example → Sales** (no personal data). Keep its existing JD, or use:
   `Customer service required. Maintain stock records. Supplier negotiation preferred.`
   Review the displayed CV/JD first.
3. Choose **Scan CV** once. The cancel-first acknowledgement must say
   **Send to Anthropic (Claude)?** Confirm only if correct. This is the first
   intentional paid request. Review evidence and coverage: the manager's supplier
   negotiation must not become the applicant's skill. “Not evidenced” is not
   proof of lacking ability. Record elapsed time and consult the private Claude
   Console for actual token usage/cost; do not copy keys or personal content.
4. Choose **Rewrite this CV**. Enter:
   `Make the wording concise and clear. Preserve every name, date and qualification. Keep my manager's negotiation line verbatim. Do not add achievements, numbers or skills.`
   Choose **Rewrite CV** once. This is the second intentional paid request.
   Review the entire CV, exact dates/qualification, retained attribution, notes
   and instruction adherence before using it. Edit manually as needed. Existing
   explicit save/reopen, TXT, and Print / Save as PDF controls remain unchanged;
   none of those actions should call AI.
5. On timeout/error, keep the inputs/edited draft. **Do not immediately submit
   another paid request.** An aborted client request does not guarantee provider
   cancellation. Unknown/pending reservations can block further AI until the
   existing reconciliation process resolves them. Review the console/reservation
   outcome before any deliberate new operation. No automatic retries are made.

## Boundaries and reliability

- The server-only adapter uses native `fetch`, one Messages call per existing
  durable reservation. No SDK dependency, automatic retry, second quota system,
  provider/model fallback, hosted changes or migrations were added.
- Existing authentication, same-origin/Host checks, request IDs, in-memory
  duplicate coalescing, durable digest/ticket reservations and completion state
  accounting remain. The recipient/model acknowledgement fingerprint is checked
  before reservation/provider work. It is non-secret metadata, not a model
  picker or a substitute for authentication/explicit consent.
- Existing 45-second workflow deadline is retained; the adapter also imposes a
  45-second bound for standalone callers. Output is capped at 8,000 tokens,
  160,000 envelope bytes and 60,000 JSON-text characters, then existing bounded
  nested application parsers apply. Extended thinking is explicitly disabled.
  Any unexpected thinking blocks are discarded on the server, never CV content.
- Only completed assistant `end_turn` messages with exactly one JSON text block
  are accepted. Refusal, truncation, malformed nested structures, forged source
  quotes, replaced protected lines, changed numbers and stale source contexts
  are rejected recoverably. HTTP/provider error bodies and abort details are
  never rendered or logged. Unknown transmission outcomes retain the existing
  conservative reservation hold, including envelope failures.
- Structured JSON is **not factual proof**. Existing exact JD/CV references,
  protected attribution/negation/uncertainty lines, number preservation and
  stale-result guards are retained. The prompt separates untrusted CV/JD/base
  from legitimate user style instructions and refuses unsupported factual claims
  through notes. General semantic entailment/instruction fidelity remain model
  limitations: validators cannot mathematically prove them. All names/dates/
  qualifications must still be reviewed by the user. No independent second model
  call or automatic “repair” request is made.
- The complete CV is assembled using the existing whole-line replacements;
  unchanged/name/contact lines are retained locally. This adapter does not add
  a new layout/editor or promise arbitrary section reordering, automatic saving
  or direct PDF download. Privacy filtering is conservative, not anonymization:
  JD, permitted CV/base lines, instructions and validated Scan leave the server.
  No zero-retention guarantee is asserted; Anthropic account/model retention
  policies apply. No cache-control blocks, Files API uploads or conversations
  are persisted by this adapter.
- Official docs warn the first request for a schema can incur grammar-compilation
  latency. The deadline is not extended or retried automatically for that reason;
  a cold request may time out and remain uncertain. Quality and reliability come
  before claims about speed. Real quality, latency, token/currency costs,
  account/model access and hosted/live acceptance remain **NOT RUN**.

## Offline verification

Mocked tests cover exact grounded Scan/Rewrite, untrusted-data separation,
explicit instructions, attribution/negation, unsupported-number rejection,
malformed nested output, refusal/truncation, HTTP authentication/rate errors,
bounded response bodies/timeouts/cancellation, duplicate requests and durable
reservation gates, recipient changes, and preservation of manual CV edits.
Relevant retained domain, request-identity, usage, saved-version, OpenAI transport
and Scan/Rewrite UI tests are reused/run where affected; no unrelated payment,
database or full browser suite is required for this adapter-only change.

### Executed checks and model-change reuse

- Before the owner changed the model: `pnpm exec vitest run src/lib/scan-rewrite src/components/ownpath/scan-rewrite.test.tsx src/lib/experience-translator/server/openai.test.ts`
  — **127 passed / 10 files**. This includes the unchanged client consent,
  stale-result/manual-edit, domain, saved-version, identity, usage and OpenAI
  regression checks. These unchanged results were reused after the model update.
- Final pinned-Haiku rerun: `pnpm exec vitest run src/lib/scan-rewrite/claude.test.ts src/lib/scan-rewrite/provider.test.ts src/lib/scan-rewrite/server.test.ts`
  — **59 passed / 3 files**, including both operation payloads with the exact
  pinned model, disabled thinking, no unsupported effort field, no substitution,
  completed-CV/truncation guards and existing reservation controls.
- `pnpm exec vitest run scripts/ownpath-local-preview.test.mjs`
  — **9 passed**, unchanged fixed scenarios preserve dates/attribution and reject
  different input/instructions. The existing Billing preview source-injection seam
  was also checked statically; no payment/database/browser suite was rerun.
- Targeted ESLint on the changed TypeScript application/test files passed. Final
  model-delta lint: `pnpm exec eslint src/lib/scan-rewrite/claude.ts src/lib/scan-rewrite/claude.test.ts src/lib/scan-rewrite/provider.ts src/lib/scan-rewrite/provider.test.ts src/lib/scan-rewrite/server.test.ts src/app/api/cv-review/disclosure/route.ts`.
- `pnpm typecheck` and `git diff --check` passed.
- `node <existing-next-package>/dist/bin/next build --webpack` in an isolated,
  untransformed source copy passed with **synthetic environment values only**,
  `ANTHROPIC_MODEL=claude-haiku-4-5-20251001`, live use disabled and billing OFF.
  No `.env.local` was copied/read; the selected production files match the tree.
  A synthetic server-key sentinel is absent from all browser assets.
- An owned loopback-only production server from that build returned the correct
  Anthropic disclosure and **401** for anonymous Scan; both are no-store. Next's
  stricter `private, no-store, max-age=0` header initially failed a literal-string
  smoke assertion; checking the actual directives then passed, without changing
  application code. The isolated server was stopped afterwards. No model call,
  owner-server restart, real Auth session or hosted mutation was used for this check.
- A task-baseline hash comparison preserved **370 pre-existing source/assets/
  preview/test/migration files**, including UI/branding, the original OpenAI
  adapter, quota/reservation code, schemas/parsers and export/storage code.

Evidence is local under `/tmp/opencode/claude-offline-{build-manifest,http-results}.json`;
these contain only synthetic configuration/public metadata, not the owner's key.
This is offline/self-reviewed engineering verification, not independent review or
live Claude acceptance. No agent, full-suite rerun, paid API call, commit, push,
deployment, migration or payment activation was performed.
