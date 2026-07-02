import styles from './Landing.module.css';

export default function ZeroLanding() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heading}>
            Built for <span className={styles.accent}>freedom.</span>
          </h1>
          <p className={styles.subtitle}>A private, sovereign, decentralized messenger.</p>
        </div>
      </section>
    </div>
  );
}
