export type CompanyKey = 'cypher' | 'zode' | 'zero' | 'wilderworld' | 'zchain';

export type Theme = 'dark' | 'light' | 'system';
export type AccentColor = 'cyan' | 'blue' | 'purple' | 'green' | 'orange' | 'rose';

/* ---------------------------------------------------------------------------
   Navigation (top bar + mega-panel + mobile drawer)
   --------------------------------------------------------------------------- */
export interface NavSubItem {
  id: string;
  label: string;
  description?: string;
  href: string;
  external?: boolean;
  year?: string;
}

export interface NavRepo {
  name: string;
  description: string;
}

export interface NavRepoGroup {
  project: string;
  repos: NavRepo[];
}

export interface NavRepoSection {
  heading: string;
  allHref: string;
  columns: NavRepoGroup[][];
}

export interface NavSection {
  id: string;
  label: string;
  href: string;
  external?: boolean;
  blurb?: string;
  subItems?: NavSubItem[];
  repoSection?: NavRepoSection;
  noPanel?: boolean;
}

/* ---------------------------------------------------------------------------
   Footer
   --------------------------------------------------------------------------- */
export interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
  scrollTo?: string;
  year?: string;
}

export interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

export interface FooterSocial {
  x?: string;
  github?: string;
}

export interface FooterConfig {
  columns: FooterColumn[];
  social: FooterSocial;
  copyrightName: string;
  wordmarkSrc: string;
  wordmarkAlt: string;
}

/* ---------------------------------------------------------------------------
   In-page section navigation (the floating scroll-spy nav)
   --------------------------------------------------------------------------- */
export interface PageSection {
  id: string;
  label: string;
}

/* ---------------------------------------------------------------------------
   Typography (per-brand font overrides)
   Values are CSS font-family values, typically pointing at a loader variable
   (e.g. 'var(--font-ddin)'). Omitted fields fall back to the Inter defaults
   defined in globals.css.
   --------------------------------------------------------------------------- */
export interface CompanyFonts {
  /** Body / UI font, overrides --font-sans. */
  sans?: string;
  /** Headings / display font, overrides --font-display. */
  display?: string;
}

/* ---------------------------------------------------------------------------
   Company (one per domain)
   --------------------------------------------------------------------------- */
export interface CompanyConfig {
  key: CompanyKey;
  /** Display name, e.g. "Cypher". */
  name: string;
  /** Nav wordmark text, e.g. "CYPHER". */
  wordmark: string;
  /** Optional image wordmark shown in the nav top-left instead of the text wordmark. */
  wordmarkLogo?: { src: string; alt: string };
  /** Optional nav CTA that replaces the default "Mission" button when present. */
  cta?: { label: string; href: string; external?: boolean };
  /** Canonical production domain. */
  domain: string;
  accent: AccentColor;
  defaultTheme: Theme;
  metadata: {
    title: string;
    description: string;
  };
  nav: NavSection[];
  footer: FooterConfig;
  /** Sections for the in-page scroll-spy nav on this company's landing. */
  pageSections: PageSection[];
  /** Optional per-brand font overrides. Defaults to Inter when omitted. */
  fonts?: CompanyFonts;
}
