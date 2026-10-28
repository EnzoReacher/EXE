import styles from "./paper-hero.module.css";

export function PaperHero() {
  return <aside className={styles.example} id="hero-illustration" aria-label="Fictional CV example">
    <p className={styles.caption}>Fictional example · Not a live AI result</p>
    <div className={styles.scene} role="img" aria-label="Paper CV for fictional sales assistant Jamie Reed: helped customers choose products and maintained an up-to-date stock list at Riverside Shop, 2023–2025. Skills: customer service and stock records. Business diploma, 2023. A pen marks the experience section.">
      <div className={styles.orbit} />
      <div className={styles.paper}>
        <div className={styles.monogram}>JR</div><strong>Jamie Reed</strong><p className={styles.role}>Sales assistant</p><p className={styles.contact}>jamie@example.test · Riverside</p>
        <h3>EXPERIENCE</h3><div className={styles.entry}><b>Riverside Shop</b><span>2023–2025</span></div>
        <div className={styles.writing}><p>Helped customers choose products.</p>
        <svg className={styles.ink} viewBox="0 0 320 30" preserveAspectRatio="none" aria-hidden="true"><path className={styles.correction} pathLength="1" d="M8 12 Q110 17 267 10" /><path className={styles.check} pathLength="1" d="M272 11 l8 7 16 -18" />
          <g className={styles.pen}><g transform="rotate(32)"><path d="M0 0 L-7 -22 L7 -22 Z" fill="#c49a60" /><path d="M0 0 L-2 -7 L2 -7 Z" fill="#173e39" /><rect x="-7" y="-139" width="14" height="118" rx="5" fill="#164f45" /><path d="M-3 -132 V-31" stroke="#458272" strokeWidth="2" /><rect x="-8" y="-45" width="16" height="5" fill="#d8ad70" /><path d="M5 -126 h6 v41" fill="none" stroke="#d8ad70" strokeWidth="3" /></g></g>
        </svg></div>
        <p>Maintained an up-to-date stock list.</p>
        <h3>SKILLS</h3><p>Customer service · Stock records</p>
        <h3>EDUCATION</h3><p>Business diploma, 2023</p>
      </div>
    </div>
  </aside>;
}
