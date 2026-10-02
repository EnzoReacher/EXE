# Fictional EXE Demo Data

> **Demo-only material.** Every name, company, qualification, achievement, role, and statement below is fictional. Do not replace any part of this pack with a real CV, job description, account, or personal information.

## Persona and target role

- **Persona:** Aria Vale, a fictional student developer completing fictional coursework and portfolio projects.
- **Target role:** Junior Front-end Developer.
- **Fictional company:** BrightPath Studio.
- **Purpose:** Show the complete private local flow: CV upload, saved target job, evidence report, roadmap, source-grounded draft, and saved work.

## Fictional job description

**Junior Front-end Developer — BrightPath Studio**

BrightPath Studio is a fictional product team. This fictional role supports accessible web features for fictional customers.

**Requirements**

- accessible web interfaces
- Build TypeScript components
- experiment design
- user research

**Responsibilities**

- Work with the fictional product team to improve web features.
- Communicate progress and ask for feedback.

## Fictional CV content

The uploadable fixture contains this fictional CV text:

```text
Aria Vale
Fictional junior web developer candidate

Profile
Student developer completing fictional coursework and portfolio projects. All details in this document are invented for the EXE local demonstration.

Skills
TypeScript, React, HTML, CSS, SQL querying, Git

Selected project
Campus Club Planner — fictional coursework project
• Built accessible web interfaces in TypeScript and React for a fictional student-club planning tool.
• Created reusable form components with keyboard navigation and clear error messages.
• Wrote SQL queries to filter fictional event records for a project dashboard.

Education
Fictional Bachelor of Digital Product Studies, Northbridge Learning Institute
Expected 2027

Learning goal
No experiment design experience yet; this is a learning goal, not a claimed qualification.
```

## Upload fixture

- **Path:** [`fixtures/aria-vale-fictional-cv.docx`](fixtures/aria-vale-fictional-cv.docx)
- **Format:** Valid DOCX, verified with the app dependency `mammoth` on 2026-10-02.
- **Size:** 1,489 bytes, well below the 5 MiB upload limit.
- **Why this fixture exists:** No existing uploadable PDF/DOCX fixture was present in the repository. This fixture is intentionally small and contains only the fictional content in this document.

## Expected evidence-report examples

Use the job description above without changing its requirement wording. M2 is a conservative, deterministic wording matcher; these are expected demonstrations of its labels, not a judgement of Aria's actual ability.

| Requirement | Expected state | What to point out |
|---|---|---|
| `accessible web interfaces` | **Supported** | The report should quote the project sentence: “Built accessible web interfaces in TypeScript and React …” as CV example context. |
| `Build TypeScript components` | **Partly supported** | The CV contains `TypeScript` and `components`, but does not repeat the full requirement wording. The report should show the nearby CV excerpt and explain that the wording is incomplete. |
| `experiment design` | **Unclear** | The CV says “No experiment design experience yet.” The app must show the nearby text and require the user's interpretation; it must not call this proof of an absent skill. |
| `user research` | **Missing** | The CV has no direct wording for this requirement. The report should say no CV text was found, not that Aria lacks the skill. |

## Expected M3 roadmap actions

The local M3 composer creates actions for non-supported findings. For this example, expect actions linked to:

1. **Build TypeScript components** — strengthen the genuine example with context, contribution, and a result Aria can honestly support.
2. **experiment design** — review whether Aria has genuine experience; clarify it if so, or treat it as a learning goal if not.
3. **user research** — learn the basics and create one small, truthful example that can later be described in a CV.

Priority is generated from finding status and order. It is advisory only and does not verify progress or skill.

## Expected source-grounded CV draft

The draft should contain only excerpts from the supported or partly supported findings, prefixed as evidence for the matching requirement. It should include the fictional Campus Club Planner wording, such as:

> Built accessible web interfaces in TypeScript and React for a fictional student-club planning tool.

It must **not** add an employer, a date, a metric, a qualification, user-research experience, or experiment-design experience. The provenance list should show the exact quoted CV excerpt and its extracted-text positions. The presenter may edit the draft only to demonstrate that edited content remains the user's responsibility to verify.

## Safe handling reminder

Use a newly created local fictional account for each demonstration. Reset or delete the local fictional records after the demo if needed. Do not use this pack in a hosted environment until the owner has completed the required privacy, security, backup, retention, and deletion review.
