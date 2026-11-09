import { useInfiniteQuery, type UseInfiniteQueryResult } from '@tanstack/react-query';
import type { OriginalDataProvenance } from '@/lib/originals-data';
import type { MarketNft } from '@/lib/opensea';
import { fetchNftsPage, fetchOriginalGroupsPage, type NftsPage } from '../api/fetchers';
import { dedupeItems } from '../lib/items';
import type { Availability, SelectedTraits } from '../types';

export type MarketNftsData = {
  traitCategories?:NftsPage['traitCategories'];
  totalProducts?:number;
  observedAt?:string;
  provenance?: OriginalDataProvenance;
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
  attributes?: SelectedTraits,
  grouping?:{enabled:boolean;query:string;sort:string}
): UseInfiniteQueryResult<MarketNftsData> {
  const active = attributes
    ? Object.fromEntries(
        Object.entries(attributes).filter(([, values]) => values.length > 0)
      )
    : {};
  const activeFilters = Object.keys(active).length > 0 ? active : null;
  return useInfiniteQuery({
    queryKey: ['market', 'nfts', slug, availability, activeFilters,...(grouping?.enabled?['grouped',grouping.query,grouping.sort]:[])],
    enabled: slug.length > 0,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      grouping?.enabled?fetchOriginalGroupsPage(slug,pageParam,activeFilters??undefined,grouping.query,grouping.sort):fetchNftsPage(slug, availability, pageParam, activeFilters ?? undefined),
    getNextPageParam: (lastPage: NftsPage) => lastPage.next ?? undefined,
    select: (data) => {
      const items = dedupeItems(data.pages.flatMap((page) => page.items));
      const prior = dedupeItems(
        data.pages.slice(0, -1).flatMap((page) => page.items)
      );
      return { items, batchBase: prior.length, provenance: data.pages.at(-1)?.provenance,totalProducts:data.pages[0]?.totalProducts,observedAt:data.pages[0]?.observedAt,traitCategories:data.pages[0]?.traitCategories };
    },
  });
}
