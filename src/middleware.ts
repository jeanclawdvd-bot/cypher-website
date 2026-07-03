import { NextResponse, type NextRequest } from 'next/server';
import { resolveHostCompany, resolvePathCompany, normalizeCompany } from './lib/companies/resolve';
import { DEFAULT_COMPANY } from './lib/companies/registry';
import {
  AUTH_DISABLED as ZODE_AUTH_DISABLED,
  SESSION_COOKIE as ZODE_SESSION_COOKIE,
} from './sites/zode/lib/session-constants';

const ZODE_LOGIN_PATH = '/login';

/**
 * Resolves the active company and attaches it as an `x-company` request header.
 * No path rewrite: every domain's homepage stays at `/`, and server components
 * read the header to render the right company.
 *
 * Brand resolution precedence:
 *   1. The request path, when it belongs to a brand-owned route (e.g. /universe
 *      → wilderworld). Ensures chrome and content always match.
 *   2. The request host, when it explicitly maps to a brand (real domains and
 *      `brand.localhost` subdomains). Authoritative on mapped hosts so a stray
 *      `?company=` can never make a real domain serve another brand.
 *   3. `?company=` override (dev convenience on localhost / preview hosts).
 *   4. The default company (bare localhost behaves like cypher.net).
 */
export function middleware(req: NextRequest) {
  const pathKey = resolvePathCompany(req.nextUrl.pathname);
  const hostKey = resolveHostCompany(req.headers.get('host'));
  const override = normalizeCompany(req.nextUrl.searchParams.get('company'));

  const company = pathKey ?? hostKey ?? override ?? DEFAULT_COMPANY;

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

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Run on all paths except Next internals, the favicon/icon, public images,
  // and any file with an extension (static assets).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|.*\\..*).*)'],
};
