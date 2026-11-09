import media from './campaign-media.json';
import legacyEditorials from '../accessories/editorial-images.json';
import lifestyleApprovals from './lifestyle-approvals.json';
/** Editorial scenes are separate from product, material and game-compatibility records. */
export type CampaignScene = { id?:string; image:string; position:string; kind:'editorial'|'product-scene'; productIds:string[]; label?:string; alt?:string };
export type CampaignMedia = CampaignScene & { cardImage?:string; cardPosition?:string; series?:CampaignScene[] };
export type ProductEditorial = { id:string; image:string; position?:string; alt:string; label:string; colorwayId?:string; campaign:boolean };
export const campaignMedia=media as Record<string,CampaignMedia>;

/** Each additional scene declares its own exact products; category/family matches are insufficient. */
export function campaignScenesForProduct(productId:string, campaigns:Record<string,CampaignMedia>=campaignMedia):ProductEditorial[] {
  const seen=new Set<string>();
  return Object.entries(campaigns).flatMap(([category,cover])=>[cover,...(cover.series??[])].flatMap((scene,index)=>{
    if(!scene.productIds.includes(productId)||seen.has(scene.image))return [];
    seen.add(scene.image);
    return [{id:`campaign-${category}-${scene.id??index}`,image:scene.image,position:scene.position,alt:scene.alt??'Wiami editorial featuring this product',label:scene.label??'Editorial preview',campaign:true}];
  }));
}

/** Scene photographs never become a finish image or change a selected configuration. */
export function productEditorials(productId:string,colorwayId?:string):ProductEditorial[] {
  const legacy=(legacyEditorials as Record<string,{id:string;image:string;alt:string;label:string;colorwayId:string}[]>)[productId]??[];
  const matching=legacy.filter(item=>item.colorwayId===colorwayId).map(item=>({...item,label:'Editorial preview',campaign:false}));
  return [...matching,...campaignScenesForProduct(productId)].filter((item,index,all)=>all.findIndex(other=>other.image===item.image)===index);
}

/** Retain every source candidate for review; only explicit selections return to product pages. */
export function approvedProductEditorials(productId:string,colorwayId?:string):ProductEditorial[] {
  const approved = new Set<string>(lifestyleApprovals.approvedImages);
  return productEditorials(productId,colorwayId).filter(scene=>approved.has(scene.image));
}
