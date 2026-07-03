import { NextResponse } from 'next/server';
import {
  getEntryBySlug,
  getEntrySource,
  type WilderCollectionEntry,
} from '@/lib/wilderCollections';
import { openseaFetch } from '@/lib/opensea';
import {
  hasMoreInventory,
  indexerFetch,
  INDEXER_PAGE_LIMIT,
  type IndexerInventoryResponse,
} from '@/lib/indexer';

export const revalidate = 300;

// Defensive cap for the indexer page walk: 50 pages x 200 = 10k items.
const MAX_PAGES = 50;

export type TraitCategory = {
  type: string;
  values: Array<{ value: string; count: number }>;
};

type OpenSeaTraitsResponse = {
  // OpenSea returns: { categories: {...}, counts: { <trait_type>: { <value>: count } } }
  counts?: Record<string, Record<string, number>>;
};

/**
 * GET /api/market/traits?slug=<collection>
 * Returns aggregated trait categories + value counts for a collection so the
 * market can render an OpenSea-style trait filter panel.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const entry = slug ? getEntryBySlug(slug) : undefined;
  if (!entry) return NextResponse.json({ categories: [] });

  if (getEntrySource(entry) === 'indexer') return handleIndexer(entry);

  const data = await openseaFetch<OpenSeaTraitsResponse>(
    `/traits/${encodeURIComponent(entry.slug)}`
  );

  if (!data?.counts) return NextResponse.json({ categories: [] });

  const categories: TraitCategory[] = Object.entries(data.counts)
    .map(([type, values]) => ({
      type,
      values: Object.entries(values)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => a.type.localeCompare(b.type));

  return NextResponse.json({ categories });
}

/**
 * The indexer has no traits endpoint, so aggregate value counts across every
 * asset's metadata attributes — walking all inventory pages so counts cover
 * the full collection. Same sort order as the OpenSea path: values by count
 * desc, trait types alphabetical. A failed page mid-walk means the counts
 * would be silently wrong, so it degrades to the empty shape instead.
 */
async function handleIndexer(entry: WilderCollectionEntry) {
  const contract = encodeURIComponent(entry.contract ?? '');

  const counts = new Map<string, Map<string, number>>();
  let offset = 0;
  let exhausted = false;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await indexerFetch<IndexerInventoryResponse>(
      `/v1/inventory?collections=${contract}&limit=${INDEXER_PAGE_LIMIT}&offset=${offset}`
    );
    if (!data) return NextResponse.json({ categories: [] });

    for (const asset of data.items) {
      for (const attr of asset.metadata?.attributes ?? []) {
        if (!attr.trait_type) continue;
        const value = String(attr.value);
        const values = counts.get(attr.trait_type) ?? new Map<string, number>();
        values.set(value, (values.get(value) ?? 0) + 1);
        counts.set(attr.trait_type, values);
      }
    }

    // An empty page cannot advance the offset; treat it as exhaustion even if
    // a stale `total` claims otherwise.
    if (data.items.length === 0 || !hasMoreInventory(data, offset)) {
      exhausted = true;
      break;
    }
    offset += data.items.length;
  }

  // Hitting the page cap means the counts would be silently truncated —
  // degrade to empty rather than report wrong numbers.
  if (!exhausted) return NextResponse.json({ categories: [] });

  const categories: TraitCategory[] = Array.from(counts.entries())
    .map(([type, values]) => ({
      type,
      values: Array.from(values.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => a.type.localeCompare(b.type));

  return NextResponse.json({ categories });
}
