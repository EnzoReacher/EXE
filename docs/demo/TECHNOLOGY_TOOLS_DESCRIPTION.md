# EXE Technology / Tools Description

## Application foundation

EXE uses **Next.js** and **TypeScript**. Next.js supplies the web screens and server-side route handlers in one application. TypeScript helps the team describe expected data shapes and catch many implementation mistakes before the app runs.

## Sign-in and private data

**Supabase Auth** provides account sign-in for the local prototype. **Supabase Storage** holds CV files in the non-public `cv-private` bucket. The application does not use a public demo bypass: a signed-in user works only with their own records.

**Postgres** stores CV metadata, extracted text, target jobs, reports, findings, roadmap items, drafts, and draft-claim provenance. Database **row-level security (RLS)** policies restrict records to the authenticated owner. Storage policies similarly restrict object paths to their owner. Local two-user acceptance checks verify own-user access and cross-user denial for the core data flow.

## Document parsing and evidence report

PDF and DOCX files are parsed on the server after size, filename-extension, signature, and DOCX structure checks. The limit is 5 MiB. `pdf-parse` reads PDFs and `mammoth` reads DOCX files.

M2 uses a **local deterministic evidence matcher**, not an external AI service. It extracts requirements from clearly labelled job-description sections and compares wording with extracted CV text. When wording is found, it stores an exact excerpt and text positions. It labels the result as supported, partly supported, unclear, or no CV text found. This is advisory; it does not verify a skill, measure proficiency, or predict hiring.

## Roadmap and CV draft

M3 uses a **local source composer**. It creates roadmap actions from non-supported report findings and makes a draft from only supported or partly supported CV excerpts. Each generated draft claim retains its exact source excerpt and positions. The user may edit the draft, but edits are explicitly their responsibility to verify.

## Quality and verification tools

- **Vitest** runs unit tests for validation, parsing, analysis, next steps, and owner-scoped data access.
- **ESLint** checks code-quality rules.
- **TypeScript** runs static type checking.
- **Next.js build** validates the production build.
- **Supabase CLI and Docker** run an isolated local Supabase stack and the fictional two-user RLS, private Storage, analysis, roadmap, draft, and deletion-cascade acceptance checks.

## Why no external AI provider is connected

No external AI provider is currently connected because privacy, retention, consent, cost, output evaluation, and provider-selection decisions remain open. This preserves a usable local prototype without sending CV or job-description text to an external AI service.

## Data-handling decision still open

Before real CVs are accepted, the owner must review the selected Supabase environment and its backup, retention, deletion, and recovery behavior. Any future external AI use also requires a documented data-handling and consent decision. These are open safeguards, not completed production controls.
