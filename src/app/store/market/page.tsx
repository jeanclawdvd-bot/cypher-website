import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { WILDER_INDUSTRIES, getEntryBySlug } from '@/lib/wilderCollections';
import OriginalsBrowse from './OriginalsBrowse';
import { originalItemHref, originalItemSeed } from './originals';
import { parseOriginalTraits } from './pack-categories';

export const metadata: Metadata = { title: 'Original collections — Wilder World', description: 'Explore original Wilder World collectibles, token traits and collection provenance in Wilder World.', robots: { index: false, follow: false } };

export default async function StoreMarketPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q : '';
  const slug = typeof params.c === 'string' && getEntryBySlug(params.c) ? params.c : WILDER_INDUSTRIES[0].collections[0].slug;
  if (typeof params.token === 'string') {
    const seed = originalItemSeed(slug, params.token, typeof params.contract === 'string' ? params.contract : undefined, typeof params.chain === 'string' ? params.chain : undefined);
    if (seed) redirect(originalItemHref(slug, seed));
  }
  const grouped = ['pack-weapons', 'pack-wheels', 'pack-avatars'].includes(slug);
  return <OriginalsBrowse key={slug} initialSlug={slug} initialQuery={query} initialTraits={grouped ? parseOriginalTraits(params.attributes) : {}} initialSort={params.sort === 'name' ? 'name' : 'collection'}/>;
}
