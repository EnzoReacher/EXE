# EXE Product / Service Description

## Problem

Students and recent graduates may find it difficult to tell whether their CV gives clear, checkable evidence for a specific role. They can receive generic advice or rewrites without knowing which claims the CV currently supports, where the wording is unclear, or what to work on next.

## Target-user hypothesis

The current hypothesis is students and recent graduates applying for internships or junior roles. It is not a validated segment, and the team has not chosen a first job family. CP2 research must test and refine this assumption.

## Service

EXE is a private career-readiness web-app prototype. A signed-in user uploads a CV and saves one target job description. The app then:

1. identifies job requirements using local deterministic rules;
2. compares their wording with extracted CV text;
3. labels each finding as supported, partly supported, unclear, or no CV text found;
4. displays the relevant CV excerpt when wording exists;
5. builds a gap-linked roadmap; and
6. creates an editable CV draft using only traceable supported or partly supported source excerpts.

## User value

The intended value is clearer, more accountable preparation for one application. Users can check what the app found, understand that an unclear or absent document mention is not a judgement of their ability, choose a practical action, and review a conservative draft before using it.

## MVP boundaries

The current MVP covers the private CV → job description → evidence report → roadmap → source-grounded draft path, plus a private saved-work index. It uses server-side PDF/DOCX parsing, local Supabase, and a deterministic matcher/composer.

## Intentionally excluded

- hiring scores, hiring predictions, job guarantees, and independent skill verification;
- automatic job applications, job scraping, public sharing, expert marketplace workflows, and social features;
- payments, pricing plans, and “lower-price” positioning;
- real-user or public deployment;
- any external AI provider or transfer of CV/JD text to one; and
- unsupported rewrites that invent qualifications, achievements, employers, dates, or metrics.

## Current product limits

The requirement extractor and wording matcher are prototypes; they can miss meaning, combine details, or identify related wording without proving full capability. CV claims are self-reported and require user review. The app has passed local fictional-data ownership and storage acceptance checks, but an owner privacy/security review plus Supabase backup, retention, and deletion review remain required before any real CV is accepted.

## CP2 validation work

CP2 research must validate the initial segment, the severity of the problem, reactions to evidence-first reports and grounded drafting, use intent, alternatives and competitors, and willingness to pay. Any eventual value, pricing, or competitor-positioning claim must distinguish research evidence from an assumption. Until then, the target segment and pricing are open questions.
