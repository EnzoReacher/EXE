# EXE Web App Build Tracker

This tracks engineering work separately from course grading checkpoints. Mark a part complete only after its acceptance criteria and checks have been reviewed. Do not publish or deploy without the project owner's approval.

| Part | Status | Scope | Exit criteria |
|---|---|---|---|
| M0 — Local app shell | Complete, awaiting owner review | Next.js + TypeScript shell, responsive overview, fictional report example, CV/JD intake UI, browser-only validation | App builds; lint and type checks pass; no file or job data leaves the browser; no deployment |
| M1 — Secure intake and identity | Pending decisions | Minimal identity, private CV storage, PDF/DOCX parsing, target role/JD persistence, replace/delete controls | Ownership enforced on reads/writes/deletes; parse failures recover; CV and derived text can be deleted |
| M2 — Evidence-based analysis | Pending | Requirement extraction, supported/partial/unclear/missing findings, CV evidence excerpts, caveats | Each supported finding points to source evidence; no unsupported skill claims; provider output validated |
| M3 — Roadmap and grounded CV draft | Pending | Prioritized next steps and editable job-specific CV draft with source provenance | Actions connect to gaps; draft claims trace to user facts; user reviews changes before use |
| M4 — Saved work and integration polish | Pending | Minimal saved history, empty/loading/error states, security and responsive review | Full core flow works with fictional data; privacy, ownership, and failure handling pass checks |
| M5 — CP1 Slot 8 demo readiness | Pending | Demo script, sample CV/JD, known limits, product/service and technology description | 3–5 minute demo of the core flow; all limitations and sample data are clear |
| M6 — Optional thin features | Deferred | Expert review link and curated job links, only after the core loop is stable | Owner/team accepts the scope; links are private, revocable, and narrowly scoped where applicable |

## M0 review notes

- Working branch: `codex/exe-web-app-m0` (local only).
- Review routes: `/` and `/assessment`.
- Commands: `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.
- The form only validates fields in the browser. It does not upload, save, parse, or analyze selected content.
- M0 is an engineering foundation, not a completed course checkpoint or production-ready service.

## Build boundaries

- Use fictional or explicitly consented test content only.
- Never invent user skills, experience, survey results, quotes, market facts, or hiring outcomes.
- Keep CVs private, make sharing user-controlled, and include deletion of both source and derived data before accepting real CVs.
- Keep the app local until the project owner explicitly approves publication or deployment.
