'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTheme } from './ThemeContext';
import { ArrowUpRight, ChevronRight, Menu, X, Sun, Moon, AudioLines } from 'lucide-react';
import { TypewriterText } from './TypewriterText';
import type { TypewriterSegment } from './TypewriterText';
import { SectionNav } from './SectionNav';
import { BottomWidget } from './BottomWidget';
import { useMusic } from './MusicContext';
import styles from './Nav.module.css';

interface SubItem {
  id: string;
  label: string;
  description?: string;
  href: string;
  external?: boolean;
}

interface NavSection {
  id: string;
  label: string;
  href: string;
  external?: boolean;
  blurb?: string;
  subItems?: SubItem[];
}

const sections: NavSection[] = [
  {
    id: 'products',
    label: 'Products',
    href: 'https://aura.ai',
    external: true,
    blurb: 'Software and agents built for the machine age.',
    subItems: [
      { id: 'aura', label: 'Aura', description: 'Autonomous engineering agents', href: 'https://aura.ai', external: true },
      { id: 'the-grid', label: 'The Grid', description: 'Distributed compute fabric', href: 'https://github.com/cypher-asi/the-grid', external: true },
      { id: 'zero', label: 'Zero', description: 'Private, verifiable workspace', href: 'https://zero.tech', external: true },
    ],
  },
  {
    id: 'research',
    label: 'Research',
    href: 'https://github.com/cypher-asi',
    external: true,
    blurb: 'Open work on intelligence, systems, and protocols.',
    subItems: [
      { id: 'z-chain', label: 'Z Chain', description: 'Trust layer for autonomous systems', href: 'https://zchain.org', external: true },
      { id: 'papers', label: 'Publications', description: 'Notes, papers, and experiments', href: 'https://github.com/cypher-asi', external: true },
    ],
  },
  {
    id: 'mission',
    label: 'Mission',
    href: '/vision',
    blurb: 'Why we build, and where we are going.',
    subItems: [
      { id: 'vision', label: 'Vision', description: 'The case for tools that build themselves', href: '/vision' },
    ],
  },
  {
    id: 'news',
    label: 'News',
    href: 'https://zine.live',
    external: true,
    blurb: 'Dispatches from across the network.',
    subItems: [
      { id: 'zine', label: 'Zine', description: 'Stories from the network', href: 'https://zine.live', external: true },
    ],
  },
];

function GithubIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function XIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
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
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export function Nav() {
  const [openSectionId, setOpenSectionId] = useState<string | null>('products');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const { isPlaying, toggle: toggleMusic } = useMusic();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleToggle = (id: string) => {
    setOpenSectionId((prev) => (prev === id ? null : id));
  };

  const openPanel = useCallback((id: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setHoveredId(id);
  }, []);

  const scheduleClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setHoveredId(null), 140);
  }, []);

  const expandedSegments: TypewriterSegment[] = useMemo(
    () => [
      { text: '/', style: { color: 'var(--color-text-secondary)' } },
      { text: 'CYPHER' },
    ],
    []
  );

  const activeSection = sections.find((s) => s.id === hoveredId) ?? null;

  return (
    <>
      <header className={styles.siteTopbar} onMouseLeave={scheduleClose}>
        <div className={styles.topbarInner}>
          <div className={styles.topbarLeft}>
            <Link href="/" className={styles.titleLink}>
              <TypewriterText
                segments={expandedSegments}
                speed={80}
                className={styles.brand}
              />
            </Link>
            <a
              href="https://aura.ai"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.launchButton}
            >
              Launch Agents
              <ArrowUpRight size={14} style={{ color: 'var(--color-text-secondary)' }} />
            </a>
          </div>

          <nav className={styles.topNav}>
            {sections.map((section) => {
              const inner = (
                <>
                  <span>{section.label}</span>
                  {section.external && (
                    <ArrowUpRight size={12} className={styles.topNavExternal} />
                  )}
                </>
              );
              return (
                <div
                  key={section.id}
                  className={styles.topNavItem}
                  onMouseEnter={() => openPanel(section.id)}
                  onFocus={() => openPanel(section.id)}
                >
                  {section.external ? (
                    <a
                      href={section.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${styles.topNavLink} ${hoveredId === section.id ? styles.topNavLinkActive : ''}`}
                    >
                      {inner}
                    </a>
                  ) : (
                    <Link
                      href={section.href}
                      className={`${styles.topNavLink} ${hoveredId === section.id ? styles.topNavLinkActive : ''}`}
                    >
                      {inner}
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>

          <button
            className={styles.hamburger}
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Hover mega-panel that animates down */}
        <div
          className={`${styles.megaPanel} ${activeSection ? styles.megaPanelOpen : ''}`}
          onMouseEnter={() => activeSection && openPanel(activeSection.id)}
          onMouseLeave={scheduleClose}
        >
          <div className={styles.megaInner}>
            {activeSection && (
              <>
                <div className={styles.megaLead}>
                  <span className={styles.megaTitle}>{activeSection.label}</span>
                  {activeSection.blurb && (
                    <span className={styles.megaBlurb}>{activeSection.blurb}</span>
                  )}
                </div>
                <div className={styles.megaItems}>
                  {activeSection.subItems?.map((item) =>
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
                        </span>
                        {item.description && (
                          <span className={styles.megaItemDesc}>{item.description}</span>
                        )}
                      </a>
                    ) : (
                      <Link key={item.id} href={item.href} className={styles.megaItem}>
                        <span className={styles.megaItemLabel}>{item.label}</span>
                        {item.description && (
                          <span className={styles.megaItemDesc}>{item.description}</span>
                        )}
                      </Link>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <SectionNav />
      <BottomWidget collapsed={false} onToggle={() => {}} />

      {/* Mobile drawer */}
      <div
        className={`${styles.overlay} ${mobileOpen ? styles.overlayOpen : ''}`}
        onClick={() => setMobileOpen(false)}
      />
      <div className={`${styles.drawer} ${mobileOpen ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerHeader}>
          <Link href="/" className={styles.drawerTitle} onClick={() => setMobileOpen(false)}>/CYPHER</Link>
          <button
            className={styles.drawerClose}
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <a
          href="https://aura.ai"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.drawerLaunch}
          onClick={() => setMobileOpen(false)}
        >
          Launch Agents
          <ArrowUpRight size={14} />
        </a>
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
          <button
            className={`${styles.drawerIconBtn} ${isPlaying ? styles.musicActive : ''}`}
            onClick={toggleMusic}
            aria-label={isPlaying ? 'Stop music' : 'Play music'}
          >
            <AudioLines size={15} />
          </button>
          <a
            href="https://github.com/cypher-asi"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.drawerIconBtn}
            aria-label="GitHub"
          >
            <GithubIcon size={15} />
          </a>
          <a
            href="https://x.com/aura_asi"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.drawerIconBtn}
            aria-label="X"
          >
            <XIcon size={14} />
          </a>
          <button
            className={styles.drawerIconBtn}
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {resolvedTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
    </>
  );
}
