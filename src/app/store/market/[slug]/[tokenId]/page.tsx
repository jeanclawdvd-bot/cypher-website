import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import OriginalProduct from '../../OriginalProduct';
import { originalItemSeed } from '../../originals';

export const metadata: Metadata = { title: 'Original collectible — Wilder World', robots: { index: false, follow: false } };

export default async function OriginalCollectiblePage({ params, searchParams }: { params: Promise<{ slug: string; tokenId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug, tokenId } = await params;
  const search = await searchParams;
  const seed = originalItemSeed(slug, tokenId, typeof search.contract === 'string' ? search.contract : undefined, typeof search.chain === 'string' ? search.chain : undefined);
  if (!seed) notFound();
  return <OriginalProduct key={`${seed.chain}:${seed.contract}:${seed.identifier}`} seed={seed}/>;
}
