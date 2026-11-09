import { describe, expect, it } from 'vitest';
import { curatedSourceProducts, departments, filterProducts, findMarketProduct, marketProducts } from './catalog';
import curation from './storefront-curation.json';
import expanded from './expanded-catalog.json';
import totemSources from './totem-source-candidates.json';
import { registryProducts, findRegistryProduct, productsForSection } from '../collections/store-registry';
import registry from '../collections/registry.json';
import { findFrankWilderTotem, frankWilderTotems } from './frank-wilder-totems';
import { knownProductVariant } from '@/lib/store-backend/catalog';
import { getProductEditionProposal } from './limited-editions';
import femaleRestorations from './female-restorations.json';

describe('reviewed storefront selection', () => {
  it('excludes all requested objects from browsing, search and product lookup while retaining source evidence', () => {
    expect(curation.excludedProductIds).toHaveLength(35);
    const evidence = [...expanded.products, ...expanded.vehicleArchive, ...registry.products, ...totemSources.products, ...frankWilderTotems];
    for (const id of curation.excludedProductIds) {
      const source = evidence.find(product => product.id === id);
      expect(source, id).toBeDefined();
      expect(findMarketProduct(id), id).toBeUndefined();
      expect(findRegistryProduct(id), id).toBeUndefined();
      expect(knownProductVariant(id), id).toBe(false);
      expect(getProductEditionProposal(id), id).toBeUndefined();
      expect(filterProducts(marketProducts, { query: source!.name }).some(product => product.id === id), id).toBe(false);
    }
    expect(curation.matchedProducts.filter(product => product.department === 'statues')).toHaveLength(14);
    expect(curation.matchedProducts.filter(product => product.department === 'furniture')).toHaveLength(16);
    expect(findMarketProduct('guild-satoshi')).toBeDefined();
    expect(findMarketProduct('guild-thesatoshi')).toBeUndefined();
  });

  it('keeps the curated vehicle and clothing collections without an empty vehicle-preview category', () => {
    expect(filterProducts(marketProducts, { department: 'vehicles' })).toHaveLength(2);
    expect(filterProducts(marketProducts, { department: 'rims' })).toHaveLength(8);
    expect(marketProducts.filter(product=>product.department==='vehicles')).toHaveLength(10);
    expect(filterProducts(marketProducts, { department: 'vehicles', subcategory: 'cars' }).map(product => product.id)).toEqual(['vehicle-ghostline', 'vehicle-vera-solis']);
    expect(departments.find(department => department.id === 'vehicles')!.subs.some(category => String(category.id) === 'vehicle-archive')).toBe(false);
    expect(filterProducts(marketProducts, { department: 'clothing' })).toHaveLength(163 + femaleRestorations.products.length);
    expect(filterProducts(marketProducts, { department: 'furniture' })).toHaveLength(21);
    expect(filterProducts(marketProducts, { department: 'statues' })).toHaveLength(15);
    expect(marketProducts).toHaveLength(218 + femaleRestorations.products.length);
    expect(findMarketProduct('home-object-206-workbench-02')?.subcategory).toBe('tables-desks');
  });

  it('preserves Trinity ownership and removed chain evidence without exposing them as products', () => {
    const legacy = registryProducts.find(product => product.id === 'totem-trinity-legacy')!;
    expect(legacy.collectionId).toBe('clothing');
    expect(legacy.status).toBe('legacy_reference');
    expect(registry.products.find(product => product.id === legacy.id)?.legacy?.remintAllowed).toBe(false);
    expect(legacy.sourceAssets).toEqual([]);
    expect(legacy.storeVisible).toBe(false);
    expect(findMarketProduct(legacy.id)).toBeUndefined();
    expect(filterProducts(marketProducts, { department: 'totems' })).toHaveLength(9);
    expect(productsForSection('totems')).toHaveLength(9);
    expect(departments.find(department=>department.id==='totems')!.subs.map(sub=>sub.id)).toEqual(['totems']);
    for (const source of totemSources.products) {
      expect(source.collectionId).toBe('clothing');
      expect(source.status).toBe('Source candidate');
      expect(source.purchaseEnabled).toBe(false);
      expect(Object.values(source.onchain).every(value => value === null)).toBe(true);
      expect(source.sourceEvidence.legacyTrinityBindingVerified).toBe(false);
      expect(source.image).toBeNull();
      expect(findMarketProduct(source.id)).toBeUndefined();
      expect(source.sourceIds.length).toBeGreaterThan(0);
      expect(source.sourceAssets.length).toBeGreaterThan(0);
      expect(marketProducts.some(item => item.department === 'clothing' && item.sourceIds.some(id => source.sourceIds.includes(id)))).toBe(false);
    }
  });

  it('plans nine concepts while exposing only reference-faithful clothing previews', () => {
    for (const product of marketProducts) {
      const source = curatedSourceProducts.find(candidate => candidate.id === product.id)!;
      const count=9;
      expect(product.plannedVariants, product.id).toHaveLength(count);
      expect(new Set(product.plannedVariants!.map(variant => variant.id)).size, product.id).toBe(count);
      expect(product.variants.length).toBeLessThanOrEqual(9);
      if(product.department==='clothing') {
        expect(product.variants.length).toBeGreaterThanOrEqual(source.variants.length);
        expect(product.variants.slice(0,source.variants.length).map(v=>v.id)).toEqual(source.variants.map(v=>v.id));
        expect(product.variants.every(v=>product.plannedVariants!.find(p=>p.id===v.id)!.storefrontEligible)).toBe(true);
        expect(product.plannedVariants!.filter(v=>v.renderMethod==='native_3d').every(v=>!v.storefrontEligible)).toBe(true);
      } else if(findFrankWilderTotem(product.id))expect(product.variants.every(v=>v.image&&v.renderStatus==='rendered')).toBe(true);
      else expect(product.variants).toHaveLength(count);
      expect(product.sourceVariants, product.id).toEqual(source.variants);
      expect(product.sourceAssets).toEqual(source.sourceAssets);
      expect(product.sourceIds).toEqual(source.sourceIds);
      if(source.priceCents!==null)expect(product.priceCents).toBe(source.priceCents);
      else expect(product.priceCents).toBeGreaterThan(0); // Separate approved preview overlay.
      for (const variant of product.variants) {
        expect(['rendered', 'pending']).toContain(variant.renderStatus);
        if (variant.renderStatus === 'pending') expect(variant.image).toBeNull();
      }
    }
  });
});
