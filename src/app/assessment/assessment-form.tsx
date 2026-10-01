"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

const allowedExtensions = [".pdf", ".docx"];

export default function AssessmentForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [notice, setNotice] = useState("");

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setNotice("");
    setFileError("");
    if (!file) { setSelectedFile(null); return; }

    const lowerName = file.name.toLowerCase();
    if (!allowedExtensions.some((extension) => lowerName.endsWith(extension))) {
      setSelectedFile(null);
      setFileError("Choose a PDF or DOCX file.");
      event.target.value = "";
      return;
    }
    setSelectedFile(file);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setFileError("");
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    if (!selectedFile) { setFileError("Choose a PDF or DOCX file before continuing."); return; }
    setNotice("Your details passed the local form check. Nothing was uploaded or saved; secure CV processing is the next build part.");
  }

  return (
    <form className="assessment-form" onSubmit={handleSubmit} noValidate>
      <section className="form-section" aria-labelledby="cv-section-title">
        <div className="form-section-heading"><span className="form-section-number">01</span><div><h2 id="cv-section-title">Add your CV</h2><p>Use a recent version that you are comfortable reviewing.</p></div><span className="required-note">Required</span></div>
        <label className={`file-drop ${selectedFile ? "has-file" : ""}`} htmlFor="cv-file">
          <span className="upload-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5v3A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
          <span className="file-drop-copy"><strong>{selectedFile ? selectedFile.name : "Choose a CV file"}</strong><span>{selectedFile ? "Selected in this browser only" : "PDF or DOCX · Your original remains yours"}</span></span>
          <span className="browse-button">{selectedFile ? "Change file" : "Browse files"}</span>
          <input id="cv-file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFileChange} aria-describedby={fileError ? "file-error" : "file-help"} />
        </label>
        {fileError ? <p className="field-error" id="file-error" role="alert">{fileError}</p> : <p className="field-help" id="file-help">Supported formats for the prototype: PDF and DOCX.</p>}
      </section>
      <section className="form-section" aria-labelledby="job-section-title">
        <div className="form-section-heading"><span className="form-section-number">02</span><div><h2 id="job-section-title">Set your target job</h2><p>Paste the job description so the assessment has a clear reference.</p></div><span className="required-note">Required</span></div>
        <div className="form-fields-row">
          <div className="form-field"><label htmlFor="role-title">Target role</label><input id="role-title" name="roleTitle" type="text" placeholder="e.g. Data Analyst Intern" required autoComplete="off" /></div>
          <div className="form-field"><label htmlFor="company-name">Company <span className="optional-label">Optional</span></label><input id="company-name" name="companyName" type="text" placeholder="Add a company name" autoComplete="organization" /></div>
        </div>
        <div className="form-field jd-field"><label htmlFor="job-description">Job description</label><textarea id="job-description" name="jobDescription" placeholder="Paste the responsibilities, requirements, and skills from the job description…" rows={7} required /><span className="textarea-hint">You can remove contact details before using a job description.</span></div>
      </section>
      <div className="form-actions"><button className="button button-primary" type="submit">Check my details <span aria-hidden="true">→</span></button><span className="form-action-note">This only checks the form in your browser.</span></div>
      <p className="form-notice" aria-live="polite" role={notice ? "status" : undefined}>{notice}</p>
    </form>
  );
}
