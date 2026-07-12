'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { SectionHeader } from '@/components/SectionHeader';
import LazyVideo from './LazyVideo';
import { GHOSTLINE_PASSES } from './ghostline';
import styles from './GhostlineStore.module.css';

/** Ghostline drop storefront: the offer rail changes the featured content in
 * place. Only the featured hero and its Buy Now action enter the offer funnel. */
export default function GhostlineStore() {
  const [previewId, setPreviewId] = useState(GHOSTLINE_PASSES[0].id);
  const featured =
    GHOSTLINE_PASSES.find((p) => p.id === previewId) ?? GHOSTLINE_PASSES[0];

  return (
    <div className={styles.page}>
      {/* ── Featured + rail ── */}
      <section className={styles.storeRow}>
        <Link href={`/vehicles/${featured.id}`} className={styles.featured}>
          <video
            key={featured.id}
            className={styles.featuredVideo}
            src={featured.video}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          />
          <span className={styles.featuredScrim} aria-hidden />
          <span className={styles.featuredCat}>
            <span className={styles.dot} aria-hidden />
            {featured.tier}
          </span>
          <span className={styles.featuredName}>{featured.name}</span>
          <span className={styles.featuredPrice}>{featured.price}</span>
          <span className={`sci-btn sci-btn-primary ${styles.featuredBuy}`}>
            Buy Now <ArrowUpRight size={16} strokeWidth={2.4} />
          </span>
        </Link>

        <div className={styles.rail}>
          {GHOSTLINE_PASSES.map((pass) => (
            <button
              type="button"
              key={pass.id}
              className={`${styles.railItem} ${pass.id === previewId ? styles.railItemActive : ''}`}
              onMouseEnter={() => setPreviewId(pass.id)}
              onFocus={() => setPreviewId(pass.id)}
              onClick={() => setPreviewId(pass.id)}
              aria-pressed={pass.id === previewId}
              aria-label={`Preview ${pass.name}`}
            >
              <span className={styles.railThumb}>
                <video
                  src={pass.video}
                  poster={`/images/wilder-world/mobile/${pass.poster}_mobile.webp`}
                  muted
                  playsInline
                  preload="metadata"
                />
              </span>
              <span className={styles.railLabel}>
                {pass.name}
                <span className={styles.railPrice}>{pass.price}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Pass cards ── */}
      <section className={styles.passSection}>
        <SectionHeader
          title="Two cars. One compound. Your call."
          subtitle="Both passes carry the same full compound access for three months. The only question is what you drive out of the garage."
        />
        <div className={styles.passGrid}>
          {GHOSTLINE_PASSES.map((pass) => (
            <Link key={pass.id} href={`/vehicles/${pass.id}`} className={styles.passCard}>
              <span className={styles.passMedia}>
                <LazyVideo
                  src={pass.video}
                  poster={pass.poster}
                  className={styles.passMediaFrame}
                  mediaClassName={styles.passMediaVideo}
                />
              </span>
              <span className={styles.passBody}>
                <span className={styles.passCat}>
                  <span className={styles.dot} aria-hidden />
                  {pass.tier}
                </span>
                <span className={styles.passName}>{pass.name}</span>
                <ul className={styles.passList}>
                  {pass.contents.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <span className={styles.passFoot}>
                  <span className={styles.passPrice}>{pass.price}</span>
                  <span className={`sci-btn sci-btn-primary ${styles.passBuy}`}>
                    Buy Now <ArrowUpRight size={15} strokeWidth={2.4} />
                  </span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
