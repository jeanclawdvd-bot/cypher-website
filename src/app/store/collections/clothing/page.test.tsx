import { describe, expect, it, vi } from 'vitest';
import ClothingCollectionPage, { generateMetadata } from './page';
import { filterProducts, marketProducts } from '@/sites/wilderworld/marketplace/catalog';

vi.mock('@/sites/wilderworld/marketplace/Marketplace', () => ({ MarketplaceBrowse: () => null }));

describe('clothing collection links', () => {
  it.each(['hats', 'helmets'])('opens the %s group selected by shopping navigation', async category => {
    const page = await ClothingCollectionPage({ searchParams: Promise.resolve({ category }) });
    expect(page.props.initialCategory).toBe(category);
    const products = filterProducts(marketProducts, { department: page.props.initialDepartment, subcategory: page.props.initialCategory });
    expect(products.length).toBeGreaterThan(0);
    expect(products.every(product => product.subcategory === 'headwear')).toBe(true);
    expect(products.length).toBeLessThan(filterProducts(marketProducts, { department: 'clothing', subcategory: 'headwear' }).length);
    expect((await generateMetadata({ searchParams: Promise.resolve({ category }) })).title).toBe(`${category === 'hats' ? 'Hats' : 'Helmets'} — Wilder World`);
  });

  it('retains legacy full Headwear links and normalizes unknown categories', async () => {
    expect((await ClothingCollectionPage({ searchParams: Promise.resolve({ category: 'headwear' }) })).props.initialCategory).toBe('headwear');
    expect((await ClothingCollectionPage({ searchParams: Promise.resolve({ category: 'unknown' }) })).props.initialCategory).toBe('all');
  });

  it('preserves the finish and companion filters when reopening a clothing URL', async () => {
    const page = await ClothingCollectionPage({ searchParams: Promise.resolve({ category: 'jacket', finish: 'Black', q: 'coat', brand: 'MOTOR DRIP', gender: 'Female', sort: 'price-low', view: 'list' }) });
    expect(page.props).toMatchObject({ initialDepartment: 'clothing', initialCategory: 'jacket', initialFinish: 'Black', initialQuery: 'coat', initialBrand: 'MOTOR DRIP', initialGender: 'Female', initialSort: 'price-low', initialView: 'list' });
  });
});
