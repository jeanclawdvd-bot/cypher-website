'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Topbar } from '@cypher-asi/zui';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { TypewriterText } from './TypewriterText';
import type { TypewriterSegment } from './TypewriterText';
import { SectionNav } from './SectionNav';
import styles from './Nav.module.css';

interface SubItem {
  id: string;
  label: string;
  href?: string;
}

interface NavSection {
  id: string;
  label: string;
  href?: string;
  subItems?: SubItem[];
}

const sections: NavSection[] = [
  {
    id: 'zero',
    label: 'ZERO',
    subItems: [
      { id: 'zero-os', label: 'ZERO OS', href: '/zero' },
      { id: 'zero-id', label: 'ZERO ID', href: '/zero/id' },
      { id: 'zero-chat', label: 'ZERO CHAT', href: '/zero/chat' },
      { id: 'zero-vault', label: 'ZERO VAULT', href: '/zero/vault' },
    ],
  },
  {
    id: 'agents',
    label: 'AGENTS',
    subItems: [
      { id: 'aura-code', label: 'AURA CODE', href: '/agents/aura-code' },
      { id: 'aura-swarm', label: 'AURA SWARM', href: '/agents/aura-swarm' },
      { id: 'aura-3d', label: 'AURA 3D', href: '/agents/aura-3d' },
    ],
  },
  {
    id: 'compute',
    label: 'COMPUTE',
    subItems: [
      { id: 'machina', label: 'MACHINA', href: '/compute/machina' },
      { id: 'the-grid', label: 'THE GRID', href: '/compute/the-grid' },
    ],
  },
  {
    id: 'worlds',
    label: 'WORLDS',
    subItems: [
      { id: 'wilder-world', label: 'WILDER WORLD', href: '/worlds/wilder-world' },
      { id: 'shanty-town', label: 'SHANTY TOWN', href: '/worlds/shanty-town' },
    ],
  },
  {
    id: 'protocols',
    label: 'PROTOCOLS',
    subItems: [
      { id: 'zero-id', label: 'ZERO ID', href: '/protocols/zero-id' },
      { id: 'zero-name-service', label: 'ZNS', href: '/protocols/zns' },
      { id: 'metropolis', label: 'METROPOLIS', href: '/protocols/metropolis' },
      { id: 'aura-os', label: 'AURA OS', href: '/protocols/aura-os' },
    ],
  },
  { id: 'research', label: 'RESEARCH', href: '/research' },
  { id: 'updates', label: 'UPDATES', href: '/updates' },
  { id: 'vision', label: 'VISION', href: '/vision' },
  { id: 'z', label: 'Z', href: '/z' },
];

function AccordionSection({
  section,
  isOpen,
  onToggle,
  pathname,
}: {
  section: NavSection;
  isOpen: boolean;
  onToggle: () => void;
  pathname: string;
}) {
  const hasChildren = section.subItems && section.subItems.length > 0;

  if (!hasChildren) {
    const isActive = section.href === pathname;
    return (
      <div className={styles.section}>
        <Link
          href={section.href!}
          className={`${styles.sectionTrigger} ${isActive ? styles.active : ''}`}
        >
          <span>{section.label}</span>
        </Link>
      </div>
    );
  }

  const activeSubItem = section.subItems!.some((item) => item.href === pathname);

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
          {section.subItems!.map((item) => {
            const isActive = item.href === pathname;
            return (
              <Link
                key={item.id}
                href={item.href ?? '#'}
                className={`${styles.subItemLink} ${isActive ? styles.active : ''}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Nav() {
  const pathname = usePathname();
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);

  const router = useRouter();

  const handleToggle = (id: string) => {
    if (openSectionId === id) {
      setOpenSectionId(null);
      return;
    }
    setOpenSectionId(id);
    const section = sections.find((s) => s.id === id);
    const firstHref = section?.subItems?.[0]?.href;
    if (firstHref) router.push(firstHref);
  };

  const titleSegments: TypewriterSegment[] = useMemo(
    () => [
      { text: '/', style: { color: '#969696' } },
      { text: 'CYPHER' },
    ],
    []
  );

  return (
    <>
      <Topbar
        title={
          <Link href="/" className={styles.titleLink}>
            <TypewriterText segments={titleSegments} speed={80} />
          </Link>
        }
        className={styles.siteTopbar}
        actions={
          <a href="#" className={styles.devButton}>
            DEPLOY AGENTS
            <ArrowUpRight size={14} color="#969696" />
          </a>
        }
      />
      <SectionNav />
      <nav className={styles.sideNav}>
        {sections.map((section) => (
          <AccordionSection
            key={section.id}
            section={section}
            isOpen={openSectionId === section.id}
            onToggle={() => handleToggle(section.id)}
            pathname={pathname}
          />
        ))}
      </nav>
    </>
  );
}
