'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PageSection } from '@/lib/companies/types';
import styles from './SectionNav.module.css';

export function SectionNav({ sections }: { sections: PageSection[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!sections?.length) return;

    setActiveId(sections[0].id);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    for (const { id } of sections) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sections]);

  const handleClick = useCallback((id: string) => {
    const section = document.getElementById(id);
    if (!section) return;
    const inner = (section.firstElementChild as HTMLElement) ?? section;
    const rect = inner.getBoundingClientRect();
    const topbarHeight = 56;
    const visibleHeight = window.innerHeight - topbarHeight;
    const elementCenter = window.scrollY + rect.top + rect.height / 2;
    const scrollTarget = elementCenter - topbarHeight - visibleHeight / 2;
    window.scrollTo({ top: scrollTarget, behavior: 'smooth' });
  }, []);

  if (!sections?.length) return null;

  return (
    <div className={styles.wrapper}>
      <nav className={styles.sectionNav}>
        {sections.map(({ id, label }) => (
          <button
            key={id}
            className={`${styles.item} ${activeId === id ? styles.active : ''}`}
            onClick={() => handleClick(id)}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
