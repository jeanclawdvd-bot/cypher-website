import Image from 'next/image';
import type { Block } from '../zero-os/content';
import styles from './WhitepaperBody.module.css';

function isTopLevel(num: string) {
  return /^\d+\.0$/.test(num) || num.startsWith('Appendix');
}

export function WhitepaperBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className={styles.body}>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'h': {
            const top = isTopLevel(block.num);
            const HeadingTag = top ? 'h2' : 'h3';
            return (
              <HeadingTag
                key={i}
                id={block.id}
                className={`${styles.heading} ${top ? styles.h2 : styles.h3}`}
              >
                <span className={styles.headingNum}>{block.num}</span>
                {block.title}
              </HeadingTag>
            );
          }
          case 'p':
            return (
              <p key={i} className={styles.paragraph}>
                {block.text}
              </p>
            );
          case 'ul':
            return (
              <ul key={i} className={styles.list}>
                {block.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i} className={styles.list}>
                {block.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ol>
            );
          case 'figure':
            return (
              <figure key={i} className={styles.figure}>
                <Image
                  src={block.src}
                  width={block.w}
                  height={block.h}
                  alt={block.caption ?? 'Whitepaper figure'}
                  sizes="(max-width: 880px) 100vw, 720px"
                  className={styles.figureImg}
                  unoptimized
                />
                {block.caption && (
                  <figcaption className={styles.figcaption}>{block.caption}</figcaption>
                )}
              </figure>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
