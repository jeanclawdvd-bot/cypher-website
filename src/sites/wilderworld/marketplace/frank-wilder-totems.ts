import data from './frank-wilder-totems.json';
import palettes from './material-palettes.json';
import renderData from './fw-material-render-images.json';

/** Physical design references are not digital editions, mint rights or avatar fits. */
export const frankWilderTotems = data.products;
export type FrankWilderTotem = (typeof frankWilderTotems)[number];
export const trinityArchiveStatus = data.legacyTrinity;
export function findFrankWilderTotem(id:string):FrankWilderTotem|undefined {
  return frankWilderTotems.find(product=>product.id===id);
}
export type FWRender={image:string;thumbnail?:string;srcSet?:string;renderMethod:'image_concept';reviewStatus?:string;referenceReview?:string;sourceReference:string;chainReference?:string;presentation?:'pendant_only';previousImage?:string;geometryUnchanged:false};
const renders=renderData as Record<string,FWRender>;
/** Photography approval never approves the chain assembly or digital model intake. */
export function isReviewedFrankWilderRender(render:FWRender|undefined,handle:string,finish:string):render is FWRender {
  if(!render||render.renderMethod!=='image_concept'||!(render.reviewStatus==='pass'||render.referenceReview==='pass')||!render.sourceReference)return false;
  const stem=`${handle}-${finish}.webp`;
  // The current art direction excludes necklaces. Historical v2 photos remain
  // archived, but cannot silently return when a replacement finish is pending.
  return render.presentation==='pendant_only'&&['v3-pendant','v4-source-rebuild'].some(version=>render.image===`/images/marketplace/frank-wilder-totems/${version}/${stem}`);
}
export function frankWilderMaterialPreviews(product:FrankWilderTotem) {
  return palettes.totems.map(recipe=>{
    const id=`MAT-${product.id}-${recipe.id}`;
    const render=renders[id];
    const reviewed=isReviewedFrankWilderRender(render,product.handle,recipe.id);
    return {id,name:recipe.name,swatch:recipe.swatch,materialSpec:recipe.materialSpec,render:reviewed?render:undefined,image:reviewed?render.image:null};
  });
}
function reviewedLead(product:FrankWilderTotem){return frankWilderMaterialPreviews(product).find(preview=>preview.image)?.image??null;}

export const frankWilderRegistryProducts=frankWilderTotems.map(product=>({
  ...product,
  image:reviewedLead(product),
  collectionId:'clothing' as const,
  conceptVariants:frankWilderMaterialPreviews(product).map(preview=>({id:preview.id,name:preview.name,image:preview.image,sourceReference:preview.render?.sourceReference??product.preview.sourceReference,status:preview.image?'Visual concept; model integration pending':'Requested finish; photo pending'})),
  evidence:{imageKind:product.imageKind},
}));

export function frankWilderMarketProduct(product:FrankWilderTotem) {
  const image=reviewedLead(product);
  return {
    id:product.id,name:product.name,brand:product.brand,description:product.description,
    department:'totems',subcategory:'totems',image,gallery:image?[image]:[],
    variants:frankWilderMaterialPreviews(product).map(preview=>({id:preview.id,name:preview.name,image:preview.image,swatch:preview.swatch,status:preview.image?'Visual concept; model integration pending':'Requested finish; photo pending'})),
    status:'Model integration pending',imageKind:product.imageKind,imageSourceReference:product.source.sourceUrl,
    sourceAssets:product.sourceAssets,sourceIds:product.sourceIds,priceCents:product.priceCents,
  };
}
