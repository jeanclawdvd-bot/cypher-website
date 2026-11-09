export type MarketSearchParams = Record<string, string | string[] | undefined>;

/** Preserve collection/item deep links when moving the existing market into Supply. */
export function storeMarketUrl(params: MarketSearchParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach(item => search.append(key, item));
    else if (value !== undefined) search.set(key, value);
  }
  return `/store/market${search.size ? '?' + search.toString() : ''}`;
}

/** Keep the current route and search text while moving between collections/items. */
export function marketNavigationSearch(search: string, collection: string, token?: string): string {
  const params = new URLSearchParams(search);
  params.set('c', collection);
  if (token !== undefined) params.set('token', token);
  else params.delete('token');
  // A token's contract/chain belong to that token and must not leak to another.
  params.delete('contract');
  params.delete('chain');
  return '?' + params.toString();
}
