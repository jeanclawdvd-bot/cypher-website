/** Display-only groups reviewed against the original UE thumbnails.
 * Backend Headwear category and source SKUs remain unchanged.
 */
export const helmetProductIds = new Set(['HDWR_001_A','HDWR_001_B','HDWR_002','HDWR_002_A','HDWR_003_A','HDWR_006_A','HDWR_006_B','HDWR_006_C','HDWR_007','HDWR_007_A','HDWR_014','HDWR_014_A','HDWR_FRD']);
export function matchesProductCategory(product:{id:string;subcategory:string}, category?:string) {
  if(!category||category==='all')return true;
  if(category==='helmets')return product.subcategory==='headwear'&&helmetProductIds.has(product.id);
  if(category==='hats')return product.subcategory==='headwear'&&!helmetProductIds.has(product.id);
  return product.subcategory===category;
}
