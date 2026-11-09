import data from './bottomwear-presentation-overrides.json';
import type { MaterialSpec } from './material-variants';

type ReviewedPhoto = {id:string;name:string;swatch:string;image:string;thumbnail:string;srcSet:string;sourceReference:string;presentationStatus:'reference_edit_verified';renderMethod:'image_concept';reviewStatus:'pass';materialSpec:MaterialSpec};
type ProductPresentation = {productId:string;defaultVariantId:string;variants:ReviewedPhoto[]};
const presentations=data.products as Record<string,ProductPresentation>;

/** Only individually reviewed photo edits may replace the display of an original color. */
export function reviewedBottomwearPresentation(productId:string,approvedOriginalImages:string[]):ProductPresentation|undefined {
  const item=presentations[productId];
  if(!item||item.productId!==productId||item.variants.length!==3)return undefined;
  if(!item.variants.every(photo=>photo.reviewStatus==='pass'&&photo.presentationStatus==='reference_edit_verified'&&photo.renderMethod==='image_concept'&&approvedOriginalImages.includes(photo.sourceReference)&&photo.image!==photo.sourceReference))return undefined;
  if(!item.variants.some(photo=>photo.id===item.defaultVariantId))return undefined;
  return item;
}
