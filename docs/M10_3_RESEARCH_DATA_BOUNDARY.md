# M10.3 Research Data Boundary

## Local storage

`research/private/` and `docs/evidence/private/` are root-anchored ignored directories. Create them locally as needed; Git does not track empty directories. Ignore rules are accidental-add protection, not encryption, access control, deletion or protection against `git add -f`. Store recruitment contacts separately from research notes, preferably outside the checkout in owner-controlled storage. Decide retention, permissions, backup and deletion before collecting identities. Do not place private files in `public/`, shared logs or application fixtures.

Private-only: names, contact/address details, recruitment lists, recordings, raw transcripts, full CVs, live applications, private employer details, credentials, and survey-platform exports with identifiers. These must not be committed, even if consented. Local tools accept anonymized aggregate copies, not raw platform exports.

Commit-safe after manual review: anonymized interview/expert summaries, aggregate counts, dated public-source URLs and facts, limitations, stable evidence IDs and actual owner/team review records. Synthetic tests are separately marked and never count as evidence. Public-company/source attribution is permitted only for sourced desk research; personal/confidential identifiers are not.

## Preparing a safe draft

1. Keep the raw export in private-only storage; do not overwrite it automatically.
2. Manually create a separate anonymous aggregate or summary copy. Remove contact/identity columns, timestamps that identify people, free-text quotes with identifying detail, distinctive combinations, employer/application identifiers and credentials. Do not replace real quotes with fabricated quotes.
3. For surveys, aggregate to broad categories and suppress or combine small identifying groups manually, documenting the limitation. Keep total/count denominators truthful. Do not commit respondent-level records.
4. For interviews/experts, use a stable anonymous ID, real collection date, broad category, consent status, safe paraphrase, limitations/bias and actual review status; never mark reviewed without review.
5. For public sources, retain exact URL, actual access/source dates, context, source-supported fact and what it does not establish. No automated fetching or inference.
6. Run the relevant local validator. Sensitive detection fails safely and names a category/row, never a cell value. The owner must remove material manually from the separate draft and rerun. Scripts never silently remove/rewrite personal data.
7. Inspect the full draft and staged diff manually, then copy only reviewed safe material into `docs/evidence/` and the evidence register. A pattern scan is not proof of anonymity; it cannot recognize every name or confidential phrase.

## Suspected accidental commit

Stop sharing/pushing the affected material. Notify the owner privately with the affected path/commit and type of exposure, without reposting the sensitive value. If a credential was exposed, rotate/revoke it through its owner. Arrange owner-approved removal and any necessary history/remote cleanup; deleting a working file does not remove Git history. Do not silently rewrite raw data or force-push history. Record only a non-identifying incident summary if needed.

## Output handling

Survey summaries default to stdout: review your terminal/history/sharing practices. Use explicit `--output` into an ignored draft directory for a local Markdown draft; output refuses to overwrite an existing file. Generated text still needs manual anonymity, denominator and evidence review before committing. No tool pass clears CP2, claim, real-data, M11, merge or deployment gates.
