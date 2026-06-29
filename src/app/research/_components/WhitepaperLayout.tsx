'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { List, X } from 'lucide-react';
import { TableOfContents } from './TableOfContents';
import { CustomScrollbar } from '@/components/CustomScrollbar';
import { flattenToc, type TocNode } from './toc';
import styles from './WhitepaperLayout.module.css';

export type { TocNode } from './toc';

interface WhitepaperLayoutProps {
  eyebrow: string;
  title: ReactNode;
  year?: string;
  status?: string;
  author?: string;
  lead?: ReactNode;
  sections: TocNode[];
  children: ReactNode;
}

function scrollToHeading(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const header = document.querySelector('header');
  const offset = (header ? header.getBoundingClientRect().height : 84) + 24;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: 'smooth' });
}

export function WhitepaperLayout({
  eyebrow,
  title,
  year,
  status,
  author,
  lead,
  sections,
  children,
}: WhitepaperLayoutProps) {
  const flat = useMemo(() => flattenToc(sections), [sections]);
  const [activeId, setActiveId] = useState<string | null>(flat[0]?.id ?? null);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const tocScrollRef = useRef<HTMLElement>(null);

  // Scroll-spy: highlight the section currently nearest the top of the viewport.
  useEffect(() => {
    if (flat.length === 0) return;
    const ids = flat.map((s) => s.id);
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.intersectionRatio);
          } else {
            visible.delete(entry.target.id);
          }
        }
        // Pick the topmost section among those currently in view.
        let bestId: string | null = null;
        let bestTop = Infinity;
        for (const el of els) {
          if (!visible.has(el.id)) continue;
          const top = el.getBoundingClientRect().top;
          if (top < bestTop) {
            bestTop = top;
            bestId = el.id;
          }
        }
        if (bestId) setActiveId(bestId);
      },
      { rootMargin: '-120px 0px -65% 0px', threshold: [0, 1] }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [flat]);

  const handleSelect = useCallback((id: string) => {
    setActiveId(id);
    setMobileTocOpen(false);
    scrollToHeading(id);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.body}>
        <aside className={styles.sidebar} aria-label="Table of contents">
          <nav ref={tocScrollRef} className={styles.tocSticky} data-toc-scroll>
            <p className={styles.tocTitle}>Contents</p>
            <TableOfContents items={sections} activeId={activeId} onSelect={handleSelect} />
            <CustomScrollbar targetRef={tocScrollRef} showOnHoverOnly />
          </nav>
        </aside>

        <div className={styles.main}>
          <header className={styles.hero}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1 className={styles.heading}>{title}</h1>
            {(year || status || author) && (
              <div className={styles.meta}>
                {status && <span className={styles.metaItem}>{status}</span>}
                {author && <span className={styles.metaItem}>By {author}</span>}
                {year && <span className={styles.metaItem}>{year}</span>}
              </div>
            )}
            {lead && <div className={styles.lead}>{lead}</div>}
          </header>

          {/* Mobile contents disclosure (hidden on desktop) */}
          <div className={styles.mobileToc}>
            <button
              type="button"
              className={styles.mobileTocToggle}
              aria-expanded={mobileTocOpen}
              onClick={() => setMobileTocOpen((v) => !v)}
            >
              {mobileTocOpen ? <X size={15} /> : <List size={15} />}
              <span>Contents</span>
            </button>
            {mobileTocOpen && (
              <nav className={styles.mobileTocPanel}>
                <TableOfContents items={sections} activeId={activeId} onSelect={handleSelect} />
              </nav>
            )}
          </div>

          <article className={styles.content}>{children}</article>
        </div>
      </div>
    </div>
  );
}
