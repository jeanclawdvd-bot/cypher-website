import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_ENTRIES } from '@/lib/wilderCollections';
import { marketProducts } from './catalog';
import { LIMITED_EDITION_PROPOSAL, PROPOSED_RARITY_TIERS, getProductEditionProposal, getProposedEdition } from './limited-editions';

describe('new-store limited edition proposal', () => {
  it('persists all current product and concept IDs without modifying their identity', () => {
    expect(LIMITED_EDITION_PROPOSAL.products.map(p => p.productId).sort()).toEqual(marketProducts.map(p => p.id).sort());
    const allIds: string[] = [];
    for (const product of marketProducts) {
      const proposed = getProductEditionProposal(product.id)!;
      expect(proposed.variants, product.id).toHaveLength(9);
      expect(proposed.sourceIds, product.id).toEqual(product.sourceIds);
      expect(proposed.variants.map(v => v.variantId).sort(), product.id)
        .toEqual(product.plannedVariants!.map(v => v.id).sort());
      for (const variant of proposed.variants) {
        expect(variant.productId).toBe(product.id);
        expect(getProposedEdition(product.id, variant.variantId)).toBe(variant);
        allIds.push(variant.variantId);
      }
    }
    expect(new Set(allIds).size).toBe(allIds.length);
    expect(LIMITED_EDITION_PROPOSAL.productCount).toBe(marketProducts.length);
    expect(LIMITED_EDITION_PROPOSAL.variantCount).toBe(marketProducts.length * 9);
    expect(LIMITED_EDITION_PROPOSAL.proposedTotalUnits).toBe(marketProducts.length * 3000);
    expect(LIMITED_EDITION_PROPOSAL.proposedUnitsPerProduct).toBe(3000);
    expect(LIMITED_EDITION_PROPOSAL.averageProposedUnitsPerVariant).toBeCloseTo(3000 / 9);
  });

  it('allocates 3000 units through nine editions with strict tier scarcity and exact percentages', () => {
    expect(PROPOSED_RARITY_TIERS.map(t => [t.id, t.variantsPerProduct, t.proposedUnitsPerVariant, t.supplyShareOfProductPercent])).toEqual([
      ['common', 2, 600, 40], ['uncommon', 2, 450, 30], ['rare', 2, 270, 18],
      ['epic', 1, 240, 8], ['legendary', 1, 90, 3], ['wild', 1, 30, 1],
    ]);
    for (const product of LIMITED_EDITION_PROPOSAL.products) {
      expect(product.proposedSupplyCap).toBe(3000);
      expect(product.variants.reduce((sum, v) => sum + v.proposedSupplyCap, 0)).toBe(3000);
      expect(product.variants.reduce((sum, v) => sum + v.supplyShareOfProductPercent, 0)).toBe(100);
      for (const [index, tier] of PROPOSED_RARITY_TIERS.entries()) {
        const editions = product.variants.filter(v => v.tier === tier.id);
        expect(editions).toHaveLength(tier.variantsPerProduct);
        expect(editions.every(v => v.proposedSupplyCap === tier.proposedUnitsPerVariant && Number.isInteger(v.proposedSupplyCap))).toBe(true);
        expect(editions.reduce((sum, v) => sum + v.supplyShareOfProductPercent, 0)).toBe(tier.supplyShareOfProductPercent);
        if (index > 0) expect(tier.proposedUnitsPerVariant).toBeLessThan(PROPOSED_RARITY_TIERS[index - 1].proposedUnitsPerVariant);
      }
    }
  });

  it('uses canonical Unreal tier colors and intentional finish assignments', () => {
    expect(PROPOSED_RARITY_TIERS.map(t => [t.label, t.color])).toEqual([
      ['Common', '#DFDFDF'], ['Uncommon', '#3CEFB0'], ['Rare', '#0178FF'],
      ['Epic', '#EA02FF'], ['Legendary', '#EFE93C'], ['WILD', '#FF6434'],
    ]);
    for (const product of LIMITED_EDITION_PROPOSAL.products) {
      for (const variant of product.variants) {
        const tier = PROPOSED_RARITY_TIERS.find(t => t.id === variant.tier)!;
        expect([variant.tierLabel, variant.tierColor]).toEqual([tier.label, tier.color]);
      }
      if (product.productId.startsWith('totem-fw-')) {
        expect(getProposedEdition(product.productId, `MAT-${product.productId}-sterling`)?.tier).toBe('common');
        expect(getProposedEdition(product.productId, `MAT-${product.productId}-titanium`)?.tier).toBe('common');
        expect(getProposedEdition(product.productId, `MAT-${product.productId}-ceramic-white`)?.tier).toBe('legendary');
        expect(getProposedEdition(product.productId, `MAT-${product.productId}-cobalt`)?.tier).toBe('wild');
      }
      if (product.department === 'clothing') {
        expect(getProposedEdition(product.productId, `MAT-${product.productId}-chrome`)?.tier).toBe('legendary');
        expect(getProposedEdition(product.productId, `MAT-${product.productId}-ultraviolet`)?.tier).toBe('wild');
      }
    }
  });

  it('never grants mint authority or silently allocates legacy and unknown identities', () => {
    expect(LIMITED_EDITION_PROPOSAL.status).toBe('proposed');
    expect(LIMITED_EDITION_PROPOSAL.approvedSupplyCap).toBeNull();
    expect(LIMITED_EDITION_PROPOSAL.mintAuthorized).toBe(false);
    expect(LIMITED_EDITION_PROPOSAL.contractAddresses).toBeNull();
    for (const product of LIMITED_EDITION_PROPOSAL.products) {
      for (const row of [product, ...product.variants]) {
        expect(row.status).toBe('proposed');
        expect(row.approvedSupplyCap).toBeNull();
        expect(row.mintAuthorized).toBe(false);
      }
      expect(product.variants.every(v => v.onchainTokenId === null)).toBe(true);
    }
    for (const id of [...ALL_ENTRIES.flatMap(e => [e.id, e.slug, e.contract!]), 'totem-trinity-legacy', 'unrecognized-new-product']) {
      expect(getProductEditionProposal(id)).toBeUndefined();
    }
    const first = marketProducts[0], second = marketProducts[1];
    expect(getProposedEdition(first.id, second.plannedVariants![0].id)).toBeUndefined();
    expect(getProposedEdition(first.id, 'future-color')).toBeUndefined();
    expect(LIMITED_EDITION_PROPOSAL.inventoryRules).toMatchObject({
      allChannelsShareCap: true, reservationsAreInsideCap: true, burnsReopenMint: false,
      transfersCreateSupply: false, legacySupplyChanged: false,
    });
    expect(LIMITED_EDITION_PROPOSAL.allocationMeaning).toContain('not drop odds');
    expect(LIMITED_EDITION_PROPOSAL.purchaseGrant).toContain('one selected color edition');
  });

  it('keeps the separate handoff report identical to the displayed proposal', () => {
    const reportPath = path.resolve(process.cwd(), 'handoff/fixtures/outputs/ww-store-curation-20261108/Edition-Rarity-Proposal.json');
    expect(JSON.parse(readFileSync(reportPath, 'utf8'))).toEqual(LIMITED_EDITION_PROPOSAL);
    const previous=JSON.parse(readFileSync(path.resolve(process.cwd(),'handoff/fixtures/outputs/ww-edition-supply-20261108/Edition-Rarity-Proposal.json'),'utf8'));
    const removed=new Set(LIMITED_EDITION_PROPOSAL.curation.excludedProductIds);
    expect(previous.products.filter((product:{productId:string})=>removed.has(product.productId))).toHaveLength(4);
    for(const current of LIMITED_EDITION_PROPOSAL.products){
      const original=previous.products.find((product:{productId:string})=>product.productId===current.productId);
      expect({...current,productName:original.productName}).toEqual(original);
    }
  });
});
