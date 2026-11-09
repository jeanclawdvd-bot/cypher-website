import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import CollectionBrowse from './CollectionBrowse';
import CollectionProduct from './CollectionProduct';
import { CollectionNavigation, CollectionOverview, collectionLinks } from './CollectionNavigation';
import { findRegistryProduct, isBrowseSection, productsForSection, registryProducts } from './store-registry';
import { individualStoreProducts } from '../accessories/fashion';
import { generateMetadata, generateStaticParams } from '@/app/store/items/[id]/page';

vi.mock('next/image', () => ({ default: ({ src, alt }: { src: string; alt: string }) => createElement('img', { src, alt }) }));

describe('collection browsing and launch boundaries', () => {
  it('labels and filters the complete furniture categories', () => {
    render(<CollectionBrowse section="furniture" products={productsForSection('furniture')} />);
    for (const label of ['Sofa', 'Chair', 'Coffee table', 'Desk']) expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Chair' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.queryByRole('article', { name: /Sofa/ })).not.toBeInTheDocument();
  });
  it('provides four collection destinations with real covers and keeps fashion identities intact', () => {
    render(<><CollectionOverview /><CollectionNavigation active="clothing" /></>);
    const navigation = within(screen.getByRole('navigation', { name: 'Store collections' }));
    expect(navigation.getByRole('link', { name: 'Clothing' })).toHaveAttribute('aria-current', 'page');
    for (const link of collectionLinks) {
      expect(screen.getByRole('link', { name: `Explore ${link.name}` })).toHaveAttribute('href', link.href);
      if (link.image) expect(existsSync(resolve('public', link.image.slice(1)))).toBe(true);
    }
    expect(individualStoreProducts).toHaveLength(163);
    expect(individualStoreProducts.flatMap(product => product.colorways)).toHaveLength(489);
    expect(registryProducts.filter(product => product.section === 'fashion').map(product => product.id).sort()).toEqual(individualStoreProducts.map(product => product.id).sort());
    expect(productsForSection('totems').every(product => product.collectionId === 'clothing')).toBe(true);
    expect(isBrowseSection('clothing')).toBe(false);
    expect(isBrowseSection('totems')).toBe(true);
  });

  it('filters complete vehicles and rim candidates without changing the existing vehicle landing', () => {
    const products = productsForSection('vehicles');
    render(<CollectionBrowse section="vehicles" products={products} />);
    expect(screen.getByRole('link', { name: /Explore the featured vehicles/ })).toHaveAttribute('href', '/vehicles');
    fireEvent.click(screen.getByRole('button', { name: 'Rims' }));
    expect(screen.getAllByRole('article')).toHaveLength(products.filter(product => product.itemType === 'rim_set').length);
    const rim = products.find(product => product.itemType === 'rim_set')!;
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search vehicles' }), { target: { value: rim.sourceIds[0] } });
    expect(screen.getByRole('article', { name: rim.name })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Buy|Mint|Add to bag/ })).not.toBeInTheDocument();
  });

  it('keeps archived Trinity out of active routes while showing honest Frank Wilder model readiness',()=>{
    expect(productsForSection('totems').some(product=>product.status==='legacy_reference')).toBe(false);
    expect(findRegistryProduct('totem-trinity-legacy')).toBeUndefined();
    const product=productsForSection('totems').find(product=>product.id==='totem-fw-hermes-ii')!;
    render(<CollectionProduct product={product}/>);
    expect(screen.getByRole('heading',{name:product.name,level:1})).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Purchasing unavailable'})).toBeDisabled();
    expect(screen.getByText('Integration pending')).toBeInTheDocument();
    expect(screen.queryByText('Chain + pendant')).not.toBeInTheDocument();
    expect(screen.queryByText(/Sold out|In stock|You own/)).not.toBeInTheDocument();
  });

  it('provides non-fashion item routes with review metadata and blocks candidate purchase', async () => {
    const candidates = registryProducts.filter(product => product.section !== 'fashion' && product.storeVisible !== false);
    const routes = generateStaticParams();
    expect(routes.map(route => route.id).sort()).toEqual(candidates.map(product => product.id).sort());
    for (const product of candidates) {
      expect(findRegistryProduct(product.id)).toBe(product);
      if (product.image) expect(existsSync(resolve('public', product.image.slice(1))), product.image).toBe(true);
    }
    expect(findRegistryProduct(individualStoreProducts[0].id)).toBeUndefined();
    expect(findRegistryProduct('unknown')).toBeUndefined();
    for (const product of registryProducts.filter(product => product.storeVisible === false)) expect(findRegistryProduct(product.id)).toBeUndefined();
    const furniture = productsForSection('furniture')[0];
    const metadata = await generateMetadata({ params: Promise.resolve({ id: furniture.id }) });
    expect(metadata.title).toBe(`${furniture.name} — Wilder World`);
    render(<CollectionProduct product={furniture} />);
    expect(screen.getByRole('button', { name: 'Purchasing unavailable' })).toBeDisabled();
    expect(screen.queryByText(/\$\d/)).not.toBeInTheDocument();
  });
});
