# CP1 Idea Lock — Team Review Draft

**Prepared:** 2026-09-28  
**Status:** Discussion draft only. The team has not recorded approval of the target segment, value proposition, or technology stack. This file also does not establish whether a Slot 3 submission has already been accepted.

## Problem hypothesis

Students and recent graduates applying for internships or junior roles may find it hard to tell whether their CV demonstrates the requirements of a particular job, what evidence is weak or missing, and what to do next.

This is a problem to validate through the CP2 survey and interviews, not a confirmed market finding.

## Target-user hypothesis

Start research with year 3 or later students and recent graduates who have prepared or submitted an internship or junior-role application recently. They can describe an actual CV-to-job matching task. Keep the first job family open until the team reviews the research.

This is a research cohort, not a team-approved launch segment. The original brief also includes year 2 students.

## One-sentence product description

A student provides a CV and a target job description; the platform maps job requirements to CV evidence, flags unclear or missing evidence, suggests a short learning or project plan, and helps draft truthful role-specific CV edits.

## Value proposition to test

The product may help early-career applicants decide what to improve by showing the evidence behind each requirement finding and connecting gaps to practical next steps. The main claim to test is whether this transparent, evidence-linked workflow is more useful and trustworthy than existing free CV tools, general AI assistants, or university career support.

Do not claim that the project is the first CV-matching product or that market fit has been established. Current products already overlap with CV-to-job matching, gap analysis, or career support.

## Core user journey

1. Provide a CV and one target job description.
2. Review extracted information and correct mistakes.
3. See each job requirement labeled supported, partly supported, unclear, or missing, with a CV excerpt or an explicit no-evidence note.
4. Review a short, prioritized learning or project roadmap tied to the gaps.
5. Edit and accept proposed CV wording that uses only user-confirmed facts.
6. Delete the uploaded CV and its derived text when finished.

## Proposed course MVP boundary

**Core flow:** CV intake, manual job-description entry, evidence-based requirement report, prioritized next steps, and user-reviewed role-specific CV draft.

**Only after the core flow works:** a narrowly scoped expert-review form or a small set of curated job links.

**Outside the course MVP:** payments, a full reviewer marketplace, automated job scraping, social features, mobile apps, and hiring or job-outcome guarantees.

## Draft checkpoint descriptions

**Product/service:** A browser-based career-readiness tool that helps a student compare one CV with one internship or junior-role description, understand which requirements have supporting evidence, identify gaps, and improve the application using only verified information supplied by the student.

**Technology/tools:** The planning proposal is one modular web app using Next.js and TypeScript, Supabase Auth/Postgres/private Storage, and a server-side AI adapter. These choices remain proposals until the team approves them. The first prototype should use fictional or consented data, keep CVs private, and never place provider secrets in browser code.

## Team decisions to record

- Confirm the initial research cohort and later choose one first segment/job family from CP2 evidence.
- Confirm whether expert review and curated job links belong in the course demo or remain optional.
- Approve or replace the proposed technical stack before the application scaffold is created.
- Confirm that the core product must show evidence and user-visible uncertainty, and must not invent CV facts.
- Confirm the status of the earlier CP1 Slot 3 submission.

## Next actions

1. Team reviews and edits this draft; record accepted decisions and owners in DECISIONS.md.
2. Resolve the CP2 participant-count questions with the instructor.
3. Collect the approved primary research and revise the segment/value proposition from actual findings.
4. Approve the implementation stack and UX boundaries before the foundation phase.
