import { AsciiCube } from './_components/AsciiCube';
import { Headline } from './_components/Headline';
import styles from './page.module.css';

export default function Home() {
  return (
    <>
      <Headline />
      <div className={styles.page}>
        <div className={styles.stage}>
          <div className={styles.frame}>
            <span className={`${styles.corner} ${styles.cornerTL}`} />
            <span className={`${styles.corner} ${styles.cornerTR}`} />
            <span className={`${styles.corner} ${styles.cornerBL}`} />
            <span className={`${styles.corner} ${styles.cornerBR}`} />
            <AsciiCube className={styles.asciiPanel} forceLight />
          </div>
        </div>
        <div className={styles.bottomSpacer} />
      </div>
    </>
  );
}
