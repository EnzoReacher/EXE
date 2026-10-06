"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Cv = { id: string; originalFilename: string; byteSize: number; processingStatus: "processing" | "ready" | "failed" | "deleting" | "delete_failed"; parseErrorCode: string | null };
type Job = { id: string; roleTitle: string; companyName: string | null };
type Notice = { tone: "success" | "error" | "info"; text: string } | null;

const acceptedTypes = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function responseJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "We could not complete that request. Try again.");
  return body;
}

export default function AssessmentForm() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cvs, setCvs] = useState<Cv[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedCvId, setSelectedCvId] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [clientRequestId, setClientRequestId] = useState<string | null>(null);
  const [fileError, setFileError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [mutatingCv, setMutatingCv] = useState(false);
  const [replaceCvId, setReplaceCvId] = useState<string | null>(null);

  async function loadWorkspace() {
    setLoading(true);
    try {
      const [cvData, jobData] = await Promise.all([fetch("/api/intake/cv").then(responseJson), fetch("/api/intake/jobs").then(responseJson)]);
      setCvs(cvData.cvs); setJobs(jobData.jobs);
      setSelectedCvId((current) => cvData.cvs.some((cv: Cv) => cv.id === current && cv.processingStatus === "ready") ? current : cvData.cvs.find((cv: Cv) => cv.processingStatus === "ready")?.id || "");
      setSelectedJobId((current) => jobData.jobs.some((job: Job) => job.id === current) ? current : jobData.jobs[0]?.id || "");
      setNotice(null);
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "Sign in to access your private workspace." }); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadWorkspace(); }, 0);
    const refreshAfterSignIn = () => { void loadWorkspace(); };
    window.addEventListener("exe:workspace-signed-in", refreshAfterSignIn);
    return () => { window.clearTimeout(timer); window.removeEventListener("exe:workspace-signed-in", refreshAfterSignIn); };
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setNotice(null); setFileError("");
    if (!file) { setSelectedFile(null); return; }
    if (!/\.(pdf|docx)$/i.test(file.name)) { setSelectedFile(null); setFileError("Choose a PDF or DOCX file."); event.target.value = ""; return; }
    setSelectedFile(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice(null); setFileError("");
    const form = event.currentTarget;
    const values = new FormData(form);
    const role = String(values.get("roleTitle") || "").trim();
    const company = String(values.get("companyName") || "").trim();
    const description = String(values.get("jobDescription") || "").trim();
    const errors: Record<string, string> = {};
    if (role.length < 2 || role.length > 120) errors.roleTitle = "Enter a target role between 2 and 120 characters.";
    if (company.length > 120) errors.companyName = "Use 120 characters or fewer for the company name.";
    if (description.length < 30 || description.length > 15000) errors.jobDescription = "Enter a job description between 30 and 15,000 characters.";
    setFieldErrors(errors);
    if (!selectedFile && (!cvs.length || replaceCvId)) { setFileError("Choose a PDF or DOCX file before saving."); document.getElementById("cv-file")?.focus(); return; }
    if (selectedFile && (!selectedFile.size || selectedFile.size > 5 * 1024 * 1024)) { setFileError("Choose a non-empty file no larger than 5 MiB."); document.getElementById("cv-file")?.focus(); return; }
    if (Object.keys(errors).length) { (form.elements.namedItem(Object.keys(errors)[0]) as HTMLElement).focus(); return; }
    setSubmitting(true);
    let cvSaved = false;
    try {
      if (selectedFile) {
        const data = new FormData(); data.set("file", selectedFile); if (replaceCvId) data.set("replaceCvId", replaceCvId);
        const { cv } = await fetch("/api/intake/cv", { method: "POST", body: data }).then(responseJson);
        if (!cv?.id) throw new Error("We could not confirm the saved CV. Reload your workspace before retrying.");
        setCvs((current) => [cv, ...current.filter((item) => item.id !== cv.id && (item.id !== replaceCvId || cv.processingStatus !== "ready"))]);
        setSelectedCvId(cv.processingStatus === "ready" ? cv.id : "");
        cvSaved = true;
        setSelectedFile(null); setReplaceCvId(null); setClientRequestId(null);
        (form.elements.namedItem("cvFile") as HTMLInputElement).value = "";
      }
      const { job } = await fetch("/api/intake/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roleTitle: role, companyName: company, jobDescription: description }) }).then(responseJson);
      if (!job?.id) throw new Error("We could not confirm the saved job. Reload your workspace before retrying.");
      setJobs((current) => [job, ...current.filter((item) => item.id !== job.id)]);
      setSelectedJobId(job.id); setClientRequestId(null);
      form.reset(); setNotice({ tone: "success", text: "Your target job was saved. Choose a processed CV below to create a report." });
    } catch (error) {
      setNotice({ tone: "error", text: `${error instanceof Error ? error.message : "We could not save your intake. Try again."}${cvSaved ? " Your uploaded CV is kept in your saved CVs. Retry saving the job without uploading again." : ""}` });
    }
    finally { setSubmitting(false); }
  }

  async function copyJob(id: string) {
    setMutatingCv(true); setNotice(null);
    try {
      const { job } = await fetch(`/api/intake/jobs/${id}`).then(responseJson);
      const form = document.querySelector<HTMLFormElement>('form[aria-label="Save a CV and target job"]');
      if (!form || job?.id !== id || typeof job.jobDescription !== "string") throw new Error("This target job could not be loaded.");
      (form.elements.namedItem("roleTitle") as HTMLInputElement).value = job.roleTitle;
      (form.elements.namedItem("companyName") as HTMLInputElement).value = job.companyName ?? "";
      (form.elements.namedItem("jobDescription") as HTMLTextAreaElement).value = job.jobDescription;
      setFieldErrors({}); setNotice({ tone: "info", text: "Edit these details and save a new target job. Existing reports keep their original job." });
      document.getElementById("role-title")?.focus();
    } catch { setNotice({ tone: "error", text: "This target job could not be loaded. Reload your workspace and retry." }); }
    finally { setMutatingCv(false); }
  }

  async function deleteJob(id: string, title: string) {
    if (!window.confirm(`Delete ${title}? This removes its reports, roadmaps, drafts, review links, feedback, and saved opportunities. Your CV files and credential versions are kept.`)) return;
    setMutatingCv(true); setNotice(null);
    try {
      await fetch(`/api/intake/jobs/${id}`, { method: "DELETE" }).then(responseJson);
      const remaining = jobs.filter((item) => item.id !== id); setJobs(remaining);
      if (selectedJobId === id) setSelectedJobId(remaining[0]?.id ?? "");
      setClientRequestId(null);
      setNotice({ tone: "success", text: "The target job and its related reports, drafts, review links and opportunities were deleted. CV files were kept." });
      document.getElementById("job-section-title")?.focus();
    } catch { setNotice({ tone: "error", text: "We could not confirm deletion. Reload your workspace and retry." }); }
    finally { setMutatingCv(false); }
  }

  async function createReport() {
    setNotice(null);
    const requestId = clientRequestId ?? crypto.randomUUID();
    setClientRequestId(requestId);
    setAnalyzing(true);
    try {
      const result = await fetch("/api/analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cvId: selectedCvId, jobId: selectedJobId, clientRequestId: requestId }) }).then(responseJson);
      setClientRequestId(null);
      router.push(`/analysis/${result.runId}`);
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "We could not prepare the report. Try again." });
    } finally { setAnalyzing(false); }
  }

  async function retryCv(id: string) {
    setMutatingCv(true);
    setNotice({ tone: "info", text: "Retrying private CV processing…" });
    try { const { cv } = await fetch(`/api/intake/cv/${id}`, { method: "POST" }).then(responseJson); if (!cv || cv.id !== id) throw new Error("We could not confirm the processing result. Reload your workspace."); setCvs((items) => items.map((item) => item.id === id ? cv : item)); setNotice(cv.processingStatus === "ready" ? { tone: "success", text: "Your CV was processed successfully." } : { tone: "error", text: "We still could not read this CV. Check the file, replace it with a readable PDF or DOCX, or delete it." }); }
    catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "Processing could not be retried." }); }
    finally { setMutatingCv(false); }
  }

  async function deleteCv(id: string, name: string) {
    if (!window.confirm(`Delete ${name}? This permanently removes the private file and extracted text.`)) return;
    setMutatingCv(true);
    setNotice({ tone: "info", text: `Deleting ${name}…` });
    setCvs((items) => items.map((item) => item.id === id ? { ...item, processingStatus: "deleting" } : item));
    try {
      await fetch(`/api/intake/cv/${id}`, { method: "DELETE" }).then(responseJson);
      const remaining = cvs.filter((item) => item.id !== id);
      setCvs(remaining);
      if (selectedCvId === id) setSelectedCvId(remaining.find((item) => item.processingStatus === "ready")?.id ?? "");
      setNotice({ tone: "success", text: "Your CV, extracted text, and saved evidence reports were deleted. Target jobs were kept." });
      document.getElementById("cv-section-title")?.focus();
    }
    catch (error) { await loadWorkspace(); setNotice({ tone: "error", text: error instanceof Error ? error.message : "The CV was not deleted. Retry deletion." }); }
    finally { setMutatingCv(false); }
  }

  return (
    <>
      <section className="workspace-status" role="status">
        {loading ? <p>Loading your private workspace…</p> : <><strong>Private workspace</strong><span>{cvs.length ? `${cvs.length} CV${cvs.length === 1 ? "" : "s"} saved` : "No CV saved yet"} · {jobs.length ? `${jobs.length} target job${jobs.length === 1 ? "" : "s"} saved` : "No target job saved yet"}</span></>}
      </section>
      <button type="button" className="text-button" disabled={loading || submitting || analyzing || mutatingCv} onClick={() => void loadWorkspace()}>Reload workspace</button>
      <form className="assessment-form" onSubmit={handleSubmit} noValidate aria-label="Save a CV and target job" aria-busy={submitting}>
        <section className="form-section" aria-labelledby="cv-section-title">
          <div className="form-section-heading"><span className="form-section-number">01</span><div><h2 id="cv-section-title" tabIndex={-1}>{replaceCvId ? "Replace your CV" : "Add your CV"}</h2><p>PDF or DOCX, up to 5 MiB. Reuse a saved CV when adding another job.</p></div><span className="required-note">Required</span></div>
          <label className={`file-drop ${selectedFile ? "has-file" : ""}`} htmlFor="cv-file"><span className="upload-icon" aria-hidden="true">↑</span><span className="file-drop-copy"><strong>{selectedFile ? selectedFile.name : "Choose a CV file"}</strong><span>{selectedFile ? "Ready for private upload" : "PDF or DOCX · private to your account"}</span></span><span className="browse-button">{selectedFile ? "Change file" : "Browse files"}</span><input id="cv-file" name="cvFile" type="file" accept={acceptedTypes} disabled={submitting || analyzing || mutatingCv} onChange={handleFileChange} aria-label="CV file (required)" aria-invalid={Boolean(fileError)} aria-describedby={`file-help${fileError ? " file-error" : ""}`} /></label>
          <p className="field-help" id="file-help">Choose a PDF or DOCX up to 5 MiB. Use sample information for this prototype. {replaceCvId ? "Saving removes the selected old CV and its extracted text." : "Use Replace on a saved CV to remove it after the new file is safely stored."}</p>{fileError && <p className="field-error" id="file-error" role="alert">{fileError}</p>}
        </section>
        <section className="form-section" aria-labelledby="job-section-title"><div className="form-section-heading"><span className="form-section-number">02</span><div><h2 id="job-section-title" tabIndex={-1}>Set your target job</h2><p>Save a role and job description, then choose them below to create a report.</p></div><span className="required-note">Required</span></div><div className="form-fields-row"><div className="form-field"><label htmlFor="role-title">Target role (required)</label><input id="role-title" name="roleTitle" type="text" disabled={submitting || analyzing || mutatingCv} minLength={2} maxLength={120} placeholder="e.g. Data Analyst Intern" required autoComplete="off" aria-invalid={Boolean(fieldErrors.roleTitle)} aria-describedby={`role-help${fieldErrors.roleTitle ? " role-error" : ""}`} /><p className="field-help" id="role-help">Use 2–120 characters.</p>{fieldErrors.roleTitle && <p className="field-error" id="role-error" role="alert">{fieldErrors.roleTitle}</p>}</div><div className="form-field"><label htmlFor="company-name">Company <span className="optional-label">Optional</span></label><input id="company-name" name="companyName" type="text" disabled={submitting || analyzing || mutatingCv} maxLength={120} placeholder="Add a company name" autoComplete="organization" aria-invalid={Boolean(fieldErrors.companyName)} aria-describedby={fieldErrors.companyName ? "company-error" : undefined} />{fieldErrors.companyName && <p className="field-error" id="company-error" role="alert">{fieldErrors.companyName}</p>}</div></div><div className="form-field jd-field"><label htmlFor="job-description">Job description (required)</label><textarea id="job-description" name="jobDescription" disabled={submitting || analyzing || mutatingCv} minLength={30} maxLength={15000} placeholder="Paste responsibilities, requirements, and skills…" rows={7} required aria-invalid={Boolean(fieldErrors.jobDescription)} aria-describedby={`job-help${fieldErrors.jobDescription ? " job-error" : ""}`} /><span className="textarea-hint" id="job-help">Use 30–15,000 characters. Remove contact details you do not need to store.</span>{fieldErrors.jobDescription && <p className="field-error" id="job-error" role="alert">{fieldErrors.jobDescription}</p>}</div></section>
        <div className="form-actions"><button className="button button-primary" type="submit" disabled={submitting || loading || analyzing || mutatingCv}>{submitting ? "Saving intake…" : !selectedFile && cvs.length > 0 && !replaceCvId ? "Save target job" : "Save CV and target job"}</button><span className="form-action-note">Reuse a saved CV to add another job. Saving does not create a report.</span></div>
      </form>
      <p className={`form-notice ${notice?.tone ?? "info"}`} role="status">{notice?.tone !== "error" ? (submitting ? "Saving your CV and target job…" : analyzing ? "Preparing your evidence report…" : notice?.text) : null}</p>
      <p className="form-notice error" role="alert">{notice?.tone === "error" ? notice.text : null}</p>
      {!loading && cvs.length > 0 && <section className="saved-intake" aria-labelledby="saved-cvs-title" aria-busy={mutatingCv}><h2 id="saved-cvs-title">Your saved CVs</h2>{cvs.map((cv) => <article className="saved-cv" key={cv.id}><div><strong>{cv.originalFilename}</strong><span className={`cv-status ${cv.processingStatus}`}>{cv.processingStatus === "ready" ? "Ready for a report" : cv.processingStatus === "failed" ? "Could not read file" : cv.processingStatus === "delete_failed" ? "Deletion failed" : cv.processingStatus === "deleting" ? "Deleting" : "Processing"}</span>{cv.processingStatus === "failed" && <p>We could not read this file. Retry processing or delete it.</p>}</div><div className="cv-actions">{cv.processingStatus === "failed" && <button type="button" className="text-button" disabled={mutatingCv || submitting || analyzing} aria-label={`Retry processing ${cv.originalFilename}`} onClick={() => void retryCv(cv.id)}>Retry processing</button>}<button type="button" className="text-button" disabled={mutatingCv || submitting || analyzing} aria-label={`Replace ${cv.originalFilename}`} onClick={() => { setReplaceCvId(cv.id); setNotice({ tone: "info", text: `Choose a new file to replace ${cv.originalFilename}, then save the CV and target job.` }); document.getElementById("cv-file")?.focus(); }}>Replace</button><button type="button" className="text-button danger" aria-label={`Delete CV ${cv.originalFilename}`} disabled={mutatingCv || submitting || analyzing || cv.processingStatus === "deleting"} onClick={() => void deleteCv(cv.id, cv.originalFilename)}>Delete CV</button></div></article>)}</section>}
      {!loading && jobs.length > 0 && <section className="saved-intake" aria-labelledby="saved-jobs-title"><h2 id="saved-jobs-title">Your saved target jobs</h2>{jobs.map((job) => <article className="saved-cv" key={job.id}><div><strong>{job.roleTitle}</strong>{job.companyName && <p>{job.companyName}</p>}</div><div className="cv-actions"><button type="button" className="text-button" disabled={mutatingCv || submitting || analyzing} onClick={() => void copyJob(job.id)} aria-label={`Copy target job ${job.roleTitle}`}>Copy and edit</button><button type="button" className="text-button danger" disabled={mutatingCv || submitting || analyzing} onClick={() => void deleteJob(job.id, job.roleTitle)} aria-label={`Delete target job ${job.roleTitle}`}>Delete target job</button></div></article>)}</section>}
      {!loading && (cvs.length > 0 || jobs.length > 0) && <section className="saved-intake report-launcher" aria-labelledby="report-launcher-title">
        <div><p className="eyebrow">LOCAL WORDING CHECK</p><h2 id="report-launcher-title">Create an evidence report</h2><p id="report-help">Choose one processed CV and one saved job. Both are needed to create a report. No AI provider is connected.</p></div>
        <div className="report-launcher-fields">
          <div className="form-field"><label htmlFor="analysis-cv">Saved CV for report</label><select id="analysis-cv" value={selectedCvId} disabled={analyzing || submitting || mutatingCv} aria-describedby="report-help" onChange={(event) => { setSelectedCvId(event.target.value); setClientRequestId(null); }}>
            <option value="">Choose a processed CV</option>{cvs.filter((cv) => cv.processingStatus === "ready").map((cv) => <option key={cv.id} value={cv.id}>{cv.originalFilename}</option>)}
          </select></div>
          <div className="form-field"><label htmlFor="analysis-job">Saved target job for report</label><select id="analysis-job" value={selectedJobId} disabled={analyzing || submitting || mutatingCv} aria-describedby="report-help" onChange={(event) => { setSelectedJobId(event.target.value); setClientRequestId(null); }}>
            <option value="">Choose a target job</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.roleTitle}{job.companyName ? ` · ${job.companyName}` : ""}</option>)}
          </select></div>
        </div>
        <div className="form-actions"><button className="button button-primary" type="button" aria-describedby="report-help" onClick={() => void createReport()} disabled={analyzing || submitting || mutatingCv || !selectedCvId || !selectedJobId}>{analyzing ? "Preparing report…" : "Create evidence report"}<span aria-hidden="true"> →</span></button><span className="form-action-note">No hiring score. Review findings against your CV.</span></div>
        {cvs.every((cv) => cv.processingStatus !== "ready") && <p className="field-help">A processed CV is needed before you can create a report.</p>}
      </section>}
    </>
  );
}
