import { COMPANIES, DEFAULT_COMPANY, DOMAIN_TO_COMPANY, PATH_TO_COMPANY } from './registry';
import type { CompanyConfig, CompanyKey } from './types';

function isCompanyKey(value: string): value is CompanyKey {
  return value in COMPANIES;
}

/** Returns the value as a valid CompanyKey, or null if unknown/missing. */
export function normalizeCompany(value: string | null | undefined): CompanyKey | null {
  return value && isCompanyKey(value) ? value : null;
}

/**
 * Resolves a request host (e.g. "zode.org", "www.zode.org:443",
 * "zode.localhost:3000") to a company key, or `null` when the host does not
 * explicitly map to one (unknown hosts, bare `localhost`, the `*.onrender.com`
 * preview URL, etc.).
 *
 * Returning `null` — rather than the default company — lets callers treat a
 * real, mapped domain as authoritative while still allowing an override/cookie
 * fallback on non-mapped hosts. This is what prevents brand "leaks" where a
 * stale `company` cookie could otherwise override the real domain.
 *
 * Dev convenience: a leading subdomain that matches a company key works too,
 * so `zode.localhost:3000` resolves to `zode` without real DNS.
 */
export function resolveHostCompany(host: string | null | undefined): CompanyKey | null {
  if (!host) return null;
  const hostname = host.split(':')[0].toLowerCase();

  if (DOMAIN_TO_COMPANY[hostname]) return DOMAIN_TO_COMPANY[hostname];

  const sub = hostname.split('.')[0];
  if (isCompanyKey(sub)) return sub;

  return null;
}

/**
 * Like {@link resolveHostCompany} but falls back to the default company for
 * unknown/missing hosts.
 */
export function resolveCompanyKey(host: string | null | undefined): CompanyKey {
  return resolveHostCompany(host) ?? DEFAULT_COMPANY;
}

/**
 * Returns the brand that owns a URL path (first segment), or `null` when the
 * path is shared across brands (e.g. `/`, `/privacy`, `/research`).
 */
export function resolvePathCompany(pathname: string): CompanyKey | null {
  const segment = pathname.split('/').filter(Boolean)[0];
  if (!segment) return null;
  return PATH_TO_COMPANY[segment] ?? null;
}

/**
 * Home link and dev override for internal nav links. On mapped hosts (real
 * domains and `brand.localhost`) the logo and links stay at `/`. On unmapped
 * dev/preview hosts, non-default brands carry `?company=` so `/` resolves
 * correctly.
 */
export function brandNavParams(
  companyKey: CompanyKey,
  host: string | null | undefined
): { homeHref: string; brandParam: CompanyKey | null } {
  const hostMapped = resolveHostCompany(host) !== null;
  if (hostMapped || companyKey === DEFAULT_COMPANY) {
    return { homeHref: '/', brandParam: null };
  }
  return { homeHref: `/?company=${companyKey}`, brandParam: companyKey };
}

function isDevHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const hostname = host.split(':')[0].toLowerCase();
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.onrender.com')
  );
}

/**
 * Parent colophon link ("A Cypher Company"). On real child domains opens
 * cypher.net in a new tab; on dev/preview hosts navigates same-tab to the
 * local Cypher root (bare localhost when on brand.localhost).
 */
export function parentColophonParams(
  canonicalHref: string,
  host: string | null | undefined
): { href: string; external: boolean } {
  if (!isDevHost(host)) {
    return { href: canonicalHref, external: true };
  }

  const hostname = host!.split(':')[0].toLowerCase();
  if (hostname.endsWith('.localhost')) {
    const port = host!.includes(':') ? `:${host!.split(':')[1]}` : '';
    return { href: `http://localhost${port}/`, external: false };
  }

  return { href: '/', external: false };
}

/**
 * Returns the full company config for a key (or the value of the `x-company`
 * header). Falls back to the default company for unknown/missing values.
 */
export function getCompanyConfig(key: string | null | undefined): CompanyConfig {
  if (key && isCompanyKey(key)) return COMPANIES[key];
  return COMPANIES[DEFAULT_COMPANY];
}
