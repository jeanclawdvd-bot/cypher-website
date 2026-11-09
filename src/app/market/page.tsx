import { redirect } from 'next/navigation';
import { storeMarketUrl, type MarketSearchParams } from './lib/store-links';

export default async function MarketPage({ searchParams }: { searchParams: Promise<MarketSearchParams> }) {
  redirect(storeMarketUrl(await searchParams));
}
