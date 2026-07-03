import { NextResponse } from 'next/server';
import {
  getEntryBySlug,
  getEntrySource,
  type WilderCollectionEntry,
} from '@/lib/wilderCollections';
import {
  hasMoreInventory,
  indexerFetch,
  resolveMediaUrl,
  INDEXER_PAGE_LIMIT,
  type IndexerAsset,
  type IndexerInventoryResponse,
} from '@/lib/indexer';
import {
  fetchNftByContract,
  fetchBestListingsMap,
  openseaFetch,
  type OpenSeaCollection,
  type OpenSeaNft,
} from '@/lib/opensea';

export const revalidate = 300;

// Defensive cap for the indexer page walk: 50 pages x 200 = 10k items.
const MAX_PAGES = 50;

export type MarketItem = {
  identifier: string;
  name: string;
  image: string | null;
  animationUrl: string | null;
  description: string | null;
  collectionSlug: string;
  collectionName: string;
  traits: Array<{ type: string; value: string }>;
  priceEth: number | null;
  openseaUrl: string;
};

/**
 * GET /api/market/item?slug=<collection>&identifier=<tokenId>&contract=&chain=
 *
 * Resolves full metadata for a single NFT. The previous implementation looked
 * up the collection by slug and then picked the *first* contract, which was
 * wrong for umbrella slugs (e.g. `wilderworld`) and produced "Item
 * unavailable". We now resolve directly by the token's own contract + chain
 * (passed from the grid, with the configured contract as a fallback).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const identifier = searchParams.get('identifier');
  const contractParam = searchParams.get('contract');
  const chainParam = searchParams.get('chain');

  const entry = slug ? getEntryBySlug(slug) : undefined;
  if (!entry || !identifier) {
    return NextResponse.json({ item: null }, { status: 400 });
  }

  if (getEntrySource(entry) === 'indexer') return handleIndexer(entry, identifier);

  const chain = chainParam || entry.chain;
  let contract = contractParam || entry.contract || null;

  // Last-resort: resolve a contract from the collection detail.
  let detail: OpenSeaCollection | null = null;
  if (!contract) {
    detail = await openseaFetch<OpenSeaCollection>(
      `/collections/${encodeURIComponent(entry.slug)}`
    );
    const contractEntry =
      detail?.contracts?.find((c) => c.chain === chain) ?? detail?.contracts?.[0];
    contract = contractEntry?.address ?? null;
  }

  if (!contract) {
    return NextResponse.json({ item: null }, { status: 404 });
  }

  const nft: OpenSeaNft | null = await fetchNftByContract(chain, contract, identifier);
  if (!nft) {
    return NextResponse.json({ item: null }, { status: 404 });
  }

  const priceMap = await fetchBestListingsMap(entry.slug);

  const item: MarketItem = {
    identifier: nft.identifier,
    name: nft.name || `${entry.label ?? entry.slug} #${nft.identifier}`,
    image: nft.display_image_url || nft.image_url || null,
    animationUrl: nft.display_animation_url || nft.animation_url || null,
    description: nft.description ?? null,
    collectionSlug: entry.slug,
    collectionName: detail?.name ?? entry.label ?? entry.slug,
    traits: (nft.traits ?? []).map((t) => ({
      type: t.trait_type,
      value: String(t.value),
    })),
    priceEth: priceMap[nft.identifier] ?? null,
    openseaUrl:
      nft.opensea_url ||
      `https://opensea.io/assets/${chain}/${contract}/${nft.identifier}`,
  };

  return NextResponse.json({ item });
}

/**
 * Z-Chain items come from the indexer inventory. No trading yet, so
 * `priceEth` is always null and `openseaUrl` is '' (no explorer to link).
 */
async function handleIndexer(entry: WilderCollectionEntry, identifier: string) {
  const contract = encodeURIComponent(entry.contract ?? '');

  // Walk inventory pages until the token appears; the collection may hold
  // thousands of items. Capped defensively so a misbehaving API cannot loop.
  let asset: IndexerAsset | undefined;
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await indexerFetch<IndexerInventoryResponse>(
      `/v1/inventory?collections=${contract}&limit=${INDEXER_PAGE_LIMIT}&offset=${offset}`
    );
    if (!data) break;
    asset = data.items.find((a) => a.tokenId === identifier);
    // An empty page cannot advance the offset; treat it as exhaustion even if
    // a stale `total` claims otherwise.
    if (asset || data.items.length === 0 || !hasMoreInventory(data, offset)) break;
    offset += data.items.length;
  }
  if (!asset) return NextResponse.json({ item: null }, { status: 404 });

  const metadata = asset.metadata;
  const item: MarketItem = {
    identifier: asset.tokenId,
    name: metadata?.name || `${entry.label ?? entry.slug} #${asset.tokenId}`,
    image: resolveMediaUrl(metadata?.image),
    animationUrl: resolveMediaUrl(metadata?.animationUrl),
    description: metadata?.description ?? null,
    collectionSlug: entry.slug,
    collectionName: asset.collectionName || (entry.label ?? entry.slug),
    traits: (metadata?.attributes ?? [])
      .filter((t) => Boolean(t.trait_type))
      .map((t) => ({ type: t.trait_type, value: String(t.value) })),
    priceEth: null,
    openseaUrl: '',
  };

  return NextResponse.json({ item });
}
