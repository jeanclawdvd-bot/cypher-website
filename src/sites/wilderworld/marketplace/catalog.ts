import { individualStoreProducts } from '../accessories/fashion';
import { registryProducts, productTypeLabel } from '../collections/store-registry';
import { findStandaloneBaseRender, getCollectionImage } from '../collections/furniture-base-images';
import expanded from './expanded-catalog.json';
import curation from './storefront-curation.json';
import totemSources from './totem-source-candidates.json';
import totemMedia from './totem-media-overrides.json';
import rugMedia from './rug-product-media.json';
import { productDisplayName } from './product-display-names';
import { findFrankWilderTotem, frankWilderMarketProduct } from './frank-wilder-totems';
import femaleRestorations from './female-restorations.json';
import { storefrontPreviewPrice } from './preview-prices';
import { matchesProductCategory } from './headwear-groups';
import { clothingFit, groupClothingStyles } from './clothing-fit';
import { applyMaterialConcepts, type MaterialSpec, type MaterialConcept } from './material-variants';

export type Variant = { id: string; name: string; image: string | null; thumbnail?: string; srcSet?: string; swatch: string; status: string; sourceAssets?: string[]; renderStatus?: 'rendered' | 'pending'; materialSpec?: MaterialSpec };
export type MarketProduct = { id: string; name: string; department: string; subcategory: string; description: string; image: string | null; gallery: string[]; variants: Variant[]; plannedVariants?:MaterialConcept[]; sourceVariants?: Variant[]; defaultVariantId?:string; status: string; imageKind: string; imageSourceReference?: string; sourceAssets: string[]; sourceIds: string[]; priceCents: number | null; brand?: string; gender?: string; href?: string };
export const departments = [
  { id: 'vehicles', name: 'Vehicles', tagline: 'Find your next ride.', subs: [{id:'cars',name:'Complete vehicles'}] },
  { id: 'rims', name: 'Rims', tagline: 'Make the finishing touch your own.', subs: [{id:'rims',name:'Rims'}] },
  { id: 'clothing', name: 'Clothing', tagline: 'Wear your own world.', subs: [{id:'jacket',name:'Jackets'},{id:'topwear',name:'Tops'},{id:'bottomwear',name:'Bottoms'},{id:'footwear',name:'Shoes'},{id:'suit',name:'Suits'},{id:'hats',name:'Hats'},{id:'helmets',name:'Helmets'},{id:'eyewear',name:'Glasses'},{id:'mask',name:'Masks'},{id:'jewelry',name:'Headphones'},{id:'extra',name:'Accessories'}] },
  { id: 'furniture', name: 'Furniture', tagline: 'Make room for you.', subs: [{id:'seating',name:'Seating'},{id:'tables-desks',name:'Tables & desks'},{id:'storage',name:'Storage'},{id:'decor',name:'Home objects'},{id:'rugs',name:'Rugs & mats'}] },
  { id: 'statues', name: 'Statues', tagline: 'Objects with presence.', subs: [{id:'sculptures',name:'Sculptures'},{id:'busts',name:'Busts & figures'},{id:'guild-objects',name:'Guild objects'}] },
  { id: 'totems', name: 'Totems', tagline: 'A story to carry.', subs: [{id:'totems',name:'Frank Wilder totems'}] },
] as const;
const finishes = expanded.finishes as Record<string, Variant[]>;
const canonical = (s: string) => s.split('.')[0];
const clothing: MarketProduct[] = individualStoreProducts.map(p => ({
  id:p.id,name:p.name,department:'clothing',subcategory:p.category,description:p.description,image:p.image,
  gallery:[p.image],variants:p.colorways.map(v=>({id:v.id,name:v.name,image:v.image,swatch:v.primary,status:'Color concept'})),
  status:'Color concepts',imageKind:'color_concept',sourceAssets:[],sourceIds:[p.sourceSku],priceCents:p.priceCents,brand:p.brand,gender:p.gender,href:`/store/${p.id}`,
}));
const collections: MarketProduct[] = registryProducts.filter(p=>p.storeVisible!==false && p.section!=='fashion').map(p=>{
  const frankWilder=findFrankWilderTotem(p.id);
  if(frankWilder)return frankWilderMarketProduct(frankWilder);
  const base = findStandaloneBaseRender(p.sourceAssets);
  const variants = p.sourceAssets.length===1 ? finishes[canonical(p.sourceAssets[0])] ?? [] : [];
  const image=variants[0]?.image ?? getCollectionImage(p);
  return {id:p.id,name:p.name,department:p.section==='totems'?'totems':p.collectionId,subcategory:p.itemType==='rim_set'?'rims':p.itemType==='vehicle'?'cars':['sofa','chair'].includes(p.itemType)?'seating':['desk','coffee_table'].includes(p.itemType)?'tables-desks':p.itemType,
    description:p.description,image,gallery:[image,...(base?.front?[base.front]:[])].filter((s):s is string=>!!s),variants,status:p.status==='legacy_reference'?'Existing collectible':variants.length?'Finish study':'Collection preview',imageKind:variants.length?'finish_study':base?'neutral_source_render':p.evidence?.imageKind??'source_preview',sourceAssets:p.sourceAssets,sourceIds:p.sourceIds,priceCents:null};
});
const additional = (expanded.products as MarketProduct[]).map(p=>{
  const variants=p.sourceAssets.length===1 ? finishes[canonical(p.sourceAssets[0])] ?? p.variants : p.variants;
  return {...p,subcategory:p.id==='home-object-206-workbench-02'?'tables-desks':p.subcategory,variants,image:variants[0]?.image??p.image,status:finishes[canonical(p.sourceAssets[0]??'')]?'Finish study':p.status};
});
// Storefront selection retains the curated rims and two complete vehicles.
// Keep discovery records in expanded-catalog.json; they are not store releases.
// Explicit identities prevent source reordering/additions from restoring removals.
const storefrontVehicleIds = new Set([
  'rim-preview-wertone-wantide-2010',
  'rim-preview-worsche-911-wt1-98',
  'rim-preview-wertone-v1',
  'rim-preview-wertone-v2',
  'rim-preview-wheel-001',
  'rim-preview-wheel-003',
  'rim-preview-lambos-v1',
  'rim-preview-lambos-v2',
  'vehicle-ghostline',
  'vehicle-vera-solis',
]);
const excludedProductIds = new Set(curation.excludedProductIds);
export const curatedSourceProducts: MarketProduct[] = [...clothing,...femaleRestorations.products as MarketProduct[],...collections,...additional,...totemSources.products as MarketProduct[],...expanded.vehicleArchive as MarketProduct[],...expanded.rimArchive as MarketProduct[]]
  .filter(product => !excludedProductIds.has(product.id) && (product.department !== 'vehicles' || storefrontVehicleIds.has(product.id)))
  .map(product=>product.id==='totem-trinity-legacy'?{...product,image:totemMedia['totem-trinity-legacy'].image,imageKind:totemMedia['totem-trinity-legacy'].imageKind,imageSourceReference:totemMedia['totem-trinity-legacy'].sourceReference,gallery:totemMedia['totem-trinity-legacy'].gallery.map(item=>item.image),description:'The original Trinity Totem: a triangular Wilder World pendant and chain, released to existing collectors.'}:product)
  .map(product=>product.id===rugMedia.productId?{...product,image:rugMedia.image,imageKind:rugMedia.imageKind,gallery:rugMedia.gallery,description:rugMedia.description}:product)
  .map(product=>({...product,name:productDisplayName(product.id,product.name)}));
export const marketProducts: MarketProduct[] = curatedSourceProducts.map(applyMaterialConcepts)
  .map(product=>{
    const fit=product.department==='clothing'?clothingFit(product.id):undefined;
    return {...product,gender:fit?.fits.length===1?fit.fits[0]:product.gender,priceCents:storefrontPreviewPrice(product.id,product.priceCents)};
  });
export function findMarketProduct(id:string) { return marketProducts.find(p=>p.id===id); }
export function featuredMaterial(product:MarketProduct):Variant|undefined {
  if(product.status==='Existing collectible')return undefined;
  if(product.defaultVariantId)return product.variants.find(v=>v.id===product.defaultVariantId);
  if(product.id===rugMedia.productId)return product.variants.find(v=>v.id===rugMedia.defaultVariantId);
  if(product.department==='clothing')return product.variants.find(v=>v.image===product.image);
  const rendered=product.variants.filter(v=>v.image);
  if(!rendered.length)return undefined;
  const hash=[...product.id].reduce((value,letter)=>(value*31+letter.charCodeAt(0))>>>0,0);
  return rendered[hash%rendered.length];
}
export function departmentName(id:string) { return departments.find(d=>d.id===id)?.name??'All products'; }
/** Web navigation only: vehicles and rim sets retain the same collection/contract. */
export function storefrontDepartment(product:Pick<MarketProduct,'department'|'subcategory'>) { return product.department==='vehicles'&&product.subcategory==='rims'?'rims':product.department; }
export function browseDepartment(department:string,subcategory?:string) { return department==='vehicles'&&subcategory==='rims'?'rims':department; }
export function subcategoryName(id:string) { return (id==='headwear'?'Headwear':departments.flatMap(d=>[...d.subs]).find(s=>s.id===id)?.name)??productTypeLabel({itemType:id} as Parameters<typeof productTypeLabel>[0]); }
export function productHref(p:MarketProduct, variant?:Variant) { return p.href ? `${p.href}${variant?'?color='+encodeURIComponent(variant.id):''}` : `/store/products/${p.id}${variant?'?variant='+encodeURIComponent(variant.id):''}`; }
export function filterProducts(products:MarketProduct[], filter:{department?:string;subcategory?:string;query?:string;brand?:string;finish?:string;sort?:string;gender?:string}) {
  const words=(filter.query??'').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const department=browseDepartment(filter.department??'all',filter.subcategory);
  const result=products.filter(p=>(department==='all'||storefrontDepartment(p)===department)&&matchesProductCategory(p,filter.subcategory)&&(!filter.gender||filter.gender==='all'||(p.department==='clothing'&&clothingFit(p.id).fits.some(fit=>fit===filter.gender)))&&(!filter.brand||filter.brand==='all'||p.brand===filter.brand)&&(!filter.finish||filter.finish==='all'||p.variants.some(v=>v.name.toLowerCase()===filter.finish!.toLowerCase()))&&words.every(w=>`${p.name} ${p.brand??''} ${departmentName(storefrontDepartment(p))} ${subcategoryName(p.subcategory)} ${p.description} ${p.sourceIds.join(' ')} ${p.variants.map(v=>v.name).join(' ')}`.toLowerCase().includes(w)));
  if(filter.sort==='name')result.sort((a,b)=>a.name.localeCompare(b.name));
  if(filter.sort==='price-low')result.sort((a,b)=>(a.priceCents??Infinity)-(b.priceCents??Infinity));
  if(filter.sort==='price-high')result.sort((a,b)=>(b.priceCents??-Infinity)-(a.priceCents??-Infinity));
  if(filter.sort==='variants')result.sort((a,b)=>b.variants.length-a.variants.length);
  return result;
}

/** Storefront style entries; underlying fit-specific inventory stays intact. */
export function browseProducts(products:MarketProduct[],filter:Parameters<typeof filterProducts>[1]) { return groupClothingStyles(filterProducts(products,filter)); }
