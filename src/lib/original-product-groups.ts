import snapshot from './original-product-groups.snapshot.json';
import type { MarketNft } from './opensea';
import type { TraitCategory } from '@/app/api/market/traits/route';

export type OriginalEdition = {id:string; traits:MarketNft['traits']; image:string|null; animationUrl?:string|null; members:Array<{tokenId:string;tag:string}>};
export type OriginalFamily = {id:string;slug:string;chain:string;chainId:number;contract:string;sourceAssetId:string;name:string;image:string|null;description:string;traits:MarketNft['traits'];variants:OriginalEdition[];observedAt:string;count:number};
type Collection = {observedAt:string;itemCount:number;sourceSha256:string;families:OriginalFamily[]};
const collections = snapshot.collections as unknown as Record<string,Collection>;
export function originalGroupCollection(slug:string) {return Object.hasOwn(collections,slug)?collections[slug]:null;}
export function findOriginalFamily(slug:string,id:string) {return originalGroupCollection(slug)?.families.find(f=>f.id===id) ?? null;}
const traitCache=new Map<string,TraitCategory[]>();
/** Full observed-copy counts, independent of the current page or active filters. */
export function originalGroupTraitCategories(slug:string):TraitCategory[] {
  const collection=originalGroupCollection(slug);
  if(!collection)return [];
  const cached=traitCache.get(slug);
  if(cached)return cached;
  const types=new Map<string,Map<string,number>>();
  for(const family of collection.families)for(const variant of family.variants)for(const trait of variant.traits){
    const values=types.get(trait.type)??new Map<string,number>();
    values.set(trait.value,(values.get(trait.value)??0)+variant.members.length);types.set(trait.type,values);
  }
  const categories=[...types].map(([type,values])=>({type,values:[...values].map(([value,count])=>({value,count})).sort((a,b)=>b.count-a.count||a.value.localeCompare(b.value))})).sort((a,b)=>a.type.localeCompare(b.type));
  traitCache.set(slug,categories);return categories;
}
export function originalFamilyHref(slug:string,id:string) {return `/store/market/${encodeURIComponent(slug)}/group/${encodeURIComponent(id)}`;}
export function originalEditionLabel(edition:OriginalEdition) {const get=(name:string)=>edition.traits.find(t=>t.type===name)?.value;return ['Rarity','Primary Material','Secondary Color','Accent Color'].map(get).filter(Boolean).join(' · ');}
export function familyBrowseItem(family:OriginalFamily,selectedEditionId=family.variants[0].id):MarketNft {
  const edition=family.variants.find(variant=>variant.id===selectedEditionId);
  if(!edition)throw new Error('Selected edition does not belong to this product family');
  return {identifier:edition.members[0].tokenId, name:family.name,image:edition.image,collectionSlug:family.slug,contract:family.contract,chain:family.chain,sourceAssetId:family.sourceAssetId,priceEth:null,traits:edition.traits,
    productGroup:{id:family.id,editionCount:family.variants.length,observedCount:family.count,observedAt:family.observedAt,selectedEditionId:edition.id}};
}
