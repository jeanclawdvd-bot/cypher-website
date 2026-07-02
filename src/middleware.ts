import { NextResponse, type NextRequest } from 'next/server';
import { resolveHostCompany, normalizeCompany } from './lib/companies/resolve';
import { DEFAULT_COMPANY } from './lib/companies/registry';
import {
  AUTH_DISABLED as ZODE_AUTH_DISABLED,
  SESSION_COOKIE as ZODE_SESSION_COOKIE,
} from './sites/zode/lib/session-constants';

const COMPANY_COOKIE = 'company';
const ZODE_LOGIN_PATH = '/login';

/**
 * Resolves the active company and attaches it as an `x-company` request header.
 * No path rewrite: every domain's homepage stays at `/`, and server components
 * read the header to render the right company.
 *
 * Brand resolution precedence:
 *   1. The request host, when it explicitly maps to a brand (real domains and
 *      `brand.localhost` subdomains). This is authoritative so a stale cookie
 *      or stray `?company=` can never make a real domain serve another brand.
 *   2. `?company=` override (dev convenience) — also persisted to a cookie.
 *   3. A previously-set `company` cookie (keeps the dev override sticky across
 *      internal navigations so links never need to carry `?company=`).
 *   4. The default company.
 *
 * Making the explicit host win first is the structural fix for brand "leaks":
 * on `cypher.net` (the default brand's domain) a lingering `company=wilderworld`
 * cookie previously overrode the host and served Wilder World. The override and
 * cookie now only apply on non-mapped hosts (`localhost`, `*.onrender.com`).
 */
export function middleware(req: NextRequest) {
  const hostKey = resolveHostCompany(req.headers.get('host'));
  const override = normalizeCompany(req.nextUrl.searchParams.get('company'));
  const cookieKey = normalizeCompany(req.cookies.get(COMPANY_COOKIE)?.value);

  const company = hostKey ?? override ?? cookieKey ?? DEFAULT_COMPANY;

  /*
   * Zode shared-password gate (ported from zode-website's proxy.ts, currently
   * disabled via AUTH_DISABLED). This Edge bundle can't use node:crypto, so it
   * only checks cookie presence for the redirect; full HMAC verification
   * happens server-side in ZodeGate before any content renders.
   */
  if (company === 'zode' && !ZODE_AUTH_DISABLED) {
    const { pathname } = req.nextUrl;
    const hasSession = Boolean(req.cookies.get(ZODE_SESSION_COOKIE)?.value);

    if (pathname === ZODE_LOGIN_PATH) {
      if (hasSession) {
        return NextResponse.redirect(new URL('/', req.nextUrl));
      }
    } else if (!hasSession) {
      return NextResponse.redirect(new URL(ZODE_LOGIN_PATH, req.nextUrl));
    }
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-company', company);
  // Lets server components (e.g. ZodeGate) know the requested path.
  requestHeaders.set('x-pathname', req.nextUrl.pathname);

  const res = NextResponse.next({ request: { headers: requestHeaders } });

  // Keep the dev override sticky; clear it when explicitly returning to default.
  if (override) {
    if (override === DEFAULT_COMPANY) {
      res.cookies.delete(COMPANY_COOKIE);
    } else {
      res.cookies.set(COMPANY_COOKIE, override, {
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      });
    }
  }

  return res;
}

export const config = {
  // Run on all paths except Next internals, the favicon/icon, public images,
  // and any file with an extension (static assets).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|.*\\..*).*)'],
};
