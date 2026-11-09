import approval from './preview-prices.json';
import curation from './storefront-curation.json';

const prices: Readonly<Record<string, {priceCents:number;rationale:string}>> = approval.products;
const excludedProductIds = new Set(curation.excludedProductIds);

/** Display-only prices. Source catalogs and approved fulfillment offers remain separate. */
export function storefrontPreviewPrice(productId:string, sourcePrice:number|null):number|null {
  // Keep the approved historical pricebook intact without quoting removed items.
  if(excludedProductIds.has(productId))return null;
  if(sourcePrice!==null)return sourcePrice;
  const proposed=Object.hasOwn(prices,productId)?prices[productId].priceCents:null;
  if(proposed!==null&&(!Number.isSafeInteger(proposed)||proposed<=0))throw Error(`Invalid preview price: ${productId}`);
  return proposed;
}
