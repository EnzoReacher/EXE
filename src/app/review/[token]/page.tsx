import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { getPublicReview } from "@/lib/review-links/repository";
import ReviewFeedbackForm from "./review-feedback-form";
import { evidenceLabels } from "@/components/evidence-labels";

export const metadata: Metadata = { title: "Private EXE review", description: "Review an owner-selected report and leave advisory feedback.", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function Unavailable() {
  return <main id="main-content" tabIndex={-1} className="reviewer-page"><div className="reviewer-wrap reviewer-unavailable"><p className="eyebrow">PRIVATE EXE REVIEW</p><h1>This private review link is not available.</h1><p>It may have expired, been revoked, or no longer be available. Ask the owner for a new link if needed.</p></div></main>;
}

export default async function PrivateReviewPage({ params }: { params: Promise<{ token: string }> }) {
  noStore();
  const { token } = await params;
  const review = await getPublicReview(token);
  if (!review) return <Unavailable />;
  return <main id="main-content" tabIndex={-1} className="reviewer-page"><div className="reviewer-wrap">
    <p className="eyebrow">PRIVATE EXE REVIEW</p><h1>Review: {review.roleTitle}</h1><p className="analysis-subtitle">{review.companyName ?? "Company not included"}</p>
    <section className="reviewer-notice"><strong>Private and advisory</strong><p>This selected report is shared by its owner. CV wording is self-reported and not independently verified. This is not a hiring prediction or employment guarantee.</p></section>
    <section className="reviewer-findings" aria-labelledby="reviewer-findings-heading">
      <h2 id="reviewer-findings-heading">Selected evidence report</h2>
      {review.findings.map((finding) => <article className="analysis-finding" key={`${finding.requirement}-${finding.status}`}>
        <div className="analysis-finding-heading"><span className={`finding-status ${finding.status === "partly_supported" ? "partial" : finding.status}`}>{evidenceLabels[finding.status]}</span></div>
        <h3>{finding.requirement}</h3><p className="analysis-rationale">{finding.rationale}</p>
        {finding.evidenceExcerpt ? <blockquote><span>{finding.evidenceKind === "cv_example" ? "CV example context" : "Self-reported CV wording"}</span><q>{finding.evidenceExcerpt}</q></blockquote> : <div className="analysis-no-evidence"><strong>No excerpt shared</strong><p>{finding.caveat}</p></div>}
      </article>)}
    </section>
    {review.draftContent && <section className="reviewer-draft" aria-labelledby="reviewer-draft-heading"><h2 id="reviewer-draft-heading">Accepted CV draft selected by the owner</h2><p>The owner included this accepted draft for feedback. It remains theirs to review and change.</p><pre>{review.draftContent}</pre></section>}
    <ReviewFeedbackForm token={token} />
  </div></main>;
}
