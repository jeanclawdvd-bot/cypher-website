'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Topbar, useTheme } from '@cypher-asi/zui';
import { ArrowUpRight, ChevronRight, Menu, X, Sun, Moon, FileText } from 'lucide-react';
import { TypewriterText } from './TypewriterText';
import type { TypewriterSegment } from './TypewriterText';
import { SectionNav } from './SectionNav';
import { BottomWidget } from './BottomWidget';
import styles from './Nav.module.css';

interface SubItem {
  id: string;
  label: string;
  href?: string;
  external?: boolean;
}

interface NavSection {
  id: string;
  label: string;
  href?: string;
  external?: boolean;
  subItems?: SubItem[];
}

const sections: NavSection[] = [
  {
    id: 'projects',
    label: 'NETWORKS',
    subItems: [
      { id: 'aura', label: 'AURA', href: 'https://aura.ai', external: true },
      { id: 'zero', label: 'ZERO', href: 'https://zero.tech', external: true },
      { id: 'wilder-world', label: 'WILDER WORLD', href: 'https://wilderworld.com', external: true },
      { id: 'z-chain', label: 'Z CHAIN', href: 'https://zchain.org', external: true },
      { id: 'the-grid', label: 'THE GRID', href: 'https://thegrid.com', external: true },
    ],
  },
  {
    id: 'protocols',
    label: 'PROTOCOLS',
    subItems: [
      { id: 'zid', label: 'ZID', href: '/protocols/zid' },
      { id: 'zns', label: 'ZNS', href: '/protocols/zns' },
      { id: 'aura-os', label: 'AURA OS', href: '/protocols/aura-os' },
      { id: 'the-grid', label: 'THE GRID', href: '/protocols/the-grid' },
    ],
  },
  { id: 'mission', label: 'MISSION', href: '/vision' },
  { id: 'news', label: 'NEWS', href: 'https://zine.live', external: true },
];

function AccordionSection({
  section,
  isOpen,
  onToggle,
}: {
  section: NavSection;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const hasChildren = section.subItems && section.subItems.length > 0;

  if (!hasChildren) {
    if (section.external) {
      return (
        <div className={styles.section}>
          <a
            href={section.href!}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.sectionTrigger}
          >
            <span>{section.label}</span>
          </a>
        </div>
      );
    }
    return (
      <div className={styles.section}>
        <Link href={section.href!} className={styles.sectionTrigger}>
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
        <ChevronRight
          size={12}
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
        />
      </button>
      <div
        className={`${styles.accordionContent} ${isOpen ? styles.accordionContentOpen : ''}`}
      >
        <div className={styles.accordionInner}>
          {section.subItems!.map((item) => (
            <a
              key={item.id}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.subItemLink}
            >
              {item.label}
              {item.external && <ArrowUpRight size={10} className={styles.externalIcon} />}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

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

export function Nav() {
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

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

  const toggleSideNav = useCallback(() => {
    setSideCollapsed((prev) => {
      const next = !prev;
      document.documentElement.toggleAttribute('data-nav-collapsed', next);
      return next;
    });
  }, []);

  const expandedSegments: TypewriterSegment[] = useMemo(
    () => [
      { text: '/', style: { color: 'var(--color-text-secondary)' } },
      { text: 'CYPHER' },
    ],
    []
  );

  const collapsedSegments: TypewriterSegment[] = useMemo(
    () => [
      { text: '/', style: { color: 'var(--color-text-secondary)' } },
      { text: 'C' },
    ],
    []
  );

  return (
    <>
      <Topbar
        title={
          <Link href="/" className={styles.titleLink}>
            <TypewriterText
              key={sideCollapsed ? 'collapsed' : 'expanded'}
              segments={sideCollapsed ? collapsedSegments : expandedSegments}
              speed={80}
            />
          </Link>
        }
        className={styles.siteTopbar}
        actions={
          <>
            <a href="https://aura.ai" target="_blank" rel="noopener noreferrer" className={styles.devButton}>
              DEPLOY AGENTS
              <ArrowUpRight size={14} style={{ color: 'var(--color-text-secondary)' }} />
            </a>
            <button
              className={styles.hamburger}
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
          </>
        }
      />
      <SectionNav />
      <nav className={`${styles.sideNav} ${sideCollapsed ? styles.sideNavCollapsed : ''}`}>
        {sections.map((section) => (
          <AccordionSection
            key={section.id}
            section={section}
            isOpen={openSectionId === section.id}
            onToggle={() => handleToggle(section.id)}
          />
        ))}
      </nav>
      <BottomWidget collapsed={sideCollapsed} onToggle={toggleSideNav} />

      {/* Mobile drawer */}
      <div
        className={`${styles.overlay} ${mobileOpen ? styles.overlayOpen : ''}`}
        onClick={() => setMobileOpen(false)}
      />
      <div className={`${styles.drawer} ${mobileOpen ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>/CYPHER</span>
          <button
            className={styles.drawerClose}
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <div className={styles.drawerNav}>
          {sections.map((section) => (
            <AccordionSection
              key={section.id}
              section={section}
              isOpen={openSectionId === section.id}
              onToggle={() => handleToggle(section.id)}
            />
          ))}
        </div>
        <div className={styles.drawerFooter}>
          <Link
            href="/docs"
            className={styles.drawerIconBtn}
            onClick={() => setMobileOpen(false)}
            aria-label="Docs"
          >
            <FileText size={15} />
          </Link>
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
            href="https://x.com/cyaborgs"
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
