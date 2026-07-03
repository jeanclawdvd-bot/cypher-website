import type {
  CompanyConfig,
  CompanyKey,
  FooterColumn,
  FooterConfig,
  FooterParentCompany,
  FooterSocial,
  NavSection,
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

/* ZERO runs its own product-site nav (not the ecosystem chrome). */
const zeroNav: NavSection[] = [
  { id: 'messenger', label: 'Messenger', href: '/messenger', noPanel: true },
  { id: 'social', label: 'Social', href: '/social', noPanel: true },
  { id: 'id', label: 'ID', href: '/id', noPanel: true },
  { id: 'protocol', label: 'Protocol', href: '/protocol', noPanel: true },
];

/* Wilder World runs its own product-site nav (not the ecosystem chrome). */
const wilderNav: NavSection[] = [
  { id: 'universe', label: 'Universe', href: '/universe', noPanel: true },
  { id: 'gameplay', label: 'Gameplay', href: '/gameplay', noPanel: true },
  { id: 'city', label: 'City', href: '/city', noPanel: true },
  { id: 'industries', label: 'Industries', href: '/industries', noPanel: true },
  { id: 'economy', label: 'Economy', href: '/economy', noPanel: true },
  { id: 'market', label: 'Market', href: '/market', noPanel: true },
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

const CYPHER_PARENT: FooterParentCompany = {
  label: 'A Cypher Company',
  href: 'https://cypher.net',
};

/* Minimal per-site footer for child brands that don't yet have a full footer:
   just their wordmark + the Cypher colophon (no ecosystem columns). */
function minimalFooter(copyrightName: string, wordmarkText: string): FooterConfig {
  return {
    columns: [],
    social: {},
    copyrightName,
    wordmarkText,
    parentCompany: CYPHER_PARENT,
  };
}

/* Wilder World runs its own product-site footer (not the ecosystem chrome). */
const WILDER_EARLY_ACCESS_URL =
  'https://store.epicgames.com/p/wilder-world-wilder-world-alpha-b4ccf8?lang=en-US';

const wilderFooter: FooterConfig = {
  copyrightName: 'Wilder World',
  wordmarkSrc: '/images/wilder-world/wilder-world-wordmark.svg',
  wordmarkAlt: 'Wilder World',
  social: {},
  cta: {
    heading: 'A New Dimension of Reality',
    button: { label: 'Early Access', href: WILDER_EARLY_ACCESS_URL, external: true },
  },
  parentCompany: CYPHER_PARENT,
  columns: [
    {
      heading: 'Game',
      links: [
        { label: 'Overview', href: '/' },
        { label: 'Universe', href: '/universe' },
        { label: 'Gameplay', href: '/gameplay' },
        { label: 'City', href: '/city' },
        { label: 'Economy', href: '/economy' },
        { label: 'Market', href: '/market' },
      ],
    },
    {
      heading: 'Industries',
      links: [
        { label: 'Land', href: '/industries#industry-land' },
        { label: 'Avatars', href: '/industries#industry-avatars' },
        { label: 'Wheels', href: '/industries#industry-wheels' },
        { label: 'Weapons', href: '/industries#industry-weapons' },
        { label: 'Beasts', href: '/industries#industry-beasts' },
        { label: 'Moto', href: '/industries#industry-moto' },
        { label: 'PALs', href: '/industries#industry-pals' },
        { label: 'Crafts', href: '/industries#industry-crafts' },
        { label: 'Cribs', href: '/industries#industry-cribs' },
        { label: 'Kicks', href: '/industries#industry-kicks' },
      ],
    },
    {
      heading: 'Community',
      links: [
        { label: 'News', href: 'https://www.wilderworld.com/news', external: true },
        { label: 'X', href: 'https://x.com/WilderWorld', external: true },
        { label: 'Instagram', href: 'https://www.instagram.com/wilderworld', external: true },
        { label: 'Telegram', href: 'https://t.me/wilderworld', external: true },
        { label: 'ZERO', href: 'https://zero.tech', external: true },
        { label: 'YouTube', href: 'https://www.youtube.com/@WilderWorld', external: true },
        { label: 'Discord', href: 'https://discord.gg/wilderworld', external: true },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
      ],
    },
  ],
};

/* ZERO runs its own product-site footer, mirroring the zero.tech menu. */
const ZERO_GET_STARTED_URL = 'https://zos.zero.tech/';

const zeroFooter: FooterConfig = {
  copyrightName: 'Zero',
  wordmarkText: 'ZERO',
  social: {},
  cta: {
    heading: 'Built for Freedom',
    button: { label: 'Get Started', href: ZERO_GET_STARTED_URL, external: true },
  },
  parentCompany: CYPHER_PARENT,
  columns: [
    {
      heading: 'Resources',
      links: [
        { label: 'Zine', href: 'https://www.zine.live', external: true },
        {
          label: 'Whitepaper',
          href: 'https://drive.google.com/file/d/1fsR0_ygZTd46i4kLSLMifnvduH5UdEWX/view?usp=sharing',
          external: true,
        },
        {
          label: 'Press Kit',
          href: 'https://www.dropbox.com/sh/blf8nmnz0g2rjaj/AABNrXeCwI4CdmgzMgwswxfma?dl=0',
          external: true,
        },
        {
          label: 'Deck',
          href: 'https://www.dropbox.com/s/5v0fute7s3t44hy/Zero%20Deck.pdf?dl=0',
          external: true,
        },
      ],
    },
    {
      heading: 'Audits',
      links: [
        {
          label: 'Z Token',
          href: 'https://certificate.quantstamp.com/full/zns-token-upgrade/349ec7ff-7d8c-45fe-92a0-bb86b9dde5be/index.html',
          external: true,
        },
        {
          label: 'Z NS',
          href: 'https://certificate.quantstamp.com/full/zero-name-service-zns/4ec9b4dd-2c6b-4ce8-ad3f-c4f4246e0140/index.html',
          external: true,
        },
        {
          label: 'Z FI',
          href: 'https://certificate.quantstamp.com/full/zero-staking/40ffa176-7b8d-43ec-a7e2-29732c12f21e/index.html',
          external: true,
        },
      ],
    },
    {
      heading: 'Products',
      links: [
        { label: 'Messenger', href: '/messenger' },
        { label: 'Social', href: '/social' },
        { label: 'ZERO ID', href: '/id' },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'T&C', href: '/terms' },
        { label: 'EULA', href: 'https://zero.tech/eula', external: true },
      ],
    },
    {
      heading: 'Downloads',
      links: [
        {
          label: 'iOS',
          href: 'https://apps.apple.com/us/app/zero-messenger/id6476882926',
          external: true,
        },
        {
          label: 'Android',
          href: 'https://play.google.com/store/apps/details?id=com.zero.android.messenger',
          external: true,
        },
        { label: 'Windows', href: 'https://download.zero.tech', external: true },
        { label: 'Mac', href: 'https://download.zero.tech', external: true },
        { label: 'Linux', href: 'https://download.zero.tech', external: true },
      ],
    },
    {
      heading: 'Protocol',
      links: [
        { label: 'Overview', href: '/protocol#overview' },
        { label: 'Applications', href: '/protocol#applications' },
        { label: 'Z NS', href: '/protocol#z-ns' },
        { label: 'Z DAO', href: '/protocol#z-dao' },
        { label: 'Z XP', href: '/protocol#z-xp' },
        { label: 'ZODE', href: '/protocol#zode' },
      ],
    },
  ],
};

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
      description:
        'ZODE — the connective layer for a decentralized, secure compute network.',
      // Carried over from the standalone zode-website (site not yet launched).
      noindex: true,
    },
    /* Zode ships its own chrome (SiteNav / SiteFooter / BottomTaskbar) ported
       verbatim from the standalone zode-website; see src/sites/zode/ZodeShell. */
    customChrome: true,
    nav: sharedNav,
    footer: minimalFooter('Zode', 'ZODE'),
    pageSections: [],
  },
  zero: {
    key: 'zero',
    name: 'ZERO',
    wordmark: 'ZERO',
    wordmarkLogo: {
      src: '/images/zero/zero-wordmark-nav.svg',
      alt: 'ZERO',
    },
    cta: {
      label: 'Get Started',
      href: ZERO_GET_STARTED_URL,
      external: true,
    },
    domain: 'zero.tech',
    accent: 'cyan',
    defaultTheme: 'dark',
    metadata: {
      title: 'ZERO',
      description: 'A private, sovereign, decentralized messenger.',
    },
    nav: zeroNav,
    footer: zeroFooter,
    pageSections: [],
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
    navStyle: 'buttons',
    footer: wilderFooter,
    pageSections: [],
    fonts: {
      sans: 'var(--font-ddin)',
      display: 'var(--font-ddin)',
    },
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
    footer: minimalFooter('Z Chain', 'Z'),
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

/**
 * Maps the first URL path segment to the brand that owns that route. When a
 * request hits a brand-owned path, the owning brand wins so chrome and content
 * always match (e.g. /universe always serves Wilder World).
 */
export const PATH_TO_COMPANY: Record<string, CompanyKey> = {
  universe: 'wilderworld',
  gameplay: 'wilderworld',
  city: 'wilderworld',
  industries: 'wilderworld',
  economy: 'wilderworld',
  market: 'wilderworld',
  messenger: 'zero',
  social: 'zero',
  id: 'zero',
  protocol: 'zero',
  network: 'zode',
  invest: 'zode',
  'buy-compute': 'zode',
  'give-compute': 'zode',
  login: 'zode',
};

export const DEFAULT_COMPANY: CompanyKey = 'cypher';
