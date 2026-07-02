import type { ReactElement, ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/sites/zode/lib/session';

/**
 * Defense in depth for the zode shared-password gate: the middleware already
 * redirects unauthenticated requests, but re-check here (with full HMAC
 * verification, which needs the Node runtime) so content is never rendered
 * without a valid session. `/login` is exempt so the gate never loops.
 * Currently a no-op while AUTH_DISABLED is true in session-constants.ts.
 */
export async function ZodeGate({ children }: { children: ReactNode }): Promise<ReactElement> {
  const pathname = (await headers()).get('x-pathname') ?? '/';
  if (pathname !== '/login' && !(await isAuthenticated())) {
    redirect('/login');
  }
  return <>{children}</>;
}
