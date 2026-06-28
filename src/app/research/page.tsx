import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { papers } from './_components/papers';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Research | Cypher',
  description:
    'Whitepapers and open research on intelligence, distributed systems, and protocols from Cypher.',
};

export default function ResearchIndex() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Research</p>
        <h1 className={styles.heading}>
          Papers on intelligence,
          <br />
          <span className={styles.accent}>systems, and protocols.</span>
        </h1>
        <p className={styles.subtitle}>
          Our open research and whitepapers on autonomous systems, distributed
          compute, and the protocols that connect them.
        </p>
      </header>

      <section className={styles.list} aria-label="Whitepapers">
        {papers.map((paper) => (
          <Link key={paper.slug} href={`/research/${paper.slug}`} className={styles.card}>
            <div className={styles.cardMeta}>
              <span className={styles.cardYear}>{paper.year}</span>
              {!paper.available && <span className={styles.cardBadge}>Coming soon</span>}
            </div>
            <h2 className={styles.cardTitle}>
              {paper.title}
              <ArrowUpRight size={18} className={styles.cardIcon} />
            </h2>
            <p className={styles.cardBlurb}>{paper.blurb}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
