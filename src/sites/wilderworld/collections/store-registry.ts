import data from './registry.json';
import { productDisplayName } from '../marketplace/product-display-names';
import { frankWilderRegistryProducts, trinityArchiveStatus } from '../marketplace/frank-wilder-totems';
import curation from '../marketplace/storefront-curation.json';

export type BrowseSection = 'vehicles' | 'furniture' | 'totems';
export type RegistryProduct = {
  id: string;
  name: string;
  description: string;
  collectionId: 'vehicles' | 'clothing' | 'furniture';
  section: string;
  itemType: string;
  status: string;
  storeVisible?: boolean;
  image: string | null;
  sourceIds: string[];
  sourceAssets: string[];
  conceptVariants: unknown[];
  purchaseEnabled: boolean;
  price: unknown;
  supplyCap: number | null;
  unresolved: string[];
  evidence?: { imageKind?: string };
  setContents?: { status: string; quantity: number; positions: string[]; included: string[]; excluded: string[]; fitmentApproved: boolean };
};

const excludedProductIds = new Set(curation.excludedProductIds);
export const registryProducts = [...data.products as unknown as RegistryProduct[], ...frankWilderRegistryProducts].map(product => ({ ...product, name: productDisplayName(product.id, product.name), ...(product.id===trinityArchiveStatus.productId||excludedProductIds.has(product.id)?{storeVisible:false}:{}) }));
export const browseSections = {
  vehicles: { name: 'Vehicles', description: 'Explore the machines and rim designs shaping the streets of Wiami. This collection brings complete vehicles and rims together, with fitment and final product details still under review.' },
  furniture: { name: 'Furniture', description: 'Objects for a life in Wiami. Explore complete furniture candidates, from seating to desks and tables, as the collection takes shape.' },
  totems: { name: 'Totems', description: 'Sculptural wearable objects by Frank Wilder. Digital models and release details are being prepared.' },
} as const;

export function isBrowseSection(value: string): value is BrowseSection {
  return Object.hasOwn(browseSections, value);
}

export function productsForSection(section: BrowseSection) {
  return registryProducts.filter(product => product.storeVisible !== false).filter(product => section === 'totems'
    ? product.section === 'totems'
    : product.collectionId === section && product.section !== 'fashion')
    .sort((a, b) => Number(b.itemType === 'vehicle') - Number(a.itemType === 'vehicle'));
}

export function findRegistryProduct(id: string) {
  return registryProducts.find(product => product.id === id && product.section !== 'fashion' && product.storeVisible !== false);
}

export function sectionForProduct(product: RegistryProduct): BrowseSection {
  return product.section === 'totems' ? 'totems' : product.collectionId === 'furniture' ? 'furniture' : 'vehicles';
}

export function productTypeLabel(product: RegistryProduct) {
  return ({ vehicle: 'Vehicle', rim_set: 'Rim design', furniture: 'Furniture', sofa: 'Sofa', chair: 'Chair', coffee_table: 'Coffee table', desk: 'Desk', totem: 'Totem' } as Record<string, string>)[product.itemType] ?? 'Collection item';
}

export function productStatusLabel(product: RegistryProduct) {
  return product.status === 'legacy_reference' ? 'Existing collectible' : 'Collection preview';
}
