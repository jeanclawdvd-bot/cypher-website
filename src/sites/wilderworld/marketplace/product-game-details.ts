import evidenceData from './product-game-evidence.json';
import { findMarketProduct } from './catalog';
import { findFrankWilderTotem } from './frank-wilder-totems';
import femaleRestorations from './female-restorations.json';

export type GameProductDetails = {
  productId:string;
  itemTypeLabel:string;
  intendedUse:string;
  includedContents:string[];
  colorPolicy:string;
  badges:{label:string;state:'recorded'|'pending'|'legacy'}[];
  readiness:{label:string;summary:string;live:false;gameReady:null};
  compatibility:{summary:string;supportedFits:string[];unsupportedFits:string[];scope:string};
  ownership:{summary:string;delivery:string;limitations:string[]};
  traceability:{sourceIds:string[];assetStatus:'identified'|'unverified';evidenceReferences:string[];recordedAvatarFlags:Record<string,boolean>};
  pending:string[];
};
export type ProductGameDetails = GameProductDetails;
type Evidence = {
  sourceIds:string[];assetIdentified:boolean;exactCompatibilityRecord:boolean;
  avatarFits:Record<string,{label:string;allowed:boolean}>;layerRules:Record<string,boolean>;
  historicMatchStatus:string|null;savedSceneRooms:string[];savedSceneRecorded:boolean;
  sourceFitmentLabels:string[];legacyExternal:boolean;evidenceReferences:string[];
};
const restorationEvidence:Record<string,Evidence>=Object.fromEntries(femaleRestorations.products.map(product=>[product.id,{
  sourceIds:product.sourceIds,assetIdentified:product.sourceAssets.length>0&&!!product.restoration.sourceSha256,
  exactCompatibilityRecord:false,avatarFits:{},layerRules:{},historicMatchStatus:null,
  savedSceneRooms:[],savedSceneRecorded:false,sourceFitmentLabels:[],legacyExternal:false,
  evidenceReferences:[product.restoration.review,product.restoration.sourceFile],
}]));
const evidence={...evidenceData,...restorationEvidence} as unknown as Record<string,Evidence>;
const clothingTypes:Record<string,string>={jacket:'Digital jacket',topwear:'Digital top',bottomwear:'Digital bottomwear',footwear:'Digital footwear',suit:'Digital suit',headwear:'Digital headwear',eyewear:'Digital glasses',mask:'Digital mask',jewelry:'Digital headphones',extra:'Digital wearable accessory'};
const objectTypes:Record<string,string>={seating:'Digital seating',sofa:'Digital sofa',chair:'Digital chair','tables-desks':'Digital table or desk',storage:'Digital storage object',rugs:'Digital rug',decor:'Digital home object',sculptures:'Digital sculpture',busts:'Digital bust or figure','guild-objects':'Digital display object'};

/** Source evidence is separate from runtime fit, approved editions and delivery. */
export function getProductGameDetails(productId:string):GameProductDetails|undefined {
  const product=findMarketProduct(productId),frankWilder=findFrankWilderTotem(productId);
  if(product&&frankWilder) return {
    productId,itemTypeLabel:'Digital totem preview',intendedUse:'A Frank Wilder design proposed as a wearable collectible in Wilder World.',
    includedContents:['A preview of this individual totem design.','Final digital item contents, chain inclusion and wearing options are still being defined.'],
    colorPolicy:'Nine finish studies are proposed; only completed, reviewed photos are shown. A future purchase is proposed to include one selected, approved finish. These previews do not unlock colors or establish in-game materials.',
    badges:[{label:'Design reference recorded',state:'recorded'},{label:'Model integration pending',state:'pending'},{label:'Release pending',state:'pending'}],
    readiness:{label:'Model integration pending',summary:'The original Frank Wilder design is recorded. Its digital model must be supplied, matched to the design and tested in game before release.',live:false,gameReady:null},
    compatibility:{summary:'Supported avatars, wearing position, chain attachment and clothing combinations have not been confirmed.',supportedFits:[],unsupportedFits:[],scope:'Fit not yet tested'},
    ownership:{summary:'This preview grants no digital item. Ownership of a physical Frank Wilder piece does not establish digital ownership.',delivery:'Payment, token creation and delivery in game will require separate confirmation. Purchases are not live.',limitations:['No edition, supply or mint permission has been approved.','No connection to an existing collectible or wallet entitlement is established.']},
    traceability:{sourceIds:product.sourceIds,assetStatus:'unverified',evidenceReferences:[frankWilder.source.sourceUrl,frankWilder.source.catalogSnapshot,frankWilder.source.referenceManifest],recordedAvatarFlags:{}},
    pending:['Supply the digital model','Match the model to this design','Test avatar fit and clothing combinations','Approve item ownership and delivery'],
  };
  const fact=evidence[productId];
  if(!product||!fact)return undefined;
  const details:GameProductDetails={
    productId,itemTypeLabel:'Digital item',intendedUse:'A proposed item for Wilder World.',
    includedContents:['One item in the selected style is proposed; final contents require approval.'],
    colorPolicy:'Proposed launch purchase: one selected, approved finish. Other preview colors are separate concepts, not included unlocks.',
    badges:[{label:fact.assetIdentified?'Asset identified':'Source review pending',state:fact.assetIdentified?'recorded':'pending'}],
    readiness:{label:'Release pending',summary:'Identified assets and product previews do not confirm a playable release. In-game checks and release approval are still pending.',live:false,gameReady:null},
    compatibility:{summary:'Supported use has not been approved for release.',supportedFits:[],unsupportedFits:[],scope:'Not release-verified'},
    ownership:{summary:'This preview grants no item ownership or game access.',delivery:'Payment, token creation and delivery in game are separate steps. Purchases are not live.',limitations:['Selecting a preview finish does not grant ownership or access in game.']},
    traceability:{sourceIds:fact.sourceIds,assetStatus:fact.assetIdentified?'identified':'unverified',evidenceReferences:fact.evidenceReferences,recordedAvatarFlags:Object.fromEntries(Object.entries(fact.avatarFits).map(([key,fit])=>[key,fit.allowed]))},
    pending:['Final item and finish approval','Ownership and delivery checks','Release availability'],
  };
  if(product.department==='clothing') {
    details.itemTypeLabel=clothingTypes[product.subcategory]??'Digital wearable';
    details.intendedUse='Style an eligible avatar in Wilder World. Compatibility must be confirmed for the released item.';
    details.includedContents=['One digital wearable in this individual style is proposed.'];
    if(product.subcategory==='suit')details.includedContents.push('Shoes and gloves are separate products.');
    if(product.subcategory==='footwear')details.includedContents.push('Final pair or set contents require release approval.');
    // HM/HF names are joined to the inspected DT_AvatarMeshes definitions.
    // Other codes remain auditable source flags, not inferred storefront fits.
    const fits=Object.entries(fact.avatarFits).filter(([key])=>key==='HM'||key==='HF').map(([key,fit])=>({...fit,label:key==='HM'?'Male human avatar':'Female human avatar'}));
    const rules=Object.entries(fact.layerRules);
    details.compatibility.supportedFits=[...fits.filter(f=>f.allowed).map(f=>f.label),...rules.filter(([,allowed])=>allowed).map(([name])=>name)];
    details.compatibility.unsupportedFits=[...fits.filter(f=>!f.allowed).map(f=>f.label),...rules.filter(([,allowed])=>!allowed).map(([name])=>name)];
    if(fact.exactCompatibilityRecord) {
      details.badges.push({label:'Compatibility recorded',state:'recorded'});
      details.compatibility.scope='Exact source record';
      details.compatibility.summary=rules.length?'The source records which accessories may be combined with this style. These rules still need in-game testing.':'The source records these avatar fits for this exact style. Avatar fit, clothing overlaps and selected colors still need in-game testing.';
    } else {
      details.compatibility.scope=fact.historicMatchStatus==='family_reference_only'?'Family evidence only':'Exact fit unconfirmed';
      details.compatibility.summary=fact.historicMatchStatus==='family_reference_only'?'A related family record exists, but its compatibility cannot be assigned to this individual style.':'No exact compatibility record is available for this individual style. A model or product photo alone does not establish supported avatar fits.';
    }
    details.colorPolicy='Proposed launch purchase: one selected, approved color for this style. Store photos are visual concepts; they do not prove those colors are implemented in game.';
    details.pending=['Confirm the selected color in game','Check avatar fit and clothing overlaps','Release and delivery approval'];
  } else if(product.department==='vehicles'&&product.subcategory==='rims') {
    details.itemTypeLabel='Digital rim set';
    details.intendedUse='Customize a compatible vehicle once rim fitment and installation rules are approved.';
    details.includedContents=['The photograph shows a single rim. Final set quantity and wheel positions are awaiting approval.','Tires, brakes and performance upgrades are outside the proposed rim product.'];
    details.compatibility.summary=(fact.sourceFitmentLabels.length?`Source reference: ${fact.sourceFitmentLabels.join(', ')}. `:'')+'Source vehicle or axle names do not certify fit. Supported vehicles and wheel positions remain unconfirmed.';
    details.compatibility.scope='Source reference only';
    details.ownership.limitations=['Planned installation must prevent the same rim set from also being independently transferred or used.','Installation, verified removal and transfer handling still require release approval.'];
    details.pending=['Vehicle and axle fitment','Final set contents','Installation, removal and delivery approval'];
  } else if(product.department==='vehicles') {
    details.itemTypeLabel='Digital vehicle';
    details.intendedUse='A proposed complete vehicle for Wiami. Final playable model and capabilities remain unconfirmed.';
    details.includedContents=['One complete digital vehicle is proposed.','Final equipment and finish contents require release approval.'];
    details.compatibility.summary='The storefront vehicle presentation is not yet bound to a verified playable model. No performance values or upgrade effects are confirmed.';
    details.pending=['Confirm the playable vehicle','Final equipment and finish approval','Release and delivery checks'];
  } else if(product.department==='furniture'||product.department==='statues') {
    details.itemTypeLabel=objectTypes[product.subcategory]??'Digital placeable object';
    details.intendedUse='Furnish or decorate an eligible space in Wiami, subject to placement approval.';
    details.includedContents=['One complete object in the selected style is proposed.','Property, structural building modules and business permissions are not included.'];
    details.compatibility.summary=(fact.savedSceneRecorded?`Source use is recorded in the saved apartment scene${fact.savedSceneRooms.length?` (${fact.savedSceneRooms.join(', ')})`:''}. `:'')+'Eligible locations, scale, collision and placement rules remain unapproved.';
    details.compatibility.scope=fact.savedSceneRecorded?'Saved scene evidence':'Placement unconfirmed';
    if(fact.savedSceneRecorded)details.badges.push({label:'Scene use recorded',state:'recorded'});
    details.ownership.limitations=['Placement would require ownership and permission to use an eligible space.','Pickup and transfer handling must be validated before release.'];
    details.pending=['Confirm where the item can be placed','Pickup and transfer behavior','Final item and delivery approval'];
  } else if(product.department==='totems') {
    details.itemTypeLabel='Digital wearable totem';
    details.intendedUse='A proposed wearable collectible for Wilder World.';
    details.includedContents=productId==='totem-chain-jwlr-002-a'?['Chain-only style; the identified model has no pendant.']:['A chain and triangular pendant are shown in the identified model.','Their relationship to the existing Trinity collectible is unverified.'];
    details.compatibility.summary='Avatar fit and access to this style in game remain unverified. A matching model does not establish Trinity ownership.';
    details.pending=['Avatar fit','Confirm the collectible and ownership record','Release and delivery approval'];
  }
  if(fact.legacyExternal) {
    details.itemTypeLabel='Existing Trinity collectible';
    details.intendedUse='A reference for the Trinity Totem already held by collectors.';
    details.includedContents=['No new item or mint is offered by this reference listing.','Preview finishes do not alter the original collectible.'];
    details.colorPolicy='These finish studies grant no additional colors, items or ownership rights.';
    details.badges=[{label:'Existing collectible',state:'legacy'},{label:'Integration pending',state:'pending'}];
    details.readiness={label:'Integration pending',summary:'Existing ownership is acknowledged; its external collection, token identity and game connection have not been verified here.',live:false,gameReady:null};
    details.compatibility={summary:'The other chain styles are separate items. They are not verified matches for the existing Trinity collectible.',supportedFits:[],unsupportedFits:[],scope:'Original collectible link unverified'};
    details.ownership={summary:'Existing owners retain their original rights. This page does not verify an individual wallet or issue a replacement token.',delivery:'This listing takes no payment and creates no token or access in game.',limitations:['Reminting and new issuance are not permitted for this listing.']};
    details.pending=['Confirm the original collection and token','Verify existing ownership','Connect access in game'];
  } else details.badges.push({label:'Release pending',state:'pending'});
  return details;
}
