const SKILLS = [
  { name: "JavaScript", terms: ["javascript", "js"] },
  { name: "TypeScript", terms: ["typescript", "ts"] },
  { name: "Node.js", terms: ["node.js", "node js", "node"] },
  { name: "React", terms: ["react", "react.js"] },
  { name: "Python", terms: ["python"] },
  { name: "SQL / relational databases", terms: ["postgresql", "postgres", "mysql", "sql", "relational database", "relational databases"] },
  { name: "REST APIs", terms: ["rest api", "rest apis", "api development", "api endpoint", "api endpoints"] },
  { name: "Git / version control", terms: ["git", "version control"] },
  { name: "Unit testing", terms: ["unit test", "unit tests", "jest", "vitest", "pytest", "testing"] },
  { name: "Docker", terms: ["docker", "containerization", "containers"] },
  { name: "HTML / CSS", terms: ["html", "css"] },
  { name: "Data analysis", terms: ["data analysis", "data analytics", "analyze data", "analyse data"] },
  { name: "Communication", terms: ["communication", "communicate", "presentation skills"] },
  { name: "Team collaboration", terms: ["collaborate", "collaboration", "teamwork", "cross-functional"] },
  { name: "Problem solving", terms: ["problem solving", "problem-solving", "troubleshoot", "debugging"] },
];

const ACTION_VERBS = /\b(built|developed|implemented|designed|created|tested|analyzed|analysed|improved|maintained|deployed|collaborated|delivered|automated|wrote|led|managed|tối ưu|xây dựng|phát triển|thiết kế|kiểm thử|triển khai|phân tích|hợp tác|thực hiện)\b/i;
const LIMITED_EVIDENCE = /\b(familiar with|basic knowledge|knowledge of|learning|coursework|exposure to|đang học|kiến thức cơ bản|làm quen với)\b/i;
const SKILL_LIST_HEADING = /^skills?\s*[:\-]?$/i;

function normalize(text) {
  return String(text ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}+#]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsTerm(text, term) {
  const normalizedText = ` ${normalize(text)} `;
  const normalizedTerm = ` ${normalize(term)} `;
  return normalizedText.includes(normalizedTerm);
}

function splitEvidence(text) {
  const lines = String(text ?? "").split(/\n+/u);
  const parts = [];
  let inSkillsSection = false;

  for (const line of lines) {
    const cleanLine = line.trim().replace(/^[-*•\d.)\s]+/, "");
    if (!cleanLine) continue;
    if (SKILL_LIST_HEADING.test(cleanLine)) {
      inSkillsSection = true;
      continue;
    }
    if (/^(education|projects?|experience|employment|certifications?|học vấn|dự án|kinh nghiệm)\s*[:\-]?$/i.test(cleanLine)) {
      inSkillsSection = false;
      continue;
    }

    for (const sentence of cleanLine.split(/(?<=[.!?])\s+/u).filter(Boolean)) {
      parts.push({ text: sentence, inSkillsSection });
    }
  }

  return parts;
}

function findMatches(text, terms) {
  return terms.some((term) => containsTerm(text, term));
}

export function extractRequirements(jobDescription) {
  const text = String(jobDescription ?? "").trim();
  if (!text) return [];

  return SKILLS
    .filter((skill) => findMatches(text, skill.terms))
    .map((skill) => ({ name: skill.name, terms: skill.terms }));
}

export function analyzeCvAgainstJob({ cvText, jobDescription, roleTitle }) {
  const cv = String(cvText ?? "").trim();
  const jd = String(jobDescription ?? "").trim();
  const role = String(roleTitle ?? "").trim();
  if (cv.length < 30) throw new Error("Hãy nhập ít nhất 30 ký tự nội dung CV để bắt đầu.");
  if (jd.length < 30) throw new Error("Hãy nhập ít nhất 30 ký tự mô tả công việc.");
  if (!role) throw new Error("Hãy nhập tên vị trí mục tiêu.");

  const requirements = extractRequirements(jd);
  if (requirements.length === 0) {
    throw new Error("Prototype chưa nhận diện được kỹ năng phổ biến trong JD này. Hãy thử dán phần yêu cầu có tên kỹ năng cụ thể.");
  }

  const cvParts = splitEvidence(cv);
  const findings = requirements.map((requirement) => {
    const matchedPart = cvParts.find((part) => findMatches(part.text, requirement.terms)) ?? null;
    const evidence = matchedPart?.text ?? null;
    if (!evidence) {
      return { requirement: requirement.name, status: "missing", evidence: null };
    }
    let status = "unclear";
    if (ACTION_VERBS.test(evidence)) status = "supported";
    else if (!matchedPart.inSkillsSection && LIMITED_EVIDENCE.test(evidence)) status = "partial";

    return {
      requirement: requirement.name,
      status,
      evidence,
    };
  });

  const summary = {
    supported: findings.filter((item) => item.status === "supported").length,
    partial: findings.filter((item) => item.status === "partial").length,
    unclear: findings.filter((item) => item.status === "unclear").length,
    missing: findings.filter((item) => item.status === "missing").length,
    total: findings.length,
  };

  const actions = findings
    .filter((item) => item.status !== "supported")
    .slice(0, 3)
    .map((item) => {
      if (item.status === "partial") {
        return `Bằng chứng về ${item.requirement} còn hạn chế. Hãy bổ sung việc bạn đã làm, phạm vi và kết quả thật nếu có.`;
      }
      if (item.status === "unclear") {
        return `CV có nhắc đến ${item.requirement} nhưng chưa cho thấy cách áp dụng. Hãy thêm một ví dụ thật từ môn học, dự án hoặc công việc.`;
      }
      return `Chưa thấy ${item.requirement} trong CV. Nếu bạn có kinh nghiệm, hãy nêu ví dụ thật; nếu chưa, cân nhắc một bài tập hoặc dự án nhỏ để tạo bằng chứng.`;
    });

  if (actions.length === 0) {
    actions.push("Đọc lại từng trích dẫn để chắc chắn chúng mô tả đúng việc bạn đã làm; nhờ giảng viên hoặc người hướng dẫn góp ý nếu cần.");
  }

  return { roleTitle: role, findings, summary, actions };
}

export const SAMPLE_CV = `EDUCATION\nBachelor of Information Technology — Example University (fictional)\n\nPROJECTS\nCampus Events API | Coursework project\n- Built a Node.js and TypeScript REST API for event registration using PostgreSQL.\n- Wrote Jest unit tests for input validation and error handling.\n- Collaborated with three classmates using Git and reviewed pull requests.\n- Basic knowledge of Docker from a local deployment exercise.\n\nSKILLS\nJavaScript, TypeScript, Node.js, PostgreSQL, REST APIs, Git, Jest, communication.`;

export const SAMPLE_JD = `Backend Developer Intern — Example Company (fictional)\n\nWhat you will do\n- Build and maintain REST APIs with Node.js.\n- Collaborate with engineers to design reliable services.\n\nRequirements\n- Familiarity with JavaScript or TypeScript.\n- Basic SQL and relational database knowledge.\n- Experience writing unit tests.\n- Comfortable using Git and version control.\n- Clear communication skills.\n\nNice to have: Docker and React.`;
