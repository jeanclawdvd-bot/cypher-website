import data from './furniture-base-renders.json';
import type { RegistryProduct } from './store-registry';

export type FurnitureBaseRender = {
  id: string;
  name: string;
  category: string;
  hero: string;
  front: string;
  sourceAssets: string[];
  sourceIds: string[];
  notes: string;
};
export type FurnitureBaseRenderData = {
  status: string;
  summary: { ready: number; held: number };
  entries: FurnitureBaseRender[];
  held: { name: string; reason: string }[];
};
export const furnitureBaseRenders = data as unknown as FurnitureBaseRenderData;

/** UE package path or the same path with its redundant .AssetName object suffix. No fuzzy/name matching. */
export function canonicalGameAsset(source: string): string | null {
  if (!source.startsWith('/Game/') || source.includes(':') || source.includes('\\') || source !== source.trim()) return null;
  const basename = source.slice(source.lastIndexOf('/') + 1);
  if (!basename) return null;
  const dot = basename.indexOf('.');
  if (dot === -1) return source;
  if (basename.slice(dot + 1) !== basename.slice(0, dot)) return null;
  return source.slice(0, source.lastIndexOf('/') + 1) + basename.slice(0, dot);
}

export function findStandaloneBaseRender(sourceAssets: readonly string[], entries = furnitureBaseRenders.entries): FurnitureBaseRender | undefined {
  const sourceKeys = new Set(sourceAssets.map(canonicalGameAsset).filter((key): key is string => key !== null));
  if (sourceAssets.length !== 1 || sourceKeys.size !== 1) return undefined;
  return entries.find(entry => entry.sourceAssets.length === 1 && !!entry.hero && sourceKeys.has(canonicalGameAsset(entry.sourceAssets[0]) ?? ''));
}

export function getCollectionImage(product: Pick<RegistryProduct, 'collectionId' | 'sourceAssets' | 'image'>, entries = furnitureBaseRenders.entries): string | null {
  if (product.collectionId !== 'furniture') return product.image;
  return findStandaloneBaseRender(product.sourceAssets, entries)?.hero ?? product.image;
}
