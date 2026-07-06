import type { MarketNft } from '@/lib/opensea';
import type { MarketCollection } from '@/app/api/market/collections/route';
import type { MarketItem } from '@/app/api/market/item/route';
import type { TraitCategory } from '@/app/api/market/traits/route';
import type { Availability, SelectedTraits } from '../types';

export type NftsPage = {
  items: MarketNft[];
  next: string | null;
};

/** Thrown when a market route handler reports an upstream failure. */
export class MarketFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MarketFetchError';
  }
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new MarketFetchError(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchCollections(): Promise<Record<string, MarketCollection>> {
  const data = await getJson('/api/market/collections');
  const collections =
    data && typeof data === 'object' && 'collections' in data
      ? (data as { collections?: MarketCollection[] }).collections
      : undefined;
  const byId: Record<string, MarketCollection> = {};
  for (const c of collections ?? []) byId[c.slug] = c;
  return byId;
}

export async function fetchEthPrice(): Promise<number | null> {
  const data = await getJson('/api/market/eth-price');
  if (data && typeof data === 'object' && 'usd' in data) {
    const usd = (data as { usd?: number | null }).usd;
    return typeof usd === 'number' ? usd : null;
  }
  return null;
}

export async function fetchNftsPage(
  slug: string,
  availability: Availability,
  next: string | null,
  attributes?: SelectedTraits
): Promise<NftsPage> {
  const params = new URLSearchParams({ slug, status: availability });
  if (next) params.set('next', next);
  // Server-side trait filter for indexer collections: forward only the
  // selected values (drop empty types) as a JSON attribute filter.
  const active = attributes
    ? Object.fromEntries(
        Object.entries(attributes).filter(([, values]) => values.length > 0)
      )
    : {};
  if (Object.keys(active).length > 0) {
    params.set('attributes', JSON.stringify(active));
  }
  const data = await getJson(`/api/market/nfts?${params.toString()}`);
  const parsed = (data ?? {}) as {
    items?: MarketNft[];
    next?: string | null;
    error?: boolean;
  };
  // An upstream failure must never be shown as "no listed items"; surface it as
  // an error so the empty-state copy stays truthful.
  if (parsed.error) throw new MarketFetchError('Upstream NFT data unavailable');
  return { items: parsed.items ?? [], next: parsed.next ?? null };
}

export async function fetchTraits(slug: string): Promise<TraitCategory[]> {
  const data = await getJson(`/api/market/traits?slug=${encodeURIComponent(slug)}`);
  const categories =
    data && typeof data === 'object' && 'categories' in data
      ? (data as { categories?: TraitCategory[] }).categories
      : undefined;
  return categories ?? [];
}

export async function fetchItem(args: {
  slug: string;
  identifier: string;
  contract?: string;
  chain?: string;
}): Promise<MarketItem> {
  const params = new URLSearchParams({ slug: args.slug, identifier: args.identifier });
  if (args.contract) params.set('contract', args.contract);
  if (args.chain) params.set('chain', args.chain);
  const data = await getJson(`/api/market/item?${params.toString()}`);
  const item =
    data && typeof data === 'object' && 'item' in data
      ? (data as { item?: MarketItem | null }).item
      : null;
  if (!item) throw new MarketFetchError('Item metadata unavailable');
  return item;
}
