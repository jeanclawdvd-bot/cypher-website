import { NextResponse } from 'next/server';
import { fetchExplorerPage, originalProvenance } from '@/lib/originals-data';
import {
  getEntryBySlug,
  getEntrySource,
  type WilderCollectionEntry,
} from '@/lib/wilderCollections';
import {
  hasMoreInventory,
  indexerFetch,
  normalizeIndexerAsset,
  INDEXER_GRID_LIMIT,
  type IndexerInventoryResponse,
} from '@/lib/indexer';
import {
  fetchNftsByContract,
  fetchBestListingsMap,
  fetchBestListingsPage,
  fetchNftsByIdentifiers,
  normalizeNft,
  openseaFetch,
  type BestListing,
  type MarketNft,
  type OpenSeaNft,
} from '@/lib/opensea';

export const revalidate = 300;

/**
 * GET /api/market/nfts?slug=<collection>&next=<cursor>&status=<listed|unlisted>
 *
 * - status=listed (default): drives the grid from best listings, so results are
 *   sorted cheapest-first and every item carries a price. Paginated via the
 *   listings `next` cursor; metadata is batch-resolved by token identifier.
 * - status=unlisted: enumerates the collection by contract and returns only the
 *   tokens that have no active best listing (best-effort, price is always null).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const next = searchParams.get('next');
  const status = searchParams.get('status') === 'all' ? 'all' : searchParams.get('status') === 'unlisted' ? 'unlisted' : 'listed';

  const empty: { items: MarketNft[]; next: string | null; error: boolean } = {
    items: [],
    next: null,
    error: false,
  };

  // A failed upstream fetch must be reported as an error, never as a confirmed
  // empty result: the client relies on this flag to avoid telling the user a
  // collection has no listings when OpenSea was simply unreachable.
  const fetchFailed = () =>
    NextResponse.json({ items: [], next: null, error: true }, { status: 502 });

  const entry = slug ? getEntryBySlug(slug) : undefined;
  if (!entry) return NextResponse.json(empty);

  // Catalog browsing is independent from listings: public explorer metadata is
  // safe to show when the marketplace API is not configured.
  if (status === 'all') {
    if (getEntrySource(entry) === 'indexer' && !next?.startsWith('bs:')) {
      const indexed = await handleIndexer(entry, next, fetchFailed, searchParams.get('attributes'));
      if (indexed.status === 200) return indexed;
    } else if (entry.chain === 'ethereum' && !next?.startsWith('bs:')) {
      const page = entry.contract ? await fetchNftsByContract(entry.chain,entry.contract,next) : null;
      if (page) {
        const provenance = originalProvenance('opensea');
        return NextResponse.json({items:page.nfts.filter(nft=>nft.contract?.toLowerCase()===entry.contract?.toLowerCase()).map(nft=>({...normalizeNft(nft,entry.slug,entry.chain,null),collectionSlug:entry.slug,provenance})),next:page.next,error:false,provenance});
      }
      // Never change providers halfway through another provider's cursor.
      if (next) return fetchFailed();
    }
    const page = await fetchExplorerPage(entry,next);
    if (!page) return fetchFailed();
    let items = page.items;
    if (searchParams.get('attributes')) {
      try {
        const attributes = JSON.parse(searchParams.get('attributes')!);
        if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return NextResponse.json({error:true},{status:400});
        items = items.filter(item=>Object.entries(attributes).every(([type,values])=>Array.isArray(values) && (!values.length || item.traits.some(trait=>trait.type===type && values.includes(trait.value)))));
      } catch { return NextResponse.json({error:true},{status:400}); }
    }
    return NextResponse.json({...page,items,error:false});
  }

  // Z-Chain collections are indexer-backed and browse-only: no listings, no
  // prices, no listed/unlisted distinction. Paginated via a numeric offset
  // carried in the `next` cursor; `next: null` terminates the infinite query.
  if (getEntrySource(entry) === 'indexer') {
    return handleIndexer(entry, next, fetchFailed, searchParams.get('attributes'));
  }

  if (status === 'listed') {
    const page = await fetchBestListingsPage(entry.slug, next);
    if (!page) return fetchFailed();

    // Listings are already ascending; a token can appear more than once, so
    // keep the first (cheapest) occurrence and preserve that order.
    const seen = new Set<string>();
    const ordered: BestListing[] = [];
    for (const listing of page.listings) {
      if (listing.contract && listing.contract.toLowerCase() !== entry.contract?.toLowerCase()) continue;
      if (seen.has(listing.identifier)) continue;
      seen.add(listing.identifier);
      ordered.push(listing);
    }

    const meta = await fetchNftsByIdentifiers(
      entry.chain,
      ordered.map((o) => ({
        contract: o.contract || entry.contract || '',
        identifier: o.identifier,
      }))
    );
    const metaById: Record<string, OpenSeaNft> = {};
    for (const m of meta) metaById[m.identifier] = m;

    const items: MarketNft[] = ordered.map((o) => {
      const m = metaById[o.identifier];
      if (m) return normalizeNft(m, entry.slug, entry.chain, o.priceEth);
      // Never drop a priced listing just because metadata was missing.
      return {
        identifier: o.identifier,
        name: `#${o.identifier}`,
        image: null,
        collectionSlug: entry.slug,
        contract: o.contract || entry.contract || '',
        chain: entry.chain,
        priceEth: o.priceEth,
        traits: [],
      };
    });

    return NextResponse.json({ items, next: page.next, error: false, provenance: originalProvenance('opensea','available') });
  }

  // status === 'unlisted'
  let nfts: OpenSeaNft[] = [];
  let nextCursor: string | null = null;

  if (entry.contract) {
    const data = await fetchNftsByContract(entry.chain, entry.contract, next);
    if (!data) return fetchFailed();
    nfts = data.nfts;
    nextCursor = data.next;
  } else {
    const params = new URLSearchParams({ limit: '50' });
    if (next) params.set('next', next);
    const data = await openseaFetch<{ nfts?: OpenSeaNft[]; next?: string | null }>(
      `/collection/${encodeURIComponent(entry.slug)}/nfts?${params.toString()}`
    );
    if (!data?.nfts) return fetchFailed();
    nfts = data.nfts;
    nextCursor = data.next ?? null;
  }

  if (nfts.length === 0) return NextResponse.json({ items: [], next: nextCursor, error: false });

  const priceMap = await fetchBestListingsMap(entry.slug);

  const items = nfts
    .filter((nft) => priceMap[nft.identifier] == null)
    .map((nft) => normalizeNft(nft, entry.slug, entry.chain, null));

  return NextResponse.json({ items, next: nextCursor, error: false, provenance: originalProvenance('opensea','available') });
}

async function handleIndexer(
  entry: WilderCollectionEntry,
  next: string | null,
  fetchFailed: () => NextResponse,
  attributes: string | null
) {
  const parsed = next ? parseInt(next, 10) : 0;
  const offset = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;

  // `attributes` is a JSON trait filter (e.g. {"Rarity":["Rare","Common"]});
  // the indexer applies it server-side across the whole collection.
  const data = await indexerFetch<IndexerInventoryResponse>(
    `/v1/inventory?collections=${encodeURIComponent(entry.contract ?? '')}` +
      `&limit=${INDEXER_GRID_LIMIT}&offset=${offset}` +
      (attributes ? `&attributes=${encodeURIComponent(attributes)}` : '')
  );
  if (!data) return fetchFailed();

  const items = data.items.map((asset) =>
    normalizeIndexerAsset(asset, entry.slug, entry.chain)
  );
  const nextCursor =
    data.items.length > 0 && hasMoreInventory(data, offset, INDEXER_GRID_LIMIT)
      ? String(offset + data.items.length)
      : null;
  return NextResponse.json({ items, next: nextCursor, error: false });
}
