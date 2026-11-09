import { redirect } from 'next/navigation';
import { originalItemHref, originalItemSeed } from '@/app/store/market/originals';
import { notFound } from 'next/navigation';

/**
 * Preserve original marketplace bookmarks while using the native store product page.
 */
export default async function MarketItemRedirect({
  params,
}: {
  params: Promise<{ slug: string; tokenId: string }>;
}) {
  const { slug, tokenId } = await params;
  const seed = originalItemSeed(slug, tokenId);
  if (!seed) notFound();
  redirect(originalItemHref(slug, seed));
}
