import { Gamepad2 } from 'lucide-react';
import styles from './Facts.module.css';

function XIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function AppleIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.46z" />
    </svg>
  );
}

function WindowsIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.351" />
    </svg>
  );
}

function AppStoreIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zM7.563 16.518a.722.722 0 0 1-.627.361.713.713 0 0 1-.36-.097.722.722 0 0 1-.264-.986l.66-1.144c.745-.226 1.355-.05 1.834.53l-1.243 2.154zm6.838-2.448H5.291a.722.722 0 0 1-.722-.722c0-.398.324-.722.722-.722h2.357l3.018-5.228-.943-1.633a.722.722 0 0 1 1.25-.722l.41.71.41-.71a.722.722 0 0 1 1.25.722L9.317 12.904h2.731l.696 1.166zm3.864 0h-1.346l.91 1.577a.722.722 0 0 1-1.25.722l-2.36-4.088c-.526-.911-.151-1.825.222-2.135.412.713 1.03 1.785 1.85 3.213h2.024c.399 0 .722.324.722.722a.722.722 0 0 1-.722.722z" />
    </svg>
  );
}

function PlayStoreIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.022l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z" />
    </svg>
  );
}

function GithubIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

type PlatformIcon = 'apple' | 'windows' | 'appstore' | 'playstore' | 'epic' | 'github';

function PlatformGlyph({ icon }: { icon: PlatformIcon }) {
  switch (icon) {
    case 'apple':
      return <AppleIcon size={13} />;
    case 'windows':
      return <WindowsIcon size={12} />;
    case 'appstore':
      return <AppStoreIcon size={14} />;
    case 'playstore':
      return <PlayStoreIcon size={12} />;
    case 'epic':
      return <Gamepad2 size={14} />;
    case 'github':
      return <GithubIcon size={13} />;
  }
}

interface FactItem {
  name: string;
  year?: string;
}

interface DownloadLink {
  label: string;
  href: string;
  icon: PlatformIcon;
}

interface ProductLeaf {
  name: string;
  downloads?: DownloadLink[];
}

interface ProductGroup {
  name: string;
  items: ProductLeaf[];
}

interface KeyFact {
  label: string;
  value?: string;
  items?: (string | FactItem)[];
  groups?: ProductGroup[];
  href?: string;
}

const keyFacts: KeyFact[] = [
  { label: 'Incorporated', value: '2025' },
  { label: 'Companies', value: '5' },
  { label: 'Work Began', value: '2015' },
  { label: 'Incorporation', value: 'Nevada, USA' },
  { label: 'Founder & CEO', value: 'n3o', href: 'https://x.com/real_n3o' },
  {
    label: 'Locations',
    items: [
      'San Francisco, California',
      'Vancouver, British Columbia',
      'Calgary, Alberta',
      'Gyumri, Armenia',
    ],
  },
  { label: 'Focus', value: 'Sovereign AI' },
  {
    label: 'Products',
    groups: [
      {
        name: 'ZODE',
        items: [
          { name: 'ZODE One' },
          {
            name: 'ZODE',
            downloads: [
              { label: 'THE GRID on GitHub', href: 'https://github.com/cypher-asi/the-grid', icon: 'github' },
            ],
          },
        ],
      },
      {
        name: 'AURA',
        items: [
          { name: 'AURA Agents' },
          {
            name: 'AURA Code',
            downloads: [
              { label: 'Download for macOS', href: 'https://aura.ai/download', icon: 'apple' },
              { label: 'Download for Windows', href: 'https://aura.ai/download', icon: 'windows' },
            ],
          },
        ],
      },
      {
        name: 'ZERO',
        items: [
          {
            name: 'ZERO Messenger',
            downloads: [
              { label: 'Download for macOS', href: 'https://download.zero.tech', icon: 'apple' },
              { label: 'Download for Windows', href: 'https://download.zero.tech', icon: 'windows' },
              { label: 'Download on the App Store', href: 'https://apps.apple.com', icon: 'appstore' },
              { label: 'Get it on Google Play', href: 'https://play.google.com', icon: 'playstore' },
            ],
          },
          { name: 'ZERO ID' },
        ],
      },
      {
        name: 'Wilder World',
        items: [
          {
            name: 'Wilder World',
            downloads: [
              { label: 'Get it on the Epic Games Store', href: 'https://store.epicgames.com/p/wilder-world-wilder-world-alpha-b4ccf8', icon: 'epic' },
            ],
          },
        ],
      },
    ],
  },
  {
    label: 'Protocols',
    items: [
      { name: 'THE GRID', year: '2026' },
      { name: 'AURA Harness', year: '2025' },
      { name: 'ZNS', year: '2022' },
      { name: 'ZERO OS', year: '2020' },
    ],
  },
];

const principles = [
  'Sovereignty',
  'Privacy',
  'Decentralization',
  'Censorship-Resistance',
  'Open Source',
];

const stack: { name: string; tags: string[][] }[] = [
  { name: 'Clean Energy', tags: [['ZODE']] },
  { name: 'Land Acquisition', tags: [['ZODE']] },
  { name: 'Manufacturing', tags: [['ZODE']] },
  { name: 'Compute Protocol', tags: [['THE GRID']] },
  { name: 'Identity & Payments', tags: [['ZNS', 'Z CHAIN']] },
  { name: 'Training', tags: [['THE GRID']] },
  { name: 'Fine-tuning', tags: [['THE GRID']] },
  { name: 'Harness + Routing', tags: [['AURA-HARNESS']] },
  { name: 'Agent TEE', tags: [['AURA-SWARM']] },
  { name: 'End-products', tags: [['AURA', 'WILDER WORLD', 'ZERO']] },
];

export function Facts() {
  return (
    <section id="what-we-do" className={styles.facts}>
      <div className={styles.inner}>
        <article className={styles.row}>
          <p className={styles.eyebrow}>What We Do</p>
          <div className={styles.content}>
            <h2 className={styles.heading}>
              Sovereign AI systems for an autonomous world.
            </h2>
            <p className={styles.body}>
              We build distributed protocols, micro-data centers and AI-focused
              applications that enable people, communities, and countries to own
              their intelligence.
            </p>
          </div>
        </article>

        <article className={styles.row}>
          <p className={styles.eyebrow}>Our Vision</p>
          <div className={styles.content}>
            <h2 className={styles.heading}>Open source decentralized AI becomes the leader.</h2>
            <p className={styles.body}>
              A future where autonomous agents work on behalf of and empower the
              individual, not the platform. Where compute, identity, and value
              flow across open networks no single party can censor or capture.
            </p>
          </div>
        </article>

        <article className={styles.row}>
          <p className={styles.eyebrow}>Our Mission</p>
          <div className={styles.content}>
            <h2 className={styles.heading}>People own their intelligence.</h2>
            <p className={styles.body}>
              We make private, verifiable, and decentralized AI the default,
              building tools and protocols that are open, private and accessible
              by design.
            </p>
          </div>
        </article>

        <article className={styles.row}>
          <p className={styles.eyebrow}>Principles</p>
          <div className={styles.content}>
            <ol className={styles.principles}>
              {principles.map((principle, index) => (
                <li key={principle} className={styles.principle}>
                  <span className={styles.principleNum}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className={styles.principleName}>{principle}</span>
                </li>
              ))}
            </ol>
          </div>
        </article>

        <article className={styles.row}>
          <p className={styles.eyebrow}>Vertical Integration</p>
          <div className={styles.content}>
            <h2 className={styles.heading}>From raw materials to human interaction.</h2>
            <p className={styles.body}>
              We believe the best solutions are the ones considered from raw
              materials all the way to human interaction. Operating at every
              layer of the stack gives the deepest and most integrated
              understanding and solutions.
            </p>
            <ol className={styles.stack}>
              {stack.map((item, index) => (
                <li key={item.name} className={styles.stackItem}>
                  <span className={styles.stackNum}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className={styles.stackName}>{item.name}</span>
                  <span className={styles.stackTags}>
                    {item.tags.map((line, lineIndex) => (
                      <span key={lineIndex} className={styles.stackTagLine}>
                        {line.map((tag) => (
                          <span key={tag} className={styles.stackTag}>
                            {tag}
                          </span>
                        ))}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </article>

        <article className={`${styles.row} ${styles.rowFacts}`}>
          <p className={styles.eyebrow}>Key Facts</p>
          <div className={styles.content}>
            <dl className={styles.factTable}>
              {keyFacts.map((fact) => (
                <div key={fact.label} className={styles.factRow}>
                  <dt className={styles.factLabel}>{fact.label}</dt>
                  <dd className={styles.factValue}>
                    {fact.groups ? (
                      <div className={styles.productGroups}>
                        {fact.groups.map((group) => (
                          <div key={group.name} className={styles.productGroup}>
                            <p className={styles.productGroupName}>{group.name}</p>
                            <ul className={`${styles.factList} ${styles.productList}`}>
                              {group.items.map((leaf) => (
                                <li key={leaf.name} className={styles.productItem}>
                                  <span>{leaf.name}</span>
                                  {leaf.downloads && (
                                    <span className={styles.downloads}>
                                      {leaf.downloads.map((dl) => (
                                        <a
                                          key={dl.label}
                                          className={styles.downloadLink}
                                          href={dl.href}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          aria-label={dl.label}
                                          title={dl.label}
                                        >
                                          <PlatformGlyph icon={dl.icon} />
                                        </a>
                                      ))}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : fact.items ? (
                      <ul className={styles.factList}>
                        {fact.items.map((item) => {
                          const name = typeof item === 'string' ? item : item.name;
                          const year = typeof item === 'string' ? undefined : item.year;
                          return (
                            <li key={name}>
                              {name}
                              {year && <span className={styles.itemYear}>{year}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    ) : fact.href ? (
                      <a
                        className={styles.factLink}
                        href={fact.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {fact.value}
                        <XIcon size={12} />
                      </a>
                    ) : (
                      fact.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </article>
      </div>
    </section>
  );
}
