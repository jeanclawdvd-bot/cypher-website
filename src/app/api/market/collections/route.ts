import { NextResponse } from 'next/server';
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
      return {
        slug: c.slug,
        name: detail?.name ?? c.label ?? c.slug,
        image: detail?.image_url ?? null,
        floorPrice: stats?.total?.floor_price ?? null,
        floorSymbol: stats?.total?.floor_price_symbol ?? null,
        topOfferEth,
        totalVolume: stats?.total?.volume ?? null,
        listedCount: null,
        owners: stats?.total?.num_owners ?? null,
        totalSupply: detail?.total_supply ?? null,
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
 * Z-Chain collections are indexer-backed and browse-only: no floor / offers /
 * volume / owners stats. Name + supply come from the indexer collections
 * endpoint when available, the card image from the first asset. Any indexer
 * failure degrades to config-only nulls — never rejects the whole response.
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
  const firstAsset = inventory?.items?.[0];

  return {
    slug: c.slug,
    name: detail?.collectionName || (c.label ?? c.slug),
    image: resolveMediaUrl(firstAsset?.metadata?.image),
    floorPrice: null,
    floorSymbol: null,
    topOfferEth: null,
    totalVolume: null,
    listedCount: null,
    owners: null,
    totalSupply: detail?.totalItems ?? null,
    launched: c.launched ?? null,
  };
}
