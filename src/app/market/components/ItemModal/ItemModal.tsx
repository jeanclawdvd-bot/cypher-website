'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { MarketNft } from '@/lib/opensea';
import { getEntryBySlug, getEntrySource } from '@/lib/wilderCollections';
import { formatUsd, formatEth } from '@/lib/price';
import { FadeInImage } from '@/components/FadeInImage';
import { useItemQuery } from '../../hooks/useItemQuery';
import styles from '../../ItemModal.module.css';

type Props = {
  nft: MarketNft;
  slug: string;
  ethUsd: number | null;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
};

export function ItemModal({
  nft,
  slug,
  ethUsd,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
}: Props) {
  // Full onchain detail is loaded (and cached) via TanStack Query, keyed by the
  // token's own contract + chain — the fix for umbrella-slug "Item unavailable".
  const { data: item, status } = useItemQuery(slug, nft);
  // Z-Chain (indexer-source) items have no OpenSea presence; never render the
  // link for them (their openseaUrl is '', which is not nullish).
  const entry = getEntryBySlug(slug);
  const hideOpenSea =
    (entry != null && getEntrySource(entry) === 'indexer') ||
    (entry != null && item?.openseaUrl === '');
  const [mounted, setMounted] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [loaderVisible, setLoaderVisible] = useState(false);
  const loaderStartRef = useRef(0);

  useEffect(() => setMounted(true), []);

  // Reset media state when the active NFT changes.
  useEffect(() => {
    setVideoFailed(false);
    setVideoReady(false);
  }, [nft.identifier, nft.contract, nft.chain]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const animationUrl = item?.animationUrl ?? null;
  const showVideo = Boolean(animationUrl) && !videoFailed;

  useEffect(() => {
    if (showVideo) {
      loaderStartRef.current = Date.now();
      setLoaderVisible(true);
    } else {
      setLoaderVisible(false);
    }
  }, [showVideo, animationUrl]);

  useEffect(() => {
    if (!showVideo || !videoReady) return;
    const MIN_VISIBLE_MS = 650;
    const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - loaderStartRef.current));
    const t = setTimeout(() => setLoaderVisible(false), remaining);
    return () => clearTimeout(t);
  }, [showVideo, videoReady]);

  if (!mounted) return null;

  const priceEth = item?.priceEth ?? nft.priceEth ?? null;
  const priceUsd = formatUsd(priceEth, ethUsd);
  const image = item?.image ?? nft.image;
  const name = item?.name ?? nft.name;
  const isLoading = status === 'pending';
  const isError = status === 'error';

  return createPortal(
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <button
        className={styles.close}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
      >
        <X size={22} />
      </button>

      {hasPrev && (
        <button
          className={`${styles.nav} ${styles.navPrev}`}
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          aria-label="Previous item"
        >
          <ChevronLeft size={28} />
        </button>
      )}
      {hasNext && (
        <button
          className={`${styles.nav} ${styles.navNext}`}
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          aria-label="Next item"
        >
          <ChevronRight size={28} />
        </button>
      )}

      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.frame}>
          {showVideo ? (
            <>
              {image ? (
                <FadeInImage className={styles.image} src={image} alt={name} />
              ) : (
                <div className={styles.imageFallback} aria-hidden />
              )}
              <video
                key={animationUrl ?? undefined}
                className={`${styles.video} ${videoReady ? styles.videoReady : ''}`}
                src={animationUrl ?? undefined}
                autoPlay
                loop
                muted
                playsInline
                onCanPlay={() => setVideoReady(true)}
                onPlaying={() => setVideoReady(true)}
                onError={() => setVideoFailed(true)}
              />
              {loaderVisible && (
                <div className={styles.mediaProgress} aria-hidden>
                  <div className={styles.mediaProgressFill} />
                </div>
              )}
            </>
          ) : image ? (
            <FadeInImage className={styles.image} src={image} alt={name} />
          ) : (
            <div className={styles.imageFallback} aria-hidden />
          )}
        </div>

        <div className={styles.details}>
          {isError ? (
            <>
              <p className={styles.collectionName}>{nft.collectionSlug}</p>
              <h2 className={styles.title}>{name}</h2>
              <p className={styles.errorBody}>
                We couldn&apos;t load this item&apos;s onchain metadata right now.
              </p>
              {!hideOpenSea && (
                <a
                  className={styles.openseaLink}
                  href={`https://opensea.io/assets/${nft.chain}/${nft.contract}/${nft.identifier}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on OpenSea
                  <ArrowUpRight size={14} />
                </a>
              )}
            </>
          ) : (
            <>
              <p className={styles.collectionName}>
                {item?.collectionName ?? nft.collectionSlug}
              </p>
              <h2 className={styles.title}>{name}</h2>

              <div className={styles.priceRow}>
                <span className={styles.priceLabel}>Price</span>
                <span className={styles.priceValue}>
                  {priceUsd ?? formatEth(priceEth) ?? '—'}
                </span>
              </div>

              {!hideOpenSea && (
                <a
                  className={styles.openseaLink}
                  href={
                    item?.openseaUrl ??
                    `https://opensea.io/assets/${nft.chain}/${nft.contract}/${nft.identifier}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on OpenSea
                  <ArrowUpRight size={14} />
                </a>
              )}

              {isLoading ? (
                <div className={styles.descriptionSkeleton} aria-hidden>
                  <div className={styles.textSkeleton} style={{ width: '92%' }} />
                  <div className={styles.textSkeleton} style={{ width: '100%' }} />
                  <div className={styles.textSkeleton} style={{ width: '76%' }} />
                </div>
              ) : item?.description ? (
                <p className={`${styles.description} ${styles.fadeIn}`}>{item.description}</p>
              ) : null}

              {isLoading ? (
                <div className={styles.traitsSection}>
                  <div
                    className={styles.textSkeleton}
                    style={{ width: '30%', marginBottom: '0.6rem' }}
                    aria-hidden
                  />
                  <div className={styles.traitsGrid}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className={styles.traitSkeleton} aria-hidden />
                    ))}
                  </div>
                </div>
              ) : item && item.traits.length > 0 ? (
                <div className={`${styles.traitsSection} ${styles.fadeIn}`}>
                  <p className={styles.traitsHeading}>Traits</p>
                  <div className={styles.traitsGrid}>
                    {item.traits.map((t) => (
                      <div key={`${t.type}-${t.value}`} className={styles.trait}>
                        <span className={styles.traitType}>{t.type}</span>
                        <span className={styles.traitValue}>{t.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

