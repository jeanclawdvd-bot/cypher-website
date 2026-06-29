import type {
  CompanyConfig,
  CompanyKey,
  FooterColumn,
  FooterConfig,
  FooterSocial,
  NavSection,
  PageSection,
} from './types';

const GITHUB_ORG = 'https://github.com/cypher-asi';

/* ---------------------------------------------------------------------------
   Shared ecosystem chrome
   The "Companies / Research / News" nav and footer are ecosystem-wide and make
   sense on every domain. Each company reuses them and overrides only its
   wordmark, accent, landing, and metadata.
   --------------------------------------------------------------------------- */
const sharedNav: NavSection[] = [
  {
    id: 'products',
    label: 'Companies',
    href: 'https://aura.ai',
    external: true,
    blurb: 'A sovereign AI stack spanning energy, infrastructure, protocols, and end-products.',
    subItems: [
      { id: 'aura', label: 'AURA', description: 'An agentic coding system', href: 'https://aura.ai', external: true },
      { id: 'zode', label: 'ZODE', description: 'A micro-data center', href: 'https://zode.org', external: true },
      { id: 'wilder-world', label: 'Wilder World', description: 'A virtual simulation', href: 'https://wilderworld.com', external: true },
      { id: 'z-chain', label: 'Z Chain', description: 'A blazing-fast blockchain', href: 'https://zchain.org', external: true },
      { id: 'zero', label: 'ZERO', description: 'A secure messenger', href: 'https://zero.tech', external: true },
    ],
  },
  {
    id: 'research',
    label: 'Research',
    href: '/research',
    blurb: 'Open source research to accelerate AI sovereignty for people and communities.',
    subItems: [
      { id: 'the-grid', label: 'THE GRID', description: 'Distributed compute fabric', href: '/research/the-grid', year: '2026' },
      { id: 'aura-harness', label: 'AURA Harness', description: 'A deterministic multi-agent runtime', href: '/research/aura-harness', year: '2025' },
      { id: 'zns', label: 'ZNS', description: 'Naming and trust layer', href: '/research/zns', year: '2022' },
      { id: 'zero-os', label: 'ZERO OS', description: 'A social operating system', href: '/research/zero-os', year: '2020' },
    ],
    repoSection: {
      heading: 'Open Source',
      allHref: GITHUB_ORG,
      columns: [
        [
          {
            project: 'AURA',
            repos: [
              { name: 'aura-os', description: 'The Secure OS for AI agents.' },
              { name: 'aura-harness', description: 'A frontier harness for agentic intelligence.' },
              { name: 'aura-router', description: 'Model proxy and billing router for the AURA network.' },
              { name: 'aura-storage', description: 'The execution data layer for the AURA platform.' },
              { name: 'aura-swarm', description: 'An orchestration environment for deploying agent swarms at scale.' },
              { name: 'aura-network', description: 'The social network layer for autonomous agents and teams.' },
              { name: 'aura-bridge', description: 'The AURA bridge to open messaging systems.' },
              { name: 'aura-website', description: 'The official aura.ai website.' },
            ],
          },
        ],
        [
          {
            project: 'ZERO',
            repos: [
              { name: 'zero-os', description: 'A verifiable OS.' },
              { name: 'zos', description: 'A secure and resilient communication system.' },
              { name: 'zero-sdk', description: 'Official SDK for the ZERO messaging protocol.' },
              { name: 'zero-auth', description: 'The auth service for zero-id.' },
              { name: 'zero-vault', description: 'A system for secrets, remote key signing, and access policies.' },
              { name: 'zid', description: 'A post-quantum sovereign identity system.' },
            ],
          },
        ],
        [
          {
            project: 'The Grid',
            repos: [
              { name: 'the-grid', description: 'The Global Resilient Internet Datalink.' },
              { name: 'machina', description: 'A compute orchestration environment for the Machine Age.' },
              { name: 'the-grid-legacy', description: 'An unstoppable distributed compute network.' },
            ],
          },
          {
            project: 'Wilder World',
            repos: [
              { name: 'wilderworld-com', description: 'The official Wilder World site and web platform.' },
            ],
          },
        ],
        [
          {
            project: 'Cypher Core',
            repos: [
              { name: 'cypher-website', description: 'The official cypher.net website.' },
              { name: 'cypher-asi', description: 'Tools for the Machine Age.' },
              { name: 'z-billing', description: 'The core payments, billing and usage system for the Cypher network.' },
              { name: 'orbit', description: 'A fast git system for machines.' },
              { name: 'spectron', description: 'A code analysis tool for complex code bases.' },
              { name: 'shell', description: 'The standard app shell used to build Cypher ecosystem projects.' },
              { name: 'zui', description: 'A future UI kit made for machines.' },
            ],
          },
        ],
      ],
    },
  },
  {
    id: 'news',
    label: 'News',
    href: 'https://zine.live',
    external: true,
    blurb: 'Dispatches from across the network.',
    noPanel: true,
    subItems: [
      { id: 'zine', label: 'Zine', description: 'Stories from the network', href: 'https://zine.live', external: true },
    ],
  },
];

/* Wilder World runs its own product-site nav (not the ecosystem chrome). */
const wilderNav: NavSection[] = [
  { id: 'gameplay', label: 'Gameplay', href: '#gameplay', noPanel: true },
  { id: 'city', label: 'City', href: '#city', noPanel: true },
  { id: 'industries', label: 'Industries', href: '#industries', noPanel: true },
  { id: 'economy', label: 'Economy', href: '#economy', noPanel: true },
  { id: 'news', label: 'News', href: 'https://zine.live', external: true, noPanel: true },
];

const sharedFooterColumns: FooterColumn[] = [
  {
    heading: 'Companies',
    links: [
      { label: 'AURA', href: 'https://aura.ai', external: true },
      { label: 'ZODE', href: 'https://zode.org', external: true },
      { label: 'Wilder World', href: 'https://wilderworld.com', external: true },
      { label: 'Z Chain', href: 'https://zchain.org', external: true },
      { label: 'ZERO', href: 'https://zero.tech', external: true },
    ],
  },
  {
    heading: 'Research',
    links: [
      { label: 'THE GRID', href: '/research/the-grid', year: '2026' },
      { label: 'AURA Harness', href: '/research/aura-harness', year: '2025' },
      { label: 'ZNS', href: '/research/zns', year: '2022' },
      { label: 'ZERO OS', href: '/research/zero-os', year: '2020' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Mission', href: '/vision', scrollTo: 'what-we-do' },
      { label: 'News', href: 'https://zine.live', external: true },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Contact', href: '/contact' },
    ],
  },
];

const sharedSocial: FooterSocial = {
  x: 'https://x.com/cypher_asi',
  github: 'https://github.com/cypher-asi',
};

function footer(copyrightName: string): FooterConfig {
  return {
    columns: sharedFooterColumns,
    social: sharedSocial,
    copyrightName,
    wordmarkSrc: '/images/brand/cypher-wordmark.png',
    wordmarkAlt: '/CYPHER',
  };
}

/* ---------------------------------------------------------------------------
   Per-company landing scroll sections
   --------------------------------------------------------------------------- */
const zodeSections: PageSection[] = [
  { id: 'hero', label: 'Overview' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'features', label: 'Features' },
  { id: 'security', label: 'Security' },
  { id: 'start', label: 'Get Started' },
  { id: 'faq', label: 'FAQ' },
];

const zeroSections: PageSection[] = [
  { id: 'hero', label: 'Overview' },
  { id: 'principles', label: 'Principles' },
  { id: 'features', label: 'Features' },
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'trust', label: 'Security' },
  { id: 'open', label: 'Open Source' },
  { id: 'start', label: 'Get Started' },
  { id: 'faq', label: 'FAQ' },
];

/* ---------------------------------------------------------------------------
   Companies
   --------------------------------------------------------------------------- */
export const COMPANIES: Record<CompanyKey, CompanyConfig> = {
  cypher: {
    key: 'cypher',
    name: 'Cypher',
    wordmark: 'CYPHER',
    domain: 'cypher.net',
    accent: 'cyan',
    defaultTheme: 'dark',
    metadata: {
      title: 'Cypher',
      description: 'A sovereign AI stack spanning energy, infrastructure, protocols, and end-products.',
    },
    nav: sharedNav,
    footer: footer('Cypher, Inc.'),
    pageSections: [],
  },
  zode: {
    key: 'zode',
    name: 'ZODE',
    wordmark: 'ZODE',
    domain: 'zode.org',
    accent: 'green',
    defaultTheme: 'dark',
    metadata: {
      title: 'ZODE',
      description: 'Autonomous AI agents that triage, code, test, and ship inside your infrastructure.',
    },
    nav: sharedNav,
    footer: footer('Zode'),
    pageSections: zodeSections,
  },
  zero: {
    key: 'zero',
    name: 'ZERO',
    wordmark: 'ZERO',
    domain: 'zero.tech',
    accent: 'blue',
    defaultTheme: 'dark',
    metadata: {
      title: 'ZERO OS',
      description: 'A secure operating system for an agentic world.',
    },
    nav: sharedNav,
    footer: footer('Zero'),
    pageSections: zeroSections,
  },
  wilderworld: {
    key: 'wilderworld',
    name: 'Wilder World',
    wordmark: 'WILDER',
    wordmarkLogo: {
      src: '/images/wilder-world/wilder-world-logo-orange.svg',
      alt: 'Wilder World',
    },
    cta: {
      label: 'Early Access',
      href: 'https://store.epicgames.com/p/wilder-world-wilder-world-alpha-b4ccf8?lang=en-US',
      external: true,
    },
    domain: 'wilderworld.com',
    accent: 'purple',
    defaultTheme: 'dark',
    metadata: {
      title: 'Wilder World',
      description: 'A photorealistic, immersive virtual simulation.',
    },
    nav: wilderNav,
    footer: footer('Wilder World'),
    pageSections: [],
  },
  zchain: {
    key: 'zchain',
    name: 'Z Chain',
    wordmark: 'Z',
    domain: 'zchain.org',
    accent: 'orange',
    defaultTheme: 'dark',
    metadata: {
      title: 'Z Chain',
      description: 'A blazing-fast blockchain for the Machine Age.',
    },
    nav: sharedNav,
    footer: footer('Z Chain'),
    pageSections: [],
  },
};

/**
 * Maps a request hostname to a company. Add new domains here.
 */
export const DOMAIN_TO_COMPANY: Record<string, CompanyKey> = {
  'cypher.net': 'cypher',
  'www.cypher.net': 'cypher',
  'zode.org': 'zode',
  'www.zode.org': 'zode',
  'zero.tech': 'zero',
  'www.zero.tech': 'zero',
  'wilderworld.com': 'wilderworld',
  'www.wilderworld.com': 'wilderworld',
  'zchain.org': 'zchain',
  'www.zchain.org': 'zchain',
};

export const DEFAULT_COMPANY: CompanyKey = 'cypher';
