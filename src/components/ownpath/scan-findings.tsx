import type { Scan } from "@/lib/scan-rewrite/domain";
import WorkbenchIcon from "./workbench-icon";
import { applicantNextStep } from "@/lib/scan-rewrite/applicant-guidance";

export function ScanCounts({ scan }: { scan: Scan }) {
  return <ul className="op-scan-counts" aria-label="Finding categories">{([["unclear", "to clarify"], ["not_found", "not shown in CV"], ["supported", "strengths"]] as const).map(([group, label]) => <li key={group}><strong>{scan.findings.filter(f => f.group === group).length}</strong> {label}</li>)}</ul>;
}
export default function ScanFindings({ scan, prefix }: { scan: Scan; prefix: string }) {
  return <><p className="op-coverage">{scan.coverage}</p>{([["unclear", "Make it clearer", "edit"], ["not_found", "Not shown in your CV", "document"], ["supported", "Demonstrated strengths", "check"]] as const).map(([group, title, icon]) => <section className={`op-finding-group op-group-${group}`} key={group}>
    <h3><WorkbenchIcon name={icon} />{title}<span className="op-group-count">{scan.findings.filter(f => f.group === group).length}</span></h3>
    {group === "not_found" && <p className="op-group-note">Not shown here doesn’t mean you lack the skill.</p>}
    {scan.findings.map((finding, index) => ({ finding, index })).filter(({ finding }) => finding.group === group).map(({ finding: f, index }) => <article className="op-finding" key={index} id={`${prefix}-finding-${index}`}>
      <div className="op-finding-meta"><span>{f.priority === "important" ? "Priority" : "Secondary"}</span>{f.expectation !== "unspecified" && <span>{f.expectation === "required" ? "Required by JD" : "Preferred by JD"}</span>}</div>
      <h4>{f.title}</h4><p id={`${prefix}-explanation-${index}`}>{f.explanation}</p><p className="op-next-step"><strong>Your next step</strong>{applicantNextStep(f)}</p>
      <details aria-describedby={`${prefix}-explanation-${index}`}><summary>Explanation & source evidence</summary><div className="op-source-detail"><p>{f.explanation}</p><span>FROM YOUR CV</span><blockquote>{f.excerpt || "No supporting excerpt found in the supplied CV."}</blockquote><span>FROM THE JOB DESCRIPTION</span><blockquote>{f.requirement}</blockquote></div></details>
    </article>)}
    {!scan.findings.some(f => f.group === group) && <p className="op-group-empty">No findings in this group.</p>}
  </section>)}</>;
}
