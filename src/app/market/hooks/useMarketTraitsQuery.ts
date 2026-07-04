import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { TraitCategory } from '@/app/api/market/traits/route';
import { fetchTraits } from '../api/fetchers';

/**
 * Live trait categories for indexer-source collections. Pass an empty slug to
 * disable the query (ETH collections use static traits and never fetch).
 */
export function useMarketTraitsQuery(slug: string): UseQueryResult<TraitCategory[]> {
  return useQuery({
    queryKey: ['market', 'traits', slug],
    queryFn: () => fetchTraits(slug),
    enabled: slug !== '',
    staleTime: 5 * 60_000,
  });
}
