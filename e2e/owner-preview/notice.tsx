// Copied only into disposable builds. No production import or public mode flag.
export default function PreviewNotice({mode,jd,instruction}:{mode:string;jd:string;instruction:string}) {
 return <aside aria-label="Local preview notice" style={{padding:'8px 16px',background:'#eef5f0',color:'#24483e',font:'13px/1.5 Arial',borderBottom:'1px solid #d4e2d9'}}>
  <style>{'@media(min-width:761px){body:has(.op-workspace)>aside[aria-label="Local preview notice"]{margin-left:232px}}'}</style>
  <strong>{mode} preview · Fictional services · No real payment</strong>
  <details><summary style={{cursor:'pointer',minHeight:44}}>Sample account, CV and exact instructions</summary>
   <p>Use <code>fictional@example.test</code> / <code>fictional-preview-only</code> to sign in. No real signup or email delivery. The Scan preview home opens this sample session automatically.</p>
   <p><a href="/__preview/samples/sales-cv.pdf" download>Download synthetic PDF</a> · <a href="/__preview/samples/sales-cv.docx" download>Download synthetic DOCX</a></p>
   <label htmlFor="preview-sample-jd">Exact job description</label><textarea id="preview-sample-jd" readOnly value={jd} rows={4} style={{display:'block',width:'100%',maxWidth:700,font:'14px/1.5 Arial'}}/>
   <p>Exact Rewrite instruction (English): <code>{instruction}</code></p>
   <p>Only this sales scenario is simulated. Other CVs/JDs/instructions or an edited Rewrite base are rejected. Edit after Rewrite, then copy/export/save. Explicit saves are isolated and deleted when this preview stops. {mode==='Scan'?'AI quotas and payments are not simulated here; use the separate Billing preview.':'Free/Pro quota and payment processing use disposable local PostgreSQL. Never make a real transfer.'}</p>
  </details>
 </aside>;
}
