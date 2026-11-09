import definitions from './clothing-fit-families.json';
import femaleSources from '../accessories/female-source-evidence.json';
import historicalFits from '../accessories/gender-fit.json';
import restorations from './female-restorations.json';

export type ClothingFit = 'Men'|'Women';
type FitRecord = {raw_avatar_compatibility?:{HM?:boolean;HF?:boolean}|null;confidence?:string};
const sourceFits=historicalFits as Record<string,FitRecord>;
const femaleIds=new Set([...Object.keys(femaleSources),...restorations.products.map(p=>p.id)]);
export const clothingFitFamilies=definitions.families;
export function clothingFitFamily(productId:string) { return clothingFitFamilies.find(f=>f.fits.some(fit=>fit.productId===productId)); }
export function clothingStyleName(productId:string,fallback:string) { return clothingFitFamily(productId)?.name??fallback; }
/** Merchandising cut is separate from runtime compatibility. Never infer from _F. */
export function clothingFit(productId:string):{fits:ClothingFit[];basis:'source_cut'|'source_table'|'unconfirmed'} {
  if(femaleIds.has(productId))return {fits:['Women'],basis:'source_cut'};
  const pair=clothingFitFamily(productId)?.fits.find(f=>f.productId===productId);
  if(pair)return {fits:[pair.label as ClothingFit],basis:'source_cut'};
  if(definitions.unresolvedProductIds.includes(productId))return {fits:[],basis:'unconfirmed'};
  const record=sourceFits[productId];
  if(record?.confidence==='exact_game_row') {
    const fits:ClothingFit[]=[];
    if(record.raw_avatar_compatibility?.HM)fits.push('Men');
    if(record.raw_avatar_compatibility?.HF)fits.push('Women');
    return {fits,basis:'source_table'};
  }
  return {fits:[],basis:'unconfirmed'};
}
/** Group after filtering so a Women filter or exact SKU search keeps its matched fit. */
export function groupClothingStyles<T extends {id:string;department:string}>(products:T[]):T[] {
  const seen=new Set<string>();
  return products.filter(product=>{
    const key=product.department==='clothing'?(clothingFitFamily(product.id)?.styleId??product.id):product.id;
    if(seen.has(key))return false;
    seen.add(key);return true;
  });
}
