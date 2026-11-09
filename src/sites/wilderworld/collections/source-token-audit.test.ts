import {describe,expect,it} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {auditStoreMappings,currentDraftRegistry} from './source-token-audit';
import registry from './registry.json';
import fw from '../marketplace/frank-wilder-totems.json';
import {LIMITED_EDITION_PROPOSAL,getProductEditionProposal} from '../marketplace/limited-editions';
describe('full current source to token audit',()=>{
 it('retains every source ID and concept while leaving production token mappings unresolved',()=>{
  const audit=auditStoreMappings();
  for(const product of registry.products){expect(product.purchaseEnabled).toBe(false);expect(product.supplyCap).toBeNull();expect(product.onchain.contract).toBeNull();expect(product.onchain.tokenId).toBeNull();}
  for(const product of fw.products){expect(product.purchaseEnabled).toBe(false);expect(product.onchain.contractAddress).toBeNull();expect(product.onchain.onchainTokenId).toBeNull();}
  expect(new Set(audit.products.map(product=>product.storefrontProductId)).size).toBe(audit.totals.products);
  expect(audit.totals.sourceIdMissing).toBe(0);
  expect(audit.totals.proposedUnits).toBe(663000);
  expect(audit.totals.proposedUnits).toBe(LIMITED_EDITION_PROPOSAL.proposedTotalUnits);
  expect(audit.editionProposal).toMatchObject({version:LIMITED_EDITION_PROPOSAL.version,proposedUnitsPerProduct:3000,approvedSupplyCap:null,mintAuthorized:false});
  expect(audit.historicalCuratedClothing).toMatchObject({products:163,conceptVariants:489});
  for(const product of audit.products){
   expect(product.variants).toHaveLength(9);
   expect(new Set(product.variants.map(variant=>variant.conceptId)).size).toBe(9);
   expect(product.onchain).toMatchObject({contract:null,tokenId:null,approvedSupplyCap:null,mintAuthorized:false});
   if(product.itemType==='rim_set'||product.itemType==='vehicle')expect(product.logicalCollection).toBe('vehicles');
   if(product.itemType==='totem')expect(product.logicalCollection).toBe('clothing');
   expect(product.purchaseGrant.allConceptColorsIncluded).toBe(false);
   const edition=getProductEditionProposal(product.storefrontProductId)!;
   expect(product.variants.reduce((sum,variant)=>sum+(variant.proposedSupplyCap??0),0)).toBe(3000);
   for(const variant of product.variants){
    const proposed=edition.variants.find(value=>value.variantId===variant.storefrontVariantId)!;
    expect(variant.proposedRarity).toBe(proposed.tier);
    expect(variant.proposedSupplyCap).toBe(proposed.proposedSupplyCap);
    expect(variant.approvedSupplyCap).toBeNull();
    expect(variant.onchainTokenId).toBeNull();
    expect(variant.approvedEditionId).toBeNull();
    expect(variant.gameMaterialAsset).toBeNull();
   }
  }
  expect(audit.products.some(product=>product.storefrontProductId==='totem-trinity-legacy')).toBe(false);
  expect(audit.originalCollections).toHaveLength(15);
  const destination=resolve(process.cwd(),'.tmp/handoff/source-token-audit');
  mkdirSync(destination,{recursive:true});writeFileSync(resolve(destination,'New-Store-Source-Token-Audit.json'),JSON.stringify(audit,null,2)+'\n');
  const current=currentDraftRegistry();
  expect(current.counts).toMatchObject({products:221,conceptVariants:1989,proposedUnits:663000,approvedMints:0});
  for(const id of LIMITED_EDITION_PROPOSAL.curation.excludedProductIds)expect(current.products.some(product=>product.id===id)).toBe(false);
  expect(current.products).toHaveLength(audit.totals.products);
  for(const product of current.products){
   expect(product.onchain.tokenId).toBeNull();expect(product.onchain.mintAuthorized).toBe(false);expect(product.supplyCap).toBeNull();expect(product.releaseApproved).toBe(false);expect(product.purchaseEnabled).toBe(false);expect(product.conceptVariants).toHaveLength(9);expect(product.fulfillment.gameEntitlementDelivery).toBeNull();
   expect(product.conceptVariants.reduce((sum,variant)=>sum+(variant.proposedSupplyCap??0),0)).toBe(3000);
   for(const variant of product.conceptVariants){expect(variant.approved).toBe(false);expect(variant.mintAuthorized).toBe(false);expect(variant.approvedSupplyCap).toBeNull();}
  }
  const registryDirectory=destination;
  mkdirSync(registryDirectory,{recursive:true});writeFileSync(resolve(registryDirectory,'Collection-Product-Registry.json'),JSON.stringify(current,null,2)+'\n');
 });
});
