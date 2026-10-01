# CV Compass — Production Web Foundation

Next.js + TypeScript implementation of the approved reduced EXE101 MVP. The current app compares pasted CV text with one pasted job description and produces a transparent four-state evidence report plus up to three next actions.

## Requirements

- Node.js 24 recommended; Next.js requires Node.js 20.9 or newer.
- npm, using the committed `package-lock.json`.

## Run locally

```bash
npm ci
npm run dev
```

Open `http://localhost:3000` and use the fictional sample.

## Verify

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Current limits

- Browser-local pasted text only.
- No login, persistence, database, or file upload.
- No external AI provider.
- No numeric hiring score or hiring prediction.
- The target segment and job family remain provisional until CP2 research is complete.

See `../docs/ARCHITECTURE.md`, `../docs/CURRENT_STATE.md`, and `../docs/OPENCODE_SETUP.md` for the project-level context.
