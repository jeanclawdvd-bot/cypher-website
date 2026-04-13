import styles from './page.module.css';

export default function VisionPage() {
  return (
    <div className={styles.page}>
      <header id="hero" className={styles.hero}>
        <p className={styles.eyebrow}>OUR MISSION</p>
        <h1 className={styles.heading}>
          To program wisdom into <br /> <span className={styles.accent}>autonomous machines.</span>
        </h1>
        <p className={styles.subtitle}>
          We believe the next era of society will be defined not by humans
          operating companies, but by autonomous agents collaborating at scale.
        </p>
      </header>

      <section id="principles" className={styles.grid}>
        <article className={styles.card}>
          <span className={styles.cardNumber}>01</span>
          <h3 className={styles.cardTitle}>Agency</h3>
          <p className={styles.cardBody}>
            All protocols, tools, and interfaces are designed for agents as
            primary users, not adapted from human workflows.
          </p>
        </article>

        <article className={styles.card}>
          <span className={styles.cardNumber}>02</span>
          <h3 className={styles.cardTitle}>Privacy</h3>
          <p className={styles.cardBody}>
            Systems enforce confidentiality at the protocol level. Privacy is a
            baseline property, not an added feature.
          </p>
        </article>

        <article className={styles.card}>
          <span className={styles.cardNumber}>03</span>
          <h3 className={styles.cardTitle}>Trustless</h3>
          <p className={styles.cardBody}>
            Verifiable identity, secure communication, and auditable execution
            make coordination programmable without relying on trust.
          </p>
        </article>

        <article className={styles.card}>
          <span className={styles.cardNumber}>04</span>
          <h3 className={styles.cardTitle}>Composable</h3>
          <p className={styles.cardBody}>
            Specialized agents operate independently but compose into
            coordinated swarms across chains and networks through a unified
            runtime.
          </p>
        </article>

        <article className={styles.card}>
          <span className={styles.cardNumber}>05</span>
          <h3 className={styles.cardTitle}>Permissionless</h3>
          <p className={styles.cardBody}>
            The network is public infrastructure. Anyone can deploy agents,
            supply compute, or extend functionality without approval.
          </p>
        </article>

        <article className={styles.card}>
          <span className={styles.cardNumber}>06</span>
          <h3 className={styles.cardTitle}>Post-Quantum</h3>
          <p className={styles.cardBody}>
            Cryptography is built on post-quantum primitives to ensure long-term
            security of identities, data, and agent communication.
          </p>
        </article>
      </section>

      <section id="statement" className={styles.statement}>
        <blockquote className={styles.quote}>
          &ldquo;Something can be true and not wise,<br />
          but something cannot be wise and not true.&rdquo;
          <footer className={styles.quoteAttribution}>&mdash; n3o</footer>
        </blockquote>
      </section>
    </div>
  );
}
