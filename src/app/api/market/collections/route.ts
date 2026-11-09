import { NextResponse } from 'next/server';
import { collectionQuantity, observedInventoryQuantity, validCollectionCount, type OriginalCollectionQuantity } from '@/lib/originals-counts';
import { fetchExplorerCollection, originalProvenance, type OriginalDataProvenance } from '@/lib/originals-data';
import {
  ALL_ENTRIES,
  getEntrySource,
  type WilderCollectionEntry,
} from '@/lib/wilderCollections';
import { openseaFetch, type OpenSeaCollection, type OpenSeaStats } from '@/lib/opensea';
import {
  indexerFetch,
  resolveMediaUrl,
  type IndexerInventoryResponse,
} from '@/lib/indexer';

export const revalidate = 300;

export type MarketCollection = {
  provenance?: OriginalDataProvenance;
  tokenStandard?: string | null;
  slug: string;
  name: string;
  image: string | null;
  floorPrice: number | null;
  floorSymbol: string | null;
  topOfferEth: number | null;
  totalVolume: number | null;
  listedCount: number | null;
  owners: number | null;
  totalSupply: number | null;
  quantity?: OriginalCollectionQuantity | null;
  launched: string | null;
};

type OffersResponse = {
  offers?: Array<{ price?: { value?: string; decimals?: number } }>;
};

/** Best-effort top collection offer, in ETH. */
async function fetchTopOfferEth(slug: string): Promise<number | null> {
  const data = await openseaFetch<OffersResponse>(
    `/offers/collection/${encodeURIComponent(slug)}`
  );
  if (!data?.offers?.length) return null;
  let best = 0;
  for (const offer of data.offers) {
    const raw = offer.price?.value;
    const decimals = offer.price?.decimals ?? 18;
    if (!raw) continue;
    const eth = Number(raw) / 10 ** decimals;
    if (!Number.isNaN(eth) && eth > best) best = eth;
  }
  return best > 0 ? best : null;
}

function formatLaunched(createdDate: string | null | undefined): string | null {
  if (!createdDate) return null;
  const d = new Date(createdDate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * GET /api/market/collections
 * Returns every configured Wilder World collection enriched with live OpenSea
 * metadata (name, image, floor, top offer, volume, owners, supply, launch date)
 * for the industry rail and info panel. Keyed by slug on the client.
 */
export async function GET() {
  const results = await Promise.all(
    ALL_ENTRIES.map(async (c): Promise<MarketCollection> => {
      if (getEntrySource(c) === 'indexer') return buildIndexerCollection(c);
      const [detail, stats, topOfferEth] = await Promise.all([
        openseaFetch<OpenSeaCollection>(`/collections/${encodeURIComponent(c.slug)}`),
        openseaFetch<OpenSeaStats>(`/collections/${encodeURIComponent(c.slug)}/stats`),
        fetchTopOfferEth(c.slug),
      ]);
      const explorer = !detail || !stats ? await fetchExplorerCollection(c) : null;
      const quantity = collectionQuantity(detail?.total_supply, 'opensea', new Date().toISOString(), explorer?.tokenStandard ?? null)
        ?? collectionQuantity(explorer?.totalSupply, 'blockscout', explorer?.provenance.retrievedAt ?? '', explorer?.tokenStandard ?? null);
      return {
        provenance: detail ? originalProvenance('opensea',stats ? 'available' : 'unavailable') : explorer?.provenance,
        tokenStandard:explorer?.tokenStandard ?? null,
        slug: c.slug,
        name: detail?.name ?? c.name ?? c.label ?? c.slug,
        image: detail?.image_url ?? explorer?.image ?? null,
        floorPrice: stats?.total?.floor_price ?? null,
        floorSymbol: stats?.total?.floor_price_symbol ?? null,
        topOfferEth,
        totalVolume: stats?.total?.volume ?? null,
        listedCount: null,
        owners: stats?.total?.num_owners ?? explorer?.owners ?? null,
        totalSupply: quantity?.value ?? null,
        quantity,
        launched: formatLaunched(detail?.created_date) ?? c.launched ?? null,
      };
    })
  );

  return NextResponse.json({ collections: results });
}

type IndexerCollectionsResponse = {
  collections?: Array<{
    collectionAddress?: string;
    collectionName?: string;
    totalItems?: number;
    totalHolders?: number;
  }>;
};

/**
 * Z-Chain collections are browse-only. Report observed quantities separately
 * from edition caps, and distinguish ERC-1155 units from unique token designs.
 * A completed dated inventory is the last fallback for ERC-721 collections.
 */
async function buildIndexerCollection(
  c: WilderCollectionEntry
): Promise<MarketCollection> {
  const [collections, inventory] = await Promise.all([
    indexerFetch<IndexerCollectionsResponse>('/v1/inventory/collections'),
    indexerFetch<IndexerInventoryResponse>(
      `/v1/inventory?collections=${encodeURIComponent(c.contract ?? '')}`
    ),
  ]);

  const contract = (c.contract ?? '').toLowerCase();
  const detail = collections?.collections?.find(
    (col) => (col.collectionAddress ?? '').toLowerCase() === contract
  );
  const inventoryIsScoped = Array.isArray(inventory?.items) && inventory.items.every(asset => asset.collectionAddress?.toLowerCase() === contract && asset.chainId === c.chainId);
  const firstAsset = inventoryIsScoped ? inventory?.items?.[0] : undefined;
  // Even a present indexer collection can have no total; explorer also verifies
  // the token standard, which controls whether totalItems can represent supply.
  const explorer = await fetchExplorerCollection(c);
  const sealedPacks = c.chainId === 9369 && contract === '0x5ce3a764cc43e891d8bd068dd16c1b08db4ad0d4';
  const standard = sealedPacks ? 'ERC-1155' : explorer?.tokenStandard ?? firstAsset?.tokenStandard ?? null;
  const erc721 = standard?.replaceAll('-', '').toUpperCase() === 'ERC721';
  const indexerCount = validCollectionCount(detail?.totalItems) ?? (inventoryIsScoped ? validCollectionCount(inventory?.total) : null);
  const quantity = (erc721 ? collectionQuantity(indexerCount, 'indexer', new Date().toISOString(), standard) : null)
    ?? collectionQuantity(explorer?.totalSupply, 'blockscout', explorer?.provenance.retrievedAt ?? '', standard)
    ?? (standard === null || erc721 ? observedInventoryQuantity(c) : null);

  return {
    slug: c.slug,
    name: detail?.collectionName || (c.name ?? c.label ?? c.slug),
    image: resolveMediaUrl(firstAsset?.metadata?.image) ?? explorer?.image ?? null,
    floorPrice: null,
    floorSymbol: null,
    topOfferEth: null,
    totalVolume: null,
    listedCount: null,
    owners: validCollectionCount(detail?.totalHolders) ?? explorer?.owners ?? null,
    totalSupply: quantity?.value ?? null,
    quantity,
    provenance:detail ? originalProvenance('indexer') : explorer?.provenance,
    tokenStandard:standard,
    launched: c.launched ?? null,
  };
}
