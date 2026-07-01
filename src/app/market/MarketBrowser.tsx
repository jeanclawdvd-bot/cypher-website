'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown, Grid2x2, Grid3x3, LayoutGrid } from 'lucide-react';
import type { WilderIndustry } from '@/lib/wilderCollections';
import type { MarketNft } from '@/lib/opensea';
import type { MarketCollection } from '@/app/api/market/collections/route';
import type { TraitCategory } from '@/app/api/market/traits/route';
import { formatUsd, formatEth } from '@/lib/price';
import { FadeInImage } from '@/components/FadeInImage';
import { AnimatedHeight } from '@/components/AnimatedHeight';
import { CustomScrollbar } from '@/components/CustomScrollbar';
import ItemModal from './ItemModal';
import styles from './market.module.css';

type Props = { industries: WilderIndustry[] };

type SelectedTraits = Record<string, Set<string>>;

export default function MarketBrowser({ industries }: Props) {
  const allEntries = useMemo(
    () => industries.flatMap((i) => i.collections),
    [industries]
  );
  const firstSlug = allEntries[0]?.slug ?? '';

  const [activeSlug, setActiveSlug] = useState(firstSlug);
  const [meta, setMeta] = useState<Record<string, MarketCollection>>({});
  const [ethUsd, setEthUsd] = useState<number | null>(null);

  const [items, setItems] = useState<MarketNft[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const [selected, setSelected] = useState<SelectedTraits>({});
  const [openTraitGroups, setOpenTraitGroups] = useState<Record<string, boolean>>({});

  // The filter panel renders from this lagging view rather than the raw fetch
  // state: the previous collection's filters stay visible until the new ones
  // are ready, then slug + cats update together so the crossfade and height
  // tween fire in the same beat (no collapse-to-empty flash).
  const [filterView, setFilterView] = useState<{ slug: string; cats: TraitCategory[] }>(
    { slug: '', cats: [] }
  );

  const [openNav, setOpenNav] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLElement | null>(null);

  const [gridSize, setGridSize] = useState<'lg' | 'md' | 'sm'>('md');

  // Index at which the most recently loaded batch starts, so each page of
  // results staggers in one-at-a-time relative to itself (not the whole list).
  const batchBaseRef = useRef(0);

  const [modalId, setModalId] = useState<string | null>(null);

  const activeEntry = allEntries.find((c) => c.slug === activeSlug);
  const activeIndustry = industries.find((i) =>
    i.collections.some((c) => c.slug === activeSlug)
  );
  const activeMeta = meta[activeSlug];

  /* ----- One-time enrichment: collection stats + ETH price ---------------- */
  useEffect(() => {
    let alive = true;
    fetch('/api/market/collections')
      .then((r) => r.json())
      .then((d: { collections?: MarketCollection[] }) => {
        if (!alive || !d.collections) return;
        const byId: Record<string, MarketCollection> = {};
        for (const c of d.collections) byId[c.slug] = c;
        setMeta(byId);
      })
      .catch(() => {});
    fetch('/api/market/eth-price')
      .then((r) => r.json())
      .then((d: { usd?: number | null }) => {
        if (alive) setEthUsd(d.usd ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  /* ----- Remember the preferred grid density ------------------------------ */
  useEffect(() => {
    const saved = localStorage.getItem('market-grid-size');
    if (saved === 'lg' || saved === 'md' || saved === 'sm') setGridSize(saved);
  }, []);

  const changeGridSize = useCallback((size: 'lg' | 'md' | 'sm') => {
    setGridSize(size);
    try {
      localStorage.setItem('market-grid-size', size);
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, []);

  /* ----- Sync active collection + modal from the URL (back button) -------- */
  useEffect(() => {
    const apply = () => {
      const p = new URLSearchParams(window.location.search);
      const c = p.get('c');
      const token = p.get('token');
      if (c && allEntries.some((e) => e.slug === c)) setActiveSlug(c);
      setModalId(token);
    };
    apply();
    window.addEventListener('popstate', apply);
    return () => window.removeEventListener('popstate', apply);
  }, [allEntries]);

  /* ----- Load the first page whenever the active collection changes ------- */
  useEffect(() => {
    if (!activeSlug) return;
    let alive = true;
    setLoading(true);
    setError(false);
    setItems([]);
    setNext(null);
    setSelected({});
    batchBaseRef.current = 0;
    fetch(`/api/market/nfts?slug=${encodeURIComponent(activeSlug)}`)
      .then((r) => r.json())
      .then((d: { items?: MarketNft[]; next?: string | null }) => {
        if (!alive) return;
        if (!d.items || d.items.length === 0) setError(true);
        setItems(d.items ?? []);
        setNext(d.next ?? null);
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [activeSlug]);

  /* ----- Load trait categories for the filter panel ----------------------- */
  useEffect(() => {
    if (!activeSlug) return;
    let alive = true;
    // Keep the current filters on screen while the new ones load; only swap
    // the displayed view once data arrives to avoid a mid-transition collapse.
    fetch(`/api/market/traits?slug=${encodeURIComponent(activeSlug)}`)
      .then((r) => r.json())
      .then((d: { categories?: TraitCategory[] }) => {
        if (!alive) return;
        setOpenTraitGroups({});
        setFilterView({ slug: activeSlug, cats: d.categories ?? [] });
      })
      .catch(() => {
        if (alive) setFilterView({ slug: activeSlug, cats: [] });
      });
    return () => {
      alive = false;
    };
  }, [activeSlug]);

  const loadMore = useCallback(() => {
    if (!next || loadingMore) return;
    setLoadingMore(true);
    fetch(
      `/api/market/nfts?slug=${encodeURIComponent(activeSlug)}&next=${encodeURIComponent(next)}`
    )
      .then((r) => r.json())
      .then((d: { items?: MarketNft[]; next?: string | null }) => {
        setItems((prev) => {
          batchBaseRef.current = prev.length;
          return [...prev, ...(d.items ?? [])];
        });
        setNext(d.next ?? null);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [next, loadingMore, activeSlug]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !next) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '600px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [next, loadMore]);

  /* ----- Close the nav dropdown on outside click / Escape ----------------- */
  useEffect(() => {
    if (!openNav) return;
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenNav(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenNav(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openNav]);

  /* ----- Collection switching: update URL + scroll to top ----------------- */
  const selectCollection = useCallback(
    (slug: string) => {
      setOpenNav(null);
      if (slug === activeSlug) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setActiveSlug(slug);
      window.history.replaceState({}, '', `?c=${slug}`);
      window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [activeSlug]
  );

  /* ----- Client-side trait filtering over loaded items -------------------- */
  const filtered = useMemo(() => {
    const active = Object.entries(selected).filter(([, v]) => v.size > 0);
    if (active.length === 0) return items;
    return items.filter((nft) =>
      active.every(([type, values]) =>
        nft.traits.some((t) => t.type === type && values.has(t.value))
      )
    );
  }, [items, selected]);

  const toggleTrait = useCallback((type: string, value: string) => {
    setSelected((prev) => {
      const nextSet = new Set(prev[type] ?? []);
      if (nextSet.has(value)) nextSet.delete(value);
      else nextSet.add(value);
      return { ...prev, [type]: nextSet };
    });
  }, []);

  const selectedCount = useMemo(
    () => Object.values(selected).reduce((n, s) => n + s.size, 0),
    [selected]
  );

  /* ----- Item modal navigation ------------------------------------------- */
  const modalIndex = modalId ? filtered.findIndex((n) => n.identifier === modalId) : -1;
  const modalNft = modalIndex >= 0 ? filtered[modalIndex] : null;

  const gridClass = `${styles.grid} ${
    gridSize === 'lg' ? styles.gridLg : gridSize === 'sm' ? styles.gridSm : ''
  }`;

  const openModal = useCallback(
    (id: string, { replace = false }: { replace?: boolean } = {}) => {
      setModalId(id);
      const url = `?c=${activeSlug}&token=${id}`;
      const state = { token: id };
      // Opening from the grid pushes a single history entry; navigating the
      // carousel replaces it so closing always returns straight to the grid.
      if (replace) window.history.replaceState(state, '', url);
      else window.history.pushState(state, '', url);
    },
    [activeSlug]
  );

  const closeModal = useCallback(() => {
    if (window.history.state?.token) window.history.back();
    else {
      setModalId(null);
      window.history.replaceState({}, '', `?c=${activeSlug}`);
    }
  }, [activeSlug]);

  const goPrev = useCallback(() => {
    if (modalIndex > 0) openModal(filtered[modalIndex - 1].identifier, { replace: true });
  }, [modalIndex, filtered, openModal]);

  const goNext = useCallback(() => {
    if (modalIndex >= 0 && modalIndex < filtered.length - 1) {
      openModal(filtered[modalIndex + 1].identifier, { replace: true });
    } else if (next) {
      loadMore();
    }
  }, [modalIndex, filtered, openModal, next, loadMore]);

  return (
    <>
      {/* ---- Top bar: title + horizontal collection navigation ---- */}
      <div className={styles.topbar}>
        <h1 className={styles.headerTitle}>Wilder Market</h1>
        <nav className={styles.nav} ref={navRef} aria-label="Collections">
          {industries.map((industry) => {
            const isActiveIndustry = industry.collections.some((c) => c.slug === activeSlug);
            if (industry.collections.length === 1) {
              const c = industry.collections[0];
              return (
                <button
                  key={industry.id}
                  type="button"
                  className={`${styles.navItem} ${
                    isActiveIndustry ? styles.navItemActive : ''
                  }`}
                  onClick={() => selectCollection(c.slug)}
                >
                  {industry.name}
                </button>
              );
            }
            const open = openNav === industry.id;
            return (
              <div key={industry.id} className={styles.navGroup}>
                <button
                  type="button"
                  className={`${styles.navItem} ${
                    isActiveIndustry ? styles.navItemActive : ''
                  }`}
                  onClick={() => setOpenNav(open ? null : industry.id)}
                  aria-expanded={open}
                >
                  {industry.name}
                  <ChevronDown size={13} className={open ? styles.chevOpen : styles.chev} />
                </button>
                {open && (
                  <div className={styles.navMenu}>
                    {industry.collections.map((c) => (
                      <button
                        key={c.slug}
                        type="button"
                        className={`${styles.navMenuItem} ${
                          c.slug === activeSlug ? styles.navMenuItemActive : ''
                        }`}
                        onClick={() => selectCollection(c.slug)}
                      >
                        {c.label ?? industry.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className={styles.sizeToggle} role="group" aria-label="Grid size">
          <button
            type="button"
            className={`${styles.sizeBtn} ${gridSize === 'lg' ? styles.sizeBtnActive : ''}`}
            onClick={() => changeGridSize('lg')}
            aria-label="Large grid"
            aria-pressed={gridSize === 'lg'}
          >
            <Grid2x2 size={16} />
          </button>
          <button
            type="button"
            className={`${styles.sizeBtn} ${gridSize === 'md' ? styles.sizeBtnActive : ''}`}
            onClick={() => changeGridSize('md')}
            aria-label="Medium grid"
            aria-pressed={gridSize === 'md'}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            className={`${styles.sizeBtn} ${gridSize === 'sm' ? styles.sizeBtnActive : ''}`}
            onClick={() => changeGridSize('sm')}
            aria-label="Small grid"
            aria-pressed={gridSize === 'sm'}
          >
            <Grid3x3 size={16} />
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        {/* ---- Left rail: filters + info ---- */}
        <aside className={styles.rail} ref={railRef}>
          <div className={styles.panel}>
            <div className={styles.filtersHead}>
              <p className={styles.railHeading}>Filters</p>
              {selectedCount > 0 && (
                <button className={styles.clearBtn} onClick={() => setSelected({})}>
                  Clear ({selectedCount})
                </button>
              )}
            </div>
            <AnimatedHeight innerClassName={styles.panelInner} motionKey={filterView.slug}>
              {filterView.slug === '' ? null : filterView.cats.length === 0 ? (
                <p className={styles.filtersEmpty}>No trait filters available.</p>
              ) : (
                <div className={styles.traitGroups}>
                  {filterView.cats.map((cat) => {
                    const open = openTraitGroups[cat.type] ?? false;
                    return (
                      <div key={cat.type} className={styles.traitGroup}>
                        <button
                          className={styles.traitGroupHead}
                          onClick={() =>
                            setOpenTraitGroups((p) => ({ ...p, [cat.type]: !open }))
                          }
                        >
                          <span>{cat.type}</span>
                          <ChevronDown
                            size={14}
                            className={open ? styles.chevOpen : styles.chev}
                          />
                        </button>
                        {open && (
                          <div className={styles.traitValues}>
                            {cat.values.map((v) => {
                              const checked = selected[cat.type]?.has(v.value) ?? false;
                              return (
                                <label key={v.value} className={styles.traitValue}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleTrait(cat.type, v.value)}
                                  />
                                  <span className={styles.traitValueLabel}>{v.value}</span>
                                  <span className={styles.traitValueCount}>{v.count}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </AnimatedHeight>
          </div>

          {/* Info panel */}
          <div className={styles.panel}>
            <AnimatedHeight innerClassName={styles.panelInner} motionKey={activeSlug}>
            <p className={styles.railHeading}>
              {activeMeta?.name ?? activeEntry?.label ?? activeIndustry?.name ?? 'Collection'}
            </p>
            <div className={styles.info}>
              <InfoRow label="Launched" value={activeMeta?.launched ?? activeEntry?.launched ?? '—'} />
              <InfoRow
                label="Floor Price"
                value={
                  formatUsd(activeMeta?.floorPrice ?? null, ethUsd) ??
                  formatEth(activeMeta?.floorPrice ?? null) ??
                  '—'
                }
              />
              <InfoRow
                label="Top Offer"
                value={
                  formatUsd(activeMeta?.topOfferEth ?? null, ethUsd) ??
                  formatEth(activeMeta?.topOfferEth ?? null) ??
                  '—'
                }
              />
              <InfoRow
                label="Total Volume"
                value={
                  formatUsd(activeMeta?.totalVolume ?? null, ethUsd) ??
                  formatEth(activeMeta?.totalVolume ?? null) ??
                  '—'
                }
              />
              <InfoRow
                label="Listed"
                value={activeMeta?.listedCount != null ? String(activeMeta.listedCount) : '—'}
              />
              <InfoRow
                label="Owners (Unique)"
                value={activeMeta?.owners != null ? activeMeta.owners.toLocaleString() : '—'}
              />
            </div>
            {activeEntry && (
              <a
                className={styles.railOpensea}
                href={`https://opensea.io/collection/${activeEntry.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on OpenSea
                <ArrowUpRight size={12} />
              </a>
            )}
            </AnimatedHeight>
          </div>

          <CustomScrollbar targetRef={railRef} showOnHoverOnly />
        </aside>

        {/* ---- Center: NFT grid ---- */}
        <div className={styles.main}>
          {loading ? (
            <div className={gridClass}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className={styles.skeleton} aria-hidden />
              ))}
            </div>
          ) : error ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>No items to display</p>
              <p className={styles.emptyBody}>
                Live NFT data is unavailable right now. Check that the OpenSea API key is
                configured, or view the collection directly on OpenSea.
              </p>
              {activeEntry && (
                <a
                  className={styles.emptyLink}
                  href={`https://opensea.io/collection/${activeEntry.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open on OpenSea
                  <ArrowUpRight size={14} />
                </a>
              )}
            </div>
          ) : (
            <>
              <div className={gridClass}>
                {filtered.map((nft, i) => {
                  const priceUsd = formatUsd(nft.priceEth, ethUsd);
                  // One-at-a-time reveal within the current batch; capped so a
                  // large page never leaves off-screen cards waiting too long.
                  const within = Math.max(0, i - batchBaseRef.current);
                  const delayMs = Math.min(within, 40) * 45;
                  return (
                    <button
                      key={`${nft.contract}-${nft.identifier}`}
                      type="button"
                      className={styles.card}
                      style={{ animationDelay: `${delayMs}ms` }}
                      onClick={() => openModal(nft.identifier)}
                    >
                      <div className={styles.cardImageWrap}>
                        {nft.image ? (
                          <FadeInImage
                            className={styles.cardImage}
                            src={nft.image}
                            alt={nft.name}
                            loading="lazy"
                          />
                        ) : (
                          <div className={styles.cardImageFallback} aria-hidden />
                        )}
                      </div>
                      <div className={styles.cardBody}>
                        <span className={styles.cardName}>{nft.name}</span>
                        {priceUsd && <span className={styles.cardPrice}>{priceUsd}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
              {next && (
                <div ref={sentinelRef} className={styles.loadMoreRow}>
                  <button
                    type="button"
                    className={styles.loadMore}
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {modalNft && (
        <ItemModal
          nft={modalNft}
          slug={activeSlug}
          ethUsd={ethUsd}
          hasPrev={modalIndex > 0}
          hasNext={modalIndex < filtered.length - 1 || Boolean(next)}
          onPrev={goPrev}
          onNext={goNext}
          onClose={closeModal}
        />
      )}
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}
