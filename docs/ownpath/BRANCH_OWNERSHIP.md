# Branch ownership and archive — 16 October 2026

The lead merges reviewed deliveries into `main`. Each team member works on **one dedicated branch**, named `team/<github-handle>` once their identity and ownership are confirmed. Do not create an FE1/FE2 branch on someone's behalf or infer acceptance from an absent branch. Owners commit small, reviewable slices to their own branch and open PRs toward `main`; only the branch owner resolves conflicts on their branch. Sync from the lead's updated `main` after preceding merges, without force-pushing another person's work. Preserve the frozen OwnPath DTOs, FE1/FE2 file reservations, local profiles, and existing worktrees.

## Existing delivery chain

The existing draft PRs are a **legacy dependency chain**, not a template for new per-task branches. Do not rebase/rewrite their tested SHAs or retarget all PRs to `main` at once: that would overlap the changes under review. Lead-controlled merge order:

1. Review the current original checkout baseline `codex/exe-m17-survey-readiness` (`ae2527633733fc5081a96ecb2c16e09081a8c878`) against `main`, then decide its integration into `main`. Its source is not currently on `main`.
2. After that baseline is integrated, retarget draft [PR #1](https://github.com/EnzoReacher/EXE/pull/1) (`feat/ownpath-experience-translator`, base presently `codex/exe-m17-survey-readiness`) to `main`, review its new diff/checks, and let the lead merge it.
3. Retarget draft [PR #2](https://github.com/EnzoReacher/EXE/pull/2) (`feat/ownpath-backend`, base presently `feat/ownpath-experience-translator`) **after #1**; review its new diff/checks before the lead merges.
4. Retarget draft [PR #3](https://github.com/EnzoReacher/EXE/pull/3) (`feat/ownpath-accounts-billing`, base presently `feat/ownpath-backend`) **after #2**; review its new diff/checks before the lead merges. W7 still lacks an independent read-only code review; exact-head CI alone does not supply it.

These four current delivery branches remain unchanged and checked-out worktrees stay intact. The eight backend-local profiles and the original checkout are preserved. Proposed FE1 auth/account and FE2 billing/history branches remain **uncreated here**; actual human branch names and full-SHA deliveries must be received before composition. Neither a new team-branch convention nor this archive is frontend acknowledgment, a merge, or a deployment.

## Remote archive operation

After explicit lead authorization, 25 historical **remote branch refs** whose exact tips were ancestors of `codex/exe-m17-survey-readiness` were replaced with one-for-one lightweight archive tags on GitHub. Tag names are `archive/2026-10-16/<old-branch>`. Each tag points to the exact full SHA below; tags were pushed and checked against the branches **before** branch deletion. One atomic push deleted the branches with an exact expected-SHA lease for each. A fresh fetch and remote listing confirmed **10 remaining branches**: `main`, the original checkout branch, three open-PR heads, and five branches with unique commits. No local branch, worktree, PR head/base, `main`, or unique-commit remote branch was deleted. Archive tags are preservation refs, never a request to merge all historical commits again.

| Archived remote branch (append to `archive/2026-10-16/` for tag) | Preserved tip SHA |
|---|---|
| `codex/exe-m15-auth-handoff-fix` | `e4d3e4e066d11bdfe872d1176983a702b7791aaa` |
| `codex/exe-m16-pilot-readiness` | `ca4046010d23f1a4da0d21567e8e07e66eec9c7d` |
| `codex/exe-m17-cp2-evidence-review` | `3131c51de370c9c5c906d1ab9ffcb7b004fe6c96` |
| `codex/exe-m18-decision-gate` | `ec563c8666cc5ddae14949586b542334a096750e` |
| `codex/exe-web-app-m0` | `5852f100b9d214ba36c367a173ed968c716eba5a` |
| `codex/exe-web-app-m1` | `7909dc82e881ff75b921e37c54aae107dfc78b9d` |
| `codex/exe-web-app-m10-2-hardening` | `bd347432cd49aa6e47342261f39082c00fea2cdf` |
| `codex/exe-web-app-m10-3-research-ops` | `9d9e3c2b49e5421dc625952f5fbbe3570188d285` |
| `codex/exe-web-app-m10-4-evidence-review` | `9d9e3c2b49e5421dc625952f5fbbe3570188d285` |
| `codex/exe-web-app-m10-5-qa-preflight` | `aaee9f93d366f61ab2f284cdab363fa6cb582300` |
| `codex/exe-web-app-m10-6-review-verify` | `5dd5fbebf688aeafe20ecc91cb55838bdc5d851e` |
| `codex/exe-web-app-m11a-credentialed-cv-versions` | `bc24377d57d503a21059ee0a467ede23252f289a` |
| `codex/exe-web-app-m11b-cv-export` | `64b0dc9e0c138ae31ed0eda102a783f0db9137b5` |
| `codex/exe-web-app-m11b1-browser-acceptance` | `e15d9584fa67230024ed21cc6258f29a1353726b` |
| `codex/exe-web-app-m11c-proof-review` | `65583406b3bc177cc4ed215df1df98900d83fa87` |
| `codex/exe-web-app-m12-landing-auth` | `b832d1ad7d112209d257ff3f39f8e4f0d4740f1a` |
| `codex/exe-web-app-m13-auth-browser-acceptance` | `b8e5cbb6c00222215d5382f17274480698b0f018` |
| `codex/exe-web-app-m14-visual-foundation` | `a0429ccc8261cf2ae61936602daebe46520dbb5d` |
| `codex/exe-web-app-m15-complete-workspace` | `4f8bb429919a60eb6b50bd913ddc8ae4550a15ba` |
| `codex/exe-web-app-m2` | `45188c5bb2854aee07165cd4284dda9cd87f9401` |
| `codex/exe-web-app-m6` | `4ccb54db548b83fe1d54d4eeaaeb0b4f5b59982a` |
| `codex/exe-web-app-m6b` | `45273017073130c75770a10041f1b33d0f6671af` |
| `codex/exe-web-app-m7` | `13eab1bfcce15042866e29aebbb9dc2bff4ccca6` |
| `codex/exe-web-app-m8` | `8755795bb3e86d13a342f191aa8dbaffa0f59cdd` |
| `codex/exe-web-app-m9` | `b374f0cc6f8a36a776d683855e4cf82d4c017445` |

Five historical remote branches **remain** because their tips have commits not reachable from the active OwnPath delivery head. Keep them until their actual owners and the lead decide whether to integrate or separately archive them: `codex/cv-readiness-prototype` (`a3ac24d68bf64ef9f50d73253aa5cfe72b6792f1`), `codex/exe-web-app-m10` (`c19215aaae1020b0282081bd885e3c0e4fd8368d`), `codex/initial-phases-kickoff` (`623866a17e741753fa9bcc831b28c1f09296dfba`), `codex/production-web-foundation` (`b4824c2733ba43644b03487a2d842f7ac673bd59`), and `codex/web-foundation` (`2d8d0786e531b5eaf2af68851dc943b441109528`). Do not infer they are abandoned just because no PR is open.

The local `codex/exe-web-app-m12-landing-auth` branch has an additional unpublished commit beyond its archived remote tip; it was **not** deleted, rewritten, or merged. Other local branches were left untouched as well. If an archived remote branch is needed again, the lead can explicitly restore it from `refs/tags/archive/2026-10-16/<old-branch>` after checking ownership; do not force-push or silently reuse its old name. The operation inventory with exact refs is `/tmp/opencode/ownpath-branch-inventory.json` (coordinator-local); this document contains the recoverable GitHub tag/SHA mapping.
