import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './styles/globals.css';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { ThemeWrapper } from '@/components/ThemeWrapper';
import { MusicProvider } from '@/components/MusicContext';
import { CustomScrollbar } from '@/components/CustomScrollbar';
import { getCurrentCompany } from '@/lib/companies/current';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCurrentCompany();
  return {
    title: company.metadata.title,
    description: company.metadata.description,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const company = await getCurrentCompany();

  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
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
