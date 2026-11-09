import {marketProducts,storefrontDepartment} from '../marketplace/catalog';
import registry from './registry.json';
import evidence from '../marketplace/product-game-evidence.json';
import {LIMITED_EDITION_PROPOSAL,getProductEditionProposal} from '../marketplace/limited-editions';
import {findFrankWilderTotem,trinityArchiveStatus} from '../marketplace/frank-wilder-totems';
import {WILDER_INDUSTRIES} from '@/lib/wilderCollections';

/** Read-only mapping audit. Display concepts are never promoted to approved editions. */
export function auditStoreMappings(){
 const game=evidence as Record<string,{sourceIds?:string[];nativeAssets?:string[];exactCompatibilityRecord?:boolean;avatarFits?:unknown;tableRows?:unknown[];fitmentApproved?:boolean;placementApproved?:boolean;gameReady?:boolean|null;releaseApproved?:boolean}>;
 const rows=marketProducts.map(product=>{
  const original=registry.products.find(row=>row.id===product.id);
  const fw=findFrankWilderTotem(product.id),proof=game[product.id];
  const proposal=getProductEditionProposal(product.id);
  const logicalCollection=product.department==='vehicles'?'vehicles':['furniture','statues'].includes(product.department)?'furniture':'clothing';
  const conceptIds=(product.plannedVariants??product.variants).map(variant=>variant.id);
  return {
   storefrontProductId:product.id,name:product.name,webDepartment:storefrontDepartment(product),logicalCollection,
   itemType:product.department==='vehicles'?(product.subcategory==='rims'?'rim_set':'vehicle'):product.department==='totems'?'totem':logicalCollection==='furniture'?'furniture':'clothing',
   sourceIds:product.sourceIds,sourceAssets:product.sourceAssets,nativeAssetEvidence:proof?.nativeAssets??[],
   sourceRecord:fw?'marketplace/frank-wilder-totems.json':original?'collections/registry.json':'marketplace expanded/restoration/source catalog',
   hasHistoricalRegistryRecord:!!original,physicalReferenceOnly:!!fw,
   compatibility:{exactSourceRow:proof?.exactCompatibilityRecord??false,tableRows:proof?.tableRows??[],avatarFits:proof?.avatarFits??null,fitmentApproved:proof?.fitmentApproved??false,placementApproved:proof?.placementApproved??false},
   onchain:{chainId:null,contract:null,tokenId:null,approvedEditionId:null,approvedSupplyCap:null,mintAuthorized:false},
   purchaseGrant:{status:'unapproved',quantity:1,selectedFinishOnly:true,allConceptColorsIncluded:false},
   variants:conceptIds.map(id=>{const edition=proposal?.variants.find(row=>row.variantId===id);return {storefrontVariantId:id,conceptId:id,rendered:product.variants.some(variant=>variant.id===id&&!!variant.image),proposedRarity:edition?.tier??null,proposedSupplyCap:edition?.proposedSupplyCap??null,approvedSupplyCap:null,onchainTokenId:null,approvedEditionId:null,gameMaterialAsset:null};}),
   unresolved:[...new Set([...(original?.unresolved??[]),...(!original?['canonical launch registry record']:[]),...(!proof?.nativeAssets?.length?['native model evidence']:[]),...(fw?['digital model upload and source binding']:[]),'chain and contract approval','approved edition and supply','concept-to-game material binding','approved price and currency','production identity and ownership adapters','game entitlement delivery'])],
  };
 });
 return {schemaVersion:1,generatedAt:new Date().toISOString(),scope:'local audit; no approved releases or mint rights',
  editionProposal:{version:LIMITED_EDITION_PROPOSAL.version,source:'src/sites/wilderworld/marketplace/limited-editions.proposal.json',status:'proposed',proposedUnitsPerProduct:LIMITED_EDITION_PROPOSAL.proposedUnitsPerProduct,averageProposedUnitsPerVariant:LIMITED_EDITION_PROPOSAL.averageProposedUnitsPerVariant,approvedSupplyCap:null,mintAuthorized:false},
  totals:{products:rows.length,conceptVariants:rows.reduce((count,row)=>count+row.variants.length,0),proposedUnits:rows.reduce((count,row)=>count+row.variants.reduce((units,variant)=>units+(variant.proposedSupplyCap??0),0),0),sourceIdMissing:rows.filter(row=>!row.sourceIds.length).length,historicalRegistryMatches:rows.filter(row=>row.hasHistoricalRegistryRecord).length,requiresNewLaunchRegistryRecord:rows.filter(row=>!row.hasHistoricalRegistryRecord).length,nativeEvidenceMissing:rows.filter(row=>!row.sourceAssets.length&&!row.nativeAssetEvidence.length).length,physicalReferenceOnly:rows.filter(row=>row.physicalReferenceOnly).length,approvedMints:0},
  historicalCuratedClothing:{products:registry.products.filter(product=>product.section==='fashion').length,conceptVariants:registry.products.filter(product=>product.section==='fashion').reduce((count,product)=>count+product.conceptVariants.length,0),source:'collections/registry.json (historical catalog, unchanged)'},
  legacyTrinity:trinityArchiveStatus,
  originalCollections:WILDER_INDUSTRIES.flatMap(industry=>industry.collections.map(collection=>({slug:collection.slug,chain:collection.chain,chainId:collection.chainId??(collection.chain==='ethereum'?1:null),contract:collection.contract??null,tokenIdentity:'exact uint256 decimal string from collection inventory; never inferred from directory or product count',newMintAuthorized:false}))),
  fulfillment:{paymentConfirmation:'provider-authenticated confirmed evidence matched to order, wallet, currency and amount',mintSettlement:'canonical finalized receipt matched to order, recipient, contract, product, edition and selected variant; unique event and token claims',gameDelivery:'fresh ownerOf plus linked game account; idempotent grant and revoke; no delivery from payment alone',productionState:'unconfigured',localPersistence:{status:'implemented_local_only',repository:'collections/durable-fulfillment.server.ts',outbox:'leased_with_bounded_retries_and_revocation_recovery',wiredToCheckout:false},localAccountSales:{payment:'simulated',settlement:'simulated',gameEntitlement:'not_issued'},remaining:['production distributed repository and outbox','production payment adapter','chain receipt/finality adapter','production account and game entitlement adapter','secondary marketplace settlement integration']},products:rows};
}

/** Separate current draft registry, preserving the 163/489 historical snapshot. */
export function currentDraftRegistry(){
 const audit=auditStoreMappings();
 return {schemaVersion:2,generatedAt:audit.generatedAt,status:'draft_unapproved_no_mint_rights',editionProposal:audit.editionProposal,
  historicalSnapshot:{path:'src/sites/wilderworld/collections/registry.json',products:163,conceptVariants:489,unchanged:true},
  collections:[{id:'vehicles',name:'Wilder: Vehicles',contractFamily:'WilderVehicles',implementationCandidate:'WilderVehiclesUpgradeable',webDepartments:['vehicles','rims']},{id:'clothing',name:'Wilder: Clothing',contractFamily:'WilderClothing',implementationCandidate:'WilderClothingUpgradeable',webDepartments:['clothing','totems']},{id:'furniture',name:'Wilder: Furniture',contractFamily:'WilderFurniture',implementationCandidate:'WilderFurnitureUpgradeable',webDepartments:['furniture','statues']}].map(collection=>({...collection,chainId:null,contractAddress:null,deployed:false})),
  counts:{products:audit.totals.products,conceptVariants:audit.totals.conceptVariants,proposedUnits:audit.totals.proposedUnits,approvedProducts:0,approvedMints:0},
  products:audit.products.map(row=>{
   const product=marketProducts.find(product=>product.id===row.storefrontProductId)!;
   const fw=findFrankWilderTotem(product.id);
   const historical=registry.products.find(product=>product.id===row.storefrontProductId);
   return {id:product.id,name:product.name,description:product.description,collectionId:row.logicalCollection,webDepartment:row.webDepartment,subcategory:product.subcategory,itemType:row.itemType,
    brand:product.brand??null,displayFit:product.gender??null,
    media:{image:product.image,gallery:product.gallery,imageKind:product.imageKind,sourceReference:product.imageSourceReference??null,publishedBaseUri:null},
    status:'draft_unapproved',storeVisible:true,purchaseEnabled:false,releaseApproved:false,gameReady:null,
    sourceIds:row.sourceIds,sourceAssets:row.sourceAssets,
    provenance:{record:row.sourceRecord,exactStorefrontSource:'src/sites/wilderworld/marketplace/catalog.ts',historicalRegistryId:historical?.id??null,nativeAssetEvidence:row.nativeAssetEvidence,gameEvidenceRecord:'src/sites/wilderworld/marketplace/product-game-evidence.json#'+product.id,physicalReference:fw?.source??null},
    onchain:{...row.onchain,productKey:null,sourceIdHash:null,contractFamily:row.logicalCollection==='vehicles'?'WilderVehicles':row.logicalCollection==='clothing'?'WilderClothing':'WilderFurniture'},
    pricing:{previewPriceCents:product.priceCents,approvedPriceMinor:null,currency:null},supplyCap:null,
    compatibility:row.compatibility,
    conceptVariants:row.variants.map(variant=>{
     const planned=(product.plannedVariants??product.variants).find(value=>value.id===variant.conceptId);
     const rendered=product.variants.find(value=>value.id===variant.conceptId);
     return {...variant,name:planned?.name??variant.conceptId,image:rendered?.image??null,thumbnail:rendered?.thumbnail??null,swatch:planned?.swatch??null,materialSpec:planned?.materialSpec??null,sourceAssets:planned?.sourceAssets??[],renderStatus:rendered?.image?'rendered':'pending',approved:false,mintAuthorized:false};
    }),
    entitlement:{...row.purchaseGrant,gameAssetId:null,gameAccountBinding:null,approvedConceptIds:[],deliveryAdapter:null},
    usage:{eligibilityApproved:false,eligibilityEvidence:[],state:row.itemType==='rim_set'?'detached':row.itemType==='furniture'?'unplaced':row.itemType==='clothing'||row.itemType==='totem'?'unequipped':'unassigned',transferPolicy:row.itemType==='rim_set'?'remove from vehicle before independent transfer':row.itemType==='vehicle'?'remove installed rim set before transfer':row.itemType==='furniture'?'pickup before transfer':'unequip before transfer',rimSetContents:row.itemType==='rim_set'?{status:'unresolved',quantity:null,positions:[],includedAssets:[],approved:false}:null,placementEligibility:row.itemType==='furniture'?{propertyPermissionEvidence:null,location:null,approved:false}:null},
    fulfillment:{status:'unconfigured',paymentConfirmation:null,mintSettlement:null,gameEntitlementDelivery:null,requiredOrder:'confirmed payment -> validated mint settlement -> ownership-checked game delivery',production:{recipeId:null,blueprintApproval:null,editionMintPermission:null,resourcesComponentsBinding:null}},
    unresolved:row.unresolved,
   };
  }),legacyTrinity:audit.legacyTrinity,originalCollections:audit.originalCollections,
 };
}
