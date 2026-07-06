import { NextResponse } from 'next/server';
import {
  getEntryBySlug,
  getEntrySource,
  type WilderCollectionEntry,
} from '@/lib/wilderCollections';
import { openseaFetch } from '@/lib/opensea';
import {
  indexerFetch,
  INDEXER_TRAITS_REVALIDATE,
  type IndexerAttributeCounts,
} from '@/lib/indexer';

export const revalidate = 300;

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
 * Z-Chain collections are indexer-backed. The indexer aggregates trait counts
 * server-side in a single query, so we just map its response to the panel's
 * `categories` shape. Ordering already matches the OpenSea path (trait types
 * alphabetical, values by count desc), so it passes through. A failed fetch
 * degrades to empty categories rather than reporting wrong numbers.
 */
async function handleIndexer(entry: WilderCollectionEntry) {
  const contract = encodeURIComponent(entry.contract ?? '');

  const data = await indexerFetch<IndexerAttributeCounts>(
    `/v1/inventory/attributes/counts?collections=${contract}`,
    INDEXER_TRAITS_REVALIDATE
  );
  if (!data) return NextResponse.json({ categories: [] });

  const categories: TraitCategory[] = data.attributes.map((attribute) => ({
    type: attribute.traitType,
    values: attribute.values.map(({ value, count }) => ({ value, count })),
  }));

  return NextResponse.json({ categories });
}
