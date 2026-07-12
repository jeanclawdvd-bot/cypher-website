'use client';

import Link from 'next/link';
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { GHOSTLINE_PASSES, type GhostlinePass } from './ghostline';
import styles from './GhostlineStore.module.css';

const EARLY_ACCESS_URL =
  'https://store.epicgames.com/p/wilder-world-wilder-world-alpha-b4ccf8?lang=en-US';

/** Pass detail page: media viewer left; name, description, price, INCLUDES
 *  checklist and Early Access notice right. Thumbnails walk between passes. */
export default function GhostlineDetail({ pass }: { pass: GhostlinePass }) {
  const index = GHOSTLINE_PASSES.findIndex((p) => p.id === pass.id);
  const prev = GHOSTLINE_PASSES[(index + GHOSTLINE_PASSES.length - 1) % GHOSTLINE_PASSES.length];
  const next = GHOSTLINE_PASSES[(index + 1) % GHOSTLINE_PASSES.length];

  return (
    <div className={styles.page}>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span className={styles.crumbSep} aria-hidden>
          {'\u203A'}
        </span>
        <Link href="/ghostline">Ghostline</Link>
        <span className={styles.crumbSep} aria-hidden>
          {'\u203A'}
        </span>
        <span>{pass.name}</span>
      </nav>

      <div className={styles.detailRow}>
        <div>
          <div className={styles.viewer}>
            <video
              key={pass.id}
              src={pass.video}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
            />
          </div>
          <p className={styles.viewerCap}>{pass.name}</p>
          <div className={styles.thumbRow}>
            <Link href={`/ghostline/${prev.id}`} className={styles.thumbArrow} aria-label="Previous pass">
              <ChevronLeft size={20} />
            </Link>
            {GHOSTLINE_PASSES.map((p) => (
              <Link
                key={p.id}
                href={`/ghostline/${p.id}`}
                className={`${styles.thumb} ${p.id === pass.id ? styles.thumbActive : ''}`}
                aria-label={p.name}
              >
                <video src={p.video} muted playsInline preload="metadata" />
              </Link>
            ))}
            <Link href={`/ghostline/${next.id}`} className={styles.thumbArrow} aria-label="Next pass">
              <ChevronRight size={20} />
            </Link>
          </div>
        </div>

        <div>
          <h1 className={styles.detailName}>{pass.name}</h1>
          <p className={styles.detailBlurb}>{pass.blurb}</p>
          <div className={styles.detailBuyRow}>
            <span className={styles.detailPrice}>{pass.price}</span>
            <Link href={`/ghostline/${pass.id}/checkout`} className="sci-btn sci-btn-primary">
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
                </span>
              </div>
            ))}
          </section>
          <aside className={styles.notice}>
            <span>
              This pass does not include access to Wilder World. To play, EARLY ACCESS on Epic
              Games is required.
            </span>
            <a href={EARLY_ACCESS_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={13} aria-hidden /> View
            </a>
          </aside>
        </div>
      </div>
    </div>
  );
}
