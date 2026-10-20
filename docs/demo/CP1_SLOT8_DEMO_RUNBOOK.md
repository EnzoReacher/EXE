# CP1 Slot 8 Demo Runbook

**Format:** local-only fictional-data demonstration  
**Target length:** 3–5 minutes  
**Starting point:** Local app, local Docker Supabase stack, and a fresh fictional account prepared with [`DEMO_ENVIRONMENT_CHECKLIST.md`](DEMO_ENVIRONMENT_CHECKLIST.md).

## A. Purpose and audience

### The problem

Students and recent graduates can struggle to tell whether a CV actually shows evidence for a specific role, which wording needs clarification, and what practical next step to take. Generic rewrites can hide that uncertainty.

### User segment hypothesis

EXE currently explores students and recent graduates applying for internships or junior roles. This is a **hypothesis**, not a validated market fact. CP2 research must select the first segment and job family.

### Core promise

From a CV and one job description, EXE provides checkable evidence, clear document gaps, practical next actions, and a truthful role-specific CV draft.

### Differentiator demonstrated today

The app puts checkable CV evidence beside each requirement, marks uncertainty plainly, connects gaps to practical actions, and limits the draft to source-grounded CV wording. It does not present a hiring score or make a hiring prediction.

## B. Timed presentation flow

Keep the fictional DOCX and job-description text ready before screen sharing. Do not show the terminal, browser history, environment values, local Studio, or account password.

| Time | Screen / route | Presenter action | What the presenter says | Audience should notice |
|---:|---|---|---|---|
| 0:00–0:20 | `/` | Open the EXE overview. | “EXE helps someone compare the wording in one CV with one target job, then decide what to clarify or build next.” | The flow is CV → evidence → action → truthful draft. |
| 0:20–0:40 | `/` then `/assessment` | Point to the fictional preview and select **Start an assessment**. | “Everything in today’s demonstration is fictional. The production path is not live, and this demo uses a local private workspace.” | The fictional label and privacy-focused framing are visible. |
| 0:40–1:00 | `/assessment` | Sign in with the prepared local fictional account, or show its signed-in state. | “This is a temporary local account created only for the demo. A real CV is not being used.” | The workspace is authenticated and private rather than publicly bypassed. |
| 1:00–1:30 | `/assessment` | Upload `aria-vale-fictional-cv.docx`; paste **Junior Front-end Developer**, **BrightPath Studio**, and the job description from `FICTIONAL_DEMO_DATA.md`; select **Save CV and target job**. | “The app accepts a PDF or DOCX up to 5 MiB and extracts the text on the server. No external AI provider receives the CV or job text.” | The file reaches **Ready for a report**, and the target job is saved. |
| 1:30–1:45 | `/assessment` | Select the processed CV and saved job, then choose **Create evidence report**. | “M2 uses a local deterministic wording matcher. It is not an AI hiring assessment.” | The report creation action says there is no hiring score. |
| 1:45–2:30 | `/analysis/[id]` | Open the completed report and scroll through the four example requirements. | “Here, accessible web interfaces is supported. Build TypeScript components needs review because related terms appear in separate sentences and the quoted excerpt does not establish the full requirement. Experiment design also needs review because the CV says it has no experience yet. User research has no CV text found.” | This fixture shows supported, unclear and missing findings. The app also supports partly supported; this fixture does not demonstrate that state. |
| 2:30–2:45 | `/analysis/[id]` | Expand or point to an evidence block and its quoted text. | “Every positive wording finding points to an exact excerpt and extracted-text position. The excerpt is self-reported CV text, not independent verification.” | Evidence is checkable, and the app preserves uncertainty. |
| 2:45–2:55 | `/analysis/[id]` | Point to the method and caveat text. | “EXE does not predict hiring outcomes, independently verify skills, or guarantee a job. A missing document mention is not proof that someone lacks a skill.” | The safety boundary is part of the product, not a hidden disclaimer. |
| 2:55–3:25 | `/analysis/[id]/next-steps` | Select **Open next steps**, then **Create my roadmap and draft** if needed. | “The roadmap turns non-supported findings into practical actions. For example, the user-research item becomes a learning goal; it is not a claim that Aria cannot do user research.” | Each action is connected to a report finding and has a visible status. |
| 3:25–3:50 | `/analysis/[id]/next-steps` | Show the editable CV draft and **Source evidence used** list. | “The draft repeats only supported or partly supported CV excerpts. The provenance panel shows where each line came from. Any edit remains the user’s responsibility to verify.” | No invented experience, qualifications, dates, employers, or metrics are generated. |
| 3:50–4:05 | `/saved-work` | Open Saved work. | “Saved work is a private return-to-work index. It shows report state and summary counts without sending source CV or job text in the list.” | The report and next-steps entry are easy to reopen, with readable status text. |
| 4:05–4:30 | `/saved-work` or `/` | End on a calm static page. | “The current limits are important: this is a local prototype, an owner privacy and retention review is still required before real CVs, and CP2 research is still needed to validate the segment, value, pricing, and competitor positioning.” | The team is presenting a bounded MVP honestly, not claiming a finished market-ready service. |

## C. Presenter wording

Use these short, natural lines as needed:

- “We are showing only fictional material in a local environment.”
- “The report checks wording in the uploaded CV; it does not assess a person’s real capability.”
- “When the app says no CV text was found, that is a document gap—not proof that the person lacks the skill.”
- “The quotation lets the user check why a finding was shown.”
- “The roadmap is advisory and connected to a specific finding.”
- “The draft is deliberately conservative: it starts from source excerpts, and the user checks any edits.”
- “We have not connected an external AI provider, so CV and job-description text do not leave this local app for AI processing.”
- “We are not claiming job outcomes, market validation, competitor superiority, or a price advantage. CP2 research is the next step for those questions.”

Do **not** say that EXE guarantees jobs, proves skills, is cheaper than all competitors, knows what the market wants, or uses objective AI candidate evaluation.

## F. Demo failure plan

### If local Supabase is unavailable

1. Do not improvise with a hosted account or real material.
2. State: “The live local private-data flow is unavailable today, so we are switching to a prepared fictional walkthrough. This does not demonstrate a successful live upload or storage session.”
3. Use a pre-captured local screenshot or static fictional walkthrough only if it was created from this demo pack and contains no account details, tokens, browser history, environment values, or personal information.
4. Walk through the expected screens using the fictional CV/JD and the expected evidence table in [`FICTIONAL_DEMO_DATA.md`](FICTIONAL_DEMO_DATA.md).
5. Clearly identify which statements describe implemented behavior verified by the automated local acceptance check and which parts are static illustration.

### Presentation hygiene

- Use a fresh browser profile or private window with only the local app tab open.
- Close terminals, source-control panels, email, password managers, local Studio, and other tabs before screen sharing.
- Hide browser bookmarks and history; do not enter passwords while projected.
- Do not show `.env` files, `supabase status` output, auth tokens, API keys, service-role keys, raw database rows, or Storage object contents.
- Keep the fixture path and fictional job text in an offline note or this repository file, not in a personal cloud document.

## Final presenter check

Before presenting, complete [`CP1_SLOT8_OWNER_REVIEW_CHECKLIST.md`](CP1_SLOT8_OWNER_REVIEW_CHECKLIST.md) and run the quality commands in [`DEMO_ENVIRONMENT_CHECKLIST.md`](DEMO_ENVIRONMENT_CHECKLIST.md).
