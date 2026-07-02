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

export interface FooterCta {
  heading: string;
  button: { label: string; href: string; external?: boolean };
}

export interface FooterParentCompany {
  label: string;
  /** Canonical absolute URL; the footer rewrites it to a local link on dev hosts. */
  href: string;
}

export interface FooterConfig {
  columns: FooterColumn[];
  social: FooterSocial;
  copyrightName: string;
  /** Image wordmark shown large at the bottom. */
  wordmarkSrc?: string;
  wordmarkAlt?: string;
  /** Text wordmark fallback when there is no image wordmark. */
  wordmarkText?: string;
  /** Optional pre-footer call-to-action band. */
  cta?: FooterCta;
  /** Optional parent-company colophon (e.g. "A Cypher Company"). */
  parentCompany?: FooterParentCompany;
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
    /** Block search-engine indexing for this brand (robots noindex/nofollow). */
    noindex?: boolean;
  };
  nav: NavSection[];
  /** Top-nav item presentation. 'buttons' renders uppercase, button-styled
   *  items (e.g. Wilder World); defaults to plain text links. */
  navStyle?: 'links' | 'buttons';
  /** When true, the root layout skips the shared Nav/Footer/scrollbar chrome
   *  and the brand supplies its own shell (e.g. zode's ZodeShell). */
  customChrome?: boolean;
  footer: FooterConfig;
  /** Sections for the in-page scroll-spy nav on this company's landing. */
  pageSections: PageSection[];
  /** Optional per-brand font overrides. Defaults to Inter when omitted. */
  fonts?: CompanyFonts;
}
