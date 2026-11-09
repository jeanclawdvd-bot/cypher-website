import identities from '@/lib/store-backend/original-review-identities.json';
import {findMarketProduct,productHref} from './catalog';

export type ReviewSubjectPresentation={name:string;href?:string;variantLabel?:string};
/** Shopper-facing labels only. Identity/ownership authorization remains server-side. */
export function reviewSubjectPresentation(productId:string,variantId?:string):ReviewSubjectPresentation {
  const subjects=identities.presentation as Record<string,{name:string;href:string;editionLabels:string[]}>;
  const families=identities.families as Record<string,string[]>;
  if(Object.hasOwn(subjects,productId)&&Object.hasOwn(families,productId)){
    const subject=subjects[productId],index=variantId?families[productId].indexOf(variantId):-1;
    return {name:subject.name,href:index>=0?`${subject.href}?${new URLSearchParams({variant:variantId!})}`:subject.href,
      variantLabel:index>=0?subject.editionLabels[index]:undefined};
  }
  // Unknown source identifiers are never displayed as chain/contract strings.
  if(productId.startsWith('original-family:')||productId.startsWith('legacy:'))return {name:'Original collectible'};
  const product=findMarketProduct(productId);
  if(!product)return {name:'Archived product'};
  const variant=product.variants.find(option=>option.id===variantId);
  return {name:product.name,href:productHref(product,variant),variantLabel:variant?.name};
}
