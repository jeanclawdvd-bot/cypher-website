import { ArrowUpRight } from 'lucide-react';
import { ZERO_GET_STARTED_URL } from './Blocks';
import styles from './Landing.module.css';

export default function ZeroLanding() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.glow} aria-hidden />
        <div className={styles.heroInner}>
          <h1 className={styles.heading}>Built for freedom.</h1>
          <p className={styles.subtitle}>A private, sovereign, decentralized messenger.</p>
          <a
            className="sci-btn sci-btn-primary"
            href={ZERO_GET_STARTED_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get Started
            <ArrowUpRight size={16} />
          </a>
        </div>
      </section>
    </div>
  );
}
