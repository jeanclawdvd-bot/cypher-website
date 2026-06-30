'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import styles from './ImageAccordion.module.css';

export type AccordionItem = {
  id: string;
  title: string;
  description: string;
  image: string;
  /** Optional CTA target. When omitted, no button is rendered. */
  href?: string;
  /** Render the CTA as an external anchor instead of a Next.js link. */
  external?: boolean;
  /** CTA label. Defaults to `Enter ${title}`. */
  ctaLabel?: string;
};

function AccordionPanel({
  item,
  isActive,
  onActivate,
}: {
  item: AccordionItem;
  isActive: boolean;
  onActivate: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  // Defer flipping to "loaded" until the next frame so the browser first paints
  // the opacity:0 state -- otherwise cached images would snap in with no fade.
  const markLoaded = useCallback(() => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setLoaded(true)),
    );
  }, []);

  // Cover images already cached/complete when the node mounts (onLoad may have
  // fired before React attached its handler); the handler covers the network
  // case.
  const imgRef = useCallback(
    (node: HTMLImageElement | null) => {
      if (node?.complete && node.naturalWidth > 0) markLoaded();
    },
    [markLoaded],
  );

  const ctaLabel = item.ctaLabel ?? `Enter ${item.title}`;

  return (
    <div
      className={`${styles.panel} ${isActive ? styles.panelActive : ''}`}
      onMouseEnter={onActivate}
      onFocus={onActivate}
    >
      <img
        ref={imgRef}
        className={`${styles.bg} ${loaded ? styles.bgLoaded : ''}`}
        src={item.image}
        alt=""
        aria-hidden
        onLoad={markLoaded}
      />
      <div className={styles.scrim} aria-hidden />

      <span className={styles.label}>{item.title}</span>

      <div className={styles.content}>
        <h3 className={styles.contentTitle}>{item.title}</h3>
        <p className={styles.contentDesc}>{item.description}</p>
        {item.href ? (
          item.external ? (
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`sci-btn sci-btn-primary ${styles.contentButton}`}
            >
              {ctaLabel}
              <ArrowRight size={15} />
            </a>
          ) : (
            <Link
              href={item.href}
              className={`sci-btn sci-btn-primary ${styles.contentButton}`}
            >
              {ctaLabel}
              <ArrowRight size={15} />
            </Link>
          )
        ) : null}
      </div>
    </div>
  );
}

export default function ImageAccordion({ items }: { items: AccordionItem[] }) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id);

  return (
    <div className={styles.row}>
      {items.map((item) => (
        <AccordionPanel
          key={item.id}
          item={item}
          isActive={item.id === activeId}
          onActivate={() => setActiveId(item.id)}
        />
      ))}
    </div>
  );
}
