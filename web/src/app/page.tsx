import { CvReadinessWorkspace } from "@/components/cv-readiness-workspace";
import styles from "./page.module.css";

export default function Home() {
  return (
    <>
      <a className={styles.skipLink} href="#workspace">Đi đến công cụ đối chiếu</a>
      <header className={styles.siteHeader}>
        <a className={styles.brand} href="#top" aria-label="CV Compass, về đầu trang">
          <span className={styles.brandMark} aria-hidden="true">c</span>
          <span>CV Compass <span className={styles.brandTag}>FOUNDATION</span></span>
        </a>
        <nav className={styles.headerLinks} aria-label="Điều hướng chính">
          <a href="#workspace">Cách hoạt động</a>
          <a href="#privacy">Quyền riêng tư</a>
        </nav>
        <span className={styles.audiencePill}>Dành cho sinh viên &amp; người mới tốt nghiệp</span>
      </header>

      <main id="top">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span className={styles.eyebrowDot} /> BƯỚC ĐẦU TRÊN HÀNH TRÌNH NGHỀ NGHIỆP</p>
            <h1 id="hero-title">CV của bạn đang <em>chứng minh được</em> điều gì?</h1>
            <p className={styles.heroLede}>
              Đối chiếu hồ sơ với một vị trí cụ thể. Xem yêu cầu nào đã có bằng chứng, điều gì chưa được thể hiện và nên cải thiện phần nào trước.
            </p>
            <div className={styles.heroNotes}>
              <span><span className={styles.checkIcon} aria-hidden="true">✓</span> Bám theo nội dung bạn cung cấp</span>
              <span><span className={styles.checkIcon} aria-hidden="true">✓</span> Không biến thiếu thông tin thành thiếu năng lực</span>
            </div>
          </div>

          <div className={styles.heroArt} aria-hidden="true">
            <div className={`${styles.orbit} ${styles.orbitOne}`} />
            <div className={`${styles.orbit} ${styles.orbitTwo}`} />
            <div className={`${styles.spark} ${styles.sparkOne}`}>✳</div>
            <div className={`${styles.spark} ${styles.sparkTwo}`}>✳</div>
            <div className={`${styles.miniCard} ${styles.cardCv}`}>
              <span className={styles.miniLabel}>CV HIỆN TẠI</span>
              <span className={`${styles.miniLine} ${styles.lineLong}`} />
              <span className={`${styles.miniLine} ${styles.lineMid}`} />
              <span className={`${styles.miniLine} ${styles.lineShort}`} />
              <span className={styles.miniChip}>Kinh nghiệm</span>
            </div>
            <div className={styles.connector}><span /></div>
            <div className={styles.matchBubble}><span>CV</span><span className={styles.bubbleArrow}>↔</span><span>JD</span></div>
            <div className={`${styles.miniCard} ${styles.cardJob}`}>
              <span className={styles.miniLabel}>VỊ TRÍ MỤC TIÊU</span>
              <span className={`${styles.miniLine} ${styles.lineLong}`} />
              <span className={`${styles.miniLine} ${styles.lineMid}`} />
              <span className={styles.miniTag}>Yêu cầu công việc</span>
            </div>
            <div className={styles.heroCaption}>Từ hồ sơ hiện tại đến bước tiếp theo rõ ràng hơn.</div>
          </div>
        </section>

        <CvReadinessWorkspace />

        <section id="privacy" className={styles.privacySection} aria-labelledby="privacy-title">
          <div className={styles.privacySymbol} aria-hidden="true">◎</div>
          <div>
            <p className={styles.eyebrow}>THIẾT KẾ CÓ Ý THỨC VỀ QUYỀN RIÊNG TƯ</p>
            <h2 id="privacy-title">CV của bạn không rời khỏi trình duyệt.</h2>
            <p>Bản nền tảng này không gửi, lưu hoặc tải CV lên máy chủ. Chỉ dùng dữ liệu mẫu hoặc dữ liệu bạn được phép sử dụng.</p>
          </div>
          <div className={styles.privacyPoints}>
            <span><b>01</b> Không đăng nhập</span>
            <span><b>02</b> Không lưu hồ sơ</span>
            <span><b>03</b> Không gọi dịch vụ AI</span>
          </div>
        </section>
      </main>

      <footer className={styles.siteFooter}>
        <a className={`${styles.brand} ${styles.footerBrand}`} href="#top">
          <span className={styles.brandMark} aria-hidden="true">c</span><span>CV Compass</span>
        </a>
        <span>EXE101 · Production foundation · Chưa phải công cụ tuyển dụng hoàn chỉnh</span>
      </footer>
    </>
  );
}
