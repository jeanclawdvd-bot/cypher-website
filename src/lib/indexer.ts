/* ---------------------------------------------------------------------------
   Server-only indexer API helpers.

   The base URL and key are read from `INDEXER_API_URL` / `INDEXER_API_KEY`
   and only ever used here (inside route handlers), so they never reach the
   browser. Callers should treat missing config as an empty result rather
   than an error, mirroring the graceful fallback in `opensea.ts`.
   --------------------------------------------------------------------------- */
import type { MarketNft } from './opensea';

export const INDEXER_REVALIDATE = 300;

export function hasIndexerConfig(): boolean {
  return Boolean(process.env.INDEXER_API_URL && process.env.INDEXER_API_KEY);
}

/** Fetch a JSON endpoint from the indexer. Returns null on any failure. */
export async function indexerFetch<T>(path: string): Promise<T | null> {
  const baseUrl = process.env.INDEXER_API_URL;
  const key = process.env.INDEXER_API_KEY;
  if (!baseUrl || !key) return null;
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { 'x-api-key': key, accept: 'application/json' },
      next: { revalidate: INDEXER_REVALIDATE },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type IndexerAttribute = {
  trait_type: string;
  value: unknown;
};

export type IndexerAsset = {
  id: string;
  collectionAddress: string;
  collectionName: string;
  tokenId: string;
  ownerAddress: string;
  chainId: number;
  tokenStandard: string;
  balance: string;
  tokenUri: string | null;
  metadata: {
    name?: string;
    description?: string;
    image?: string;
    animationUrl?: string;
    attributes?: IndexerAttribute[] | null;
  } | null;
};

export type IndexerInventoryResponse = {
  items: IndexerAsset[];
  // Optional so a degraded envelope still parses; `total` is the primary
  // pagination driver, with a short-page heuristic as runtime fallback.
  total?: number;
  limit?: number;
  offset?: number;
};

/** Page size used by all inventory-paginating route handlers. */
export const INDEXER_PAGE_LIMIT = 200;

/**
 * Whether more inventory pages remain after the page just fetched. Exact when
 * the envelope carries `total`; otherwise falls back to the full-page
 * heuristic (a page shorter than the limit means the collection is exhausted).
 */
export function hasMoreInventory(
  page: IndexerInventoryResponse,
  offset: number
): boolean {
  return typeof page.total === 'number'
    ? offset + page.items.length < page.total
    : page.items.length === INDEXER_PAGE_LIMIT;
}

/**
 * Resolve a metadata media URI to a fetchable URL. Rewrites `ipfs://` (and
 * the `ipfs://ipfs/` double prefix) to a public gateway, passes http(s)
 * through unchanged, and returns null for anything else.
 */
export function resolveMediaUrl(uri: string | null | undefined): string | null {
  if (!uri) return null;
  if (uri.startsWith('ipfs://')) {
    const rest = uri.slice('ipfs://'.length).replace(/^ipfs\//, '');
    return `https://ipfs.io/ipfs/${rest}`;
  }
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;
  return null;
}

/** Convert an indexer asset to the shared `MarketNft` shape. */
export function normalizeIndexerAsset(
  asset: IndexerAsset,
  collectionSlug: string,
  chain: string
): MarketNft {
  const metadata = asset.metadata;
  return {
    identifier: asset.tokenId,
    name: metadata?.name || `#${asset.tokenId}`,
    image: resolveMediaUrl(metadata?.image),
    collectionSlug,
    contract: asset.collectionAddress,
    chain,
    // The indexer carries no listings/prices; OpenSea supplies live pricing.
    priceEth: null,
    traits: (metadata?.attributes ?? [])
      .filter((a) => Boolean(a.trait_type))
      .map((a) => ({ type: a.trait_type, value: String(a.value) })),
  };
}
