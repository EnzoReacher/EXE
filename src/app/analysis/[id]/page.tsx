import Link from "next/link";
import { notFound } from "next/navigation";
import { getOwnedAnalysisDetails } from "@/lib/analysis/repository";
import { IntakeError } from "@/lib/intake/types";
import { AnalysisStatus, RetryAnalysis } from "./analysis-status";
import type { FindingStatus } from "@/lib/analysis/types";

export const metadata = {
  title: "Evidence report | EXE",
  description: "Review CV evidence against one saved target job.",
};

const labels: Record<FindingStatus, string> = {
  supported: "Text found",
  partly_supported: "Some wording found",
  unclear: "Needs your review",
  missing: "No CV text found",
};

const descriptions: Record<FindingStatus, string> = {
  supported: "A close wording match was found in your CV. This is a self-reported claim, not independent verification.",
  partly_supported: "The CV includes some related wording, but it may not show the full requirement.",
  unclear: "The wording may be incomplete or ambiguous. Review the excerpt and decide what it means.",
  missing: "No direct wording was found in the extracted CV text. That does not mean you lack this skill or experience.",
};

function countStatus(findings: Awaited<ReturnType<typeof getOwnedAnalysisDetails>>["findings"], status: FindingStatus) {
  return findings.filter((finding) => finding.status === status).length;
}

export default async function AnalysisReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let details;
  try { details = await getOwnedAnalysisDetails(id); }
  catch (error) { if (error instanceof IntakeError && error.status === 404) notFound(); throw error; }

  const { run, findings } = details;
  const counts: Array<{ status: FindingStatus; count: number }> = [
    { status: "supported", count: countStatus(findings, "supported") },
    { status: "partly_supported", count: countStatus(findings, "partly_supported") },
    { status: "unclear", count: countStatus(findings, "unclear") },
    { status: "missing", count: countStatus(findings, "missing") },
  ];

  return <main className="analysis-page">
    <header className="analysis-topbar"><Link className="brand" href="/" aria-label="EXE career readiness home"><span className="brand-mark" aria-hidden="true">E</span><span className="brand-copy"><strong>EXE</strong><span>Career readiness</span></span></Link><Link href="/assessment" className="back-link"><span aria-hidden="true">←</span>Back to your workspace</Link></header>
    <div className="analysis-wrap">
      <p className="eyebrow">MILESTONE 2 · EVIDENCE REPORT</p>
      <h1>{details.roleTitle}</h1>
      <p className="analysis-subtitle">{details.companyName ? `${details.companyName} · ` : ""}{details.cvFilename}</p>

      {run.status === "processing" && <AnalysisStatus id={id} />}
      {run.status === "failed" && <section className="analysis-failure" role="alert"><div><strong>We could not complete this report.</strong><p>Your CV and job are still saved privately. You can retry the local text check.</p></div><RetryAnalysis id={id} /></section>}

      {run.status === "completed" && <>
        <section className="analysis-method" aria-label="How to read this report"><strong>How to read this report</strong><p>This M2 prototype checks wording from your job description against extracted CV text. The requirement list is heuristic and may miss or combine details, so review it against the job description. It does not call an AI provider, verify skills, or predict hiring outcomes.</p></section>
        {findings.length > 0 ? <>
          <section className="analysis-counts" aria-label="Finding counts">{counts.map(({ status, count }) => <div className={`analysis-count ${status}`} key={status}><span>{count}</span><small>{labels[status]}</small></div>)}</section>
          <div className="analysis-findings"><h2>Requirements and CV evidence</h2>{findings.map((finding) => <article className="analysis-finding" key={finding.id}>
            <div className="analysis-finding-heading"><span className={`finding-status ${finding.status === "partly_supported" ? "partial" : finding.status}`}>{labels[finding.status]}</span><span className="analysis-requirement-number">Requirement {finding.ordinal + 1}</span></div>
            <h3>{finding.requirement}</h3>
            <p className="analysis-rationale">{finding.rationale}</p>
            {finding.evidenceExcerpt ? <blockquote><span>CV excerpt · {finding.evidenceKind === "cv_example" ? "Example context in your CV" : "Self-reported wording"}</span><q>{finding.evidenceExcerpt}</q><small>Extracted CV text · positions {(finding.sourceStart ?? 0) + 1}–{finding.sourceEnd} · not independently verified</small></blockquote> : <div className="analysis-no-evidence"><strong>No excerpt found</strong><p>{descriptions[finding.status]}</p></div>}
            {finding.evidenceExcerpt && <p className="analysis-caveat">{finding.caveat}</p>}
          </article>)}</div>
          <section className="analysis-next-step"><div><strong>Ready to decide what to do next?</strong><p>Create a private roadmap from the gaps in this report and review a source-grounded CV draft.</p></div><Link className="button button-primary" href={`/analysis/${id}/next-steps`}>Open next steps <span aria-hidden="true">→</span></Link></section>
        </> : <section className="analysis-empty"><h2>No requirements were extracted</h2><p>This local prototype looks for bullet points and clearly labeled requirements in the job description. Edit the saved job to make the required skills or experience easier to identify.</p><Link className="text-link" href="/assessment">Update your intake <span aria-hidden="true">→</span></Link></section>}
      </>}

      <footer className="analysis-footer"><span>Report version {run.schemaVersion} · {run.providerName} {run.providerVersion}</span><span>Private to your account · Advisory only</span></footer>
    </div>
  </main>;
}
