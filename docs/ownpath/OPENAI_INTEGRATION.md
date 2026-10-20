# OpenAI Translator — local-only implementation preview

> Historical pipeline notes. The CV workspace reuses the bounded provider/model
> transport but retires these Translator endpoints and the demo mode selector.
> Current configuration and consent boundaries: [CV_WORKSPACE_SETUP.md](CV_WORKSPACE_SETUP.md).

OWNPATH-OPENAI-001; baseline HEAD `7adbd6b77085318be43d55bff382d74b499e6350`
plus uncommitted candidate. **Bounded repaired-byte QA and static security review
accepted the disabled-by-default fictional numeric-loopback preview and mocked
integration. PUBLIC DEPLOYMENT NOT AUTHORIZED.** Real connectivity,
model compatibility/quality, latency and cost: **NOT RUN**. No credentials, live provider calls or installs
were needed for mocked verification. Existing deterministic StudyTrack engine
and its literal positive/negative tests are retained unchanged.

## Configuration and operating boundary

The default UI is explicitly **Demo — local templates (not AI)**. OpenAI mode
never falls back to demo. Disabled/missing server configuration returns exactly
`OpenAI is not configured.` without a provider request. Before the first extraction,
an unchecked checkbox discloses the transfer of project/JD/submitted answers to
OpenAI. Use fictional data only; real-data privacy approval is not established.

Server-only variables (placeholders in `.env.example`, never commit actual keys):

| Variable | Required value |
|---|---|
| `OWNPATH_OPENAI_LOCAL_ENABLED` | `true` only for separately authorized local use; default `false` |
| `OWNPATH_OPENAI_LOCAL_ORIGIN` | Exact numeric-loopback HTTP origin including owned port, e.g. `http://127.0.0.1:4351` |
| `OPENAI_API_KEY` | Owner-provisioned server secret, never `NEXT_PUBLIC_` |
| `OPENAI_MODEL` | Owner-selected Responses strict-JSON-schema-compatible model; no guessed default |

Do not enable the backend merely to run tests. A future live call incurs charges
and needs separate explicit authorization. For a separately authorized local run,
bind explicitly: `pnpm start --hostname 127.0.0.1 --port 4351` after a fresh build
(or `pnpm dev --hostname 127.0.0.1 --port 4351`). Use only an available owned port.
Do not expose it through tunnels, reverse proxies, containers publishing broadly,
or `0.0.0.0`. Exact request URL/Host/Origin and browser fetch-site checks restrict
browser cross-origin requests; **Host/Origin are not authentication** and cannot
prove the TCP peer or process binding. An external client can forge headers.
Loopback binding, local OS access and the operator's network boundary are mandatory;
the code cannot enforce or attest the listener binding. No public access-control
or authenticated production deployment is claimed. Other local processes/users
can still access the endpoint. Existing app authentication is not repurposed as
Translator API authorization. A public deployment requires a separately scoped
auth, CSRF, distributed quotas and privacy/security review, not just a config flag.

## Data flow and grounding

Only `POST /api/experience-translator/prepare` and `POST
/api/experience-translator/generate` are added. Native server `fetch` calls the
fixed `https://api.openai.com/v1/responses`; no SDK/dependencies, tools, user model,
base URL, URL fetching or public mock switch. Trusted developer instructions and
JSON-serialized untrusted sources are separate messages. Responses use strict
`text.format` JSON schema with required properties and `additionalProperties:false`;
`store:false`, `background:false`, `stream:false` and bounded output tokens.
Only completed envelopes containing a single assistant output-text JSON document
are accepted; refusal, incomplete/error/tool/malformed/oversized output fails closed.
Reasoning envelope items are not treated as output text. No raw provider errors,
headers, sources, tokens or credentials are logged or returned as diagnostics.

Prepare extracts natural atomic self/completed positive claims, JD requirements
and at most four relevant optional clarification questions, without the demo's
closed vocabulary. IDs are constructed by the server. Exact immutable project or
issued-question answer quotes (never JD) must match uniquely; the app computes
UTF-16 offsets, retaining emoji, Vietnamese and CRLF bytes. Repeated quotes fail
closed rather than guessing an occurrence. Labels and quotes are both displayed
for explicit source confirmation. Skips add no sources; unknown questions fail.
Answers create one new immutable revision; changing submitted answers requires a
new preparation. Server state, not client-supplied facts, is authoritative.

The browser validates complete bounded success contracts before installing state:
exact nested fields,43-character base64url tokens, revisions, unique IDs and
references, immutable project/answer agreement, current JD quotes and exact
UTF-16 offsets. Generation links must reference the current selected facts and
issued requirements. Duplicate JSON object keys are rejected before parsing can
discard them. Malformed success responses produce a recoverable inline error,
not unchecked React state or a demo fallback.

**Schema/offset checks are not semantic truth.** The app applies conservative
whole-clause vetoes for common other-actor, negative, exclusion, planned, uncertain,
instruction and unsupported numeric cases. A second independent structured
provider pass audits every proposed label against complete immutable raw sources
and context, including corrections. Every check must explicitly accept entailment,
self attribution, completed positive polarity, no invented details, explicit
relationships, no instruction following and selected-only evidence. The same
independent check audits generated bullets and their atomic claim-to-selected-fact
maps. Every claim must have issued selected fact IDs; concatenated claim text must
equal the whole bullet. Requirements only guide relevance. Separate action and
tool declarations cannot imply tool-per-action usage. Unknown/deselected/foreign
IDs, mismatched revisions, unsupported numbers and duplicate text fail closed.

The generator aims for 2–3 distinct concise useful English bullets, fewer including
zero if evidence is insufficient; it may paraphrase useful contributions outside
frontend regex vocabulary. Every generated bullet links source facts and relevant
JD requirements. Original provenance is distinguished from user-added edits.
Edits revoke acceptance. Source/answer/selection/consent/mode changes cancel or
invalidate pending work and revoke acceptance; stale completions cannot restore
it. Detached retained wording cannot be accepted in the live journey. Only
explicitly accepted text is included in review, copy and UTF-8 TXT export.

Independent model verification remains probabilistic, not a proof or independent
verification of user statements. Both passes can share mistakes or obey an attack;
the conservative vetoes are incomplete and can also reject valid statements.
Real multilingual model quality and adversarial robustness remain unmeasured.
Explicit user review and independent security/QA gates remain necessary.

## Limits, lifecycle and failures

- Project 30–6,000 / JD 30–15,000 / each of at most four answers 0–1,000 JS characters.
- Request body 100,000 bytes with a 5s read deadline; provider envelope 100,000 bytes;
  at most 24 facts, 12 requirements, four questions, three bullets, 500 characters
  per bullet. A workflow shares a 45s provider deadline and request abort signal.
- Native fetch is the sole retry owner: at most two attempts per structured call;
  connection errors or transient 429/5xx only, bounded numeric Retry-After <=2s.
  No retries for quota exhaustion, auth/config, schema/refusal/grounding or abort.
  A retry can duplicate billable processing; no exactly-once provider-cost claim.
- At most two concurrent operations, 12 distinct operations/minute per process,
  six operations per session, 64 stored sessions, 24 dedup entries per scope.
  A preparation or generation may use two structured calls, each with one retry.
- Random 256-bit bearer capabilities, 15-minute non-sliding expiry; no database,
  cookies/localStorage or durable persistence of Translator content. Possession
  of a token grants access; it is not account authentication. Keep tokens private.
- Request-ID duplicates coalesce in flight and cache results in memory; different
  payloads with the same ID conflict. IDs are scoped to the capability (initial
  preparation dedup is process-scoped and minute-bounded). Expired/replaced
  revisions are rejected. Refresh/lost capabilities may leave unreachable server
  state until TTL; expiry cleanup is lazy on subsequent requests, not a deletion
  timer or physical memory-erasure promise. Restart loses all sessions and quotas.
- Explicit forget uses prepare's `forget` operation and deletes local capability
  state. It does not delete OpenAI data. Failures preserve browser inputs/edits,
  explain recovery without raw provider messages, and never substitute demo output.
- This single-process store/rate limit is not distributed production control.

## Privacy and official API sources

Official research was supplied by the lead/researcher as verified 2026-10-18; no
fresh web lookup or real service verification is claimed by this builder.
`store:false` is **not zero data retention**. API inputs/outputs are not used for
training by default unless opted in, but abuse monitoring logs may be retained
up to 30 days, with exceptions, account controls and caching considerations.
Local forgetting/expiry does not promise provider deletion or backup erasure.

- [Structured outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [Responses create reference](https://developers.openai.com/api/reference/resources/responses/methods/create)
- [Your data](https://developers.openai.com/api/docs/guides/your-data)
- [Agent builder safety](https://developers.openai.com/api/docs/guides/agent-builder-safety)
- [Safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices)
- [Official SDK README](https://raw.githubusercontent.com/openai/openai-node/master/README.md)
  (comparison only; this implementation uses native REST, not SDK `output_text`).

## Evidence boundary

Unit tests inject provider dependencies and mocked native fetch. The dedicated
compiled browser suite intercepts ONLY the two intended same-origin POST routes,
rejecting other transfer. That suite is **client evidence, not backend/live AI
acceptance**. The existing demo browser suite retains its abort-all-non-GET gate.
The retirement guard allows exactly the two new compiled route keys and retains
all 119 HTTP checks across 17 retired patterns; unknown handlers still fail.

### Accepted bounded engineering evidence — 2026-10-19

[Independent repaired-byte QA report](../../.factory/evidence/OWNPATH-OPENAI-001/qa/repair/QA_REPORT.md)
accepts the scoped repair and closes the prior P2 malformed-success crashes. The
lead separately reports repaired-byte static Security acceptance and both reviewers
stopped. This is not a runtime-security guarantee or public authorization.

- Builder executed **743/743 tests,59/59 files,no skips,exit0** with
  `env TMPDIR=/tmp COREPACK_ENABLE_NETWORK=0 pnpm test`; final lint/typecheck/build
  also exit0. QA reviewed those full raw logs and exits; **QA did not rerun the
  full743 suite, lint or typecheck**. Exact Builder commands and preservation:
  `.factory/evidence/OWNPATH-OPENAI-001/builder/repair/RESULTS.md`.
- QA personally reran **151/151 focused tests,8files,no skips,exit0**, built the
  139-input isolated snapshot, and passed **10/10 compiled mocked-client tests**
  plus the final unchanged **11/11 retained demo tests**. Independent build ID
  `UD6CqM8iSrDsskAnnt4xS`;10 fetched JS assets hash-match that build. The real
  compiled backend's unconfigured prepare/generate routes both returned
  503/not_configured/exact `OpenAI is not configured.`/no-store. All119 retired
  HTTP checks across17patterns passed. No key/model/live opt-in was configured.
- QA additionally ran **15 malformed compiled response cases**, each followed by
  a corrected response that succeeded on the same form. Both the exact original
  null-fact body and an otherwise valid43-character-token/null-fact envelope are
  rejected. The missing-requirementIds generation body is tested after a valid
  preparation. Project/JD values and consent remain; generation selection remains,
  an inline alert and retry are available, and no wording, fallback or page error
  boundary replaces the form. Extra pending-JD and mode-roundtrip checks also pass:
  stale generation cannot restore authority, and returning to OpenAI requires
  fresh unchecked consent and extraction.
- **Retained anomaly:** QA's first repaired-byte demo invocation was10pass/1fail
  at the unchanged768px keyboard Space/check assertion. A later unchanged complete
  run passed11/11 with no skips/retries; only the reporter changed. The first
  failed invocation and logs remain retained, **root cause unknown**. A final
  runner result of flaky0 does not erase that observation. If recurrent, isolate
  the focus/Space timing; no universal no-flake claim is made.

The strengthened negative cases are recovery/protocol evidence, not a demonstrated
backend grounding bypass or real-model semantic accuracy. QA inspected three
synthetic recovery captures, not the complete normal journey's visual polish or
AT/device behavior. Semantic verification remains probabilistic. Real model
compatibility/connectivity/quality/latency/cost, real-data/privacy approval,
auth/DB integration, CI, owner/manual, AT/device, research/course/M18 and public
release remain separate **NOT RUN/not established** gates. No new tests/builds
are implied by the subsequent doc-only closure;22 non-document task hashes are
kept identical to the independently reviewed candidate.
