import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import './styles/globals.css';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { ThemeWrapper } from '@/components/ThemeWrapper';
import { MusicProvider } from '@/components/MusicContext';
import { CustomScrollbar } from '@/components/CustomScrollbar';
import { getCurrentCompany } from '@/lib/companies/current';
import { fontVariables } from '@/lib/fonts';

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCurrentCompany();
  return {
    title: company.metadata.title,
    description: company.metadata.description,
    icons: { icon: `/brand-favicon?company=${company.key}` },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const company = await getCurrentCompany();

  // Remap the semantic font tokens to the active brand's typeface. Omitted
  // fields keep the Inter defaults from globals.css.
  const fontStyle: CSSProperties = {};
  if (company.fonts?.sans) {
    (fontStyle as Record<string, string>)['--font-sans'] = company.fonts.sans;
  }
  if (company.fonts?.display) {
    (fontStyle as Record<string, string>)['--font-display'] = company.fonts.display;
  }

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={fontVariables}
      style={fontStyle}
    >
      <body>
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
              pageSections={company.pageSections}
            />
            <main id="page-main">
              {children}
              <Footer footer={company.footer} />
            </main>
          </MusicProvider>
        </ThemeWrapper>
      </body>
    </html>
  );
}
