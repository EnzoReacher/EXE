// Heading recognition is shared by source parsing and presentation. Never rewrite
// source text/IDs: collapsing letter spacing is for recognition only.
const labels = ["summary", "professional summary", "profile", "experience", "experience/activities", "experience and activities", "activities", "professional experience", "work experience", "employment", "employment history", "education", "skills", "technical skills", "core skills", "projects", "certification", "certifications", "certificates", "qualifications", "volunteering", "volunteer experience", "publications", "awards", "research/awards", "research and awards", "languages", "interests", "references", "additional information", "professional development", "teaching experience", "research", "contact", "tóm tắt", "mục tiêu nghề nghiệp", "giới thiệu", "kinh nghiệm", "kinh nghiệm làm việc", "học vấn", "kỹ năng", "dự án", "chứng chỉ", "hoạt động", "hoạt động tình nguyện", "ngôn ngữ", "giải thưởng", "liên hệ"];
labels.push("about me", "personal profile", "extracurricular activities");
const compact = (text: string) => text.normalize("NFC").toLocaleLowerCase().replace(/[\s:：/]+/gu, "");
const headings = new Map(labels.map(label => [compact(label), label]));
export function sectionLabel(text: string): string | undefined { return headings.get(compact(text.trim())); }
export function structureWarnings(text: string): string[] {
  const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
  const warnings: string[] = [];
  if (lines[0] && (sectionLabel(lines[0]) || /@|https?:|\t/u.test(lines[0]))) warnings.push("The candidate header is unclear. Text is preserved; use Edit complete CV to place the supported name, title and contact lines above the sections.");
  if (lines.some(line => /^(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+)?(?:19|20)\d{2}\s*[-–—]/iu.test(line))) warnings.push("A date is on a separate line. Its association is uncertain; check it against the source and move it onto the correct entry using a tab or | separator. No association was guessed.");
  if (lines.some(line => /\t/u.test(line) && !/\t\s*(?:(?:\p{L}+\s+)?\d{2,4})/u.test(line))) warnings.push("Possible column text remains. Review section and entry associations against the source; no automatic reordering was applied to this existing draft.");
  return warnings;
}
