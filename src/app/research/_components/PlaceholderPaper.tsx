import { WhitepaperLayout } from './WhitepaperLayout';
import type { Paper } from './papers';
import styles from './PlaceholderPaper.module.css';

export function PlaceholderPaper({ paper }: { paper: Paper }) {
  return (
    <WhitepaperLayout
      eyebrow="Research / Whitepaper"
      title={paper.title}
      status="Coming soon"
      year={paper.year}
      lead={<p>{paper.blurb}</p>}
      sections={[{ id: 'overview', label: 'Overview' }]}
    >
      <div className={styles.placeholder}>
        <h2 id="overview" className={styles.heading}>
          Overview
        </h2>
        <p className={styles.text}>
          This whitepaper is in preparation. Check back soon, or follow our work on{' '}
          <a href="https://github.com/cypher-asi" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          .
        </p>
      </div>
    </WhitepaperLayout>
  );
}
