"use client";

import { type FormEvent, useRef, useState } from "react";
import { analyzeCvAgainstJob } from "@/domain/analysis/analyzer";
import { SAMPLE_CV, SAMPLE_JD, SAMPLE_ROLE } from "@/domain/analysis/fixtures";
import type { AnalysisReport, EvidenceStatus } from "@/domain/analysis/types";
import styles from "./cv-readiness-workspace.module.css";

const STATUS_LABELS: Record<EvidenceStatus, string> = {
  supported: "Có bằng chứng",
  partial: "Một phần",
  unclear: "Chưa rõ",
  missing: "Chưa thấy trong CV",
};

const SUMMARY_CARDS: Array<{ key: EvidenceStatus; label: string }> = [
  { key: "supported", label: "Có bằng chứng mô tả" },
  { key: "partial", label: "Bằng chứng một phần" },
  { key: "unclear", label: "Có nhắc nhưng chưa rõ" },
  { key: "missing", label: "Chưa thấy trong CV" },
];

export function CvReadinessWorkspace() {
  const [cvText, setCvText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [message, setMessage] = useState("");
  const resultsRef = useRef<HTMLElement>(null);

  function loadSample() {
    setCvText(SAMPLE_CV);
    setJobDescription(SAMPLE_JD);
    setRoleTitle(SAMPLE_ROLE);
    setReport(null);
    setMessage("");
  }

  function clearReport() {
    setReport(null);
    setMessage("");
    document.querySelector("#cv-panel-title")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      const nextReport = analyzeCvAgainstJob({ cvText, jobDescription, roleTitle });
      setReport(nextReport);
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (error) {
      setReport(null);
      setMessage(error instanceof Error ? error.message : "Chưa thể đối chiếu. Hãy kiểm tra lại nội dung đã nhập.");
    }
  }

  return (
    <section id="workspace" className={styles.workspace} aria-label="Công cụ đối chiếu CV với công việc">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>THỬ LUỒNG GIÁ TRỊ CỐT LÕI</p>
          <h2>Một hồ sơ. Một công việc. Một góc nhìn rõ hơn.</h2>
        </div>
        <button className={styles.textButton} type="button" onClick={loadSample}>Điền dữ liệu mẫu <span aria-hidden="true">↗</span></button>
      </div>

      <div className={styles.prototypeBanner} role="note">
        <span className={styles.prototypeIcon} aria-hidden="true">i</span>
        <p><strong>Bản nền tảng có kiểm soát:</strong> công cụ dùng quy tắc đối chiếu minh bạch, chưa kết nối AI và chưa đánh giá năng lực thật. Kết quả chỉ cho biết điều gì đang được nêu trong CV.</p>
      </div>

      <form className={styles.inputGrid} onSubmit={handleSubmit} noValidate>
        <section className={styles.inputPanel} aria-labelledby="cv-panel-title">
          <div className={styles.panelTitleRow}>
            <span className={styles.stepNumber}>01</span>
            <div><h3 id="cv-panel-title">CV hiện tại</h3><p>Dán nội dung CV hoặc dùng hồ sơ mẫu hư cấu.</p></div>
          </div>
          <label className={styles.fieldLabel} htmlFor="cv-text">Nội dung hồ sơ</label>
          <textarea
            id="cv-text" name="cv" rows={15} required minLength={30} maxLength={20_000}
            value={cvText} onChange={(event) => setCvText(event.target.value)}
            placeholder="Dán phần học vấn, kỹ năng, dự án và kinh nghiệm của bạn…" aria-describedby="cv-help"
          />
          <div className={styles.fieldFooter} id="cv-help"><span>{cvText.length.toLocaleString("vi-VN")} ký tự</span><span>Không cần thông tin liên hệ</span></div>
        </section>

        <section className={`${styles.inputPanel} ${styles.jobPanel}`} aria-labelledby="job-panel-title">
          <div className={styles.panelTitleRow}>
            <span className={styles.stepNumber}>02</span>
            <div><h3 id="job-panel-title">Công việc bạn quan tâm</h3><p>Thêm vị trí và dán yêu cầu tuyển dụng.</p></div>
          </div>
          <label className={styles.fieldLabel} htmlFor="role-title">Tên vị trí</label>
          <input
            id="role-title" name="role" type="text" required maxLength={100}
            value={roleTitle} onChange={(event) => setRoleTitle(event.target.value)}
            placeholder="Ví dụ: Backend Developer Intern"
          />
          <label className={`${styles.fieldLabel} ${styles.jdLabel}`} htmlFor="jd-text">Mô tả công việc (JD)</label>
          <textarea
            id="jd-text" name="jd" rows={10} required minLength={30} maxLength={15_000}
            value={jobDescription} onChange={(event) => setJobDescription(event.target.value)}
            placeholder="Dán mô tả công việc hoặc các yêu cầu chính…" aria-describedby="jd-help"
          />
          <div className={styles.fieldFooter} id="jd-help"><span>{jobDescription.length.toLocaleString("vi-VN")} ký tự</span><span>Ưu tiên yêu cầu kỹ năng cụ thể</span></div>
        </section>

        <div className={styles.formActions}>
          <p className={styles.privacyInline}><span aria-hidden="true">◈</span> Dữ liệu chỉ được xử lý trong trình duyệt này.</p>
          <button className={styles.primaryButton} type="submit"><span>Đối chiếu CV với JD</span><span className={styles.buttonArrow} aria-hidden="true">→</span></button>
        </div>
      </form>

      <p className={styles.formMessage} role="status" aria-live="polite">{message}</p>

      {report ? (
        <section ref={resultsRef} className={styles.resultsSection} aria-labelledby="results-title">
          <div className={styles.resultsHeader}>
            <div>
              <p className={styles.eyebrow}>BÁO CÁO THAM KHẢO</p>
              <h2 id="results-title">Những gì CV đang thể hiện</h2>
              <p className={styles.resultsSubtitle}>Vị trí: {report.roleTitle}</p>
            </div>
            <button className={styles.secondaryButton} type="button" onClick={clearReport}>Xóa kết quả</button>
          </div>

          <div className={styles.summaryGrid} aria-label="Tóm tắt kết quả">
            {SUMMARY_CARDS.map((card) => (
              <div className={styles.summaryCard} key={card.key}>
                <span className={styles.summaryLabel}>{card.label}</span>
                <strong className={styles.summaryValue}>{report.summary[card.key]}</strong>
              </div>
            ))}
          </div>

          <div className={styles.findingsLayout}>
            <div className={styles.findingsPanel}>
              <div className={styles.findingsHeading}><h3>Đối chiếu từng yêu cầu</h3><span className={styles.countPill}>{report.findings.length} mục nhận diện</span></div>
              <p className={styles.findingsIntro}>Các trạng thái mô tả mức độ bằng chứng trong văn bản. “Chưa thấy trong CV” không có nghĩa là bạn không có kỹ năng.</p>
              <div className={styles.findingsList}>
                {report.findings.map((finding) => (
                  <article className={styles.findingCard} key={finding.requirement}>
                    <div className={styles.findingTop}>
                      <h4 className={styles.findingTitle}>{finding.requirement}</h4>
                      <span className={`${styles.statusBadge} ${styles[finding.status]}`}>{STATUS_LABELS[finding.status]}</span>
                    </div>
                    <p className={`${styles.findingEvidence} ${finding.evidence ? "" : styles.noEvidence}`}>
                      {finding.evidence ? `“${finding.evidence}”` : "Không tìm thấy đoạn CV đề cập trực tiếp đến yêu cầu này."}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <aside className={styles.actionsPanel} aria-labelledby="actions-title">
              <div className={styles.actionsIcon} aria-hidden="true">↗</div>
              <p className={styles.eyebrow}>BƯỚC TIẾP THEO</p>
              <h3 id="actions-title">Có thể làm gì?</h3>
              <p className={styles.actionsIntro}>Ưu tiên làm rõ bằng chứng thật trước khi viết lại CV.</p>
              <ol className={styles.actionList}>{report.actions.map((action) => <li key={action}>{action}</li>)}</ol>
            </aside>
          </div>

          <p className={styles.resultsDisclaimer}>Đây là bản đối chiếu theo quy tắc, không phải chấm điểm tuyển dụng, đánh giá năng lực hay dự đoán khả năng được nhận việc.</p>
        </section>
      ) : null}
    </section>
  );
}
