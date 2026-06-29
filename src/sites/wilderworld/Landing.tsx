import { ArrowUpRight, Play } from 'lucide-react';
import styles from './Landing.module.css';

const EARLY_ACCESS_URL =
  'https://store.epicgames.com/p/wilder-world-wilder-world-alpha-b4ccf8?lang=en-US';
const TRAILER_URL = 'https://www.youtube.com/watch?v=7G8SwYp6gPo';

export default function WilderworldLanding() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.frame}>
          <video
            className={styles.video}
            src="/videos/wiami-main.mp4"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden
          />
          <div className={styles.scrim} aria-hidden />
          <div className={styles.overlay}>
            <h1 className={styles.heading}>A virtual metropolis.</h1>
            <div className={styles.actions}>
              <a
                className={styles.primary}
                href={EARLY_ACCESS_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Early Access
                <ArrowUpRight size={16} />
              </a>
              <a
                className={styles.secondary}
                href={TRAILER_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Play size={15} />
                Watch Trailer
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
