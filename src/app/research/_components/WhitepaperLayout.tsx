'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { List, X } from 'lucide-react';
import styles from './WhitepaperLayout.module.css';

export interface TocItem {
  id: string;
  label: string;
  child?: boolean;
}

interface WhitepaperLayoutProps {
  eyebrow: string;
  title: ReactNode;
  year?: string;
  status?: string;
  lead?: ReactNode;
  sections: TocItem[];
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
  lead,
  sections,
  children,
}: WhitepaperLayoutProps) {
  const [activeId, setActiveId] = useState<string | null>(sections[0]?.id ?? null);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  // Scroll-spy: highlight the section currently nearest the top of the viewport.
  useEffect(() => {
    if (sections.length === 0) return;
    const ids = sections.map((s) => s.id);
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
  }, [sections]);

  const handleClick = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setActiveId(id);
    setMobileTocOpen(false);
    scrollToHeading(id);
  }, []);

  const tocList = (
    <ul className={styles.tocList}>
      {sections.map((s) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            className={`${styles.tocLink} ${s.child ? styles.tocChild : ''} ${
              activeId === s.id ? styles.tocLinkActive : ''
            }`}
            onClick={(e) => handleClick(e, s.id)}
          >
            {s.label}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.heading}>{title}</h1>
        {(year || status) && (
          <div className={styles.meta}>
            {status && <span className={styles.metaItem}>{status}</span>}
            {year && <span className={styles.metaItem}>{year}</span>}
          </div>
        )}
        {lead && <div className={styles.lead}>{lead}</div>}
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar} aria-label="Table of contents">
          <nav className={styles.tocSticky}>
            <p className={styles.tocTitle}>Contents</p>
            {tocList}
          </nav>
        </aside>

        {/* Mobile contents disclosure */}
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
          {mobileTocOpen && <nav className={styles.mobileTocPanel}>{tocList}</nav>}
        </div>

        <article className={styles.content}>{children}</article>
      </div>
    </div>
  );
}
