import { useInfiniteQuery, type UseInfiniteQueryResult } from '@tanstack/react-query';
import type { MarketNft } from '@/lib/opensea';
import { fetchNftsPage, type NftsPage } from '../api/fetchers';
import { dedupeItems } from '../lib/items';
import type { Availability, SelectedTraits } from '../types';

export type MarketNftsData = {
  items: MarketNft[];
  /** Index where the most recently loaded page begins, so only new cards
   *  stagger in on "load more" (not the whole list). */
  batchBase: number;
};

/**
 * Cursor-based infinite query for a collection's NFTs. Keying by
 * `[slug, availability, attributes]` gives each collection — and each active
 * trait-filter combination — its own cache entry, so switching collections or
 * filters never mixes items or replays a stale cursor. `attributes` are the
 * server-side trait filter for indexer collections (pass undefined for the
 * client-side ETH path); only non-empty selections affect the key.
 */
export function useMarketNftsQuery(
  slug: string,
  availability: Availability,
  attributes?: SelectedTraits
): UseInfiniteQueryResult<MarketNftsData> {
  const active = attributes
    ? Object.fromEntries(
        Object.entries(attributes).filter(([, values]) => values.length > 0)
      )
    : {};
  const activeFilters = Object.keys(active).length > 0 ? active : null;
  return useInfiniteQuery({
    queryKey: ['market', 'nfts', slug, availability, activeFilters],
    enabled: slug.length > 0,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      fetchNftsPage(slug, availability, pageParam, activeFilters ?? undefined),
    getNextPageParam: (lastPage: NftsPage) => lastPage.next ?? undefined,
    select: (data) => {
      const items = dedupeItems(data.pages.flatMap((page) => page.items));
      const prior = dedupeItems(
        data.pages.slice(0, -1).flatMap((page) => page.items)
      );
      return { items, batchBase: prior.length };
    },
  });
}
