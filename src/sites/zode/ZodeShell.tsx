'use client';

import type { ReactElement, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeProvider } from '@/sites/zode/lib/theme/ThemeProvider';
import { ShellBackdrop } from '@/sites/zode/components/ShellBackdrop';
import { SiteNav } from '@/sites/zode/components/SiteNav';
import { BottomTaskbar } from '@/sites/zode/components/BottomTaskbar';
import { SiteFooter } from '@/sites/zode/components/SiteFooter';
import { OverlayScrollbar } from '@/sites/zode/components/OverlayScrollbar';
import { ScrollReset } from '@/sites/zode/components/ScrollReset';
import styles from './ZodeShell.module.css';

const SITE_SCROLL_ID = 'site-scroll';

/**
 * Routes that bring their own full-page shell instead of the standard site
 * chrome: `/invest` renders the OuterShell pitch deck and `/login` renders a
 * bare password panel — mirroring the standalone zode-website, where those
 * routes lived outside the `(site)` layout group.
 */
function providesOwnShell(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/invest' ||
    pathname.startsWith('/invest/')
  );
}

/**
 * The zode brand's own chrome, ported from the standalone zode-website's
 * `(site)/layout.tsx` + root layout. Rendered by the monorepo root layout in
 * place of the shared Nav/Footer when the zode company is active: a white
 * outer shell with top nav and bottom taskbar framing a rounded, scrollable
 * inner content panel.
 */
export function ZodeShell({ children }: { children: ReactNode }): ReactElement {
  const pathname = usePathname() ?? '/';

  return (
    <ThemeProvider>
      <ShellBackdrop />
      {providesOwnShell(pathname) ? (
        children
      ) : (
        <div className={styles.shell}>
          <SiteNav />
          <div className={styles.body} data-shell-body="">
            <div id={SITE_SCROLL_ID} className={styles.scroll}>
              {children}
              <SiteFooter />
            </div>
            <ScrollReset targetId={SITE_SCROLL_ID} />
            <OverlayScrollbar targetId={SITE_SCROLL_ID} />
          </div>
          <BottomTaskbar />
        </div>
      )}
    </ThemeProvider>
  );
}
