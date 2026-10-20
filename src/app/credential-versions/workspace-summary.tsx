import type { Workspace } from "@/lib/credential-versions/types";

export default function WorkspaceSummary({ workspace }: { workspace: Workspace }) {
  const drafts = workspace.claims.filter((c) => c.state === "draft").length;
  const waiting = workspace.claims.filter((c) => c.state === "submitted").length;
  const approved = workspace.claims.filter((c) => c.state === "approved").length;
  const candidates = workspace.versions.filter((v) => v.state === "candidate").length;
  const accepted = workspace.versions.filter((v) => v.state === "accepted" && v.acceptedAt).length;
  return <section className="opportunity-guidance credential-summary" aria-labelledby="credential-progress-title">
    <h2 id="credential-progress-title">Your next steps</h2>
    <ol className="credential-steps">
      <li>Upload a CV and certificate or degree.</li><li>Save one exact skill claim, then submit it.</li>
      <li>Wait for the assigned expert to review the proof.</li><li>Review the candidate before accepting it.</li>
      <li>Download or print an accepted version.</li>
    </ol>
    {!workspace.cvs.length && <p>Start by uploading a source CV below. PDF and DOCX are supported.</p>}
    {!workspace.credentials.some((d) => !d.withdrawn) && <p>Upload a certificate or degree before proposing a skill. A portfolio is optional.</p>}
    <dl className="credential-counts">
      <div><dt>Drafts to submit</dt><dd>{drafts}</dd></div><div><dt>Awaiting expert review</dt><dd>{waiting}</dd></div>
      <div><dt>Approved claims to turn into candidates</dt><dd>{approved}</dd></div><div><dt>Candidates to review</dt><dd>{candidates}</dd></div>
      <div><dt>Active accepted versions</dt><dd>{accepted}</dd></div>
    </dl>
    <p>Counts cover all your source CVs and reflect the last refresh. Version numbers restart for each source CV.</p>
    <nav aria-label="Credential workspace sections" className="credential-actions">
      <a className="text-link" href="#credential-documents">Private documents</a><a className="text-link" href="#credential-proposal">Propose a skill</a>
      <a className="text-link" href="#credential-claims">Skill claims</a><a className="text-link" href="#credential-history">Version history</a>
    </nav>
  </section>;
}
