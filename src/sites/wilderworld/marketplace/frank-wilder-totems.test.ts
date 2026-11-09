import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {frankWilderTotems,findFrankWilderTotem,trinityArchiveStatus,frankWilderMaterialPreviews,isReviewedFrankWilderRender,type FWRender} from './frank-wilder-totems';
import {findMarketProduct,filterProducts,marketProducts,featuredMaterial} from './catalog';
import {findRegistryProduct,productsForSection,registryProducts} from '../collections/store-registry';
import {getProductGameDetails} from './product-game-details';
import originalRegistry from '../collections/registry.json';
import {productEditorials} from './campaign-media';
import curation from './storefront-curation.json';
import renderData from './fw-material-render-images.json';

const visibleTotems=frankWilderTotems.filter(product=>!curation.excludedProductIds.includes(product.id));
const rebuiltImageRoot='/images/marketplace/frank-wilder-totems/v4-source-rebuild/';
const requestedFinishes=['sterling','yellow-gold','rose-gold','black-rhodium','platinum','titanium','copper','ceramic-white','cobalt'];

function webpDimensions(url:string):[number,number] {
  const bytes=readFileSync(resolve(process.cwd(),'public',url.slice(1)));
  expect(bytes.toString('ascii',0,4),url).toBe('RIFF');
  expect(bytes.toString('ascii',8,12),url).toBe('WEBP');
  for(let offset=12;offset+8<=bytes.length;){
    const chunk=bytes.toString('ascii',offset,offset+4);
    const size=bytes.readUInt32LE(offset+4);
    const data=offset+8;
    if(chunk==='VP8X')return [bytes.readUIntLE(data+4,3)+1,bytes.readUIntLE(data+7,3)+1];
    if(chunk==='VP8 ')return [bytes.readUInt16LE(data+6)&0x3fff,bytes.readUInt16LE(data+8)&0x3fff];
    if(chunk==='VP8L'){
      const packed=bytes.readUInt32LE(data+1);
      return [(packed&0x3fff)+1,((packed>>>14)&0x3fff)+1];
    }
    offset=data+size+(size%2);
  }
  throw new Error(`No WebP image dimensions found: ${url}`);
}

describe('Frank Wilder design intake',()=>{
  it('records exactly ten pendant designs with stable source identities and no ring',()=>{
    expect(frankWilderTotems).toHaveLength(10);
    expect(new Set(frankWilderTotems.map(p=>p.id)).size).toBe(10);
    for(const source of frankWilderTotems){
      expect(source.id).toBe(`totem-fw-${source.handle}`);
      expect(source.handle).not.toBe('emperor-ring');
      expect(source.sourceIds).toEqual([source.source.shopifyProductId]);
      expect(source.source.shopifyProductId).toMatch(/^gid:\/\/shopify\/Product\/\d+$/);
      expect(source.source.sourceUrl).toBe(`https://frankwilder.com/products/${source.handle}`);
      expect(source.source.referenceSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(source.source.digitalSourceBindingVerified).toBe(false);
      expect(findFrankWilderTotem(source.id)).toBe(source);
    }
  });
  it('accepts reviewed pendant photography without a chain and rejects unreviewed or mismatched images',()=>{
    const pendant:FWRender={image:'/images/marketplace/frank-wilder-totems/v3-pendant/achilles-sterling.webp',renderMethod:'image_concept',reviewStatus:'pass',sourceReference:'physical-source-reference',presentation:'pendant_only',geometryUnchanged:false};
    expect(isReviewedFrankWilderRender(pendant,'achilles','sterling')).toBe(true);
    const rebuilt={...pendant,image:`${rebuiltImageRoot}achilles-sterling.webp`};
    expect(isReviewedFrankWilderRender(rebuilt,'achilles','sterling')).toBe(true);
    expect(isReviewedFrankWilderRender(rebuilt,'hercules','sterling')).toBe(false);
    expect(isReviewedFrankWilderRender(rebuilt,'achilles','copper')).toBe(false);
    expect(isReviewedFrankWilderRender({...rebuilt,presentation:undefined},'achilles','sterling')).toBe(false);
    expect(isReviewedFrankWilderRender({...pendant,reviewStatus:'pending'},'achilles','sterling')).toBe(false);
    expect(isReviewedFrankWilderRender({...pendant,sourceReference:''},'achilles','sterling')).toBe(false);
    expect(isReviewedFrankWilderRender(pendant,'hercules','sterling')).toBe(false);
    expect(isReviewedFrankWilderRender(pendant,'achilles','copper')).toBe(false);
    expect(isReviewedFrankWilderRender({...pendant,presentation:undefined},'achilles','sterling')).toBe(false);
    const legacy={...pendant,presentation:undefined,image:'/images/marketplace/frank-wilder-totems/v2/achilles-sterling.webp',chainReference:'historical-game-chain-reference'};
    expect(isReviewedFrankWilderRender(legacy,'achilles','sterling')).toBe(false);
    expect(isReviewedFrankWilderRender({...legacy,chainReference:undefined},'achilles','sterling')).toBe(false);
  });
  it('plans nine requested studies and exposes only reviewed, source-referenced images during pendant rollout',()=>{
    for(const source of visibleTotems){
      const product=findMarketProduct(source.id)!;
      const previews=frankWilderMaterialPreviews(source);
      const reviewed=previews.filter(preview=>preview.image);
      expect(product.variants.map(v=>v.id)).toEqual(reviewed.map(v=>v.id));
      expect(product.plannedVariants).toHaveLength(9);
      expect(previews.map(v=>v.id)).toEqual(source.preview.plannedMaterialIds.map(id=>`MAT-${source.id}-${id}`));
      for(const variant of product.variants)expect(variant).toMatchObject({renderMethod:'image_concept',materialSpec:{metallic:null,roughness:null}});
      for(const preview of reviewed){
        expect(preview.render?.sourceReference).toBeTruthy();
        expect(preview.render?.presentation).toBe('pendant_only');
        expect(preview.image).toContain(rebuiltImageRoot);
      }
      if(!reviewed.length){expect(product.image).toBeNull();expect(featuredMaterial(product)).toBeUndefined();}
      expect(source.preview.chainReference.assemblyApproved).toBe(false);
      expect(source.preview.otherMaterialConcepts).toBe('nine_requested_finish_studies');
      expect(product.sourceIds).toEqual(source.sourceIds);
      expect(product.sourceAssets).toEqual([]);
      expect(product.priceCents).toBe(1500);
      expect(source.priceCents).toBeNull();
      expect(findRegistryProduct(source.id)?.collectionId).toBe('clothing');
    }
    expect(filterProducts(marketProducts,{department:'totems'})).toHaveLength(9);
    expect(productsForSection('totems').filter(p=>findFrankWilderTotem(p.id))).toHaveLength(9);
  });
  it('delivers all 81 retained original-reference finish studies with consistent full and thumbnail sizes and no chain mapping',()=>{
    const renders=renderData as Record<string,FWRender>;
    const ids=new Set<string>();
    expect(visibleTotems).toHaveLength(9);
    for(const source of visibleTotems){
      expect(source.preview.plannedMaterialIds.slice().sort()).toEqual(requestedFinishes.slice().sort());
      const product=findMarketProduct(source.id)!;
      expect(product.variants).toHaveLength(9);
      for(const finish of requestedFinishes){
        const id=`MAT-${source.id}-${finish}`;
        const render=renders[id];
        ids.add(id);
        expect(render,id).toMatchObject({image:`${rebuiltImageRoot}${source.handle}-${finish}.webp`,thumbnail:`${rebuiltImageRoot}${source.handle}-${finish}-640.webp`,reviewStatus:'pass',presentation:'pendant_only',renderMethod:'image_concept',geometryUnchanged:false});
        expect(render.chainReference,id).toBeUndefined();
        expect(render.sourceReference,id).toMatch(new RegExp(`/references/${source.handle}\\.png$`));
        expect(isReviewedFrankWilderRender(render,source.handle,finish),id).toBe(true);
        expect(product.variants.find(variant=>variant.id===id)?.image,id).toBe(render.image);
        expect(webpDimensions(render.image),id).toEqual([1254,1254]);
        expect(webpDimensions(render.thumbnail!),id).toEqual([640,640]);
        expect(render.srcSet,id).toBe(`${render.thumbnail} 640w, ${render.image} 1254w`);
      }
    }
    expect(ids.size).toBe(81);
    expect(Object.entries(renders).filter(([,render])=>render.image.startsWith(rebuiltImageRoot))).toHaveLength(81);
    expect(findMarketProduct('totem-fw-queen-isis')).toBeUndefined();
    expect(findRegistryProduct('totem-fw-queen-isis')).toBeUndefined();
  });
  it('requires the ordered model, binding, compatibility and entitlement stages with no approvals inferred from photos',()=>{
    for(const product of frankWilderTotems){
      const steps=product.modelIntake.stages;
      expect(steps.map(s=>s.id)).toEqual(['model_upload','source_binding','compatibility_validation','entitlement_readiness']);
      for(const [index,step] of steps.entries()){
        expect(step.status).toBe('pending');
        expect(step.dependsOn).toEqual(index?[steps[index-1].id]:[]);
        expect(step.evidence).toEqual([]);
      }
      expect(product.modelIntake.currentStage).toBe('model_upload');
      expect(product.onchain.logicalCollectionId).toBe('clothing');
      expect(product.onchain.proposedContractTarget).toBe('WilderClothing');
      for(const key of ['contractAddress','onchainTokenId','approvedEditionId','mintPermission','productionRecipeId'] as const)expect(product.onchain[key]).toBeNull();
      expect(product.purchaseEnabled).toBe(false);
      expect(product.supplyCap).toBeNull();
      expect(product.editionQuantity).toBeNull();
      expect(product.compatibility).toBeNull();
      expect(product.proposedGrant.chainIncluded).toBeNull();
      expect(product.fulfillment).toMatchObject({paymentConfirmation:'not_enabled',mintSettlement:'not_enabled',gameEntitlementDelivery:'pending_model_integration',physicalPurchaseGrantsDigitalRights:false});
    }
  });
  it('keeps pendant descriptions and every gallery entry separate from historical chain assemblies',()=>{
    const pendantIds=visibleTotems.map(product=>product.id);
    for(const id of pendantIds){
      const product=findMarketProduct(id)!;
      const imageRoot=rebuiltImageRoot;
      expect(product.image,id).toBeTruthy();
      for(const image of [product.image,...product.gallery,...product.variants.map(variant=>variant.image)])expect(image,id).toContain(imageRoot);
      // These nine source-reviewed still lifes show only the pendant and its
      // integral bail. New editorial mappings must receive the same visual audit.
      expect(productEditorials(id).map(scene=>scene.image),id).toEqual([`/images/marketplace/wiami-product-editorials-v2/wiami-object-${id}-v2.webp`]);
      expect(product.description,id).not.toContain('pair the design with a proposed game-style chain');
    }
    for(const source of frankWilderTotems){
      expect(source.description).toContain('Nine proposed finish studies');
      expect(source.description).toContain('pendant alone in close-up');
      expect(source.description).toContain('only reviewed previews are shown');
      expect(source.description).toContain('Game-chain use, model integration and release details remain pending');
    }
    expect(findMarketProduct('totem-chain-jwlr-002-a')).toBeUndefined();
  });
  it('shows relevant model readiness and does not reuse the Trinity triangle or ownership description',()=>{
    for(const product of visibleTotems){
      const details=getProductGameDetails(product.id)!;
      expect(details.readiness).toMatchObject({label:'Model integration pending',live:false,gameReady:null});
      expect(details.traceability.assetStatus).toBe('unverified');
      expect(details.compatibility.supportedFits).toEqual([]);
      expect(details.traceability.sourceIds).toEqual(product.sourceIds);
      expect(details.includedContents.join(' ')).not.toMatch(/Trinity|triangular/);
      expect(details.ownership.summary).toContain('physical Frank Wilder piece does not establish digital ownership');
      expect(details.colorPolicy).toContain('Nine finish studies');
      expect(details.pending).toHaveLength(4);
    }
  });
  it('archives Trinity and the later removed products without changing source identities or historical rights',()=>{
    expect(trinityArchiveStatus).toMatchObject({storeVisible:false,historicalRecordPreserved:true,existingOwnershipUnchanged:true,remintAllowed:false,newIssuanceAllowed:false});
    expect(findMarketProduct('totem-trinity-legacy')).toBeUndefined();
    expect(findRegistryProduct('totem-trinity-legacy')).toBeUndefined();
    expect(registryProducts.find(p=>p.id==='totem-trinity-legacy')?.storeVisible).toBe(false);
    expect(originalRegistry.products.find(p=>p.id==='totem-trinity-legacy')?.legacy?.remintAllowed).toBe(false);
    for(const id of ['totem-chain-jwlr-002','totem-chain-jwlr-002-a','totem-fw-queen-isis']){
      expect(findMarketProduct(id)).toBeUndefined();
      expect(findRegistryProduct(id)).toBeUndefined();
      expect(getProductGameDetails(id)).toBeUndefined();
    }
    expect(findFrankWilderTotem('totem-fw-queen-isis')?.source.sourceUrl).toBe('https://frankwilder.com/products/queen-isis');
    expect(registryProducts.find(product=>product.id==='totem-fw-queen-isis')?.storeVisible).toBe(false);
  });
});
