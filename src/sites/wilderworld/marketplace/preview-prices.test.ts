import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {handoffFixture} from '@/test/handoff-fixtures';
import approval from './preview-prices.json';
import {curatedSourceProducts,marketProducts} from './catalog';
import {currentDraftRegistry} from '../collections/source-token-audit';
import {storefrontPreviewPrice} from './preview-prices';
import curation from './storefront-curation.json';

describe('approved display-only price rollout',()=>{
 it('matches the exact reviewed 63-price proposal and retains all 163 earlier prices',()=>{
  const original=readFileSync(handoffFixture(approval.sourceProposal),'utf8');
  expect(createHash('sha256').update(original).digest('hex')).toBe(approval.sourceSha256);
  const rows=JSON.parse(original).rows as {productId:string;proposedPriceCents:number|null;currentPreviewPriceCents:number|null}[];
  const proposed=rows.filter(row=>row.proposedPriceCents!==null);
  expect(proposed).toHaveLength(63);expect(Object.keys(approval.products)).toHaveLength(63);
  expect(approval).toMatchObject({status:'approved_for_preview_only',productionPriceApproved:false,checkoutEnabled:false,mintingEnabled:false});
  expect(marketProducts).toHaveLength(222);
  for(const row of rows){
   if(curation.excludedProductIds.includes(row.productId)){
    expect(marketProducts.some(product=>product.id===row.productId)).toBe(false);
    expect(storefrontPreviewPrice(row.productId,row.currentPreviewPriceCents)).toBeNull();
    continue;
   }
   const product=marketProducts.find(product=>product.id===row.productId)!;
   expect(product.priceCents,row.productId).toBe(row.currentPreviewPriceCents??row.proposedPriceCents);
   expect(curatedSourceProducts.find(product=>product.id===row.productId)!.priceCents).toBe(row.currentPreviewPriceCents);
  }
  expect(marketProducts.reduce((sum,product)=>sum+product.priceCents!,0)*3000).toBe(621300000);
 });
 it('leaves source evidence, production prices, mint permissions and delivery unresolved',()=>{
  const registry=currentDraftRegistry();
  for(const product of registry.products){
   expect(product.pricing.previewPriceCents).toBeGreaterThan(0);
   expect(product.pricing.approvedPriceMinor).toBeNull();expect(product.pricing.currency).toBeNull();
   expect(product.purchaseEnabled).toBe(false);expect(product.releaseApproved).toBe(false);
   expect(product.supplyCap).toBeNull();expect(product.onchain.mintAuthorized).toBe(false);
   expect(product.fulfillment.gameEntitlementDelivery).toBeNull();
  }
  expect(registry.originalCollections.every(collection=>collection.newMintAuthorized===false)).toBe(true);
 });
 it('does not assign a fallback price to unknown or legacy products',()=>{
  expect(storefrontPreviewPrice('future-unpriced',null)).toBeNull();
  expect(storefrontPreviewPrice('totem-trinity-legacy',null)).toBeNull();
  expect(storefrontPreviewPrice('vehicle-vera-solis',3500)).toBe(3500);
 });
});
