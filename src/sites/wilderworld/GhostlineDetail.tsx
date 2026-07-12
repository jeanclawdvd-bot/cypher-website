'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Check, ExternalLink } from 'lucide-react';
import type { GhostlinePass } from './ghostline';
import styles from './GhostlineStore.module.css';

const EARLY_ACCESS_URL =
  'https://store.epicgames.com/p/wilder-world-wilder-world-alpha-b4ccf8?lang=en-US';

/** Pass detail page. The media gallery stays within the selected offer so the
 * shopper continues forward through the purchase funnel. */
export default function GhostlineDetail({ pass }: { pass: GhostlinePass }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeMedia = pass.media[activeIndex];

  return (
    <div className={`${styles.page} ${styles.detailPage}`}>
      <div className={styles.detailRow}>
        <div className={styles.detailMedia}>
          <div className={styles.viewer}>
            {activeMedia.type === 'video' ? (
              <video
                key={activeMedia.src}
                src={activeMedia.src}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              <Image
                key={activeMedia.src}
                src={activeMedia.src}
                alt={activeMedia.alt}
                fill
                priority
                sizes="(max-width: 980px) 100vw, 58vw"
              />
            )}
          </div>
          <div className={styles.thumbRow} aria-label={`${pass.name} media gallery`}>
            {pass.media.map((media, index) => (
              <button
                type="button"
                key={media.src}
                onClick={() => setActiveIndex(index)}
                className={`${styles.thumb} ${index === activeIndex ? styles.thumbActive : ''}`}
                aria-label={`View ${media.label}`}
                aria-pressed={index === activeIndex}
              >
                {media.type === 'video' ? (
                  <video
                    src={media.src}
                    poster={`/images/wilder-world/mobile/${pass.poster}_mobile.webp`}
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <Image src={media.src} alt="" fill sizes="104px" />
                )}
              </button>
            ))}
          </div>
          <p className={styles.viewerCap}>
            {activeIndex + 1} / {pass.media.length} — {activeMedia.label}
          </p>
        </div>

        <div className={styles.detailInfo}>
          <h1 className={styles.detailName}>{pass.name}</h1>
          <p className={styles.detailBlurb}>{pass.blurb}</p>
          <div className={styles.detailBuyRow}>
            <span className={styles.detailPrice}>{pass.price}</span>
            <Link href={`/vehicles/${pass.id}/checkout`} className="sci-btn sci-btn-primary">
              Buy Now <ArrowUpRight size={16} strokeWidth={2.4} />
            </Link>
          </div>
          <section className={styles.includes} aria-label="Includes">
            <p className={styles.includesTitle}>Includes</p>
            {pass.includes.map((line) => (
              <div key={line.label} className={styles.incLine}>
                <Check className={styles.incTick} size={15} strokeWidth={3} aria-hidden />
                <span>
                  {line.label}
                  {line.detail && <span className={styles.incDetail}>{line.detail}</span>}
                  {line.children && (
                    <ul className={styles.incChildren}>
                      {line.children.map((child) => (
                        <li key={child.label}>
                          <span>{child.label}</span>
                          {child.detail && (
                            <span className={styles.incChildDetail}>{child.detail}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </span>
              </div>
            ))}
          </section>
          <aside className={styles.notice}>
            <span>This pass includes SUPER EARLY ACCESS to Wilder World.</span>
            <a href={EARLY_ACCESS_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={13} aria-hidden /> View
            </a>
          </aside>
        </div>
      </div>
    </div>
  );
}
