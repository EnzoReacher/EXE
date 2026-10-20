# Fictional OwnPath demo — 3–5 minutes

> Historical Translator rehearsal, superseded by the CV workspace.
> For the current compiled journey and fictional fixtures use
> [CV_WORKSPACE_SETUP.md](CV_WORKSPACE_SETUP.md) and `e2e/ownpath.spec.ts`.

Pitch: **OwnPath helps IT students turn a real project into truthful English CV bullets for a Frontend Intern role by clarifying their own contribution and showing each suggestion's source facts.**

Say clearly: this is a deterministic fictional-data prototype, not an approved external AI provider, independent fact verification or validated market claim.

1. Open OwnPath home and choose Translate a project. Load fictional example: `Em làm website bán hàng bằng React trong nhóm 4 người.` JD asks React, JavaScript, REST API, Git, responsive UI.
2. Explain why team project description is insufficient. Answer contribution: `Mình phụ trách product listing và tìm kiếm. Mình gọi REST API và xử lý lỗi.` Technology: `React và JavaScript`. Outcome/reference may be skipped; a repo link would stay unverified.
3. Review source facts and select only the fictional personal statements. Generate. Expected current output:
   - `Implemented product listing and search using React and JavaScript.`
   - `Used a REST API in the project and implemented error handling.`
4. Open sources/JD relevance. Point out Git/responsive are not found in selected facts; no 40-percent improvement, team leadership or fabricated company employment appears.
5. Edit bullet 1, confirm it, then regenerate. Show edit retained and approval reset. Explain edits are user wording rather than automatically source-verified.
6. Approve only bullet 1 and open Review. Copy/download includes only accepted wording. Rejecting or editing requires renewed approval. Forget session clears the input and output.

Fallback: if clipboard is denied, select the review textarea manually. If unsupported natural wording produces fewer/no bullets, disclose the template vocabulary limit and clarify the fictional sentence; do not claim a model analyzed it. No production/provider/database save demo.

After demo, use the neutral questions in RESEARCH_PLAN; record actual observations separately from interpretation. Do not call this demo a completed CP1/CP2 or mentor approval.

## DEMO-RC-001 rehearsal sequence (3–5 minutes)

Use the existing golden example above for the ambiguous-team clarification path. Additional synthetic inputs live in `src/lib/experience-translator/fixtures.ts` as `demoScenarios`; they are not participant evidence.

- **0:00–1:30 — task-management happy path:** paste `demoScenarios.taskManager` project and JD. This Vietnamese personal-contribution statement describes listing/search using React and JavaScript in a task-management app. Review any remaining questions (skip unknown outcome/reference), confirm the recognized facts, and generate English wording. Do not claim task-specific vocabulary or metrics beyond the local templates.
- **1:30–2:30 — control and provenance:** open the source details, edit and accept a bullet. Clarify facts → Back to intake → Continue → Return to existing bullets keeps unchanged work and acceptance. Regenerate keeps edits but requires acceptance again. Changing valid sources retains wording without current source links and clears approval; confirm sources and accept wording deliberately. Only Forget this session discards the complete memory.
- **2:30–3:30 — missing evidence:** clear, paste `demoScenarios.reactOnly`, review/confirm facts, generate. React wording must not acquire REST API or testing. Testing is outside the recognized vocabulary: its absence is not a complete skill assessment. JD text guides relevance, never experience evidence.
  Show the limited-result explanation: the aim is 2–3 distinct honest bullets, not fabricated padding. One current grounded suggestion is a valid limited result; Add contribution details returns to clarification. Previously retained detached wording is not counted as fresh grounded coverage. In the golden example, unchecking REST during clarification must immediately list REST as missing when returning to existing bullets.
- **3:30–4:30 — recovery:** clear, paste `demoScenarios.unsupported`. Its Frontend Intern title passes role validation, but Angular/Figma requirements are outside this demo's vocabulary. Confirm recognized project facts and generate: show “No supported JD requirements recognized”, not an all-requirements match. Use Edit JD or Clarify contribution without losing input. An unrelated non-frontend title instead fails intake validation without replacing a previous session.
- **4:30–5:00 — copy and boundaries:** accept only accurate wording; copy/TXT includes only accepted bullets. On clipboard denial, manually select the read-only accepted text. Clear at the end.

Privacy wording is scoped: Translator project/JD/answers/drafts remain in tab memory with no AI or database submission. Normal app GET requests and configured existing-session verification/refresh through unchanged middleware may still occur, including cookie updates. Do not promise zero network/cookie activity. Use fictional data only.

Current independent QA: production build PASS, compiled browser **10/10**, retired API smoke **119 checks / 17 patterns**, **21 screenshots** inspected in the documented QA set. Detailed report: `.factory/evidence/DEMO-RC-001/qa-final/QA_REPORT.md`. Full retained tests **504 passed / 1 environmental failure / 505**, so this is a local functional demo candidate, not an unconditional all-gates RC. The private CLI fixture conflicts with root-contained TMPDIR and its intentional Git-root guard; no guard/test workaround was applied. Final CSS recovery-action spacing polish awaits QA rebuild/limited visual smoke. Manual owner/device/AT acceptance remains NOT RUN. See [DEMO_RC_EVIDENCE](DEMO_RC_EVIDENCE.md) for exact commands, run instructions and limits.
