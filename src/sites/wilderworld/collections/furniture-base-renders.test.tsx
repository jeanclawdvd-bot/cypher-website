import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { canonicalGameAsset, findStandaloneBaseRender, getCollectionImage, furnitureBaseRenders, type FurnitureBaseRender, type FurnitureBaseRenderData } from './furniture-base-images';
import FurnitureBaseGallery from './FurnitureBaseGallery';
import CollectionBrowse from './CollectionBrowse';
import CollectionProduct from './CollectionProduct';
import ApartmentInventory, { type ApartmentInventoryData } from './ApartmentInventory';
import apartmentData from './apartment-definition.json';
import { registryProducts } from './store-registry';
import FurnitureBaseRenderPage, { metadata } from '@/app/store/collections/furniture/base-renders/page';

vi.mock('next/image', () => ({ default: ({ src, alt }: { src: string; alt: string }) => createElement('img', { src, alt }) }));

const chair: FurnitureBaseRender = {
  id: 'local-chair', name: 'Local chair study', category: 'Chair', hero: '/images/local-chair-hero.webp', front: '/images/local-chair-front.webp',
  sourceAssets: ['/Game/Apartment/SM_Chair.SM_Chair'], sourceIds: ['SM_Chair'], notes: 'Original source geometry in a neutral finish.',
};
const assembly: FurnitureBaseRender = {
  id: 'local-stool', name: 'Local stool assembly', category: 'Stool', hero: '/images/local-stool-hero.webp', front: '/images/local-stool-front.webp',
  sourceAssets: ['/Game/Apartment/SM_Stool_Seat', '/Game/Apartment/SM_Stool_Base'], sourceIds: ['SM_Stool_Seat', 'SM_Stool_Base'], notes: 'Seat and base remain separate source parts.',
};
const empty: FurnitureBaseRenderData = { status: 'awaiting_review', summary: { ready: 0, held: 0 }, entries: [], held: [] };
const data: FurnitureBaseRenderData = { status: 'review', summary: { ready: 2, held: 1 }, entries: [chair, assembly], held: [{ name: 'Incomplete desk', reason: 'Geometry needs review.' }] };

describe('neutral furniture base render review', () => {
  it('matches only exact canonical Game paths and never substitutes a multi-source assembly for a part', () => {
    expect(canonicalGameAsset('/Game/Apartment/SM_Chair.SM_Chair')).toBe('/Game/Apartment/SM_Chair');
    expect(canonicalGameAsset('/Game/Apartment/SM_Chair.OtherObject')).toBeNull();
    expect(canonicalGameAsset('SM_Chair')).toBeNull();
    expect(canonicalGameAsset('D:/Project/SM_Chair.uasset')).toBeNull();
    expect(findStandaloneBaseRender(['/Game/Apartment/SM_Chair'], [assembly, chair])).toBe(chair);
    expect(findStandaloneBaseRender(['/Game/OtherRoom/SM_Chair'], [chair])).toBeUndefined();
    expect(findStandaloneBaseRender(['/Game/Apartment/SM_Chair_Copy'], [chair])).toBeUndefined();
    expect(findStandaloneBaseRender(['/Game/Apartment/SM_Stool_Seat.SM_Stool_Seat'], [assembly])).toBeUndefined();
    expect(findStandaloneBaseRender(assembly.sourceAssets, [assembly])).toBeUndefined();
    expect(findStandaloneBaseRender(['/Game/Apartment/SM_Chair', '/Game/Apartment/SM_Stool_Base'], [chair])).toBeUndefined();
  });

  it('preserves original imagery on empty, unrelated or non-furniture matches without changing product data', () => {
    const product = { collectionId: 'furniture' as const, sourceAssets: ['/Game/Apartment/SM_Chair'], image: '/images/original-chair.jpg' };
    const before = structuredClone(product);
    expect(getCollectionImage(product, [])).toBe(product.image);
    expect(getCollectionImage(product, [assembly])).toBe(product.image);
    expect(getCollectionImage(product, [chair])).toBe(chair.hero);
    expect(getCollectionImage({ ...product, collectionId: 'vehicles' }, [chair])).toBe(product.image);
    expect(getCollectionImage({ ...product, image: null, sourceAssets: [] }, [chair])).toBeNull();
    expect(product).toEqual(before);
  });

  it('shows empty review state honestly and has no purchase action', () => {
    render(<FurnitureBaseGallery data={empty} />);
    expect(screen.getByText('Base studies will appear here after local render review.')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Buy|Mint|Add to bag|Purchase/ })).not.toBeInTheDocument();
  });

  it('switches every study between real hero/front assets and preserves assembly/held evidence', () => {
    render(<FurnitureBaseGallery data={data} />);
    expect(screen.getByText('2 base studies ready')).toBeInTheDocument();
    expect(screen.queryByText(/held for review/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'Local chair study — neutral base render, angled view' })).toHaveAttribute('src', chair.hero);
    fireEvent.click(screen.getByRole('button', { name: 'Front view' }));
    expect(screen.getByRole('img', { name: 'Local chair study — neutral base render, front view' })).toHaveAttribute('src', chair.front);
    expect(screen.getByRole('img', { name: 'Local stool assembly — neutral base render, front view' })).toHaveAttribute('src', assembly.front);
    expect(screen.getByRole('button', { name: 'Front view' })).toHaveAttribute('aria-pressed', 'true');
    const partGroup = within(screen.getByRole('article', { name: 'Local stool assembly' }));
    fireEvent.click(partGroup.getByText('Source and review notes'));
    expect(partGroup.getByText(/not substituted for an individual part/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Other source definitions · 1'));
    expect(screen.getByText(/including parts, structure, scene dressing and other assemblies/)).toBeInTheDocument();
    expect(screen.getByText('Incomplete desk')).toBeInTheDocument();
    expect(screen.getByText('Geometry needs review.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review the apartment inventory' })).toHaveAttribute('href', '/store/collections/furniture/apartment');
  });

  it('links the review from furniture and inventory headers without making a new product destination', () => {
    const { unmount } = render(<CollectionBrowse section="furniture" products={[]} />);
    expect(screen.getByRole('link', { name: 'Review neutral base renders' })).toHaveAttribute('href', '/store/collections/furniture/base-renders');
    unmount();
    render(<ApartmentInventory data={{ scope: 'Local test inventory', caveat: 'Saved source scene.', definitions: [] }} />);
    expect(screen.getByRole('link', { name: 'Review neutral base renders' })).toHaveAttribute('href', '/store/collections/furniture/base-renders');
  });

  it('uses the published local manifest without losing ready/held entries and resolves every supplied image', () => {
    expect(furnitureBaseRenders.summary.ready).toBe(furnitureBaseRenders.entries.length);
    expect(furnitureBaseRenders.summary.held).toBe(furnitureBaseRenders.held.length);
    expect(new Set(furnitureBaseRenders.entries.map(entry => entry.id)).size).toBe(furnitureBaseRenders.entries.length);
    for (const entry of furnitureBaseRenders.entries) {
      expect(entry.sourceAssets.length).toBeGreaterThan(0);
      for (const image of [entry.hero, entry.front]) {
        expect(image).toMatch(/^\/images\/collections\/furniture-bases\//);
        expect(existsSync(resolve('public', image.slice(1))), image).toBe(true);
      }
    }
    render(<FurnitureBaseRenderPage />);
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(screen.getByRole('heading', { name: 'The base collection' })).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(furnitureBaseRenders.entries.length);
  });

  it('verifies the final 43 studies cover 48 exact-case source assets, with 38 standalone and five assemblies', () => {
    expect(furnitureBaseRenders.status).toBe('neutral_base_render_review');
    expect(furnitureBaseRenders.entries).toHaveLength(43);
    expect(furnitureBaseRenders.held).toHaveLength(181);
    const singles = furnitureBaseRenders.entries.filter(entry => entry.sourceAssets.length === 1);
    const assemblies = furnitureBaseRenders.entries.filter(entry => entry.sourceAssets.length > 1);
    expect(singles).toHaveLength(38);
    expect(assemblies).toHaveLength(5);
    const sources = furnitureBaseRenders.entries.flatMap(entry => entry.sourceAssets);
    const ids = furnitureBaseRenders.entries.flatMap(entry => entry.sourceIds);
    expect(sources).toHaveLength(48);
    expect(new Set(sources).size).toBe(48);
    // Eight meshes are represented in both apartment and garage source inventories.
    expect(ids).toHaveLength(56);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(furnitureBaseRenders.entries.flatMap(entry => [entry.hero, entry.front])).size).toBe(86);
    const inventory = apartmentData as unknown as ApartmentInventoryData;
    const originalSources = new Set([...inventory.definitions, ...(inventory.garage?.definitions ?? [])].flatMap(item => item.sourceAssets));
    for (const source of sources) expect(originalSources.has(source), `Exact original-case source: ${source}`).toBe(true);
    for (const entry of assemblies) for (const source of entry.sourceAssets) {
      expect(findStandaloneBaseRender([source]), `Assembly part must keep its own source preview: ${source}`).toBeUndefined();
    }
  });

  it('maps all five existing furniture images exactly and preserves cached source evidence without adding products', () => {
    const furniture = registryProducts.filter(product => product.collectionId === 'furniture');
    expect(furniture).toHaveLength(5);
    const original = structuredClone(furniture);
    const { unmount } = render(<CollectionBrowse section="furniture" products={furniture} />);
    expect(screen.getAllByRole('article')).toHaveLength(5);
    expect(screen.getAllByText('Neutral base render')).toHaveLength(5);
    for (const product of furniture) {
      const study = findStandaloneBaseRender(product.sourceAssets);
      expect(study, product.id).toBeDefined();
      expect(study!.sourceAssets).toHaveLength(1);
      expect(getCollectionImage(product)).toBe(study!.hero);
      expect(screen.getByRole('article', { name: product.name }).querySelector('img')).toHaveAttribute('src', study!.hero);
      expect(product.image).toMatch(/^\/images\/collections\/furniture\//);
    }
    expect(furniture).toEqual(original);
    unmount();
    const product = furniture[0];
    render(<CollectionProduct product={product} />);
    expect(screen.getByRole('img', { name: product.name })).toHaveAttribute('src', getCollectionImage(product));
    fireEvent.click(screen.getByText('Source reference'));
    expect(screen.getByRole('img', { name: `${product.name} original source preview` })).toHaveAttribute('src', product.image);
    expect(screen.getByRole('button', { name: 'Purchasing unavailable' })).toBeDisabled();
  });

  it('labels a matched inventory render honestly while retaining the original cached preview in source details', () => {
    const inventory = apartmentData as unknown as ApartmentInventoryData;
    const item = inventory.definitions.find(definition => findStandaloneBaseRender(definition.sourceAssets));
    expect(item).toBeDefined();
    const study = findStandaloneBaseRender(item!.sourceAssets)!;
    render(<ApartmentInventory data={{ ...inventory, garage: undefined, definitions: [item!] }} />);
    expect(screen.getByRole('img', { name: `${item!.name} neutral base render` })).toHaveAttribute('src', study.hero);
    expect(screen.getByText('Neutral base render')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Source details'));
    expect(screen.getByRole('img', { name: `${item!.name} original source preview` })).toHaveAttribute('src', item!.thumbnail);
    expect(screen.getByRole('status')).toHaveTextContent(`1 definition · ${item!.instanceCount} source`);
  });
});
