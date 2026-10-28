# Owner-only synthetic Rewrite diagnostic

**Owner executed once; HTTP 400. Do not repeat the command below.** See
[existing-attempt diagnosis](CLAUDE_TERMINAL_400_DIAGNOSIS.md). The original artifact
has no provider error body. Bounded sanitized extraction is now available for a
future separately authorized attempt; it does not recover this attempt's reason.

This is the explicitly authorized, separate terminal diagnostic. It is not a web
quota exception, an account recovery action, or financial reconciliation. Existing
completed Scan/unknown Rewrite reservations, consumed allowance and all web gates
remain unchanged. No public route, account, plan, RPC or hosted mutation is added.

## Original owner-paid execution (completed; not authorization to repeat)

From `/home/enzoreacher/EXE-ownpath-demo-rc`, using the installed Node 24 runtime:

```bash
node --env-file=.env.local scripts/diagnose-claude-rewrite.mjs --execute-paid-once
```

**This command has not been executed by the coding agent.** Node loads the owner's
private environment file; the script reads only `ANTHROPIC_API_KEY`, never prints
it, and ignores environment model/provider selections. An already exported key
takes precedence under Node's normal environment rules. Ensure privately that
the key belongs to the intended Anthropic workspace. Do not paste it into chat,
put it directly in a command argument, or share the environment file.

Only the exact single execution flag is accepted. Without it the launcher does
not load the workflow, read a key or send inference. No CV/JD/instructions/model,
endpoint, timeout, token-budget or output-path CLI overrides are supported.

Run **once**, then stop. Do not automatically rerun for timeout, failed validation,
missing usage or an empty result file: provider processing/charges may already
have occurred. This test does not consume or restore an OwnPath allowance, and
does not establish the billing outcome of the previous unknown web Rewrite.

## Bounds and behavior

- Fixed `claude-haiku-4-5-20251001`, thinking disabled, maximum **8,000 output
  tokens**, stream false. Exactly one Messages request at most; no fallback,
  regeneration, tool use, batch, token-counting API call or prompt caching request.
- Adapter/workflow deadline **45 seconds**. Request body <=32,000 UTF-8 bytes;
  adapter response <=160,000 bytes, single JSON text block <=60,000 UTF-16 units;
  local result file <=262,144 bytes. Existing field/document limits also apply.
- Fixed existing Sales CV/JD and a locally validated synthetic Scan context.
  The context is labelled synthetic; **no paid Scan** is run. No real draft,
  attachments, saved CVs, cookies, user records or Supabase/service-role
  credentials are read. Only the provider API key is needed at owner execution.
- Calls the production Claude adapter and shared `performRewrite` workflow.
  The web server calls this same workflow only after its unchanged reservation
  gates. The extracted workflow has no account/reservation dependency.
- Uses the same repaired prompt/schema, exact-original/source guards, ownership,
  negation, numbers, required string-array notes and complete-document validation.
  Malformed, ungrounded, refused or truncated output rejects the whole result.

## Output and review

The launcher prints one JSON metadata report: sanitized outcome/stage,
validation path/rule/type/constraint if available, provider HTTP status/request
ID/stop reason, fixed model/token cap, number of dispatches, numeric usage when
available, and the result-file path. It never prints note text, raw model output,
request options, error stacks, credentials or environment values. Missing usage
fields mean **unknown**, not zero. Usage numbers are not invoice reconciliation.

Results go to `.local-diagnostics/claude-rewrite-<uuid>.json`, which is Git-ignored.
The tool requires a nonsymlink private directory (0700) and creates a new private
file (0600), exclusively, before dispatch. It never overwrites an old file. If the
directory is unsafe or cannot be written, it stops before a paid request.

For `accepted`, the file contains the fixed synthetic CV/JD and validated complete
result, including replacements/changes/notes. Review original facts and protected
manager attribution/negation. For `rejected`, it contains **metadata only**, never
raw rejected text or partial findings presented as complete. A filesystem/process
failure after dispatch is unconfirmed; stop and inspect the local file privately.
Do not insert this fixture into the normal app as a fabricated account result.

The terminal-only loader enables existing server-only TypeScript modules inside
this process; it changes no Next configuration or production import resolution.

## Current direct API pricing

Official [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing#model-pricing),
checked during preparation: **Haiku 4.5 standard input $1 / million tokens;
output $5 / million tokens (USD)**. No Batch discount or caching is requested.
At the 8,000-output-token cap, the output component is at most **$0.04**, plus
input tokens (including applicable provider prompt/schema overhead). This is
not a total invoice cap; taxes/account-specific terms may apply.

## Offline evidence

**211 tests / 13 files passed**:
`vitest run scripts/diagnose-claude-rewrite.test.mjs src/lib/scan-rewrite src/components/ownpath/scan-rewrite.test.tsx`.
Coverage includes explicit flag/key gates, one pinned request, synthetic context,
shared schema/prompt, private file permissions/ignored path, no secret/raw content
in terminal metadata, numeric usage filtering, wrong notes types/lengths,
grounding, refusal/truncation, HTTP errors, body cap, deadline cancellation,
unsafe output sink, complete-document/manual-edit preservation and unchanged
web reservation gates.

The loader was exercised in a subprocess **with an injected sentinel key and
in-memory request mock, with default networking disabled**. This was not the
owner paid command. Other tests invoke the same core with mocked responses; no
real key or `.env*` file was read. Relevant lint, full non-incremental typecheck,
diff check and isolated production build passed. The build has fictional loopback
Auth, empty keys and disabled inference, with no `.env*` files copied.

Artifacts: `/tmp/opencode/standalone-rewrite-{tests,lint,typecheck,build}.log` and
`standalone-rewrite-build-result.json`. Unrelated valid browser/account evidence
is reused. No paid request, owner-server restart, hosted inspection/mutation,
migration, agent, commit, push or deployment was performed.
