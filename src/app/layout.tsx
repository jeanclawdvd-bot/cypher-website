import type { Metadata, Viewport } from 'next';
import type { CSSProperties } from 'react';
import { headers } from 'next/headers';
import './styles/globals.css';
import '@/sites/zode/zode.css';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { ThemeWrapper } from '@/components/ThemeWrapper';
import { MusicProvider } from '@/components/MusicContext';
import { CustomScrollbar } from '@/components/CustomScrollbar';
import { getCurrentCompany } from '@/lib/companies/current';
import { brandNavParams, parentColophonParams } from '@/lib/companies/resolve';
import { fontVariables } from '@/lib/fonts';
import { ZodeShell } from '@/sites/zode/ZodeShell';
import { ZodeGate } from '@/sites/zode/ZodeGate';
import { themeInitScript } from '@/sites/zode/lib/theme/theme-script';
import { Providers } from './providers';

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCurrentCompany();
  return {
    title: company.metadata.title,
    description: company.metadata.description,
    icons: { icon: `/brand-favicon?company=${company.key}` },
    ...(company.metadata.noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const company = await getCurrentCompany();
  const h = await headers();
  const { homeHref, brandParam } = brandNavParams(company.key, h.get('host'));
  const parentColophon = company.footer.parentCompany
    ? parentColophonParams(company.footer.parentCompany.href, h.get('host'))
    : null;

  // Remap the semantic font tokens to the active brand's typeface. Omitted
  // fields keep the Inter defaults from globals.css.
  const fontStyle: CSSProperties = {};
  if (company.fonts?.sans) {
    (fontStyle as Record<string, string>)['--font-sans'] = company.fonts.sans;
  }
  if (company.fonts?.display) {
    (fontStyle as Record<string, string>)['--font-display'] = company.fonts.display;
  }

  /* Brands with custom chrome (currently only zode) skip the shared
     Nav/Footer/scrollbar and theme system entirely: the brand's own shell
     supplies its chrome, theming, and scroll containers. */
  if (company.customChrome) {
    return (
      <html lang="en" suppressHydrationWarning className={fontVariables}>
        <head>
          {/* Applies the persisted zode theme before first paint. */}
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        </head>
        <body data-company={company.key}>
          <Providers company={company.key}>
            <ZodeGate>
              <ZodeShell>{children}</ZodeShell>
            </ZodeGate>
          </Providers>
        </body>
      </html>
    );
  }

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={fontVariables}
      style={fontStyle}
    >
      <body data-company={company.key}>
        <Providers company={company.key}>
          <ThemeWrapper
            defaultTheme={company.defaultTheme}
            defaultAccent={company.accent}
            storageKey={`zui-theme-${company.key}`}
          >
            <MusicProvider>
              <CustomScrollbar />
              <Nav
                wordmark={company.wordmark}
                wordmarkLogo={company.wordmarkLogo}
                cta={company.cta}
                sections={company.nav}
                navStyle={company.navStyle}
                pageSections={company.pageSections}
                homeHref={homeHref}
                brandParam={brandParam}
              />
              <main id="page-main">
                {children}
                <Footer
                  footer={company.footer}
                  brandParam={brandParam}
                  parentColophon={parentColophon}
                />
              </main>
            </MusicProvider>
          </ThemeWrapper>
        </Providers>
      </body>
    </html>
  );
}
