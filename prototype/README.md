# EXE101 CV Readiness Prototype

This is the first narrow, browser-only prototype for the EXE101 project. It demonstrates the central course-project idea: helping students and recent graduates compare what a CV says with one target job description, identify evidence shown in the CV, and decide what to clarify next.

## Run locally

No dependencies or API keys are needed. From the repository root:

```bash
python -m http.server 4173 --directory prototype
```

Open `http://localhost:4173` in a browser. Use the local server because the app loads JavaScript as browser modules.

## Checks

Requires Node.js 20 or newer for the built-in test runner; no package install is needed.

```bash
cd prototype
npm run check
npm test
```

## What this prototype does

- Accepts pasted CV text, a role title, and a pasted job description.
- Detects a small set of common skills/requirements and shows exact CV text that mentions each one.
- Uses the four planned evidence states: supported, partial, unclear, and missing from the CV.
- Suggests honest next steps without treating absent CV text as proof that the user lacks a skill.
- Includes fictional sample CV/JD content for a quick demo.
- Processes text in the browser only. It does not upload, save, or send CV text to an AI provider.

## Important boundary

This is a functional UX and analysis-baseline prototype, not the final AI product. Matching is keyword-based and limited to the skill terms in `src/analyzer.js`. It can miss synonyms, context, Vietnamese phrasing, and requirements outside that list. It does not score employability or predict hiring outcomes. The framework, hosting, AI provider, user segment, and target job family remain team decisions to validate after course research.
