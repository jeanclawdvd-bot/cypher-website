import inventorySnapshot from './originals-inventory-counts.json';
import type { WilderCollectionEntry } from './wilderCollections';

export type OriginalCollectionQuantity = {
  value: number;
  kind: 'erc721-items' | 'erc1155-units' | 'provider-total';
  source: 'indexer' | 'blockscout' | 'inventory-snapshot' | 'opensea';
  observedAt: string;
  /** Observed ownership/inventory quantity is never an approved edition cap. */
  isSupplyCap: false;
};

export function validCollectionCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function collectionQuantity(value: unknown, source: OriginalCollectionQuantity['source'], observedAt: string, standard: string | null): OriginalCollectionQuantity | null {
  const count = validCollectionCount(value);
  if (count === null) return null;
  const normalized = standard?.replaceAll('-', '').toUpperCase();
  return { value: count, source, observedAt, isSupplyCap: false,
    kind: normalized === 'ERC721' ? 'erc721-items' : normalized === 'ERC1155' ? 'erc1155-units' : 'provider-total' };
}

/** Only a completed, contract-bound ERC-721 walk may supply an instance count. */
export function observedInventoryQuantity(entry: WilderCollectionEntry, snapshot: unknown = inventorySnapshot): OriginalCollectionQuantity | null {
  if (!snapshot || typeof snapshot !== 'object' || !('collections' in snapshot) || !Array.isArray(snapshot.collections)) return null;
  for (const candidate of snapshot.collections) {
    if (!candidate || typeof candidate !== 'object') continue;
    const row = candidate as Record<string, unknown>;
    if (row.chainId !== entry.chainId || row.contract !== entry.contract?.toLowerCase() || row.collection !== entry.slug) continue;
    if (row.complete !== true || row.tokenStandard !== 'ERC-721' || !Array.isArray(row.errors) || row.errors.length !== 0 || typeof row.observedAt !== 'string' || !Number.isFinite(Date.parse(row.observedAt))) return null;
    return collectionQuantity(row.tokenCount, 'inventory-snapshot', row.observedAt, 'ERC-721');
  }
  return null;
}
