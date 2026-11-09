import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { COMPANIES, PATH_TO_COMPANY } from '@/lib/companies/registry';
import type { CompanyKey } from '@/lib/companies/types';

const mocks = vi.hoisted(() => ({ company: vi.fn(), path: vi.fn() }));
vi.mock('@/lib/companies/current', () => ({ getCurrentCompany: mocks.company }));
vi.mock('next/navigation', () => ({ usePathname: mocks.path }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: '127.0.0.1:8791' }) }));
vi.mock('@/lib/fonts', () => ({ fontVariables: 'test-fonts' }));
vi.mock('@/sites/cypher/Landing', () => ({ default: () => <div>Cypher landing</div> }));
vi.mock('@/sites/zode/Landing', () => ({ default: () => <div>Zode landing</div> }));
vi.mock('@/sites/zero/Landing', () => ({ default: () => <div>Zero landing</div> }));
vi.mock('@/sites/zchain/Landing', () => ({ default: () => <div>Zchain landing</div> }));
vi.mock('@/sites/wilderworld/Landing', () => ({ default: () => <div>Original Wilder World introduction</div> }));
vi.mock('@/sites/wilderworld/marketplace/Marketplace', () => ({ MarketplaceHome: () => <div>Wilder World shopping home</div>, MarketHeader: ({ department }: { department?: string }) => <nav aria-label="Shopping navigation" data-department={department}>Wilder World shopping header</nav> }));
vi.mock('@/components/Nav', () => ({ Nav: () => <nav aria-label="Original brand navigation"/> }));
vi.mock('@/components/Footer', () => ({ Footer: () => <footer>Preserved footer</footer> }));
vi.mock('@/components/CustomScrollbar', () => ({ CustomScrollbar: () => <div data-testid="custom-scrollbar"/> }));
vi.mock('@/components/ThemeWrapper', () => ({ ThemeWrapper: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/MusicContext', () => ({ MusicProvider: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/sites/zode/ZodeShell', () => ({ ZodeShell: ({ children }: { children: ReactNode }) => <div data-zode-shell>{children}</div> }));
vi.mock('@/sites/zode/ZodeGate', () => ({ ZodeGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('./providers', () => ({ Providers: ({ children }: { children: ReactNode }) => <>{children}</> }));

import Home from './page';
import Discover from './discover/page';
import RootLayout from './layout';
import WilderShoppingNav, { hasPageShoppingNavigation } from '@/sites/wilderworld/marketplace/WilderShoppingNav';

describe('Shopping homepage by brand', () => {
  it.each<[CompanyKey, string]>([['wilderworld', 'Wilder World shopping home'], ['cypher', 'Cypher landing'], ['zero', 'Zero landing'], ['zode', 'Zode landing'], ['zchain', 'Zchain landing']])('keeps the expected home for %s', async (company, text) => {
    mocks.company.mockResolvedValue(COMPANIES[company]);
    render(await Home()); expect(screen.getByText(text)).toBeInTheDocument();
    if (company !== 'wilderworld') expect(screen.queryByText('Wilder World shopping home')).not.toBeInTheDocument();
  });
  it('preserves the original Wilder introduction at /discover', () => {
    expect(PATH_TO_COMPANY.discover).toBe('wilderworld');
    render(<Discover/>); expect(screen.getByText('Original Wilder World introduction')).toBeInTheDocument();
    expect(screen.queryByText('Wilder World shopping home')).not.toBeInTheDocument();
  });
  it('keeps world discovery in the footer and uses Play Now', () => {
    expect(JSON.stringify(COMPANIES.wilderworld.footer)).toContain('/discover');
    expect(COMPANIES.wilderworld.cta?.label).toBe('Play Now');
    expect(COMPANIES.wilderworld.cta?.href).toMatch(/^https:\/\/store\.epicgames\.com\//);
  });
});

describe('One shopping header per page', () => {
  it.each(['/', '/store', '/store/browse', '/store/account', '/store/market', '/store/market/wilderworld/123', '/store/products/furniture-sofa', '/store/collections/rims', '/store/collections/totems'])('does not duplicate the inline header on %s', path => {
    mocks.path.mockReturnValue(path); expect(hasPageShoppingNavigation(path)).toBe(true);
    render(<WilderShoppingNav/>); expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
  it.each(['/store/JCKT_001', '/discover', '/city', '/store/collections/furniture/apartment'])('provides the shopping header on %s', path => {
    mocks.path.mockReturnValue(path); expect(hasPageShoppingNavigation(path)).toBe(false);
    render(<WilderShoppingNav/>); expect(screen.getByRole('navigation', { name: 'Shopping navigation' })).toBeInTheDocument();
  });
});

describe('Global brand shell', () => {
  it('uses shopping navigation and preserves the footer for Wilder World', async () => {
    mocks.company.mockResolvedValue(COMPANIES.wilderworld); mocks.path.mockReturnValue('/discover');
    const html = renderToStaticMarkup(await RootLayout({ children: <div>Page content</div> }));
    expect(html).toContain('Shopping navigation'); expect(html).not.toContain('Original brand navigation');
    expect(html).toContain('Preserved footer'); expect(html).not.toContain('custom-scrollbar');
  });
  it('retains original navigation and scrollbar on other shared-shell brands', async () => {
    mocks.company.mockResolvedValue(COMPANIES.cypher); mocks.path.mockReturnValue('/');
    const html = renderToStaticMarkup(await RootLayout({ children: <div>Page content</div> }));
    expect(html).toContain('Original brand navigation'); expect(html).not.toContain('Shopping navigation');
    expect(html).toContain('custom-scrollbar'); expect(html).toContain('Preserved footer');
  });
  it('leaves the custom Zode shell intact', async () => {
    mocks.company.mockResolvedValue(COMPANIES.zode); mocks.path.mockReturnValue('/');
    const html = renderToStaticMarkup(await RootLayout({ children: <div>Page content</div> }));
    expect(html).toContain('data-zode-shell'); expect(html).not.toContain('Shopping navigation'); expect(html).not.toContain('Original brand navigation');
  });
});
