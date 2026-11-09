'use client';
import ProductRating from '@/sites/wilderworld/marketplace/ProductRating';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ChevronRight, RotateCcw } from 'lucide-react';
import type { MarketNft } from '@/lib/opensea';
import { getEntryBySlug, getEntrySource } from '@/lib/wilderCollections';
import { useItemQuery } from '@/app/market/hooks/useItemQuery';
import { useEthPriceQuery } from '@/app/market/hooks/useEthPriceQuery';
import { configuredTokenIdentity } from '@/app/market/lib/items';
import { formatEth, formatUsd } from '@/lib/price';
import { MarketHeader } from '@/sites/wilderworld/marketplace/Marketplace';
import ProductMarketPanel from '@/sites/wilderworld/marketplace/ProductMarketPanel';
import ProductReviews from '@/sites/wilderworld/marketplace/ProductReviews';
import { originalCollectionEyebrow, originalCollectionName } from './originals';
import typography from '@/components/SectionHeader.module.css';
import styles from './originals.module.css';

function safeExternal(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : undefined; } catch { return undefined; }
}

export default function OriginalProduct({ seed }: { seed: MarketNft }) {
  const entry = getEntryBySlug(seed.collectionSlug)!;
  const result = useItemQuery(entry.slug, seed);
  const item = result.data;
  const { data: ethUsd = null } = useEthPriceQuery();
  const [media, setMedia] = useState<'image' | 'motion'>('image');
  const [failed, setFailed] = useState(false);
  const identity = configuredTokenIdentity(seed);
  const name = item?.name ?? seed.name;
  const collection = originalCollectionName(entry);
  const isIndexer = getEntrySource(entry) === 'indexer';
  const productId = `legacy:${identity?.chainId ?? seed.chain}:${seed.contract.toLowerCase()}:${seed.identifier}`;
  const collectionHref = `/store/market?c=${encodeURIComponent(entry.slug)}`;
  const opensea = !isIndexer ? `https://opensea.io/assets/${encodeURIComponent(seed.chain)}/${seed.contract}/${seed.identifier}` : undefined;
  const video = safeExternal(item?.animationUrl);

  return <main className={styles.page}>
    <MarketHeader department="existing" collectionSlug={entry.slug}/>
    <div className={styles.content}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Wilder World</Link><ChevronRight size={12}/><Link href={collectionHref}>{collection}</Link><ChevronRight size={12}/><span>{name}</span></nav>
      <div className={styles.productLayout}>
        <section className={styles.gallery} aria-label="Collectible images">
          <div className={styles.productMedia} data-product-hero>
            {result.isLoading ? <span className={styles.mediaMissing}>Loading collectible…</span> : media === 'motion' && video && !failed ? <video src={video} controls autoPlay muted loop playsInline poster={item?.image ?? undefined} onError={() => { setFailed(false); setMedia('image'); }}/> : item?.image ? <img src={item.image} alt={name} onError={event => { event.currentTarget.style.display = 'none'; setFailed(true); }}/>: <span className={styles.mediaMissing}>Artwork unavailable</span>}
            {failed && media === 'image' && <span className={styles.mediaMissing}>Media could not load</span>}
            <span className={styles.mediaTag}>Original collectible</span>
          </div>
          {video && <div className={styles.galleryTabs}><button aria-pressed={media === 'image'} onClick={() => setMedia('image')}>Artwork</button><button aria-pressed={media === 'motion'} onClick={() => { setFailed(false); setMedia('motion'); }}>Motion</button></div>}
        </section>
        <section className={styles.productInfo} aria-label="Collectible details">
          <Link href={collectionHref} className={styles.kicker}>{originalCollectionEyebrow(entry)}</Link>
          <h1 className={typography.title}>{name}</h1>
          <ProductRating productId={productId} variantIds={[seed.identifier]}/>
          <div className={styles.priceBlock}><p>Current listing</p><strong>{formatEth(item?.priceEth ?? null) ?? 'Live price unavailable'}</strong>{formatUsd(item?.priceEth ?? null, ethUsd) && <small>{formatUsd(item?.priceEth ?? null, ethUsd)}</small>}</div>
          {result.isError ? <div className={styles.itemError} role="status"><p>We couldn’t load this item’s details. Please try again.</p><button onClick={() => { void result.refetch(); }}><RotateCcw size={14}/> Retry details</button></div> : item?.description ? <p className={styles.productDescription}>{item.description}</p> : <p className={styles.productDescription}>{result.isLoading ? 'Loading item details…' : entry.blurb}</p>}
          <div className={styles.purchaseActions}>{opensea && <a className={styles.primary} href={opensea} target="_blank" rel="noopener noreferrer">View on OpenSea <ArrowUpRight size={17}/></a>}<Link href={collectionHref} className={styles.secondary}>Back to {collection}<ArrowUpRight size={16}/></Link></div>
          <p className={styles.purchaseNote}>An existing collectible from the original Wilder World collection.</p>
        </section>
      </div>
      <section className={styles.productDetails} aria-labelledby="collectible-specifications"><header><p className={styles.kicker}>The details</p><h2 id="collectible-specifications" className={typography.title}>Made for your collection</h2></header>
        <div className={styles.detailColumns}>
          <div><h3>Item details</h3>{item?.traits.length ? <dl className={styles.traits}>{item.traits.map((trait, i) => <div key={`${trait.type}:${trait.value}:${i}`}><dt>{trait.type}</dt><dd>{trait.value}</dd></div>)}</dl> : <p>{result.isLoading ? 'Loading details…' : 'No verified details are available for this item yet.'}</p>}</div>
          <div className={styles.collectibleNotes}><h3>In Wilder World</h3><p>{entry.blurb}</p><p>In-game use depends on the original collection’s supported features and your linked ownership. Owning this item does not by itself confirm that every feature is enabled in the current game build.</p><h3>Original edition</h3><p>Part of an existing collection, with its original edition and release history.</p></div>
        </div>
      </section>
      <div className={styles.productMarket}><ProductMarketPanel productId={productId} variantId={seed.identifier} variantName={`${name} · Original collectible`} identity={identity}/><ProductReviews preview productId={productId} variantId={seed.identifier} variantName={name} variantOptions={[{ id: seed.identifier, name }]}/></div>
    </div>
  </main>;
}
