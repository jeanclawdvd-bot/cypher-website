'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { WilderIndustry } from '@/lib/wilderCollections';
import { getEntrySource } from '@/lib/wilderCollections';
import { getStaticTraits } from '@/lib/wilderTraits';
import { AnimatedPanel } from '@/components/AnimatedPanel';
import { CustomScrollbar } from '@/components/CustomScrollbar';
import { useMarketStore } from './store/marketStore';
import { useCollectionsQuery } from './hooks/useCollectionsQuery';
import { useEthPriceQuery } from './hooks/useEthPriceQuery';
import { useMarketNftsQuery } from './hooks/useMarketNftsQuery';
import { useMarketTraitsQuery } from './hooks/useMarketTraitsQuery';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useInfiniteScroll } from './hooks/useInfiniteScroll';
import { useMarketUrlSync } from './hooks/useMarketUrlSync';
import { countSelectedTraits, filterByTraits } from './lib/items';
import type { Availability } from './types';
import { CollectionNav } from './components/CollectionNav';
import { MobileCollectionMenu } from './components/MobileCollectionMenu';
import { MarketToolbar } from './components/MarketToolbar';
import { MarketFilters } from './components/MarketFilters';
import { FiltersDrawer } from './components/FiltersDrawer';
import { CollectionInfoPanel } from './components/CollectionInfoPanel';
import { NftGrid } from './components/NftGrid';
import { NftList } from './components/NftList';
import { MarketSkeleton } from './components/MarketSkeleton';
import { MarketEmptyState } from './components/MarketEmptyState';
import { LoadMoreSentinel } from './components/LoadMoreSentinel';
import { ItemModal } from './components/ItemModal';
import styles from './market.module.css';

type Props = { industries: WilderIndustry[] };

export default function MarketBrowser({ industries }: Props) {
  const allEntries = useMemo(
    () => industries.flatMap((i) => i.collections),
    [industries]
  );
  const validSlugs = useMemo(() => allEntries.map((e) => e.slug), [allEntries]);
  const firstSlug = allEntries[0]?.slug ?? '';

  /* ----- UI state (zustand) ---------------------------------------------- */
  const activeSlug = useMarketStore((s) => s.activeSlug);
  const availability = useMarketStore((s) => s.availability);
  const selectedTraits = useMarketStore((s) => s.selectedTraits);
  const openTraitGroups = useMarketStore((s) => s.openTraitGroups);
  const gridSize = useMarketStore((s) => s.gridSize);
  const viewMode = useMarketStore((s) => s.viewMode);
  const modalId = useMarketStore((s) => s.modalId);
  const filtersOpen = useMarketStore((s) => s.filtersOpen);
  const collectionMenuOpen = useMarketStore((s) => s.collectionMenuOpen);
  const openNavGroup = useMarketStore((s) => s.openNavGroup);

  const setAvailability = useMarketStore((s) => s.setAvailability);
  const toggleTrait = useMarketStore((s) => s.toggleTrait);
  const clearTraits = useMarketStore((s) => s.clearTraits);
  const toggleTraitGroup = useMarketStore((s) => s.toggleTraitGroup);
  const setGridSize = useMarketStore((s) => s.setGridSize);
  const setViewMode = useMarketStore((s) => s.setViewMode);
  const setFiltersOpen = useMarketStore((s) => s.setFiltersOpen);
  const setCollectionMenuOpen = useMarketStore((s) => s.setCollectionMenuOpen);
  const setOpenNavGroup = useMarketStore((s) => s.setOpenNavGroup);

  /* ----- URL <-> store sync + navigation controls ------------------------ */
  const { navigateCollection, openModal, closeModal } = useMarketUrlSync(
    validSlugs,
    firstSlug
  );

  /* ----- Server data (TanStack Query) ------------------------------------ */
  const { data: meta } = useCollectionsQuery();
  const { data: ethUsd = null } = useEthPriceQuery();
  const activeEntry = allEntries.find((c) => c.slug === activeSlug);
  const isIndexerSource =
    activeEntry != null && getEntrySource(activeEntry) === 'indexer';

  // Indexer collections filter server-side across the whole collection, so the
  // trait selections drive the query. ETH keeps filtering client-side over the
  // loaded page, so it passes no attributes here.
  const {
    data: nftsData,
    isLoading,
    isError,
    hasNextPage = false,
    isFetchingNextPage,
    fetchNextPage,
  } = useMarketNftsQuery(
    activeSlug,
    availability,
    isIndexerSource ? selectedTraits : undefined
  );

  const items = nftsData?.items ?? [];
  const batchBase = nftsData?.batchBase ?? 0;

  const staticTraits = useMemo(() => getStaticTraits(activeSlug), [activeSlug]);
  const { data: indexerTraits } = useMarketTraitsQuery(isIndexerSource ? activeSlug : '');
  const traitCategories = isIndexerSource ? (indexerTraits ?? []) : staticTraits;
  // Indexer results are already trait-filtered server-side; ETH filters the
  // loaded page client-side.
  const filtered = useMemo(
    () =>
      isIndexerSource ? items : filterByTraits(items, selectedTraits),
    [isIndexerSource, items, selectedTraits]
  );
  const selectedCount = countSelectedTraits(selectedTraits);

  const activeIndustry = industries.find((i) =>
    i.collections.some((c) => c.slug === activeSlug)
  );
  const activeMeta = meta?.[activeSlug];
  const collectionName =
    activeMeta?.name ?? activeEntry?.label ?? activeIndustry?.name ?? 'Collection';

  /* ----- Layout refs ------------------------------------------------------ */
  const navRef = useRef<HTMLElement | null>(null);
  const railRef = useRef<HTMLElement | null>(null);
  const collRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const isMobile = useMediaQuery('(max-width: 820px)');

  const loadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  useInfiniteScroll(sentinelRef, {
    hasNextPage,
    isFetching: isFetchingNextPage,
    onLoadMore: loadMore,
  });

  /* ----- Availability change: refetch (via key) + scroll to top ---------- */
  const changeAvailability = useCallback(
    (value: Availability) => {
      if (value === availability) return;
      setAvailability(value);
      window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [availability, setAvailability]
  );

  /* ----- Nav dropdown: close on outside click / Escape ------------------- */
  useEffect(() => {
    if (!openNavGroup) return;
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenNavGroup(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenNavGroup(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openNavGroup, setOpenNavGroup]);

  /* ----- Mobile collection dropdown: close on outside click / Escape ----- */
  useEffect(() => {
    if (!collectionMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (collRef.current && !collRef.current.contains(e.target as Node)) {
        setCollectionMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCollectionMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [collectionMenuOpen, setCollectionMenuOpen]);

  /* ----- Mobile filters drawer: close on Escape -------------------------- */
  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFiltersOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [filtersOpen, setFiltersOpen]);

  /* ----- Tidy up mobile-only overlays when leaving the mobile layout ----- */
  useEffect(() => {
    if (!isMobile) {
      setFiltersOpen(false);
      setCollectionMenuOpen(false);
    }
  }, [isMobile, setFiltersOpen, setCollectionMenuOpen]);

  /* ----- Item modal navigation ------------------------------------------- */
  const modalIndex = modalId ? filtered.findIndex((n) => n.identifier === modalId) : -1;
  const modalNft = modalIndex >= 0 ? filtered[modalIndex] : null;

  const goPrev = useCallback(() => {
    if (modalIndex > 0) openModal(filtered[modalIndex - 1].identifier, { replace: true });
  }, [modalIndex, filtered, openModal]);

  const goNext = useCallback(() => {
    if (modalIndex >= 0 && modalIndex < filtered.length - 1) {
      openModal(filtered[modalIndex + 1].identifier, { replace: true });
    } else if (hasNextPage) {
      loadMore();
    }
  }, [modalIndex, filtered, openModal, hasNextPage, loadMore]);

  /* ----- Derived view flags ---------------------------------------------- */
  const showSkeleton = activeSlug === '' || isLoading;
  // A live floor price means the collection has at least one active listing, so
  // an empty "listed" result there is almost certainly a fetch hiccup rather
  // than a truly empty collection. Don't claim "no listed items" in that case.
  const floorSuggestsListings =
    availability === 'listed' && (activeMeta?.floorPrice ?? 0) > 0;
  const showUnavailable = isError || (items.length === 0 && floorSuggestsListings);

  const filters = (
    <MarketFilters
      activeSlug={activeSlug}
      availability={availability}
      showAvailability={!isIndexerSource}
      traitCategories={traitCategories}
      selectedTraits={selectedTraits}
      openTraitGroups={openTraitGroups}
      selectedCount={selectedCount}
      onAvailabilityChange={changeAvailability}
      onToggleTrait={toggleTrait}
      onToggleGroup={toggleTraitGroup}
      onClear={clearTraits}
    />
  );

  const emptyCopy =
    items.length === 0
      ? availability === 'listed'
        ? {
            title: 'No items currently listed',
            body: 'Nothing in this collection is listed for sale right now. Try the Unlisted filter or browse on OpenSea.',
          }
        : {
            title: 'No unlisted items found',
            body: 'Every token in this collection appears to be listed. Switch back to the Listed filter to see them.',
          }
      : {
          title: 'No items match your filters',
          body: 'Try clearing or adjusting the selected trait filters.',
        };

  return (
    <>
      <div className={styles.topbar}>
        <div className={styles.titleRow}>
          <h1 className={styles.headerTitle}>Wilder Market</h1>
          <MobileCollectionMenu
            industries={industries}
            entries={allEntries}
            activeSlug={activeSlug}
            label={collectionName}
            open={collectionMenuOpen}
            menuRef={collRef}
            onToggle={() => setCollectionMenuOpen(!collectionMenuOpen)}
            onSelect={navigateCollection}
          />
        </div>

        <CollectionNav
          industries={industries}
          activeSlug={activeSlug}
          openNavGroup={openNavGroup}
          navRef={navRef}
          onToggleNavGroup={setOpenNavGroup}
          onSelect={navigateCollection}
        />

        <MarketToolbar
          gridSize={gridSize}
          viewMode={viewMode}
          selectedCount={selectedCount}
          filtersOpen={filtersOpen}
          onOpenFilters={() => setFiltersOpen(true)}
          onGridSize={setGridSize}
          onShowList={() => setViewMode('list')}
        />
      </div>

      <div className={styles.layout}>
        <aside className={styles.rail} ref={railRef}>
          {!isMobile && (
            <AnimatedPanel
              className={styles.panel}
              bodyClassName={styles.panelBody}
              measureDeps={[activeSlug, openTraitGroups]}
            >
              {filters}
            </AnimatedPanel>
          )}

          <AnimatedPanel
            className={styles.panel}
            bodyClassName={styles.panelBody}
            measureDeps={[activeSlug, activeMeta]}
          >
            <CollectionInfoPanel
              name={collectionName}
              launched={activeMeta?.launched ?? activeEntry?.launched ?? null}
              floorPrice={activeMeta?.floorPrice ?? null}
              topOfferEth={activeMeta?.topOfferEth ?? null}
              totalVolume={activeMeta?.totalVolume ?? null}
              listedCount={activeMeta?.listedCount ?? null}
              owners={activeMeta?.owners ?? null}
              ethUsd={ethUsd}
              openseaSlug={isIndexerSource ? undefined : activeEntry?.slug}
            />
          </AnimatedPanel>

          <CustomScrollbar targetRef={railRef} showOnHoverOnly />
        </aside>

        <div className={styles.main}>
          {showSkeleton ? (
            <MarketSkeleton viewMode={viewMode} gridSize={gridSize} />
          ) : showUnavailable ? (
            <MarketEmptyState
              title="No items to display"
              body={
                isIndexerSource
                  ? 'Live data is unavailable right now. Please try again shortly.'
                  : 'Live NFT data is unavailable right now. Check that the OpenSea API key is configured, or view the collection directly on OpenSea.'
              }
              openseaSlug={isIndexerSource ? undefined : activeEntry?.slug}
            />
          ) : filtered.length === 0 ? (
            <MarketEmptyState
              title={emptyCopy.title}
              body={emptyCopy.body}
              openseaSlug={
                isIndexerSource || items.length !== 0
                  ? undefined
                  : activeEntry?.slug
              }
            />
          ) : (
            <>
              {viewMode === 'list' ? (
                <NftList items={filtered} ethUsd={ethUsd} onOpen={openModal} />
              ) : (
                <NftGrid
                  items={filtered}
                  gridSize={gridSize}
                  ethUsd={ethUsd}
                  batchBase={batchBase}
                  onOpen={openModal}
                />
              )}
              {hasNextPage && (
                <LoadMoreSentinel
                  sentinelRef={sentinelRef}
                  loadingMore={isFetchingNextPage}
                  onLoadMore={loadMore}
                />
              )}
            </>
          )}
        </div>
      </div>

      {isMobile && filtersOpen && (
        <FiltersDrawer onClose={() => setFiltersOpen(false)}>{filters}</FiltersDrawer>
      )}

      {modalNft && (
        <ItemModal
          nft={modalNft}
          slug={activeSlug}
          ethUsd={ethUsd}
          hasPrev={modalIndex > 0}
          hasNext={modalIndex < filtered.length - 1 || hasNextPage}
          onPrev={goPrev}
          onNext={goNext}
          onClose={closeModal}
        />
      )}
    </>
  );
}
