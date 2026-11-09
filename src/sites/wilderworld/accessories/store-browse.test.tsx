import { createElement } from 'react';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import OriginalStore from './OriginalStore';
import { individualStoreProducts } from './fashion';
import StorePage from '@/app/store/page';
import ClothingCollectionPage, { generateMetadata } from '@/app/store/collections/clothing/page';
import ProductDetail from './ProductDetail';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => createElement('img', { src, alt }),
}));
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => window.location.pathname,
}));

const scrollIntoView = vi.fn();
const previousScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');

beforeAll(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
});

afterAll(() => {
  if (previousScrollIntoView) Object.defineProperty(Element.prototype, 'scrollIntoView', previousScrollIntoView);
  else Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
});

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/store');
  scrollIntoView.mockClear();
  router.push.mockClear();
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  })));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

type Product = (typeof individualStoreProducts)[number];

function catalog() {
  return within(screen.getByRole('region', { name: 'Shop the simulation' }));
}

function departmentNavigation() {
  return within(screen.getByRole('navigation', { name: 'Product departments' }));
}

function visibleProductIds() {
  return within(catalog().getByRole('list', { name: 'Product catalog' }))
    .getAllByRole('article')
    .map(card => {
      const href = within(card).getByRole('link', { name: /^View / }).getAttribute('href')!;
      return new URL(href, 'https://wilder.test').pathname.split('/').pop()!;
    });
}

function expectProducts(expected: Product[]) {
  expect(visibleProductIds().sort()).toEqual(expected.map(product => product.id).sort());
  expect(catalog().getByText(new RegExp('^' + expected.length + ' products?\\b'))).toBeInTheDocument();
}

describe('store category gallery and browsing', () => {
  it('opens the mixed category, editorial and product overview in the site design', () => {
    render(<StorePage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Shop the simulation' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Take a trip/ })).not.toBeInTheDocument();
    const nav=within(screen.getByRole('navigation', { name: 'Shopping navigation' }));
    expect(nav.getByRole('link', {name:'Vehicles'})).toHaveAttribute('href','/store/collections/vehicles');
    expect(nav.getByRole('link', {name:'Statues'})).toHaveAttribute('href','/store/collections/statues');
    expect(within(screen.getByRole('region',{name:'Product category gallery'})).getAllByRole('link')).toHaveLength(15);
    expect(screen.getByRole('region', { name: 'The Wilder edit' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Make it yours' })).getAllByRole('article')).toHaveLength(8);
  });

  it('uses one large image per category, mixes lifestyle and product photos, and scrolls the category rail', () => {
    const scrollBy = vi.fn();
    const { container } = render(<StorePage />);
    const gallery = screen.getByRole('region', { name: 'Product category gallery' });
    Object.defineProperty(gallery, 'scrollBy', { configurable: true, value: scrollBy });
    Object.defineProperty(gallery, 'clientWidth', { configurable: true, value: 1200 });
    const cards = within(gallery).getAllByRole('link');
    for (const card of cards) {
      expect(card.querySelectorAll('img')).toHaveLength(1);
      const source = card.querySelector('img')!.getAttribute('src')!;
      expect(source).toMatch(/^\/images\//);
      expect(existsSync(path.join(process.cwd(), 'public', source)), source).toBe(true);
    }
    expect(within(gallery).getByRole('link',{name:'Shop Rims'})).toHaveAttribute('href','/store/collections/rims');
    expect(container.querySelector('video')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next categories' }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: expect.any(Number), behavior: 'auto' });
    expect(scrollBy.mock.lastCall![0].left).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Previous categories' }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: expect.any(Number), behavior: 'auto' });
    expect(scrollBy.mock.lastCall![0].left).toBeLessThan(0);
    const edits = within(screen.getByRole('region', { name: 'The Wilder edit' }));
    expect(edits.getAllByRole('link')).toHaveLength(4);
    expect(edits.getByRole('link', { name: /After hours/ })).toHaveAttribute('href', '/store/collections/clothing?category=jacket');
    expect(edits.getByRole('link', { name: /Carry your story/ })).toHaveAttribute('href', '/store/collections/totems');
  });

  it('leads with campaign headlines above the imagery and keeps compact editorial titles above their images', () => {
    render(<StorePage />);
    const gallery = screen.getByRole('region', { name: 'Product category gallery' });
    const campaign = within(gallery).getByRole('link', { name: 'Shop Vehicles' });
    expect(within(campaign).getByRole('heading', { name: 'Find your next ride.' })).toBeInTheDocument();
    expect(within(campaign).queryByText('Drive your own world')).not.toBeInTheDocument();
    expect(within(campaign).getByText('Wilder')).toBeInTheDocument();
    const headline = campaign.querySelector('[data-campaign-heading]')!;
    expect(headline.compareDocumentPosition(campaign.querySelector('img')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const edits = screen.getByRole('region', { name: 'The Wilder edit' });
    for (const card of within(edits).getAllByRole('link')) {
      expect(card.querySelector('h3')!.compareDocumentPosition(card.querySelector('img')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(card.querySelectorAll('img')).toHaveLength(1);
    }
    expect(screen.queryByText(/sponsored|best seller|% off/i)).not.toBeInTheDocument();
  });

  it('opens the Jackets list route and clears the department back to all 163 products', async () => {
    window.history.replaceState(null, '', '/store/collections/clothing?category=jacket');
    render(<OriginalStore view="catalog" initialCategory="jacket" />);
    expect(individualStoreProducts).toHaveLength(163);
    const jackets = individualStoreProducts.filter(product => product.category === 'jacket');
    expect(jackets).toHaveLength(51);
    expectProducts(jackets);
    expect(departmentNavigation().getByRole('button', { name: 'Jackets' })).toHaveAttribute('aria-pressed', 'true');
    expect(catalog().getByRole('heading', { name: 'Jackets' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Shop by category' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Take a trip/ })).not.toBeInTheDocument();
    expect((await generateMetadata({ searchParams: Promise.resolve({ category: 'jacket' }) })).title).toBe('Jackets — Wilder World');

    fireEvent.click(catalog().getByRole('button', { name: 'Clear filters' }));
    expectProducts(individualStoreProducts);
    expect(departmentNavigation().getByRole('button', { name: 'All products' })).toHaveAttribute('aria-pressed', 'true');
    expect(catalog().getByRole('heading', { name: 'All fashion' })).toBeInTheDocument();
    expect(catalog().queryByRole('button', { name: 'Remove department filter' })).not.toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get('category')).toBeNull();
  });

  it('uses the Headphones list route to show the four Jewelry-backed products', async () => {
    render(<OriginalStore view="catalog" initialCategory="jewelry" />);

    const headphones = individualStoreProducts.filter(product => product.category === 'jewelry');
    expect(headphones).toHaveLength(4);
    expect(headphones.every(product => product.categoryLabel === 'Headphones')).toBe(true);
    expectProducts(headphones);
    expect(catalog().getByRole('heading', { name: 'Headphones' })).toBeInTheDocument();
    expect(departmentNavigation().getByRole('button', { name: 'Headphones' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps collection navigation and fashion filters separate and handles invalid category links', async () => {
    render(<OriginalStore view="catalog" initialCategory="all" />);
    const nav = within(screen.getByRole('navigation', { name: 'Store collections' }));
    expect(nav.getByRole('link', { name: 'Vehicles' })).toHaveAttribute('href', '/store/collections/vehicles');
    expect(nav.getByRole('link', { name: 'Clothing' })).toHaveAttribute('href', '/store/collections/clothing');
    expect(departmentNavigation().queryByRole('button', { name: 'Vehicles' })).not.toBeInTheDocument();
    expectProducts(individualStoreProducts);

    fireEvent.click(departmentNavigation().getByRole('button', { name: 'Shoes' }));
    expectProducts(individualStoreProducts.filter(product => product.category === 'footwear'));
    fireEvent.click(departmentNavigation().getByRole('button', { name: 'All products' }));
    expectProducts(individualStoreProducts);
  });

  it('searches inside the selected department and sorts the matching products by their actual prices', () => {
    render(<OriginalStore />);
    fireEvent.click(departmentNavigation().getByRole('button', { name: 'Jackets' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search Wilder World' }), { target: { value: 'motor drip' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search products' }));

    const matching = individualStoreProducts.filter(product => product.category === 'jacket' && product.brand === 'MOTOR DRIP');
    expect(matching).toHaveLength(24);
    expect(new Set(matching.map(product => product.priceCents)).size).toBeGreaterThan(1);
    expectProducts(matching);
    const priceById = new Map(matching.map(product => [product.id, product.priceCents]));

    fireEvent.change(catalog().getByRole('combobox', { name: 'Sort' }), { target: { value: 'price-high' } });
    expect(visibleProductIds().map(id => priceById.get(id))).toEqual(matching.map(product => product.priceCents).sort((a, b) => b - a));
    fireEvent.change(catalog().getByRole('combobox', { name: 'Sort' }), { target: { value: 'price-low' } });
    expect(visibleProductIds().map(id => priceById.get(id))).toEqual(matching.map(product => product.priceCents).sort((a, b) => a - b));
    expectProducts(matching);
    expect(departmentNavigation().getByRole('button', { name: 'Jackets' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('searchbox', { name: 'Search Wilder World' })).toHaveValue('motor drip');

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expectProducts(individualStoreProducts.filter(product => product.category === 'jacket'));
  });

  it('keeps friendly category names connected to game categories and supports searching by those names', () => {
    render(<OriginalStore />);
    const categories = [
      ['Tops', 'topwear'], ['Bottoms', 'bottomwear'], ['Shoes', 'footwear'],
      ['Glasses', 'eyewear'], ['Hats', 'headwear'], ['Accessories', 'extra'],
      ['Suits', 'suit'], ['Masks', 'mask'],
    ];
    for (const [label, category] of categories) {
      fireEvent.click(departmentNavigation().getByRole('button', { name: label }));
      expectProducts(individualStoreProducts.filter(product => product.category === category));
      expect(catalog().getByRole('heading', { name: label })).toBeInTheDocument();
      expect(departmentNavigation().getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'true');
    }

    fireEvent.click(catalog().getByRole('button', { name: 'Clear filters' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search Wilder World' }), { target: { value: 'Shoes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search products' }));
    expectProducts(individualStoreProducts.filter(product => product.category === 'footwear'));
    expect(departmentNavigation().getByRole('button', { name: 'All products' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('recovers from an empty category search by resetting every filter', () => {
    render(<OriginalStore />);
    fireEvent.click(departmentNavigation().getByRole('button', { name: 'Jackets' }));
    fireEvent.click(within(catalog().getByRole('group', { name: 'Shop by gender' })).getByRole('button', { name: 'Women' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search Wilder World' }), { target: { value: 'FTWR_004_A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search products' }));
    expect(catalog().getByRole('heading', { name: 'No products found' })).toBeInTheDocument();
    expect(catalog().queryByRole('list', { name: 'Product catalog' })).not.toBeInTheDocument();

    fireEvent.click(catalog().getByRole('button', { name: 'View all products' }));
    expectProducts(individualStoreProducts);
    expect(screen.getByRole('searchbox', { name: 'Search Wilder World' })).toHaveValue('');
    expect(within(catalog().getByRole('group', { name: 'Shop by gender' })).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('returns from an individual product to its category list', () => {
    const product = individualStoreProducts.find(item => item.category === 'jacket')!;
    render(<ProductDetail product={product} />);
    const navigation = within(screen.getByRole('navigation', { name: 'Product navigation' }));
    expect(navigation.getByRole('link', { name: product.categoryLabel })).toHaveAttribute('href', '/store/collections/clothing?category=jacket');
    expect(navigation.getByRole('link', { name: 'Store' })).toHaveAttribute('href', '/store');
  });
});
