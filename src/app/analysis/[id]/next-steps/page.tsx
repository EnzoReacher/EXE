import Link from "next/link";
import { notFound } from "next/navigation";
import { getOwnedAnalysisDetails } from "@/lib/analysis/repository";
import { IntakeError } from "@/lib/intake/types";
import { getOwnedNextSteps } from "@/lib/next-steps/repository";
import NextStepsWorkspace from "./next-steps-workspace";

export const metadata = {
  title: "Next steps and CV draft | EXE",
  description: "Turn an evidence report into a private action plan and source-grounded CV draft.",
};

export default async function NextStepsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let analysis: Awaited<ReturnType<typeof getOwnedAnalysisDetails>> | null = null;
  let nextSteps: Awaited<ReturnType<typeof getOwnedNextSteps>> = null;
  let reportStillProcessing = false;
  try {
    [analysis, nextSteps] = await Promise.all([getOwnedAnalysisDetails(id), getOwnedNextSteps(id)]);
  } catch (error) {
    if (error instanceof IntakeError && error.status === 404) notFound();
    if (error instanceof IntakeError && error.code === "analysis_not_ready") reportStillProcessing = true;
    else throw error;
  }

  if (reportStillProcessing) return <main className="analysis-page"><div className="analysis-wrap"><p className="eyebrow">MILESTONE 3 · NEXT STEPS</p><section className="analysis-empty"><h1>Finish the evidence report first</h1><p>The roadmap and CV draft need a completed evidence report so every action has a visible reason.</p><Link className="text-link" href={`/analysis/${id}`}>Return to your report <span aria-hidden="true">→</span></Link></section></div></main>;
  if (!analysis) notFound();
  return <main className="analysis-page">
    <header className="analysis-topbar"><Link className="brand" href="/" aria-label="EXE career readiness home"><span className="brand-mark" aria-hidden="true">E</span><span className="brand-copy"><strong>EXE</strong><span>Career readiness</span></span></Link><Link href={`/analysis/${id}`} className="back-link"><span aria-hidden="true">←</span>Back to evidence report</Link></header>
    <div className="analysis-wrap">
      <p className="eyebrow">MILESTONE 3 · NEXT STEPS</p>
      <h1>{analysis.roleTitle}</h1>
      <p className="analysis-subtitle">{analysis.companyName ? `${analysis.companyName} · ` : ""}{analysis.cvFilename}</p>
      <NextStepsWorkspace analysisId={id} initialDetails={nextSteps} />
    </div>
  </main>;
}
