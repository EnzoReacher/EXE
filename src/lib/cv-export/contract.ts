export function exportBlockReason(version: { state: string; acceptedAt: string | null }): string | null {
  if (version.state === "evidence_withdrawn") return "Export is unavailable because supporting evidence was withdrawn.";
  if (version.state === "candidate") return "Accept this candidate before downloading or printing it.";
  if (version.state === "rejected") return "Rejected versions cannot be exported.";
  if (!["accepted", "superseded"].includes(version.state) || !version.acceptedAt) return "Only previously accepted CV versions can be exported.";
  return null;
}

export function downloadFilename(name: string, number: number, extension: "docx" | "txt") {
  const stem = name.replace(/\.[^.]*$/, "").normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "accepted-cv";
  return `${stem}-version-${Number.isSafeInteger(number) && number > 0 ? number : 1}.${extension}`;
}
