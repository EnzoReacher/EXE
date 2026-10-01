import type {
  AnalysisInput,
  AnalysisReport,
  EvidenceStatus,
  Requirement,
  RequirementFinding,
} from "./types";

const SKILLS: readonly Requirement[] = [
  { name: "JavaScript", terms: ["javascript", "js"] },
  { name: "TypeScript", terms: ["typescript", "ts"] },
  { name: "Node.js", terms: ["node.js", "node js", "node"] },
  { name: "React", terms: ["react", "react.js"] },
  { name: "Python", terms: ["python"] },
  {
    name: "SQL / relational databases",
    terms: ["postgresql", "postgres", "mysql", "sql", "relational database", "relational databases"],
  },
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

interface EvidencePart {
  text: string;
  inSkillsSection: boolean;
}

function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}+#]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsTerm(text: string, term: string): boolean {
  return ` ${normalize(text)} `.includes(` ${normalize(term)} `);
}

function containsRequirement(text: string, requirement: Requirement): boolean {
  return requirement.terms.some((term) => containsTerm(text, term));
}

function splitEvidence(text: string): EvidencePart[] {
  const parts: EvidencePart[] = [];
  let inSkillsSection = false;

  for (const line of text.split(/\n+/u)) {
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

function classifyEvidence(part: EvidencePart): EvidenceStatus {
  if (ACTION_VERBS.test(part.text)) return "supported";
  if (!part.inSkillsSection && LIMITED_EVIDENCE.test(part.text)) return "partial";
  return "unclear";
}

function statusPriority(status: EvidenceStatus): number {
  return { supported: 3, partial: 2, unclear: 1, missing: 0 }[status];
}

function findBestEvidence(parts: EvidencePart[], requirement: Requirement): RequirementFinding {
  const candidates = parts
    .filter((part) => containsRequirement(part.text, requirement))
    .map((part) => ({ part, status: classifyEvidence(part) }))
    .sort((left, right) => statusPriority(right.status) - statusPriority(left.status));

  const best = candidates[0];
  if (!best) {
    return { requirement: requirement.name, status: "missing", evidence: null };
  }

  return {
    requirement: requirement.name,
    status: best.status,
    evidence: best.part.text,
  };
}

export function extractRequirements(jobDescription: string): Requirement[] {
  const text = jobDescription.trim();
  if (!text) return [];
  return SKILLS.filter((requirement) => containsRequirement(text, requirement));
}

export function analyzeCvAgainstJob(input: AnalysisInput): AnalysisReport {
  const cv = input.cvText.trim();
  const jd = input.jobDescription.trim();
  const role = input.roleTitle.trim();

  if (cv.length < 30) throw new Error("Hãy nhập ít nhất 30 ký tự nội dung CV để bắt đầu.");
  if (jd.length < 30) throw new Error("Hãy nhập ít nhất 30 ký tự mô tả công việc.");
  if (!role) throw new Error("Hãy nhập tên vị trí mục tiêu.");

  const requirements = extractRequirements(jd);
  if (requirements.length === 0) {
    throw new Error(
      "Hệ thống chưa nhận diện được kỹ năng phổ biến trong JD này. Hãy dán phần yêu cầu có tên kỹ năng cụ thể.",
    );
  }

  const cvParts = splitEvidence(cv);
  const findings = requirements.map((requirement) => findBestEvidence(cvParts, requirement));
  const summary = {
    supported: findings.filter((finding) => finding.status === "supported").length,
    partial: findings.filter((finding) => finding.status === "partial").length,
    unclear: findings.filter((finding) => finding.status === "unclear").length,
    missing: findings.filter((finding) => finding.status === "missing").length,
    total: findings.length,
  };

  const actions = findings
    .filter((finding) => finding.status !== "supported")
    .slice(0, 3)
    .map((finding) => {
      if (finding.status === "partial") {
        return `Bằng chứng về ${finding.requirement} còn hạn chế. Hãy bổ sung việc bạn đã làm, phạm vi và kết quả thật nếu có.`;
      }
      if (finding.status === "unclear") {
        return `CV có nhắc đến ${finding.requirement} nhưng chưa cho thấy cách áp dụng. Hãy thêm một ví dụ thật từ môn học, dự án hoặc công việc.`;
      }
      return `Chưa thấy ${finding.requirement} trong CV. Nếu bạn có kinh nghiệm, hãy nêu ví dụ thật; nếu chưa, cân nhắc một bài tập hoặc dự án nhỏ để tạo bằng chứng.`;
    });

  if (actions.length === 0) {
    actions.push(
      "Đọc lại từng trích dẫn để chắc chắn chúng mô tả đúng việc bạn đã làm; nhờ giảng viên hoặc người hướng dẫn góp ý nếu cần.",
    );
  }

  return { roleTitle: role, findings, summary, actions };
}
