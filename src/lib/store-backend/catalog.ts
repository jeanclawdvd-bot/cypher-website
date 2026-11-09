import { marketProducts, storefrontDepartment } from '../../sites/wilderworld/marketplace/catalog';
import { WILDER_INDUSTRIES } from '../wilderCollections';
import reviewIdentities from './original-review-identities.json';

export function knownProductVariant(productId: string, variantId?: string): boolean {
  const product = marketProducts.find(entry => entry.id === productId);
  if (product) return variantId === undefined || product.variants.some(variant => variant.id === variantId);
  // This checks the configured namespace only, not existence/ownership of a minted token.
  // Legacy reviews still require moderation and never receive ownership badges here.
  const match = /^legacy:([1-9][0-9]*):(0x[0-9a-f]{40}):(0|[1-9][0-9]{0,77})$/.exec(productId);
  return !!match && BigInt(match[3]) < BigInt(2) ** BigInt(256)
    && (variantId === undefined || variantId === match[3])
    && WILDER_INDUSTRIES.some(industry => industry.collections.some(collection =>
      (collection.chainId ?? (collection.chain === 'ethereum' ? 1 : 0)) === Number(match[1])
      && collection.contract?.toLowerCase() === match[2]));
}

/** A grouped original is a review subject, never an owned or tradable copy. */
export function knownReviewProductVariant(productId:string,variantId?:string):boolean {
  if(knownProductVariant(productId,variantId))return true;
  const families=reviewIdentities.families as Record<string,string[]>;
  return Object.hasOwn(families,productId)&&(variantId===undefined||families[productId].includes(variantId));
}

/** Three explicit test copies, selected from current approved storefront identities.
 * This does not mint, claim a legacy edition, or establish a production supply cap. */
export const LOCAL_SEED_ITEMS = ['clothing', 'furniture', 'rims'].flatMap(department => {
  const product = marketProducts.find(entry => storefrontDepartment(entry) === department
    && entry.status !== 'Existing collectible' && entry.variants.some(variant => !!variant.image));
  const variant = product?.variants.find(entry => !!entry.image);
  return product && variant ? [{productId:product.id,variantId:variant.id,name:product.name,variantName:variant.name}] : [];
});
