import type { Metadata } from 'next';
import Link from 'next/link';
import { FadeInImage } from '@/components/FadeInImage';
import headingStyles from '@/components/SectionHeader.module.css';
import { trinityCommunityContent as content } from './content';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Trinity Community | Wilder World',
  description: content.hero.description,
};

type Industry = { title: string; body: string; href?: string };
type Reward = {
  title: string;
  body: string;
  status: string;
  dateLabel?: string;
  image?: string;
  imageAlt?: string;
};

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {diagonal ? <path d="M6 18 18 6M6 6h12v12" /> : <path d="M5 12h14m-6-6 6 6-6 6" />}
    </svg>
  );
}

function SectionHeading({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <header className={styles.sectionHeading}>
      <p className={headingStyles.eyebrow}>{eyebrow}</p>
      <h2 id={id} className={headingStyles.title}>{title}</h2>
    </header>
  );
}

function RewardCard({ reward, index }: { reward: Reward; index: number }) {
  return (
    <article className={`${styles.rewardCard} ${!reward.image ? styles.rewardWithoutImage : ''}`}>
      {reward.image && <div className={styles.rewardMedia}><FadeInImage src={reward.image} alt={reward.imageAlt ?? reward.title} loading="lazy" /></div>}
      <div className={styles.rewardBody}>
        <div className={styles.rewardMeta}>
          <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
          {reward.dateLabel && <span>{reward.dateLabel}</span>}
          <span className={styles.status}>{reward.status}</span>
        </div>
        <h3>{reward.title}</h3>
        <p>{reward.body}</p>
      </div>
    </article>
  );
}

export default function TrinityCommunityPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <FadeInImage className={styles.heroImage} src={content.hero.image} alt={content.hero.imageAlt} loading="eager" fetchPriority="high" />
        <div className={styles.heroShade} />
        <div className={styles.heroContent}>
          <p className={`${headingStyles.eyebrow} ${styles.heroEyebrow}`}>{content.hero.eyebrow}</p>
          <h1 className={headingStyles.title}>{content.hero.title}</h1>
          <p className={styles.heroDescription}>{content.hero.description}</p>
          <a className={styles.primaryLink} href="#how-it-works">Explore Trinity<Arrow /></a>
        </div>
      </header>

      <nav className={styles.sectionNav} aria-label="Trinity page sections">
        <a href="#about">The program</a>
        <a href="#how-it-works">How it works</a>
        <a href="#trinity-chains">Trinity Chains</a>
        {content.rewards.length > 0 && <a href="#rewards">Rewards</a>}
        {content.upcoming.length > 0 && <a href="#upcoming">What’s next</a>}
        {content.faq.length > 0 && <a href="#questions">Questions & answers</a>}
      </nav>

      <section id="about" className={`${styles.section} ${styles.intro}`} aria-labelledby="about-title">
        <SectionHeading id="about-title" eyebrow="The community" title={content.intro.title} />
        <div className={styles.introCopy}>{content.intro.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
      </section>

      <section id="how-it-works" className={styles.section} aria-labelledby="steps-title">
        <SectionHeading id="steps-title" eyebrow="Getting started" title="How it works" />
        <ol className={styles.steps}>
          {content.steps.map((step, index) => <li key={step.title}>
            <span className={styles.stepNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>)}
        </ol>
      </section>

      <section id="trinity-chains" className={`${styles.section} ${styles.chains}`} aria-labelledby="chains-title">
        <div className={styles.chainIntro}>
          <SectionHeading id="chains-title" eyebrow="Go deeper" title={content.chains.title} />
          <p>{content.chains.body}</p>
        </div>
        <ol className={styles.chainLevels} aria-label="Example Trinity Chain progression">
          {content.chains.levels.map((level) => <li key={level.count}>
            <span className={styles.chainNumber}>{String(level.count).padStart(2, '0')}</span>
            <h3>{level.title}</h3>
            <p>{level.detail}</p>
            <div className={styles.chainDots} aria-hidden="true">{Array.from({length:level.count},(_,i)=><span key={i}/>)}</div>
          </li>)}
        </ol>
        <p className={styles.chainCaption}>{content.chains.caption}</p>
        <div className={styles.chainNotes}>{content.chains.notes.map(note=><article key={note.title}><h3>{note.title}</h3><p>{note.body}</p></article>)}</div>
      </section>

      {content.industries.length > 0 && <section className={styles.section} aria-labelledby="industries-title">
        <SectionHeading id="industries-title" eyebrow="Across Wilder World" title="Genesis industries" />
        <div className={styles.industries}>
          {content.industries.map((industry: Industry, index) => <article key={industry.title} className={styles.industry}>
            <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
            <h3>{industry.href ? <Link href={industry.href}>{industry.title}<Arrow diagonal /></Link> : industry.title}</h3>
            <p>{industry.body}</p>
          </article>)}
        </div>
      </section>}

      {content.rewards.length > 0 && <section id="rewards" className={styles.section} aria-labelledby="rewards-title">
        <SectionHeading id="rewards-title" eyebrow="The story so far" title="Trinity rewards" />
        <div className={styles.rewards}>{content.rewards.map((reward, index) => <RewardCard key={reward.title} reward={reward} index={index} />)}</div>
      </section>}

      {content.upcoming.length > 0 && <section id="upcoming" className={`${styles.section} ${styles.upcoming}`} aria-labelledby="upcoming-title">
        <SectionHeading id="upcoming-title" eyebrow="Looking ahead" title="What’s next" />
        <div className={styles.announcements}>{content.upcoming.map((announcement) => <article key={announcement.title}>
          <span className={styles.status}>{announcement.status}</span>
          <h3>{announcement.title}</h3>
          <p>{announcement.body}</p>
        </article>)}</div>
      </section>}

      {content.faq.length > 0 && <section id="questions" className={`${styles.section} ${styles.questions}`} aria-labelledby="questions-title">
        <SectionHeading id="questions-title" eyebrow="A little more detail" title="Questions & answers" />
        <div className={styles.faq}>{content.faq.map((item) => <details key={item.question}>
          <summary>{item.question}<span aria-hidden="true">+</span></summary>
          <p>{item.answer}</p>
        </details>)}</div>
      </section>}

    </div>
  );
}
