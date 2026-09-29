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
  return String(text ?? "")
    .split(/\n+|(?<=[.!?])\s+/u)
    .map((part) => part.trim().replace(/^[-*•\d.)\s]+/, ""))
    .filter(Boolean);
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
    const evidence = cvParts.find((part) => findMatches(part, requirement.terms)) ?? null;
    if (!evidence) {
      return { requirement: requirement.name, status: "not-stated", evidence: null };
    }
    return {
      requirement: requirement.name,
      status: ACTION_VERBS.test(evidence) ? "evidence" : "listed",
      evidence,
    };
  });

  const summary = {
    evidence: findings.filter((item) => item.status === "evidence").length,
    listed: findings.filter((item) => item.status === "listed").length,
    notStated: findings.filter((item) => item.status === "not-stated").length,
    total: findings.length,
  };

  const actions = findings
    .filter((item) => item.status !== "evidence")
    .slice(0, 3)
    .map((item) => item.status === "listed"
      ? `Nếu bạn đã áp dụng ${item.requirement}, hãy thêm một ví dụ thật về dự án, môn học hoặc công việc có liên quan.`
      : `Nếu bạn có kinh nghiệm về ${item.requirement}, hãy nêu ví dụ thật trong CV. Nếu chưa, cân nhắc một bài tập hoặc dự án nhỏ để học và tạo bằng chứng.`);

  if (actions.length === 0) {
    actions.push("Đọc lại từng trích dẫn để chắc chắn chúng mô tả đúng việc bạn đã làm; nhờ giảng viên hoặc người hướng dẫn góp ý nếu cần.");
  }

  return { roleTitle: role, findings, summary, actions };
}

export const SAMPLE_CV = `EDUCATION\nBachelor of Information Technology — Example University (fictional)\n\nPROJECTS\nCampus Events API | Coursework project\n- Built a Node.js and TypeScript REST API for event registration using PostgreSQL.\n- Wrote Jest unit tests for input validation and error handling.\n- Collaborated with three classmates using Git and reviewed pull requests.\n\nSKILLS\nJavaScript, TypeScript, Node.js, PostgreSQL, REST APIs, Git, Jest, communication.`;

export const SAMPLE_JD = `Backend Developer Intern — Example Company (fictional)\n\nWhat you will do\n- Build and maintain REST APIs with Node.js.\n- Collaborate with engineers to design reliable services.\n\nRequirements\n- Familiarity with JavaScript or TypeScript.\n- Basic SQL and relational database knowledge.\n- Experience writing unit tests.\n- Comfortable using Git and version control.\n- Clear communication skills.\n\nNice to have: Docker.`;
