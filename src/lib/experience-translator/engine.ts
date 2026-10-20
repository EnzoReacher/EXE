import { extractRequirements } from "@/lib/job-description/requirements";
import type { Answers, Bullet, Fact, FactCode, Intake, PreparedSession, Question, Requirement, Source } from "./types";

export class TranslatorError extends Error {
  constructor(message = "The generated result could not be checked. Your inputs are kept; try again.") { super(message); this.name = "TranslatorError"; }
}

const definitions: { code: FactCode; label: string; pattern: RegExp; action?: boolean }[] = [
  { code: "react", label: "React", pattern: /\breact(?:\.js|js)?\b/i },
  { code: "javascript", label: "JavaScript", pattern: /\bjavascript\b|(?<![.\w])js\b/i },
  { code: "typescript", label: "TypeScript", pattern: /\btypescript\b|(?<![.\w])ts\b/i },
  { code: "html_css", label: "HTML and CSS", pattern: /\bhtml\b[^.!?\n]{0,30}\bcss\b|\bcss\b[^.!?\n]{0,30}\bhtml\b/i },
  { code: "rest_api", label: "REST API", pattern: /\brest(?:ful)?\s*api\b/i },
  { code: "git", label: "Git", pattern: /\bgit\b/i },
  { code: "listing", label: "Implemented product listing", pattern: /\bproduct\s+list(?:ing|s)?\b|danh sách sản phẩm|liệt kê sản phẩm|hiển thị sản phẩm/i, action: true },
  { code: "search", label: "Implemented search", pattern: /\bsearch\b|tìm kiếm/i, action: true },
  { code: "error_handling", label: "Implemented error handling", pattern: /\berror\s+handling\b|handl(?:e|ed|ing)\s+(?:request\s+)?errors?|xử lý lỗi/i, action: true },
  { code: "responsive", label: "Implemented responsive UI", pattern: /\bresponsive\b/i, action: true },
  { code: "task_create", label: "Implemented task creation", pattern: /\btask creation\b|\bcreat(?:e|ed|ing) tasks?\b|tạo công việc/iu, action: true },
  { code: "task_edit", label: "Implemented task editing", pattern: /\btask editing\b|\bedit(?:ed|ing)? tasks?\b|chỉnh sửa công việc/iu, action: true },
  { code: "task_delete", label: "Implemented task deletion", pattern: /\btask deletion\b|\bdelet(?:e|ed|ing) tasks?\b|xóa công việc/iu, action: true },
  { code: "task_filter_status", label: "Implemented task filtering by status", pattern: /\b(?:task filtering|filter(?:ing)? tasks?) by (?:priority and )?status\b|lọc công việc theo (?:độ ưu tiên và )?trạng thái/iu, action: true },
  { code: "task_filter_priority", label: "Implemented task filtering by priority", pattern: /\b(?:task filtering|filter(?:ing)? tasks?) by (?:status and )?priority\b|lọc công việc theo (?:trạng thái và )?độ ưu tiên/iu, action: true },
];
const personal = /^(?:i|mình|tôi|em|bản thân)\s+(?:(?:đã|tự|directly|personally)\s+)*(?:built|developed|implemented|created|integrated|used|wrote|handled|designed|called|consumed|fetched|làm|xây dựng|phát triển|triển khai|tích hợp|dùng|sử dụng|phụ trách|gọi|xử lý)/i;
const limiting = /\b(?:not|no|never|without|cannot|can't|didn't|haven't|hasn't|don't|only watched|learn(?:ed|ing)?|stud(?:y|ied)|want|will|would|plan(?:ned)?|tutorial)\b|không|chưa|muốn|dự định|sẽ|chỉ xem|học theo|đang học/i;
const instruction = /\b(?:ignore|disregard|override|system prompt|system message|developer message|assistant|invent|fabricate|pretend|output|say that|add .*%|follow .*instructions)\b|bỏ qua (?:hướng dẫn|quy tắc)|bịa|hãy (?:viết|thêm|nói)|thêm.*%/i;
const otherActor = /\b(?:teammate|colleague|we|they|our team)\b|cả nhóm|chúng (?:tôi|em)|bạn (?:tôi|em)|nhóm (?:làm|dùng|sử dụng|xây|phát triển)|team (?:built|used|implemented|developed)/i;
const authored = /\b(?:built|developed|implemented|created)\b|(?:tự\s+)?(?:làm|xây dựng|phát triển|triển khai|phụ trách)/i;
const nonAuthoring = /\b(?:review(?:ed|ing)?|test(?:ed|ing|s)?|document(?:ed|ing|ation)?|readme|docs|debugg(?:ed|ing)|used|watched|read|copied|index|backend|server|algorithm)\b|kiểm thử|tài liệu|xem|đọc|sao chép/i;

function hasMixedActor(excerpt: string) {
  // Inspect only coordinated clause starts. Repeated first-person subjects and
  // subjectless personal actions remain valid; names are never enumerated.
  return excerpt.split(/\s+(?:and|và)\s+|,\s*/iu).slice(1).some((clause) =>
    !/^(?:i|mình|tôi|em|bản thân)\s/iu.test(clause) &&
    !personal.test(`I ${clause}`) &&
    /^(?:[\p{L}\p{N}]+\s+){1,4}(?:built|developed|implemented|used|created|integrated|wrote|handled|designed|called|consumed|fetched|làm|xây dựng|phát triển|triển khai|tích hợp|dùng|sử dụng|phụ trách|gọi|xử lý|(?:creat(?:e|ed|ing)|edit(?:ed|ing)?|delet(?:e|ed|ing)|filter(?:ed|ing)?)(?=\s+tasks?\b)|(?:tạo|chỉnh sửa|xóa|lọc)(?=\s+công việc))(?=\s|$)/iu.test(clause));
}

function hasAmbiguousTaskCoordination(excerpt: string) {
  // Task clauses inherit personal authorship only through a closed prefix:
  // a bare task phrase/predicate, optionally a first-person subject and known
  // personal modifiers/authoring verb. Reject arbitrary text before a task
  // mention rather than enumerating other actors' possible predicates.
  const personalPrefix = new RegExp(`^(?:(?:i|mình|tôi|em|bản thân)(?:\\s+|$))?(?:(?:đã|tự|directly|personally)(?:\\s+|$))*(?:(?:${authored.source}|completed|finished|handled))?$`, "iu");
  return excerpt.split(/,\s*(?:(?:and|và)\s+)?|\s+(?:and|và)\s+/iu).slice(1).some((clause) => {
    const starts = definitions.filter((d) => d.code.startsWith("task_")).flatMap((d) => {
      const match = clause.match(d.pattern);
      return match ? [match.index!] : [];
    });
    return starts.length > 0 && !personalPrefix.test(clause.slice(0, Math.min(...starts)).trim());
  });
}

function hasAlternativeTechnologies(excerpt: string) {
  // Reuse the supported tool vocabulary and inspect only the connector between
  // adjacent tool mentions, not "or" inside words or unrelated prose/the JD.
  const mentions = definitions.filter((definition) => !definition.action).flatMap((definition) =>
    [...excerpt.matchAll(new RegExp(definition.pattern.source, "gi"))]);
  mentions.sort((a, b) => a.index - b.index);
  return mentions.some((mention, index) => {
    const next = mentions[index + 1];
    return next && /^\s*,?\s*(?:or|versus|vs|hoặc|hay)(?:\s+là)?\s*$/iu.test(excerpt.slice(mention.index + mention[0].length, next.index));
  });
}

function hasAlternativeActions(excerpt: string) {
  // Only direct alternatives between supported action mentions are ambiguous.
  // Leave conjunctions and unrelated alternative purposes alone.
  const mentions = definitions.filter((definition) => definition.action).flatMap((definition) =>
    [...excerpt.matchAll(new RegExp(definition.pattern.source, "gi"))]);
  mentions.sort((a, b) => a.index - b.index);
  return mentions.some((mention, index) => {
    const next = mentions[index + 1];
    const connector = next && excerpt.slice(mention.index + mention[0].length, next.index);
    // Allow the ordinary "responsive UI" noun form and a repeated supported
    // authoring predicate, but no arbitrary prose between the action mentions.
    const alternative = new RegExp(`^\\s*(?:ui\\s*)?,?\\s*(?:or|versus|vs|hoặc|hay)(?:\\s+là)?\\s*(?:(?:${authored.source})\\s*)?$`, "iu");
    return connector !== undefined && alternative.test(connector);
  });
}

function text(value: unknown, min: number, max: number, label: string) {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) throw new TranslatorError(`${label}: enter ${min}–${max} characters. Describe specific work you actually did.`);
  return value.trim();
}
export function validateIntake(input: unknown): Intake {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TranslatorError("Add one project and one Frontend Intern job description.");
  const raw = input as Record<string, unknown>;
  const intake = { project: text(raw.project, 30, 6000, "Project"), jd: text(raw.jd, 30, 15000, "Job description") };
  const roleText = intake.jd.split(/\n/).filter((line) => !instruction.test(line)).join("\n");
  if (!/front[ -]?end/i.test(roleText) || !/\bintern(?:ship)?\b|thực tập/i.test(roleText)) throw new TranslatorError("This prototype supports Frontend Developer Intern. Paste the role title and its requirements.");
  return intake;
}

export function extractFrontendRequirements(jd: string): Requirement[] {
  // Filter negated lines before requirement splitting loses their negative scope.
  const safeLines = jd.split(/\n/).filter((line) => !instruction.test(line) && !limiting.test(line.replace(/[’‘]/g, "'")));
  const safeText = safeLines.join("\n");
  // Existing extraction is reused; a narrow fallback supports the golden short JD.
  const candidates = extractRequirements(safeText);
  const requirementText = candidates.length ? candidates : safeLines.filter((line) => /requirements?|required|needs?|cần|yêu cầu/i.test(line));
  return definitions.filter((d) => !d.action || d.code === "responsive").flatMap((d) => {
    const excerpt = requirementText.find((line) => !limiting.test(line) && d.pattern.test(line)) ?? (d.code === "html_css" && d.pattern.test(requirementText.join(", ")) ? safeLines.find((line) => d.pattern.test(line)) : undefined);
    return excerpt ? [{ id: `jd-${d.code}`, code: d.code, label: d.label.replace("Implemented ", ""), excerpt }] : [];
  });
}

export function extractPersonalFacts(sources: Source[]): Fact[] {
  const facts: Fact[] = [];
  for (const source of sources) {
    if (source.id === "answer-reference") continue;
    // Questions/corrections are not affirmative facts. Ask for a clean statement.
    if (/\?|\b(?:actually|correction|that was)\b|thực ra|đính chính/i.test(source.text)) continue;
    for (const match of source.text.matchAll(/[^.!?;\n]+(?:\.(?!\s|$)[^.!?;\n]+)*/g)) {
      const excerpt = match[0].trim();
      const start = (match.index ?? 0) + match[0].indexOf(excerpt);
      const normalized = excerpt.replace(/[’‘]/g, "'");
      // "by status/priority" is a filter parameter, not a change of author.
      // Keep all other "by" clauses subject to the existing attribution guard.
      const attributionText = normalized.replace(/\b(task filtering|filter(?:ing)? tasks?) by (?=(?:status|priority)\b)/gi, "$1 ");
      if (!excerpt || limiting.test(normalized) || instruction.test(normalized) || otherActor.test(normalized) || /\b(?:while|whereas|but|by|instead of|rather than|as opposed to)\b|trong khi|nhưng/i.test(attributionText)) continue;
      // Task alternatives (including filter parameters) are not affirmative
      // conjunctions. Deliberately conservative within a task-action sentence;
      // do not broaden this to generic sorting/filtering in old listing prose.
      if (definitions.some((d) => d.code.startsWith("task_") && d.pattern.test(normalized)) && /\b(?:or|versus|vs)\b|(?:^|\s)(?:hoặc|hay)(?:\s|$)/iu.test(normalized)) continue;
      // Do not borrow an earlier authoring verb across exclusions or temporal
      // clauses in task prose. Ask for separate affirmative sentences instead;
      // this bounded guard intentionally rejects even personal temporal clauses.
      if (definitions.some((d) => d.code.startsWith("task_") && d.pattern.test(normalized)) && /\b(?:exclud(?:e|ed|ing)|except|apart from|other than|after|before|when|once|until|since)\b|ngoại trừ|sau khi|trước khi|khi mà/iu.test(normalized)) continue;
      // Reject ambiguous subject changes for supported personal-action verbs, not names.
      if (hasMixedActor(normalized) || hasAmbiguousTaskCoordination(normalized) || hasAlternativeTechnologies(normalized) || hasAlternativeActions(normalized)) continue;
      if (!source.personalContext && /\bteam\b|nhóm/i.test(excerpt) && !/\bi (?:built|developed|implemented|created)\b|(?:mình|tôi|em) (?:tự|phụ trách)/i.test(excerpt)) continue;
      const bare = normalized.replace(/\b(?:and|using|with)\b|và|bằng|[,/]/gi, " ").trim();
      const recognizedList = /^(?:(?:product listing|danh sách sản phẩm|tìm kiếm|search|responsive(?: ui)?|react(?:\.js|js)?|javascript|js|typescript|html|css|rest api|git)\s*)+$/i.test(bare);
      const attributed = personal.test(normalized) || (source.personalContext && recognizedList);
      if (!attributed) continue;
      for (const d of definitions) {
        if (!d.pattern.test(excerpt)) continue;
        if (d.action && source.id === "answer-technology") continue;
        if (d.action && nonAuthoring.test(excerpt)) continue;
        // A tool mention alone does not establish an implemented action.
        if (d.action && d.code !== "error_handling" && (nonAuthoring.test(excerpt) || (!authored.test(excerpt) && !(source.id === "answer-contribution" && recognizedList)))) continue;
        if (d.action && d.code === "error_handling" && !/^(?:i|mình|tôi|em)\s+(?:(?:đã|tự|personally)\s+)*(?:implemented|built|handled|added|xử lý|triển khai)|\band (?:implemented|built|handled|added)\b|và xử lý lỗi/i.test(excerpt)) continue;
        facts.push({ id: `${source.id}-${start}-${d.code}`, code: d.code, label: d.label, sourceId: source.id, excerpt, start, end: start + excerpt.length, confirmed: false, evidenceKind: "user_statement" });
      }
    }
  }
  return facts;
}

function planQuestions(facts: Fact[], sources: Source[]): Question[] {
  const codes = new Set(facts.map((f) => f.code));
  const questions: Question[] = [];
  if (!facts.some((f) => definitions.some((d) => d.code === f.code && d.action))) questions.push({ id: "contribution", text: "What did you personally implement?", hint: "For example: I built product listing and search. Separate your work from the team's. Vietnamese is welcome." });
  if (!["react", "javascript", "typescript", "html_css"].some((c) => codes.has(c as FactCode))) questions.push({ id: "technology", text: "Which technologies did you directly use?", hint: "List only tools you actually used for your contribution. Do not copy skills from the JD." });
  const project = sources[0].text;
  const outcomeKnown = /\b(?:completed|working|delivered|demo|tested|deployed|result)\b|hoàn thành|chạy được|sản phẩm|đã kiểm thử/i.test(project);
  const referenceKnown = /https:\/\/|\brepo(?:sitory)?\b|minh họa/i.test(project);
  if (!questions.length && outcomeKnown) return [];
  if (!outcomeKnown) questions.push({ id: "outcome", text: "What worked or was completed?", hint: "Describe the actual feature or demo. Numbers are optional; skip if you do not know." });
  if (!referenceKnown) questions.push({ id: "reference", text: "Is there a repo or demo you can refer to?", hint: "Optional. A link remains an unverified reference and is not opened by this prototype." });
  return questions.slice(0, 4);
}

export function prepareSession(input: unknown, answers: Answers = {}): PreparedSession {
  const intake = validateIntake(input);
  if (Object.keys(answers).some((key) => !["contribution", "technology", "outcome", "reference"].includes(key))) throw new TranslatorError("Choose one of the planned interview questions.");
  const sources: Source[] = [{ id: "project", text: intake.project, label: "Project description", personalContext: false }];
  for (const [id, value] of Object.entries(answers)) {
    if (value == null || value === "") continue;
    const answer = text(value, 1, 1000, "Answer");
    // A link is a reference, never proof or a new skill. Outcomes need personal wording.
    sources.push({ id: `answer-${id}`, text: answer, label: `Interview: ${id}`, personalContext: id === "contribution" || id === "technology" });
  }
  const facts = extractPersonalFacts(sources);
  const requirements = extractFrontendRequirements(intake.jd);
  return { intake, sources, facts, requirements, questions: planQuestions(extractPersonalFacts(sources.slice(0, 1)), sources.slice(0, 1)) };
}

export function confirmFacts(session: PreparedSession, ids: string[]): PreparedSession {
  if (new Set(ids).size !== ids.length || ids.some((id) => !session.facts.some((f) => f.id === id))) throw new TranslatorError("Select available source facts.");
  return { ...session, facts: session.facts.map((f) => ({ ...f, confirmed: ids.includes(f.id) })) };
}

/** Trusted composer: only controlled action templates; no JD-derived achievements. */
export function composeBullets(session: PreparedSession): Bullet[] {
  const facts = session.facts.filter((f) => f.confirmed);
  const fact = (code: FactCode) => facts.find((f) => f.code === code);
  const candidates: Bullet[] = [];
  const add = (id: string, wording: string, selected: Fact[]) => {
    const requirementIds = session.requirements.filter((r) => selected.some((f) => f.code === r.code)).map((r) => r.id);
    // Don't force unrelated experience into Frontend JD bullet claims.
    if (requirementIds.length) candidates.push({ id, text: wording, factIds: selected.map((f) => f.id), requirementIds });
  };
  const action = fact("listing") ?? fact("search");
  const uiFacts = action ? facts.filter((f) => ["listing", "search"].includes(f.code) && f.sourceId === action.sourceId && f.excerpt === action.excerpt) : [];
  const relatedTech = (actionFact: Fact | undefined) => actionFact ? facts.filter((f) => ["react", "javascript", "typescript", "html_css"].includes(f.code) && ((f.sourceId === actionFact.sourceId && f.excerpt === actionFact.excerpt) || (actionFact.sourceId === "answer-contribution" && f.sourceId === "answer-technology"))) : [];
  const unique = (fs: Fact[]) => fs.filter((f, i) => fs.findIndex((candidate) => candidate.code === f.code) === i);
  const techFacts = unique(relatedTech(action));
  if (uiFacts.length && techFacts.length) {
    const features = uiFacts.map((f) => f.code === "listing" ? "product listing" : "search").join(" and ");
    add("ui", `Implemented ${features} using ${techFacts.map((f) => f.label).join(" and ")}.`, [...uiFacts, ...techFacts]);
  }
  const taskAction = facts.find((f) => f.code.startsWith("task_"));
  const taskFacts = taskAction ? facts.filter((f) => f.code.startsWith("task_") && f.sourceId === taskAction.sourceId && f.excerpt === taskAction.excerpt) : [];
  const attachedTaskTech = unique(relatedTech(taskAction));
  // Task-only fallback: a closed personal tool list in the immediately next
  // raw sentence of the project. Never join retained facts across dropped prose,
  // paragraphs, sources or feature/project qualifiers. Unsupported list tools
  // may delimit the sentence but are not emitted or promoted to facts.
  const toolName = "(?:React(?:\\.js|js)?|TypeScript|JavaScript|HTML|CSS|Vite|localStorage|Git|REST API)";
  const closedToolList = new RegExp(`^I used ${toolName}(?:(?:,\\s*(?:and\\s+)?|\\s+and\\s+)${toolName})*$`, "i");
  const project = session.sources.find((source) => source.id === "project");
  const adjacentTaskTech = !attachedTaskTech.length && taskAction?.sourceId === "project" && project ? facts.filter((f) =>
    ["react", "javascript", "typescript", "html_css"].includes(f.code) && f.sourceId === "project" &&
    /^\.[ \t]*(?:\r?\n[ \t]*)?$/.test(project.text.slice(taskAction.end, f.start)) &&
    closedToolList.test(f.excerpt) &&
    (f.end === project.text.length || /^\.(?:\s|$)/.test(project.text.slice(f.end)))
  ) : [];
  const taskTech = attachedTaskTech.length ? attachedTaskTech : unique(adjacentTaskTech);
  if (taskFacts.length && taskTech.length) {
    const actions = taskFacts.map((f) => f.label.replace("Implemented ", ""));
    const features = actions.length === 1 ? actions[0] : `${actions.slice(0, -1).join(", ")} and ${actions.at(-1)}`;
    const tools = taskTech.map((f) => f.label).join(" and ");
    add("tasks", attachedTaskTech.length ? `Implemented ${features} using ${tools}.` : `Implemented ${features}. Used ${tools}.`, [...taskFacts, ...taskTech]);
  }
  // API use has to describe an actual integration, not just a named tool.
  const api = facts.find((f) => f.code === "rest_api" && !/\b(?:tests?|documentation|docs|readme)\b|tài liệu/i.test(f.excerpt) && /^(?:i|mình|tôi|em)\s+(?:(?:đã|tự|personally)\s+)*(?:integrated|fetched|called|consumed|tích hợp|gọi|lấy dữ liệu)|\band (?:integrated|fetched|called|consumed)\b|và (?:gọi|tích hợp)/i.test(f.excerpt));
  if (api) {
    const error = fact("error_handling");
    // No inferred target: form errors must not become unsuccessful API requests.
    add("api", error ? "Used a REST API in the project and implemented error handling." : "Used a REST API in the project.", error ? [api, error] : [api]);
  }
  const responsive = fact("responsive");
  const responsiveTech = unique(relatedTech(responsive));
  if (responsive && responsiveTech.length) add("responsive", `Implemented responsive interfaces using ${responsiveTech.map((f) => f.label).join(" and ")}.`, [responsive, ...responsiveTech]);
  return candidates.slice(0, 3);
}

export function validateBulletOutput(output: unknown, session: PreparedSession): Bullet[] {
  let parsed = output;
  if (typeof parsed === "string") { try { parsed = JSON.parse(parsed); } catch { throw new TranslatorError(); } }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new TranslatorError();
  const bullets = (parsed as Record<string, unknown>).bullets;
  const expected = composeBullets(session);
  if (!Array.isArray(bullets) || bullets.length !== expected.length) throw new TranslatorError();
  // Indexed access visits sparse slots too; Array.map would skip their validation.
  for (let index = 0; index < bullets.length; index++) {
    const bullet = bullets[index];
    if (!bullet || typeof bullet !== "object" || Array.isArray(bullet)) throw new TranslatorError();
    const b = bullet as Record<string, unknown>; const e = expected[index];
    if (Object.keys(b).sort().join() !== "factIds,id,requirementIds,text" || b.id !== e.id || b.text !== e.text || JSON.stringify(b.factIds) !== JSON.stringify(e.factIds) || JSON.stringify(b.requirementIds) !== JSON.stringify(e.requirementIds)) throw new TranslatorError();
    // Exact offsets, original source and confirmation are required in addition to IDs.
    for (const id of e.factIds) {
      const f = session.facts.find((candidate) => candidate.id === id);
      const source = f && session.sources.find((s) => s.id === f.sourceId);
      if (!f?.confirmed || !source || f.evidenceKind !== "user_statement" || source.text.slice(f.start, f.end) !== f.excerpt || !extractPersonalFacts([source]).some((candidate) => candidate.id === f.id && candidate.code === f.code && candidate.label === f.label && candidate.start === f.start && candidate.end === f.end)) throw new TranslatorError();
    }
  }
  return expected;
}
