# OpenCode Setup and Stage Workflow

Use these steps from the repository root on Linux, macOS, or WSL. Node.js 24 is the project baseline for development and CI.

## First run

```bash
cd ~/EXE
git status --short --branch
git fetch origin codex/production-web-foundation
git switch --track origin/codex/production-web-foundation
cd web
npm ci
npm run dev
```

Open `http://localhost:3000`, select **Điền dữ liệu mẫu**, then select **Đối chiếu CV với JD**.

If the branch already exists locally, use:

```bash
git switch codex/production-web-foundation
git pull
```

If `git status` shows local changes before switching, preserve them first with `git stash push -u -m "local work before production foundation"`.

## Verification

```bash
cd ~/EXE/web
npm run lint
npm run typecheck
npm test
npm run build
```

All four commands must pass before a stage is marked complete.

## Start OpenCode

```bash
cd ~/EXE
opencode .
```

Give OpenCode only one approved stage at a time. Ask it to read `AGENTS.md`, `docs/PROJECT_SCOPE_AND_PLAN.md`, `docs/DECISIONS.md`, `docs/CURRENT_STATE.md`, and `docs/ARCHITECTURE.md` before editing.

Use this execution contract:

```text
Work only on the PM-approved EXE stage. Inspect the branch and dirty files first. Preserve the reduced MVP and evidence guardrails. Do not add authentication, persistence, CV upload, external AI, Supabase, or later-phase features unless the decision log explicitly approves them. Add meaningful tests, run lint, typecheck, tests, and production build, then report files changed, checks, risks, and the next approval gate. Do not merge to main.
```

## Repository roles

- `web/`: production Next.js and TypeScript application.
- `prototype/`: static fallback only.
- `docs/CHECKPOINT_TRACKER.md`: course and MVP completion evidence.
- `docs/DECISIONS.md`: only approved decisions; proposed items stay labeled as proposals.
- `docs/CURRENT_STATE.md`: exact resume point for the next work session.
