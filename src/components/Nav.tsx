'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight, ChevronRight, Menu, X } from 'lucide-react';
import { TypewriterText } from './TypewriterText';
import type { TypewriterSegment } from './TypewriterText';
import { SectionNav } from './SectionNav';
import { scrollToSection } from './scrollToSection';
import type { NavSection, PageSection } from '@/lib/companies/types';
import styles from './Nav.module.css';

const GITHUB_ORG = 'https://github.com/cypher-asi';

function GithubIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

/* ----------------------------------------------------------------------------
   Mobile accordion section
   ---------------------------------------------------------------------------- */
function AccordionSection({
  section,
  isOpen,
  onToggle,
  onNavigate,
}: {
  section: NavSection;
  isOpen: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const hasChildren = section.subItems && section.subItems.length > 0;

  if (!hasChildren) {
    if (section.external) {
      return (
        <div className={styles.section}>
          <a href={section.href} target="_blank" rel="noopener noreferrer" className={styles.sectionTrigger}>
            <span>{section.label}</span>
          </a>
        </div>
      );
    }
    return (
      <div className={styles.section}>
        <Link href={section.href} className={styles.sectionTrigger} onClick={onNavigate}>
          <span>{section.label}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <button
        className={`${styles.sectionTrigger} ${isOpen ? styles.sectionTriggerOpen : ''}`}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span>{section.label}</span>
        <ChevronRight size={12} className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
      </button>
      <div className={`${styles.accordionContent} ${isOpen ? styles.accordionContentOpen : ''}`}>
        <div className={styles.accordionInner}>
          {section.subItems!.map((item) =>
            item.external ? (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.subItemLink}
              >
                {item.label}
                <ArrowUpRight size={10} className={styles.externalIcon} />
              </a>
            ) : (
              <Link key={item.id} href={item.href} className={styles.subItemLink} onClick={onNavigate}>
                {item.label}
                {item.year && <span className={styles.yearTick}>{item.year}</span>}
              </Link>
            )
          )}
          {section.repoSection && (
            <>
              <div className={styles.accordionGroupHeader}>
                <GithubIcon size={11} />
                {section.repoSection.heading}
              </div>
              {section.repoSection.columns.flat().map((group) => (
                <div key={group.project} className={styles.accordionRepoGroup}>
                  <p className={styles.accordionRepoProject}>{group.project}</p>
                  {group.repos.map((repo) => (
                    <a
                      key={repo.name}
                      href={`${GITHUB_ORG}/${repo.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.subItemLink}
                    >
                      {repo.name}
                      <ArrowUpRight size={10} className={styles.externalIcon} />
                    </a>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function Nav({
  wordmark,
  wordmarkLogo,
  cta,
  sections,
  pageSections,
}: {
  wordmark: string;
  wordmarkLogo?: { src: string; alt: string };
  cta?: { label: string; href: string; external?: boolean };
  sections: NavSection[];
  pageSections: PageSection[];
}) {
  const [openSectionId, setOpenSectionId] = useState<string | null>('products');
  const [displayedSection, setDisplayedSection] = useState<NavSection | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelHeight, setPanelHeight] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [overLightBg, setOverLightBg] = useState<string | null>(null);
  const [brandKey, setBrandKey] = useState(0);
  const [brandTyped, setBrandTyped] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const megaContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Hide the topbar when scrolling down, reveal it when scrolling up (and at the
  // very bottom). Also sample whatever background sits just beneath the bar so
  // its scrim + text adapt to the section behind it (dark vs light).
  useEffect(() => {
    const NAV_HEIGHT = 84;
    let lastY = window.scrollY;
    let ticking = false;

    // Walk up from the point just below the bar to the nearest element with an
    // opaque background, then decide light/dark by relative luminance.
    const sampleLightBg = (): string | null => {
      const x = Math.round(window.innerWidth / 2);
      // Sample at the bar's vertical center (where the text sits) rather than
      // just below it, so the theme only flips once the section is actually
      // behind the header -- not while the bar still overlaps the dark section.
      const y = Math.round(NAV_HEIGHT / 2);
      // The header is fixed (z-index 100), so elementFromPoint at this pixel
      // would return the header itself -- whose ancestors are all transparent.
      // Walk the full hit stack instead and only consider the page content
      // (#page-main), skipping the header and other fixed chrome, so we read
      // the section that actually sits behind the bar.
      const main = document.getElementById('page-main');
      if (!main) return null;
      const stack = document.elementsFromPoint(x, y) as HTMLElement[];
      for (const el of stack) {
        if (!main.contains(el)) continue;
        const c = getComputedStyle(el).backgroundColor;
        const m = c.match(/^rgba?\(([^)]+)\)/);
        if (!m) continue;
        const parts = m[1].split(',').map((s) => parseFloat(s));
        const [r, g, b] = parts;
        const a = parts[3] === undefined ? 1 : parts[3];
        if (a > 0.1) {
          const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          return lum > 0.5 ? `rgb(${r}, ${g}, ${b})` : null;
        }
      }
      return null;
    };

    const update = () => {
      const y = window.scrollY;
      const atBottom =
        window.innerHeight + y >= document.documentElement.scrollHeight - 4;
      if (y <= 80 || atBottom) {
        setHidden(false);
      } else if (y > lastY) {
        setHidden(true);
      } else if (y < lastY) {
        setHidden(false);
      }
      lastY = y;

      setOverLightBg(sampleLightBg());
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const handleToggle = (id: string) => {
    setOpenSectionId((prev) => (prev === id ? null : id));
  };

  const openPanel = useCallback((id: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (unmountTimer.current) clearTimeout(unmountTimer.current);
    const next = sections.find((s) => s.id === id) ?? null;
    if (next) setDisplayedSection(next);
    setPanelOpen(true);
  }, []);

  const scheduleClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setPanelOpen(false), 140);
  }, []);

  // Clicking the CYPHER wordmark replays the typewriter animation and closes
  // the mega-panel if it is open.
  const handleBrandClick = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setPanelOpen(false);
    setBrandTyped(false);
    setBrandKey((k) => k + 1);
  }, []);

  // Clicking a top-nav section closes the mega-panel immediately (which also
  // removes the page blur via the panelOpen effect below).
  const closePanelNow = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setPanelOpen(false);
  }, []);

  // Measure and apply the panel height whenever the displayed section or open
  // state changes. On open we hold the current height for two animation frames
  // (forcing the browser to paint the starting height) and then set the measured
  // target, which guarantees the `height` CSS transition fires -- the panel
  // animates down on open, up on close, and smoothly between heights when
  // switching sections.
  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    if (panelOpen && displayedSection) {
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setPanelHeight(megaContentRef.current?.scrollHeight ?? 0);
        });
      });
    } else {
      setPanelHeight(0);
    }
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [displayedSection, panelOpen]);

  // Re-measure on viewport changes while open.
  useEffect(() => {
    if (!panelOpen) return;
    const el = megaContentRef.current;
    if (!el) return;
    const measure = () => {
      if (megaContentRef.current) {
        setPanelHeight(megaContentRef.current.scrollHeight);
      }
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [panelOpen, displayedSection]);

  // Clear timers on unmount.
  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
    };
  }, []);

  // Blur the page content beneath the topbar while the mega-panel is open.
  useEffect(() => {
    const main = document.getElementById('page-main');
    if (!main) return;
    main.classList.toggle('page-blurred', panelOpen);
    return () => main.classList.remove('page-blurred');
  }, [panelOpen]);

  const handlePanelTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.propertyName === 'height' && !panelOpen) {
        setDisplayedSection(null);
      }
    },
    [panelOpen]
  );

  const expandedSegments: TypewriterSegment[] = useMemo(
    () => [
      { text: '/', style: { color: 'var(--color-text-secondary)' } },
      { text: wordmark, className: styles.brandLetters },
    ],
    [wordmark]
  );

  const activeId = panelOpen ? displayedSection?.id ?? null : null;

  return (
    <>
      <header
        className={`${styles.siteTopbar} ${panelOpen ? styles.siteTopbarOpen : ''} ${hidden && !panelOpen ? styles.siteTopbarHidden : ''} ${overLightBg && !panelOpen ? styles.siteTopbarLight : ''}`}
        style={
          overLightBg
            ? ({ ['--site-fade-to']: overLightBg } as React.CSSProperties)
            : undefined
        }
        onMouseLeave={scheduleClose}
      >
        <div className={styles.topbarInner}>
          <div className={styles.topbarLeft} onMouseEnter={scheduleClose}>
            <Link href="/" className={styles.titleLink} onClick={handleBrandClick}>
              {wordmarkLogo ? (
                <img className={styles.brandLogo} src={wordmarkLogo.src} alt={wordmarkLogo.alt} />
              ) : (
                <TypewriterText
                  key={brandKey}
                  segments={expandedSegments}
                  speed={80}
                  className={`${styles.brand} ${brandTyped ? styles.brandFilled : ''}`}
                  onComplete={() => setBrandTyped(true)}
                />
              )}
            </Link>
          </div>

          <nav className={styles.topNav}>
            {sections.map((section) => {
              const inner = <span>{section.label}</span>;
              const linkClass = `${styles.topNavLink} ${activeId === section.id ? styles.topNavLinkActive : ''}`;
              return (
                <div
                  key={section.id}
                  className={styles.topNavItem}
                  onMouseEnter={() => (section.noPanel ? scheduleClose() : openPanel(section.id))}
                  onMouseLeave={scheduleClose}
                  onFocus={() => (section.noPanel ? scheduleClose() : openPanel(section.id))}
                >
                  {section.noPanel ? (
                    section.external ? (
                      <a
                        href={section.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={linkClass}
                        onClick={closePanelNow}
                      >
                        {inner}
                      </a>
                    ) : (
                      <Link href={section.href} className={linkClass} onClick={closePanelNow}>
                        {inner}
                      </Link>
                    )
                  ) : (
                    // Sections with a mega-panel are not navigable; the label only
                    // opens the panel (its sub-items are the actual links).
                    <button
                      type="button"
                      className={linkClass}
                      aria-expanded={activeId === section.id}
                      onClick={() => openPanel(section.id)}
                    >
                      {inner}
                    </button>
                  )}
                </div>
              );
            })}
          </nav>

          <div className={styles.topbarRight} onMouseEnter={scheduleClose}>
            <a
              href="https://github.com/cypher-asi"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.topbarGithub}
              aria-label="GitHub"
            >
              <GithubIcon size={16} />
            </a>
            {cta ? (
              <a
                href={cta.href}
                target={cta.external ? '_blank' : undefined}
                rel={cta.external ? 'noopener noreferrer' : undefined}
                className="sci-btn sci-btn-primary"
              >
                {cta.label}
                <ArrowUpRight size={14} />
              </a>
            ) : (
              <button
                type="button"
                className={styles.launchButton}
                onClick={() => scrollToSection('what-we-do')}
              >
                Mission
                <ArrowDown size={14} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            )}
            <button
              className={styles.hamburger}
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* Hover mega-panel that animates down on open and up on close */}
        <div
          className={`${styles.megaPanel} ${panelOpen ? styles.megaPanelOpen : ''}`}
          style={{ height: panelHeight }}
          onMouseEnter={() => displayedSection && openPanel(displayedSection.id)}
          onMouseLeave={scheduleClose}
          onTransitionEnd={handlePanelTransitionEnd}
        >
          <div className={styles.megaInner}>
            <div
              ref={megaContentRef}
              className={`${styles.megaContent} ${panelOpen ? styles.megaContentVisible : ''}`}
            >
              {displayedSection && (
                <>
                  <div className={styles.megaLead}>
                    {displayedSection.external || displayedSection.noPanel ? (
                      <span className={styles.megaTitle}>{displayedSection.label}</span>
                    ) : (
                      <Link href={displayedSection.href} className={styles.megaTitle} onClick={closePanelNow}>
                        {displayedSection.label}
                      </Link>
                    )}
                    {displayedSection.blurb && (
                      <span className={styles.megaBlurb}>{displayedSection.blurb}</span>
                    )}
                  </div>
                  <div className={styles.megaItems}>
                    {displayedSection.subItems?.map((item) =>
                      item.external ? (
                        <a
                          key={item.id}
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.megaItem}
                        >
                          <span className={styles.megaItemLabel}>
                            {item.label}
                            <ArrowUpRight size={12} className={styles.megaItemIcon} />
                            {item.year && <span className={styles.yearTick}>{item.year}</span>}
                          </span>
                          {item.description && (
                            <span className={styles.megaItemDesc}>{item.description}</span>
                          )}
                        </a>
                      ) : (
                        <Link key={item.id} href={item.href} className={styles.megaItem} onClick={closePanelNow}>
                          <span className={styles.megaItemLabel}>
                            {item.label}
                            {item.year && <span className={styles.yearTick}>{item.year}</span>}
                          </span>
                          {item.description && (
                            <span className={styles.megaItemDesc}>{item.description}</span>
                          )}
                        </Link>
                      )
                    )}
                  </div>

                  {displayedSection.repoSection && (
                    <div className={styles.megaRepoSection}>
                      <div className={styles.megaRepoHead}>
                        <span className={styles.megaGroupLabel}>
                          <GithubIcon size={12} />
                          {displayedSection.repoSection.heading}
                        </span>
                        <a
                          href={displayedSection.repoSection.allHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.megaRepoAll}
                        >
                          All repositories
                          <ArrowUpRight size={11} className={styles.megaItemIcon} />
                        </a>
                      </div>
                      <div className={styles.megaRepoGrid}>
                        {displayedSection.repoSection.columns.map((column, colIndex) => (
                          <div key={colIndex} className={styles.megaRepoColumn}>
                            {column.map((group) => (
                              <div key={group.project} className={styles.megaRepoGroup}>
                                <h4 className={styles.megaRepoGroupHeading}>{group.project}</h4>
                                <div className={styles.megaRepoList}>
                                  {group.repos.map((repo) => (
                                    <a
                                      key={repo.name}
                                      href={`${GITHUB_ORG}/${repo.name}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={styles.megaRepoItem}
                                    >
                                      <span className={styles.megaRepoName}>
                                        {repo.name}
                                        <ArrowUpRight size={11} className={styles.megaItemIcon} />
                                      </span>
                                      <span className={styles.megaRepoDesc}>{repo.description}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <SectionNav sections={pageSections} />

      {/* Mobile drawer */}
      <div
        className={`${styles.overlay} ${mobileOpen ? styles.overlayOpen : ''}`}
        onClick={() => setMobileOpen(false)}
      />
      <div className={`${styles.drawer} ${mobileOpen ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerHeader}>
          <Link href="/" className={styles.drawerTitle} onClick={() => setMobileOpen(false)}>
            {wordmarkLogo ? (
              <img className={styles.brandLogo} src={wordmarkLogo.src} alt={wordmarkLogo.alt} />
            ) : (
              `/${wordmark}`
            )}
          </Link>
          <button
            className={styles.drawerClose}
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        {cta ? (
          <a
            href={cta.href}
            target={cta.external ? '_blank' : undefined}
            rel={cta.external ? 'noopener noreferrer' : undefined}
            className={`sci-btn sci-btn-primary ${styles.drawerCta}`}
            onClick={() => setMobileOpen(false)}
          >
            {cta.label}
            <ArrowUpRight size={14} />
          </a>
        ) : (
          <button
            type="button"
            className={styles.drawerLaunch}
            onClick={() => {
              setMobileOpen(false);
              scrollToSection('what-we-do');
            }}
          >
            Mission
            <ArrowDown size={14} />
          </button>
        )}
        <div className={styles.drawerNav}>
          {sections.map((section) => (
            <AccordionSection
              key={section.id}
              section={section}
              isOpen={openSectionId === section.id}
              onToggle={() => handleToggle(section.id)}
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </div>
        <div className={styles.drawerFooter}>
          <a
            href="https://github.com/cypher-asi"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.drawerIconBtn}
            aria-label="GitHub"
          >
            <GithubIcon size={15} />
          </a>
        </div>
      </div>
    </>
  );
}
