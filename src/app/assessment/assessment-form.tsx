"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cvs, setCvs] = useState<Cv[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [fileError, setFileError] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replaceCvId, setReplaceCvId] = useState<string | null>(null);

  async function loadWorkspace() {
    setLoading(true);
    try {
      const [cvData, jobData] = await Promise.all([fetch("/api/intake/cv").then(responseJson), fetch("/api/intake/jobs").then(responseJson)]);
      setCvs(cvData.cvs); setJobs(jobData.jobs); setNotice(null);
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "Sign in to access your private workspace." }); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadWorkspace(); }, 0);
    return () => window.clearTimeout(timer);
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
    if (!form.reportValidity()) return;
    if (!selectedFile) { setFileError("Choose a PDF or DOCX file before saving."); return; }
    setSubmitting(true);
    try {
      const data = new FormData(); data.set("file", selectedFile); if (replaceCvId) data.set("replaceCvId", replaceCvId);
      const cvResult = await fetch("/api/intake/cv", { method: "POST", body: data }).then(responseJson);
      const jobResult = await fetch("/api/intake/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roleTitle: new FormData(form).get("roleTitle"), companyName: new FormData(form).get("companyName"), jobDescription: new FormData(form).get("jobDescription") }) }).then(responseJson);
      setCvs((current) => [cvResult.cv, ...current.filter((cv) => cv.id !== replaceCvId)]); setJobs((current) => [jobResult.job, ...current]); setSelectedFile(null); setReplaceCvId(null);
      form.reset(); setNotice({ tone: cvResult.cv.processingStatus === "ready" ? "success" : "info", text: cvResult.cv.processingStatus === "ready" ? `Your ${replaceCvId ? "replacement " : ""}CV was stored privately and its text was extracted. Your target job was saved.` : "Your CV was stored privately, but it could not be read. Retry processing below." });
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "We could not save your intake. Try again." }); }
    finally { setSubmitting(false); }
  }

  async function retryCv(id: string) {
    setNotice({ tone: "info", text: "Retrying private CV processing…" });
    try { const { cv } = await fetch(`/api/intake/cv/${id}`, { method: "POST" }).then(responseJson); setCvs((items) => items.map((item) => item.id === id ? cv : item)); setNotice({ tone: "success", text: "Your CV was processed successfully." }); }
    catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "Processing could not be retried." }); }
  }

  async function deleteCv(id: string, name: string) {
    if (!window.confirm(`Delete ${name}? This permanently removes the private file and extracted text.`)) return;
    setCvs((items) => items.map((item) => item.id === id ? { ...item, processingStatus: "deleting" } : item));
    try { await fetch(`/api/intake/cv/${id}`, { method: "DELETE" }).then(responseJson); setCvs((items) => items.filter((item) => item.id !== id)); setNotice({ tone: "success", text: "Your CV file and extracted text were deleted. Target jobs were kept." }); }
    catch (error) { await loadWorkspace(); setNotice({ tone: "error", text: error instanceof Error ? error.message : "The CV was not deleted. Retry deletion." }); }
  }

  return (
    <>
      <section className="workspace-status" aria-live="polite">
        {loading ? <p>Loading your private workspace…</p> : <><strong>Private workspace</strong><span>{cvs.length ? `${cvs.length} CV${cvs.length === 1 ? "" : "s"} saved` : "No CV saved yet"} · {jobs.length ? `${jobs.length} target job${jobs.length === 1 ? "" : "s"} saved` : "No target job saved yet"}</span></>}
      </section>
      <form className="assessment-form" onSubmit={handleSubmit} noValidate>
        <section className="form-section" aria-labelledby="cv-section-title">
          <div className="form-section-heading"><span className="form-section-number">01</span><div><h2 id="cv-section-title">{replaceCvId ? "Replace your CV" : "Add your CV"}</h2><p>PDF or DOCX only; files up to 5 MiB are checked again on the server.</p></div><span className="required-note">Required</span></div>
          <label className={`file-drop ${selectedFile ? "has-file" : ""}`} htmlFor="cv-file"><span className="upload-icon" aria-hidden="true">↑</span><span className="file-drop-copy"><strong>{selectedFile ? selectedFile.name : "Choose a CV file"}</strong><span>{selectedFile ? "Ready for private upload" : "PDF or DOCX · private to your account"}</span></span><span className="browse-button">{selectedFile ? "Change file" : "Browse files"}</span><input id="cv-file" type="file" accept={acceptedTypes} onChange={handleFileChange} aria-describedby={fileError ? "file-error" : "file-help"} /></label>
          {fileError ? <p className="field-error" id="file-error" role="alert">{fileError}</p> : <p className="field-help" id="file-help">Files are private and never made public. {replaceCvId ? "Saving removes the selected old CV and its extracted text." : "Use Replace on a saved CV to remove it after the new file is safely stored."}</p>}
        </section>
        <section className="form-section" aria-labelledby="job-section-title"><div className="form-section-heading"><span className="form-section-number">02</span><div><h2 id="job-section-title">Set your target job</h2><p>Paste a role and job description. This intake is stored; it is not analyzed in M1.</p></div><span className="required-note">Required</span></div><div className="form-fields-row"><div className="form-field"><label htmlFor="role-title">Target role</label><input id="role-title" name="roleTitle" type="text" minLength={2} maxLength={120} placeholder="e.g. Data Analyst Intern" required autoComplete="off" /></div><div className="form-field"><label htmlFor="company-name">Company <span className="optional-label">Optional</span></label><input id="company-name" name="companyName" type="text" maxLength={120} placeholder="Add a company name" autoComplete="organization" /></div></div><div className="form-field jd-field"><label htmlFor="job-description">Job description</label><textarea id="job-description" name="jobDescription" minLength={30} maxLength={15000} placeholder="Paste responsibilities, requirements, and skills…" rows={7} required /><span className="textarea-hint">Remove contact details you do not need to store.</span></div></section>
        <div className="form-actions"><button className="button button-primary" type="submit" disabled={submitting || loading}>{submitting ? "Saving privately…" : "Save private intake"}</button><span className="form-action-note">No AI assessment occurs at this stage.</span></div>
        {notice && <p className={`form-notice ${notice.tone}`} aria-live="polite" role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p>}
      </form>
      {!loading && cvs.length > 0 && <section className="saved-intake" aria-labelledby="saved-cvs-title"><h2 id="saved-cvs-title">Your saved CVs</h2>{cvs.map((cv) => <article className="saved-cv" key={cv.id}><div><strong>{cv.originalFilename}</strong><span className={`cv-status ${cv.processingStatus}`}>{cv.processingStatus === "ready" ? "Processed" : cv.processingStatus === "failed" ? "Parse failed" : cv.processingStatus === "delete_failed" ? "Deletion failed" : cv.processingStatus === "deleting" ? "Deleting" : "Processing"}</span>{cv.processingStatus === "failed" && <p>We could not read this file. The original remains private; retry or delete it.</p>}</div><div className="cv-actions">{cv.processingStatus === "failed" && <button type="button" className="text-button" onClick={() => void retryCv(cv.id)}>Retry processing</button>}<button type="button" className="text-button" onClick={() => { setReplaceCvId(cv.id); document.getElementById("cv-file")?.focus(); }}>Replace</button><button type="button" className="text-button danger" disabled={cv.processingStatus === "deleting"} onClick={() => void deleteCv(cv.id, cv.originalFilename)}>Delete CV</button></div></article>)}</section>}
    </>
  );
}
