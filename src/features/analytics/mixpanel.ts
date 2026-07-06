/**
 * Mixpanel implementation of the provider-agnostic analytics boundary.
 *
 * Mirrors the AURA client's conventions: anonymous by default, `localStorage`
 * persistence, honours DNT/GPC and an opt-out toggle, stamps a first-touch
 * acquisition source, and is a safe no-op if the site has no token configured.
 *
 * Per-site separation: each brand domain is its own Mixpanel project, selected
 * by token. A browser session is always a single domain (one site), so only
 * that site's token is ever used — events never cross-count between sites.
 */
import mixpanel from 'mixpanel-browser';
import type { CompanyKey } from '@/lib/companies/types';
import type { AnalyticsProvider } from './index';

const OPT_OUT_KEY = 'cypher-analytics-opt-out';

// Public per-site project tokens. Referenced statically (one branch per key)
// so Next inlines each `NEXT_PUBLIC_*` value into the client bundle — a
// dynamic `process.env[...]` lookup would not be inlined and would read as
// undefined in the browser.
function tokenFor(company: CompanyKey): string | undefined {
  switch (company) {
    case 'cypher':
      return process.env.NEXT_PUBLIC_MIXPANEL_TOKEN_CYPHER;
    case 'wilderworld':
      return process.env.NEXT_PUBLIC_MIXPANEL_TOKEN_WILDERWORLD;
    case 'zero':
      return process.env.NEXT_PUBLIC_MIXPANEL_TOKEN_ZERO;
    case 'zchain':
      return process.env.NEXT_PUBLIC_MIXPANEL_TOKEN_ZCHAIN;
    case 'zode':
      return process.env.NEXT_PUBLIC_MIXPANEL_TOKEN_ZODE;
  }
}

/** True when the browser signals Do Not Track or Global Privacy Control. */
function browserSignalsDNT(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.doNotTrack === '1' || nav.globalPrivacyControl === true;
}

/** True when the visitor has opted out via the consent toggle. */
function isOptedOut(): boolean {
  try {
    return localStorage.getItem(OPT_OUT_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Reduce the browser's "who sent you" signals to one clean acquisition label.
 * An explicit `utm_source` always wins; otherwise map the referring domain to
 * a known source, keep the referrer's own domain for anything unlisted, and
 * return `direct` when there is no referrer.
 */
export function classifyAcquisitionSource(referrer: string, search: string): string {
  try {
    const utm = new URLSearchParams(search).get('utm_source');
    if (utm?.trim()) return utm.trim().toLowerCase();
  } catch {
    // Malformed query string — fall through to the referrer.
  }

  if (!referrer) return 'direct';

  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return 'direct';
  }

  const from = (...domains: string[]) =>
    domains.some((d) => host === d || host.endsWith(`.${d}`));

  if (from('x.com', 'twitter.com', 't.co')) return 'x';
  if (/(^|\.)google\./.test(host)) return 'google';
  if (from('youtube.com', 'youtu.be')) return 'youtube';
  if (from('reddit.com')) return 'reddit';
  if (from('github.com')) return 'github';
  if (from('linkedin.com', 'lnkd.in')) return 'linkedin';
  if (from('facebook.com', 'fb.com')) return 'facebook';
  if (from('news.ycombinator.com')) return 'hackernews';

  return host;
}

let initialized = false;

/**
 * Build a Mixpanel-backed provider for the active site, or `null` when that
 * site has no token configured (dev/preview) — the caller then keeps the
 * boundary's no-op provider. Initialises the SDK once per session; all methods
 * are safe no-ops on failure so analytics can never crash the site.
 */
export function createMixpanelProvider(company: CompanyKey): AnalyticsProvider | null {
  const token = tokenFor(company);
  if (!token) return null;

  if (!initialized) {
    try {
      mixpanel.init(token, {
        debug: process.env.NODE_ENV === 'development',
        track_pageview: false, // pageviews are fired explicitly on route change
        persistence: 'localStorage',
        // Mixpanel resolves coarse geo ($country_code/$region/$city) from the
        // request IP at ingestion; not persisted as an event property.
        ip: true,
      });

      if (browserSignalsDNT() || isOptedOut()) {
        mixpanel.opt_out_tracking();
      }

      // `site` distinguishes brands even if projects are ever consolidated.
      mixpanel.register({ site: company });

      // First-touch acquisition source, stamped once so it survives return
      // visits and rides on every event (enables "by source" breakdowns).
      if (typeof document !== 'undefined' && typeof window !== 'undefined') {
        mixpanel.register_once({
          acquisition_source: classifyAcquisitionSource(
            document.referrer,
            window.location.search
          ),
        });
      }

      initialized = true;
    } catch {
      return null;
    }
  }

  return {
    track(event) {
      try {
        mixpanel.track(event.name, event.props);
      } catch {
        // Analytics must never crash the site.
      }
    },
    pageview(path) {
      try {
        mixpanel.track('page_view', { path });
      } catch {
        // Analytics must never crash the site.
      }
    },
  };
}
