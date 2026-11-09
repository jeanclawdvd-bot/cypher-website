import { describe, expect, it, vi } from 'vitest';
import { createElement, type ComponentType } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import catalog from './catalog.json';
import { resolvePathCompany } from '@/lib/companies/resolve';
import { excludedFamilies, hiddenProductIds, findStoreProduct, storefrontProducts } from './merchandising';
import { findIndividualProduct, individualStoreProducts } from './fashion';
import imageExceptions from './image-exceptions.json';
import OriginalStore from './OriginalStore';
import assignedPrices from './prices.json';
import { formatUsd } from './pricing';
import { generateMetadata, generateStaticParams } from '@/app/store/[id]/page';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => createElement('img', { src, alt }),
}));

describe('accessory catalog import', () => {
  it('prices every active style in USD and sorts the displayed catalog by price', () => {
    expect(Object.keys(assignedPrices.products).sort()).toEqual(individualStoreProducts.map(p => p.id).sort());
    expect(individualStoreProducts).toHaveLength(163);
    for (const product of individualStoreProducts) {
      expect(Number.isSafeInteger(product.priceCents), product.id).toBe(true);
      expect(product.priceCents, product.id).toBeGreaterThan(0);
      expect(product.currency).toBe('USD');
      expect(product.price).toBe(formatUsd(product.priceCents));
    }
    const Store = OriginalStore as ComponentType<{ initialProductId?: string | null }>;
    render(createElement(Store));
    for (const product of individualStoreProducts) {
      expect(within(screen.getByRole('article', { name: product.name })).getByText(product.price)).toBeInTheDocument();
    }
    const displayedPrices = () => screen.getAllByRole('article').map(card => {
      const product = individualStoreProducts.find(p => p.name === card.getAttribute('aria-label'))!;
      return product.priceCents;
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort' }), { target: { value: 'price-low' } });
    const ascending = displayedPrices();
    expect(ascending).toEqual([...ascending].sort((a, b) => a - b));
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort' }), { target: { value: 'price-high' } });
    const descending = displayedPrices();
    expect(descending).toEqual([...descending].sort((a, b) => b - a));
    expect(new Set(ascending).size).toBeGreaterThan(1);
  });
  it('removes excluded families and their variants from both listing and detail routes', () => {
    for (const id of excludedFamilies) {
      expect(findStoreProduct(id)).toBeUndefined();
      expect(storefrontProducts.some(p => p.id === id)).toBe(false);
      expect(findIndividualProduct(id)).toBeUndefined();
      expect(individualStoreProducts.some(p => p.familyId === id)).toBe(false);
      const excluded = catalog.products.find(p => p.id === id);
      for (const variant of excluded?.variants ?? []) {
        expect(findIndividualProduct(variant.sku)).toBeUndefined();
      }
    }
    expect(findStoreProduct('JCKT_010')?.variants).toHaveLength(3);
    expect(findStoreProduct('HDWR_001')).toBeDefined();
    expect(catalog.products.some(p => p.id === 'GravGlove')).toBe(true);
  });
  it('applies the additional merchandise removals without deleting source records or similar names', () => {
    const removed = ['HDWR_FRN', 'HDWR_0RN', 'FTWR_TRN', 'FTWR_006', 'BTWR_005', 'EYWR_NONE', 'XTRA_001', 'BTWR_003', 'XTRA_005'];
    for (const id of removed) {
      expect(catalog.products.some(p => p.id === id)).toBe(true);
      expect(excludedFamilies.has(id)).toBe(true);
      expect(findStoreProduct(id)).toBeUndefined();
    }
    expect(findStoreProduct('HDWR_FRD')).toBeDefined();
    expect(findStoreProduct('FTWR_005')).toBeDefined();
    expect(findStoreProduct('BTWR_006')).toBeDefined();
    expect(storefrontProducts).toHaveLength(68);
    expect(storefrontProducts.flatMap(p => p.variants)).toHaveLength(173);
  });
  it('preserves every source SKU once and retains its original thumbnail reference', () => {
    const variants = catalog.products.flatMap(p => p.variants);
    expect(variants).toHaveLength(318);
    expect(new Set(variants.map(v => v.sku)).size).toBe(318);
    for (const v of variants) {
      expect(v.image.startsWith('/images/accessories/')).toBe(true);
      // The hosting copy prunes unused source thumbnails; active product and
      // color photographs are checked separately below.
      expect(v.image.length).toBeGreaterThan('/images/accessories/'.length);
    }
  });
  it('keeps unverified colorways and source variants separate', () => {
    for (const p of catalog.products) {
      expect(p.availability).toBe('draft');
      expect(p.price).toBeNull();
      expect(p.proposedColorways.filter(c => c.id !== 'original').every(c => c.status === 'concept')).toBe(true);
      expect(p.variants.every(v => v.colorway === null && v.compatibility === null)).toBe(true);
    }
    expect(catalog.products.flatMap(p => p.variants).filter(v => v.renderStatus === 'styled_sample')).toHaveLength(2);
  });
  it('uses Wilder World branding on store routes', () => {
    expect(resolvePathCompany('/store')).toBe('wilderworld');
    expect(resolvePathCompany('/store/example')).toBe('wilderworld');
  });
  it('gives every visible style an independent identity and image while retaining its real source SKU', () => {
    expect(individualStoreProducts.length).toBeGreaterThan(storefrontProducts.length);
    expect(new Set(individualStoreProducts.map(p => p.id)).size).toBe(individualStoreProducts.length);
    const categories = new Set(['Topwear', 'Jacket', 'Bottomwear', 'Footwear', 'Suit', 'Headwear', 'Eyewear', 'Mask', 'Headphones', 'Extra']);
    for (const product of individualStoreProducts) {
      const sourceFamily = catalog.products.find(p => p.id === product.familyId);
      expect(sourceFamily?.variants.some(v => v.sku === product.sourceSku)).toBe(true);
      expect(product.sourceSku in imageExceptions).toBe(false);
      expect(product.name.trim()).not.toBe('');
      expect(product.brand.trim()).not.toBe('');
      expect(product.description.trim()).not.toBe('');
      expect(product.lore.trim()).not.toBe('');
      expect(categories.has(product.categoryLabel)).toBe(true);
      expect(product.options).toEqual([]);
      expect(product).not.toHaveProperty('variantImages');
      expect(product.draft).toBe(true);
      expect(product.image.startsWith('/images/accessories/')).toBe(true);
      expect(existsSync(resolve('public', product.image.slice(1)))).toBe(true);
      expect(findIndividualProduct(product.id)).toBe(product);
    }
    const eyewearStyles = ['EYWR_006', 'EYWR_006_A', 'EYWR_006_B'].map(id => findIndividualProduct(id));
    expect(eyewearStyles.every(Boolean)).toBe(true);
    expect(new Set(eyewearStyles.map(p => p?.name)).size).toBe(3);
    expect(new Set(eyewearStyles.map(p => p?.image)).size).toBe(3);
    expect(catalog.products.flatMap(p => p.variants).some(v => v.sku === 'XTRA_010_B')).toBe(true);
    expect(findIndividualProduct('XTRA_010_B')).toBeUndefined();
  });
  it('provides exact style routes, compatible family aliases and style-specific metadata', async () => {
    const routes = generateStaticParams().map(p => p.id);
    expect(new Set(routes).size).toBe(routes.length);
    for (const product of individualStoreProducts) {
      expect(routes).toContain(product.id);
      if (!hiddenProductIds.has(product.familyId)) expect(routes).toContain(product.familyId);
    }
    const mask = findIndividualProduct('MASK_001_A');
    expect(mask).toBeDefined();
    expect(findIndividualProduct('MASK_001')).toBe(mask);
    expect(findIndividualProduct('unknown-style')).toBeUndefined();
    expect(routes.some(id => id.startsWith('XTRA_005'))).toBe(false);
    const style = findIndividualProduct('EYWR_006_B')!;
    const metadata = await generateMetadata({ params: Promise.resolve({ id: style.id }) });
    expect(metadata.title).toBe(`${style.name} — Wilder World`);
    expect(metadata.description).toBe(style.description);
  });
  it('opens each accessory style without configuration controls and keeps vehicles separate from the clothing list', () => {
    const style = findIndividualProduct('EYWR_006_B')!;
    const Store = OriginalStore as ComponentType<{ initialProductId?: string | null }>;
    render(createElement(Store, { initialProductId: style.id }));
    const dialogElement = screen.getByRole('dialog', { name: style.name });
    const dialog = within(dialogElement);
    expect(dialog.getByRole('heading', { name: style.name })).toBeInTheDocument();
    expect(dialog.getByText(style.sourceSku)).toBeInTheDocument();
    expect(dialog.getByRole('img', { name: style.name })).toHaveAttribute('src', style.image);
    expect(dialog.queryByRole('group', { name: 'Style' })).not.toBeInTheDocument();
    expect(dialog.queryByRole('combobox')).not.toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Add to bag' })).toBeEnabled();
    fireEvent.click(dialog.getByRole('button', { name: 'Close product' }));
    expect(screen.getByRole('link', { name: /^Vehicles$/ })).toHaveAttribute('href', '/store/collections/vehicles');
    expect(screen.queryByRole('link', { name: 'Shop the collection' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vehicles' })).not.toBeInTheDocument();
    expect(screen.queryByText('Explore vehicles')).not.toBeInTheDocument();
  });
  it('changes actual color photographs while preserving the individual product identity', () => {
    const product = findIndividualProduct('JCKT_001')!;
    expect(product.colorways).toHaveLength(3);
    const Store = OriginalStore as ComponentType<{ initialProductId?: string | null }>;
    render(createElement(Store, { initialProductId: product.id }));
    const dialog = within(screen.getByRole('dialog', { name: product.name }));
    for (const color of product.colorways) {
      fireEvent.click(dialog.getByRole('button', { name: color.name }));
      expect(dialog.getByRole('img', { name: product.name })).toHaveAttribute('src', color.image);
      expect(dialog.getByRole('button', { name: color.name })).toHaveAttribute('aria-pressed', 'true');
      expect(dialog.getByText(product.sourceSku)).toBeInTheDocument();
      expect(existsSync(resolve('public', color.image.slice(1)))).toBe(true);
    }
    expect(dialog.queryByRole('combobox')).not.toBeInTheDocument();
    if (product.editorials.length) {
      const editorial = product.editorials[0];
      const color = product.colorways.find(c => c.id === editorial.colorwayId)!;
      fireEvent.click(dialog.getByRole('button', { name: color.name }));
      fireEvent.click(dialog.getByRole('button', { name: 'Editorial' }));
      expect(dialog.getByRole('img', { name: editorial.alt })).toHaveAttribute('src', editorial.image);
      fireEvent.click(dialog.getByRole('button', { name: 'Product' }));
      expect(dialog.getByRole('img', { name: product.name })).toHaveAttribute('src', color.image);
    }
  });
  it('delivers three distinct color photographs for every individual product', () => {
    expect(individualStoreProducts).toHaveLength(163);
    const colorIds = new Set<string>();
    const photographs = new Set<string>();
    for (const product of individualStoreProducts) {
      expect(product.colorways, product.id).toHaveLength(3);
      expect(new Set(product.colorways.map(color => color.name)).size).toBe(3);
      for (const color of product.colorways) {
        expect(colorIds.has(color.id), color.id).toBe(false);
        expect(photographs.has(color.image), color.image).toBe(false);
        expect(existsSync(resolve('public', color.image.slice(1))), color.image).toBe(true);
        colorIds.add(color.id);
        photographs.add(color.image);
      }
    }
    expect(colorIds.size).toBe(489);
    expect(photographs.size).toBe(489);
  });
  it('honors individual removals, keeps the catalog fashion-only and defines the shopper categories', () => {
    for (const id of hiddenProductIds) expect(findIndividualProduct(id), id).toBeUndefined();
    expect(findIndividualProduct('FTWR_004_A')?.gender).toBe('Women');
    const headphones = individualStoreProducts.filter(p => p.category === 'jewelry');
    expect(headphones.length).toBeGreaterThan(0);
    expect(headphones.every(p => p.categoryLabel === 'Headphones')).toBe(true);
    expect(individualStoreProducts.every(p => ['Men', 'Women', 'Unisex'].includes(p.gender))).toBe(true);
    const Store = OriginalStore as ComponentType<{ initialProductId?: string | null }>;
    render(createElement(Store));
    expect(screen.queryByRole('button', { name: 'Quick view Radeon Ghostline' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(163);
    expect(screen.queryByRole('button', { name: 'Vehicles' })).not.toBeInTheDocument();
    expect(individualStoreProducts.every(product => product.category !== 'vehicles')).toBe(true);
    const gender = within(screen.getByRole('group', { name: 'Shop by gender' }));
    fireEvent.click(gender.getByRole('button', { name: 'Women' }));
    expect(screen.getByRole('article', { name: 'Grave Courtesy / 02' })).toBeInTheDocument();
    fireEvent.click(gender.getByRole('button', { name: 'Men' }));
    expect(screen.queryByRole('article', { name: 'Grave Courtesy / 02' })).not.toBeInTheDocument();
  });
  it('previews colors in the browse grid and carries the selection to the product page', () => {
    const Store = OriginalStore as ComponentType<{ initialProductId?: string | null }>;
    render(createElement(Store));
    const product = findIndividualProduct('JCKT_001')!;
    const card = within(screen.getByRole('article', { name: product.name }));
    const color = product.colorways[2];
    fireEvent.click(card.getByRole('button', { name: color.name }));
    expect(card.getByRole('button', { name: color.name })).toHaveAttribute('aria-pressed', 'true');
    const link = card.getByRole('link', { name: `View ${product.name}` });
    expect(link).toHaveAttribute('href', `/store/${product.id}?color=${color.id}`);
    expect(link.querySelector('img')).toHaveAttribute('src', color.image);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(new Set(individualStoreProducts.map(p => p.defaultColorId?.slice(-2)))).toEqual(new Set(['01', '02', '03']));
  });
});
