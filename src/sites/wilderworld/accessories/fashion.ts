import products from './individual-products.json';
import colorwayImages from './colorway-images.json';
import editorialImages from './editorial-images.json';
import imageExceptions from './image-exceptions.json';
import genderFit from './gender-fit.json';
import femaleSourceEvidence from './female-source-evidence.json';
import { excludedFamilies, hiddenProductIds } from './merchandising';
import { getAccessoryPrice } from './pricing';

export type IndividualAccessory = {
  id: string;
  sourceSku: string;
  familyId: string;
  name: string;
  brand: string;
  brandId: string;
  collection: string;
  category: string;
  description: string;
  lore: string;
  material: string;
  trim: string;
  image: string;
};

export type ProductColorway = { id: string; name: string; primary: string; secondary: string; accent: string; material: string; finish: string; image: string };
export type EditorialImage = { id: string; colorwayId: string; image: string; alt: string; label: string };
const colorsByProduct = colorwayImages as Record<string, ProductColorway[]>;
const editorialByProduct = editorialImages as Record<string, EditorialImage[]>;
const genderByProduct = genderFit as Record<string, {gender: 'Men' | 'Women' | 'Unisex'; basis: string; source: string}>;
const femaleFits = femaleSourceEvidence as Partial<Record<string, {gender: 'Women'}>>;

export function presentAccessory(product: IndividualAccessory, index: number) {
  const pricing = getAccessoryPrice(product.id);
  const colorways = colorsByProduct[product.id] ?? [];
  // Alternate the featured palette across the collection, keeping it stable
  // when shoppers filter or sort the browse grid.
  const featuredColor = colorways[index % Math.max(colorways.length, 1)];
  return {
    ...product,
    image: featuredColor?.image ?? product.image,
    defaultColorId: featuredColor?.id,
    gender: femaleFits[product.id]?.gender ?? genderByProduct[product.id]?.gender ?? 'Unisex',
    colorways,
    editorials: editorialByProduct[product.id] ?? [],
    category: product.category.toLowerCase(),
    categoryLabel: product.category === 'Jewelry' ? 'Headphones' : product.category,
    price: pricing.price,
    priceCents: pricing.priceCents,
    currency: pricing.currency,
    draft: true,
    details: [product.collection, 'Digital accessory'].filter(Boolean),
    options: [],
    featuredRank: index + 3,
  };
}

// Each style has its own identity and image. The original UE SKU stays attached
// even when a component split needs a separate storefront ID.
export const individualStoreProducts = (products as IndividualAccessory[])
  .filter(product => !excludedFamilies.has(product.familyId) && !hiddenProductIds.has(product.id) && !(product.sourceSku in imageExceptions))
  .map(presentAccessory);

export function findIndividualProduct(id: string) {
  if (hiddenProductIds.has(id) || excludedFamilies.has(id)) return undefined;
  return individualStoreProducts.find(product => product.id === id)
    ?? individualStoreProducts.find(product => product.familyId === id);
}
