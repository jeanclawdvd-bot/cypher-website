import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import styles from './Blocks.module.css';

export const ZERO_GET_STARTED_URL = 'https://zos.zero.tech/';

/* ---------------------------------------------------------------------------
   Page hero – large centered lead, mirroring zero.tech product pages.
   --------------------------------------------------------------------------- */
export function ZeroHero({
  title,
  subtitle,
  cta = true,
}: {
  title: ReactNode;
  subtitle: string;
  cta?: boolean;
}) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden />
      <div className={styles.heroInner}>
        <h1 className={styles.heroTitle}>{title}</h1>
        <p className={styles.heroSubtitle}>{subtitle}</p>
        {cta && (
          <a
            className="sci-btn sci-btn-primary"
            href={ZERO_GET_STARTED_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get Started
            <ArrowUpRight size={16} />
          </a>
        )}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Section – 980px column with an eyebrow / heading / subtitle header,
   matching the sizing conventions used across the ecosystem sites.
   --------------------------------------------------------------------------- */
export function ZeroSection({
  id,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <section id={id} className={styles.section}>
      <div className={styles.sectionInner}>
        <div className={styles.sectionHeader}>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h2 className={styles.heading}>{title}</h2>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Card grid – bordered cells for feature / capability lists.
   --------------------------------------------------------------------------- */
export interface CardItem {
  title: string;
  description?: string;
}

export function CardGrid({ items, columns = 3 }: { items: CardItem[]; columns?: 2 | 3 | 4 }) {
  return (
    <div className={styles.cardGrid} data-columns={columns}>
      {items.map((item) => (
        <div key={item.title} className={styles.card}>
          <p className={styles.cardTitle}>{item.title}</p>
          {item.description ? <p className={styles.cardDesc}>{item.description}</p> : null}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Badge row – mono pill strip (tech stacks, platforms, bridges).
   --------------------------------------------------------------------------- */
export function BadgeRow({ label, items }: { label?: string; items: string[] }) {
  return (
    <div className={styles.badgeRow}>
      {label ? <p className={styles.badgeLabel}>{label}</p> : null}
      <div className={styles.badges}>
        {items.map((item) => (
          <span key={item} className={styles.badge}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Prose – body paragraphs for doc-style sections (Protocol page).
   --------------------------------------------------------------------------- */
export function Prose({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className={styles.prose}>
      {paragraphs.map((text) => (
        <p key={text.slice(0, 40)}>{text}</p>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Principles – the "Built with purpose" row shared by Messenger and Social.
   --------------------------------------------------------------------------- */
const PRINCIPLES: CardItem[] = [
  { title: 'Sovereign', description: 'ZERO belongs to you and you control its future.' },
  { title: 'Decentralized', description: 'ZERO is community run in a decentralized network.' },
  { title: 'Secure', description: 'ZERO employs state-of-the-art end-to-end encryption.' },
  { title: 'Uncensored', description: 'ZERO protects your rights from third-party censorship.' },
  {
    title: 'Open Source',
    description: 'ZERO is 100% free and open-source under the MIT license.',
  },
];

export function Principles() {
  return <CardGrid items={PRINCIPLES} columns={3} />;
}

/* ---------------------------------------------------------------------------
   Protocol stack diagram – shared by Social and Protocol pages.
   --------------------------------------------------------------------------- */
const STACK_LAYERS: { label: string; items: string[] }[] = [
  { label: 'Interface Layer', items: ['Z UI'] },
  { label: 'OS Layer', items: ['Z Apps', 'Z OS'] },
  { label: 'Protocol Layer', items: ['Z Token', 'Z XP', 'Z DAO', 'Z NS'] },
  { label: 'Network Layer', items: ['Z Chain', 'ZODES'] },
  { label: 'Base Layer', items: ['Ethereum'] },
];

export function StackDiagram() {
  return (
    <div className={styles.stack}>
      {STACK_LAYERS.map((layer) => (
        <div key={layer.label} className={styles.stackLayer}>
          <p className={styles.stackLabel}>{layer.label}</p>
          <div className={styles.stackItems}>
            {layer.items.map((item) => (
              <span key={item} className={styles.stackItem}>
                {item}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
