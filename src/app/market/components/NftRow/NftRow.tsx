import { ArrowUpRight } from 'lucide-react';
import type { MarketNft } from '@/lib/opensea';
import { formatUsd, formatEth } from '@/lib/price';
import { FadeInImage } from '@/components/FadeInImage';
import { shortId } from '../../lib/items';
import { getEntryBySlug, getEntrySource } from '@/lib/wilderCollections';
import styles from '../../market.module.css';

type Props = {
  nft: MarketNft;
  ethUsd: number | null;
  onOpen: (id: string) => void;
};

export function NftRow({ nft, ethUsd, onOpen }: Props) {
  const price = formatUsd(nft.priceEth, ethUsd) ?? formatEth(nft.priceEth) ?? '—';
  const collection = getEntryBySlug(nft.collectionSlug);
  const supportsOpenSea = Boolean(collection && getEntrySource(collection) === 'opensea' && nft.chain === collection.chain);
  return (
    <div
      className={styles.row}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(nft.identifier)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(nft.identifier);
        }
      }}
    >
      <div className={styles.rowItem}>
        <div className={styles.rowThumb}>
          {nft.image ? (
            <FadeInImage
              className={styles.rowThumbImg}
              src={nft.image}
              alt={nft.name}
              loading="lazy"
            />
          ) : (
            <div className={styles.rowThumbFallback} aria-hidden />
          )}
        </div>
        <span className={styles.rowName}>{nft.name}</span>
      </div>
      <span className={`${styles.colToken} ${styles.rowMuted}`} title={`#${nft.identifier}`}>
        #{shortId(nft.identifier)}
      </span>
      <span className={`${styles.colTraits} ${styles.rowMuted}`}>{nft.traits.length}</span>
      <span className={`${styles.colPrice} ${styles.rowPrice}`}>{price}</span>
      <span className={styles.colAction}>
        {supportsOpenSea ? <a
          className={styles.buyLink}
          href={`https://opensea.io/assets/${nft.chain}/${nft.contract}/${nft.identifier}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          View market
          <ArrowUpRight size={13} />
        </a> : <span className={styles.rowMuted}>Browse only</span>}
      </span>
    </div>
  );
}
