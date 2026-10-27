import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { PublicHeader, PublicFooter } from "@/components/ownpath/public-shell";
import styles from "@/components/ownpath/ownpath.module.css";
import { PaperHero } from "@/components/ownpath/paper-hero";
export const metadata = { title: "OwnPath | One profile, tailored CVs", description: "One truthful experience profile. CV versions tailored to different jobs, with every change under your control." };

export default async function Home() {
  const user = await getCurrentUser();
  const destination = user ? "/app" : "/sign-up";
  const cta = user ? "Go to workspace" : "Get started";

  return <main className={styles.publicPage} data-ownpath-public id="main-content" tabIndex={-1}>
    <PublicHeader landing />
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <h1>Your experience.<br /><em>Your next CV.</em></h1>
        <p className={styles.intro}>One truthful experience profile → CV versions tailored to different jobs.</p>
        <div className={styles.actions}>
          <Link className={styles.primary} href={destination}>{cta} ↗</Link>
          <Link className={styles.textLink} href="#example">See an example</Link>
        </div>
      </div>
      <PaperHero />
    </section>
    <div className={styles.landingSections}>
      <section className={styles.productExample} id="example" aria-labelledby="example-title" aria-describedby="example-caption">
        <div className={styles.exampleHeading}>
          <h2 id="example-title">See the difference.</h2>
          <p className={styles.exampleCaption} id="example-caption">Fictional example · Not a live AI result</p>
        </div>
        <div className={styles.exampleGrid}>
          <article className={styles.examplePanel} aria-labelledby="example-scan-title">
            <h3 id="example-scan-title">Scan</h3>
            <dl>
              <div><dt>CV excerpt</dt><dd>Helped customers choose products.</dd></div>
              <div><dt>Target job</dt><dd>Help customers select products and maintain stock records.</dd></div>
              <div className={styles.exampleOutcome}><dt>Finding</dt><dd>Customer support is shown. Stock-record experience is not shown in this excerpt.</dd></div>
            </dl>
          </article>
          <article className={styles.examplePanel} aria-labelledby="example-rewrite-title">
            <h3 id="example-rewrite-title">Rewrite</h3>
            <dl>
              <div className={styles.exampleInstruction}><dt>Instruction</dt><dd>Make this clearer without adding experience.</dd></div>
              <div className={styles.exampleOutcome}><dt>Result</dt><dd>Assisted customers with product selection.</dd></div>
            </dl>
          </article>
        </div>
      </section>
      <section className={styles.workflow} id="how-it-works">
        <div className={styles.sectionTitle}><h2>Three simple steps</h2></div>
        <ol className={styles.steps}>
          {[
             ["01", "Add your experience", "Sign in, then paste a CV or describe work, study, projects or volunteering."],
             ["02", "Add a target job", "Reuse your profile. Add a job description, or get a general wording review."],
             ["03", "Review your CV", "Accept, edit or dismiss changes. Preview, export and save named versions."],
          ].map(([n, t, c]) => <li key={n}><h3><span className={styles.stepNumber}>{n} —</span> {t}</h3><p>{c}</p></li>)}
        </ol>
      </section>
      <section className={styles.faq} id="faq">
        <div className={styles.faqInner}>
          <h2>FAQs</h2>
          <div className={styles.faqList}>
            {[
              ["What do I need?", "Sign in and paste an existing CV or describe your experience. A target job description is optional. Work, study, internships and volunteering are welcome across industries."],
              ["Does a missing skill mean I lack it?", "No. It means your CV does not clearly show evidence of it."],
              ["Can I edit and export my CV?", "Yes. Review each proposed change, copy the complete preview, download TXT and save named versions in your account."],
              ["Is this example AI?", "No. This is a static fictional example. Viewing this public page does not send CV content to AI or save a CV. AI review inside your workspace requires your explicit consent."],
            ].map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>
      <section className={styles.closing}>
        <h2>Ready for your next application?</h2>
        <Link className={styles.primary} href={destination}>{cta} ↗</Link>
      </section>
    </div>
    <PublicFooter landing />
  </main>;
}
