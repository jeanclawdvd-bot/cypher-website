'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Grid2X2, List, SlidersHorizontal, X } from 'lucide-react';
import { WILDER_INDUSTRIES, getEntryBySlug, getEntrySource } from '@/lib/wilderCollections';
import { getStaticTraits } from '@/lib/wilderTraits';
import { formatEth, formatUsd } from '@/lib/price';
import { useCollectionsQuery } from '@/app/market/hooks/useCollectionsQuery';
import { useEthPriceQuery } from '@/app/market/hooks/useEthPriceQuery';
import { useMarketNftsQuery } from '@/app/market/hooks/useMarketNftsQuery';
import { useMarketTraitsQuery } from '@/app/market/hooks/useMarketTraitsQuery';
import { useInfiniteScroll } from '@/app/market/hooks/useInfiniteScroll';
import { countSelectedTraits, filterByTraits, itemKey, searchLoadedItems } from '@/app/market/lib/items';
import { MarketFilters } from '@/app/market/components/MarketFilters';
import type { Availability, SelectedTraits } from '@/app/market/types';
import type { MarketNft } from '@/lib/opensea';
import { MarketHeader } from '@/sites/wilderworld/marketplace/Marketplace';
import { useMobileFilterDialog } from '@/sites/wilderworld/marketplace/useMobileFilterDialog';
import { originalCollectionArtwork, originalCollectionEyebrow, originalCollectionName, originalItemHref, originalPackPresentation } from './originals';
import { packCategories, packOptionSelected, selectPackCategory } from './pack-categories';
import typography from '@/components/SectionHeader.module.css';
import styles from './originals.module.css';

/** Scroll only this row: scrollIntoView would also move the surrounding page. */
export function PackCategoryRow({ label, revealKey, secondary = false, children }: { label: string; revealKey: string; secondary?: boolean; children: ReactNode }) {
  const id = useId();
  const rowRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ previous: false, next: false });

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const updateEdges = () => {
      const maximum = Math.max(0, row.scrollWidth - row.clientWidth);
      const previous = maximum > 1 && row.scrollLeft > 1;
      const next = maximum > 1 && row.scrollLeft < maximum - 1;
      setEdges(current => current.previous === previous && current.next === next ? current : { previous, next });
    };
    const revealSelected = () => {
      const selected = row.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
      if (selected && row.clientWidth > 0) {
        const viewport = row.getBoundingClientRect();
        const button = selected.getBoundingClientRect();
        const padding = 4;
        let delta = 0;
        if (button.left < viewport.left + padding || button.width > row.clientWidth - padding * 2) delta = button.left - viewport.left - padding;
        else if (button.right > viewport.right - padding) delta = button.right - viewport.right + padding;
        if (delta) row.scrollTo({ left: Math.max(0, Math.min(row.scrollWidth - row.clientWidth, row.scrollLeft + delta)), behavior: 'instant' });
      }
      updateEdges();
    };
    revealSelected();
    row.addEventListener('scroll', updateEdges, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(revealSelected);
    observer?.observe(row);
    for (const button of row.children) observer?.observe(button);
    window.addEventListener('resize', revealSelected);
    return () => {
      row.removeEventListener('scroll', updateEdges);
      observer?.disconnect();
      window.removeEventListener('resize', revealSelected);
    };
  }, [revealKey]);

  const scroll = (direction: -1 | 1) => {
    const row = rowRef.current;
    if (!row) return;
    const left = Math.max(0, Math.min(row.scrollWidth - row.clientWidth, row.scrollLeft + direction * Math.max(80, row.clientWidth * 0.8)));
    row.scrollTo({ left, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };

  return <div className={`${styles.quickScroller} ${secondary ? styles.quickSubtypes : ''}`}>
    <button type="button" className={styles.quickArrow} aria-label={`Scroll ${label.toLowerCase()} left`} aria-controls={id} disabled={!edges.previous} onClick={() => scroll(-1)}><ChevronLeft size={18} aria-hidden="true"/></button>
    <div ref={rowRef} id={id} className={styles.quickRow} role="group" aria-label={label} aria-describedby="pack-category-counts">{children}</div>
    <button type="button" className={styles.quickArrow} aria-label={`Scroll ${label.toLowerCase()} right`} aria-controls={id} disabled={!edges.next} onClick={() => scroll(1)}><ChevronRight size={18} aria-hidden="true"/></button>
  </div>;
}

export function OriginalCard({ item, slug, ethUsd }: { item: MarketNft; slug: string; ethUsd: number | null }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [item.image]);
  const entry = getEntryBySlug(slug);
  const price = formatEth(item.priceEth);
  return <article className={styles.card}>
    <Link className={styles.cardMedia} href={originalItemHref(slug, item)} aria-label={`View ${item.name}`}>
      {item.image && !failed ? <img src={item.image} alt={item.name} loading="lazy" onError={() => setFailed(true)}/> : <span className={styles.mediaMissing}>Artwork unavailable</span>}
    </Link>
    <div className={styles.cardCopy}><p className={styles.kicker}>{entry ? originalCollectionName(entry) : 'Wilder World'}</p>
      <h2><Link href={originalItemHref(slug, item)}>{item.name}</Link></h2>
      <p className={styles.tokenLabel}>{item.productGroup ? `${item.productGroup.editionCount} versions · ${item.productGroup.observedCount.toLocaleString()} copies recorded` : "Original edition"}</p>
      <div className={styles.cardBottom}><span>{price ? <><strong>{price}</strong>{formatUsd(item.priceEth, ethUsd) && <small>{formatUsd(item.priceEth, ethUsd)}</small>}</> : 'View collectible'}</span><ArrowUpRight size={16}/></div>
    </div>
  </article>;
}

export default function OriginalsBrowse({ initialSlug, initialQuery = '', initialTraits = {}, initialSort = 'collection' }: { initialSlug: string; initialQuery?: string; initialTraits?: SelectedTraits; initialSort?: string }) {
  const entry = getEntryBySlug(initialSlug)!;
  const [query, setQuery] = useState(initialQuery);
  const [availability, setAvailability] = useState<Availability>('all');
  const [traits, setTraits] = useState<SelectedTraits>(initialTraits);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState('grid');
  const [sort, setSort] = useState(initialSort === 'name' ? 'name' : 'collection');
  const { data: collections } = useCollectionsQuery();
  const { data: ethUsd = null } = useEthPriceQuery();
  const indexer = getEntrySource(entry) === 'indexer';
  const grouped = ['pack-weapons','pack-wheels','pack-avatars'].includes(entry.slug);
  const quickCategories = useMemo(() => packCategories(entry.slug, traits), [entry.slug, traits]);
  const result = useMarketNftsQuery(entry.slug, availability, indexer ? traits : undefined, grouped?{enabled:true,query,sort}:undefined);
  const { data: remoteTraits } = useMarketTraitsQuery(indexer ? entry.slug : '');
  const items = result.data?.items ?? [];
  const loadedTraits = useMemo(() => {
    const counts = new Map<string, Map<string, number>>();
    for (const item of items) for (const trait of item.traits) { const values = counts.get(trait.type) ?? new Map<string, number>(); values.set(trait.value, (values.get(trait.value) ?? 0) + 1); counts.set(trait.type, values); }
    return [...counts].map(([type, values]) => ({ type, values: [...values].map(([value, count]) => ({ value, count })) }));
  }, [items]);
  const categories = grouped && result.data?.traitCategories ? result.data.traitCategories : indexer ? remoteTraits?.length ? remoteTraits : loadedTraits : getStaticTraits(entry.slug);
  const filtered = useMemo(() => {
    const found = grouped ? [...items] : searchLoadedItems(filterByTraits(items, traits), query);
    return sort === 'name' ? found.sort((a, b) => a.name.localeCompare(b.name)) : found;
  }, [items, traits, grouped, query, sort]);
  const meta = collections?.[entry.slug];
  const presentation = originalPackPresentation(entry);
  const name = presentation?.title ?? (meta?.name && meta.name !== entry.slug ? meta.name : originalCollectionName(entry));
  const artwork = originalCollectionArtwork(entry);
  const sentinel = useRef<HTMLDivElement>(null);
  const filterPanel = useRef<HTMLElement>(null);
  const filterTrigger = useRef<HTMLButtonElement>(null);
  const filterBackdrop = useRef<HTMLButtonElement>(null);
  const filterId = useId();
  const mobileFilters = useMobileFilterDialog({ open: filtersOpen, onClose: () => setFiltersOpen(false), panel: filterPanel, trigger: filterTrigger, backdrop: filterBackdrop, breakpoint: 820 });
  const modalFiltersOpen = filtersOpen && mobileFilters;
  const selectedCount = countSelectedTraits(traits);
  const loadMore = () => { void result.fetchNextPage(); };
  useInfiniteScroll(sentinel, { hasNextPage: Boolean(result.hasNextPage), isFetching: result.isFetchingNextPage, onLoadMore: loadMore });
  useEffect(() => {
    const url = new URL(window.location.href); url.searchParams.set('c', entry.slug);
    if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
    const activeTraits = Object.fromEntries(Object.entries(traits).filter(([, values]) => values.length));
    if (grouped && Object.keys(activeTraits).length) url.searchParams.set('attributes', JSON.stringify(activeTraits)); else url.searchParams.delete('attributes');
    if (sort === 'name') url.searchParams.set('sort', sort); else url.searchParams.delete('sort');
    window.history.replaceState(null, '', url);
  }, [query, entry.slug, traits, grouped, sort]);
  const toggleTrait = (type: string, value: string) => setTraits(current => ({ ...current, [type]: current[type]?.includes(value) ? current[type].filter(v => v !== value) : [...current[type] ?? [], value] }));
  const collectionHref = (slug: string) => `/store/market?${new URLSearchParams({ c: slug, ...(query ? { q: query } : {}) }).toString()}`;

  return <main className={styles.page}>
    <MarketHeader department="existing" collectionSlug={entry.slug} query={query} onQueryChange={setQuery}/>
    <div className={styles.content}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Wilder World</Link><ChevronRight size={12}/><span>Originals</span><ChevronRight size={12}/><span>{name}</span></nav>
      <header className={`${styles.collectionHero} ${presentation ? styles.packHero : ''}`}>
        <div className={styles.heroCopy}><p className={styles.kicker}>{presentation?.eyebrow ?? originalCollectionEyebrow(entry)}</p><h1 className={typography.title}>{name}</h1><p className={styles.description} title={presentation?.description} tabIndex={presentation?0:undefined}>{presentation?.description ?? entry.blurb ?? 'Discover the original collectibles of Wilder World.'}</p>
          <div className={styles.collectionMeta}>{(meta?.launched ?? entry.launched) && <span>Est. {meta?.launched ?? entry.launched}</span>}<span>Existing editions</span></div>
        </div>
        {artwork && <div className={styles.collectionArt}><img src={artwork} alt={`${name} collection artwork`}/></div>}
      </header>
      <div className={styles.collectionStats}>
        {meta?.totalSupply != null && <div><span>{meta.quantity?.kind==='erc1155-units'?'Packs in circulation':meta.quantity?.source==='inventory-snapshot'?'Items recorded':'Collection supply'}</span><strong>{meta.totalSupply.toLocaleString()}</strong></div>}
        {meta?.owners != null && <div><span>Owners</span><strong>{meta.owners.toLocaleString()}</strong></div>}
        {meta?.floorPrice != null && <div><span>Floor price</span><strong>{meta.floorPrice} {meta.floorSymbol ?? 'ETH'}</strong></div>}
        <p>{grouped?'Explore each item, compare editions, and find your next addition.':'Browse the original collection.'}</p>
        {!indexer && <a href={`https://opensea.io/collection/${encodeURIComponent(entry.slug)}`} target="_blank" rel="noopener noreferrer">Collection on OpenSea <ArrowUpRight size={14}/></a>}
      </div>
      <div className={styles.browseLayout}>
        {modalFiltersOpen && <button ref={filterBackdrop} tabIndex={-1} type="button" className={styles.filterBackdrop} aria-label="Close filters" onClick={() => setFiltersOpen(false)}/>}
        <aside id={filterId} ref={filterPanel} tabIndex={-1} hidden={mobileFilters&&!filtersOpen} className={`${styles.sidebar} ${modalFiltersOpen ? styles.sidebarOpen : ''}`} aria-label="Collection filters" role={modalFiltersOpen ? 'dialog' : undefined} aria-modal={modalFiltersOpen ? true : undefined} onClick={event=>{if(modalFiltersOpen&&event.target instanceof Element&&event.target.closest('a[href]'))setFiltersOpen(false);}}>
          <div className={styles.sidebarHeading}><h2>Collections</h2><button aria-label="Close collection filters" onClick={() => setFiltersOpen(false)}><X size={18}/></button></div>
          <nav aria-label="Original collections">{WILDER_INDUSTRIES.map(industry => <div key={industry.id} className={styles.collectionGroup}><p>{industry.name}</p>{industry.collections.map(collection => <Link key={collection.id} href={collectionHref(collection.slug)} aria-current={collection.slug === entry.slug ? 'page' : undefined}>{originalCollectionName(collection)}<ChevronRight size={12}/></Link>)}</div>)}</nav>
          <div className={styles.traitFilters}><MarketFilters activeSlug={entry.slug} availability={availability} showAvailability={false} traitCategories={categories} selectedTraits={traits} openTraitGroups={openGroups} selectedCount={selectedCount} onAvailabilityChange={setAvailability} onToggleTrait={toggleTrait} onToggleGroup={type => setOpenGroups(current => ({ ...current, [type]: !current[type] }))} onClear={() => setTraits({})}/></div>
        </aside>
        <section className={styles.results} aria-label={`${name} collectibles`}>
          {quickCategories && <section className={styles.quickCategories} aria-labelledby="pack-categories-heading">
            <div className={styles.quickHeading}><h2 id="pack-categories-heading">Shop by category</h2><p id="pack-category-counts">Counts are recorded copies</p></div>
            <PackCategoryRow label={quickCategories.label} revealKey={JSON.stringify([entry.slug, traits, quickCategories.primary.map(option => option.id)])}>
              <button aria-pressed={!quickCategories.managed.some(type => traits[type]?.length)} onClick={() => setTraits(current => selectPackCategory(entry.slug, current))}>All items <span>{quickCategories.total.toLocaleString()}</span></button>
              {quickCategories.primary.map(option => <button key={option.id} aria-pressed={packOptionSelected(option, traits)} onClick={() => setTraits(current => selectPackCategory(entry.slug, current, option))}>{option.label} <span>{option.count.toLocaleString()}</span></button>)}
            </PackCategoryRow>
            <PackCategoryRow label="Item subtype" secondary revealKey={JSON.stringify([entry.slug, traits, quickCategories.secondary.map(option => option.id)])}>
              <button aria-pressed={!quickCategories.managed.some(type => type !== quickCategories.primaryTrait && traits[type]?.length)} onClick={() => setTraits(current => selectPackCategory(entry.slug, current, undefined, true))}>All types <span>{quickCategories.scopedCount.toLocaleString()}</span></button>
              {quickCategories.secondary.map(option => <button key={option.id} aria-pressed={packOptionSelected(option, traits)} onClick={() => setTraits(current => selectPackCategory(entry.slug, current, option))}>{option.label} <span>{option.count.toLocaleString()}</span></button>)}
            </PackCategoryRow>
          </section>}
          <div className={styles.toolbar}><button ref={filterTrigger} className={styles.mobileFilters} onClick={() => setFiltersOpen(true)} aria-expanded={modalFiltersOpen} aria-controls={filterId} aria-haspopup="dialog"><SlidersHorizontal size={16}/> Collections & filters</button><p aria-live="polite">{result.isLoading ? 'Loading collection…' : grouped?`${result.data?.totalProducts ?? filtered.length} products · ${filtered.length} shown`:`${filtered.length} items loaded`}</p>
            {!indexer && <select aria-label="Availability" value={availability} onChange={e => setAvailability(e.target.value as Availability)}><option value="all">All items</option><option value="listed">Listed for sale</option><option value="unlisted">Unlisted</option></select>}
            <select aria-label="Sort collectibles" value={sort} onChange={e => setSort(e.target.value)}><option value="collection">Collection order</option><option value="name">Name: A–Z</option></select>
            <div className={styles.viewToggle}><button aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><Grid2X2 size={16}/></button><button aria-label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={17}/></button></div>
          </div>
          {result.data?.provenance?.marketData === 'unavailable' && <p className={styles.sourceNote}>Live listings are coming soon.</p>}
          {grouped && result.data?.observedAt && <p className={styles.sourceNote}>Source inventory recorded {new Date(result.data.observedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})}. Live listings are coming soon.</p>}
          {!grouped && indexer && !remoteTraits?.length && loadedTraits.length > 0 && <p className={styles.sourceNote}>Trait filters reflect the items loaded so far.</p>}
          {(query || selectedCount > 0) && <div className={styles.filterSummary}><span>{query ? `“${query}” · ` : ''}{selectedCount ? `${selectedCount} trait filters · ` : ''}Matching items</span><button onClick={() => { setQuery(''); setTraits({}); }}>Clear filters <X size={12}/></button></div>}
          {result.isLoading ? <div className={styles.grid} aria-label="Loading collectibles">{Array.from({ length: 6 }, (_, i) => <div key={i} className={styles.skeleton}/>)}</div> : result.isError ? <div className={styles.empty}><p className={styles.kicker}>Collection connection</p><h2>Inventory is unavailable</h2><p>We couldn’t retrieve this collection’s items. The collection identity is preserved; listings and ownership are shown only when their source is available.</p><button onClick={() => { void result.refetch(); }}>Try again <ArrowRight size={16}/></button></div> : filtered.length ? <div className={`${styles.grid} ${view === 'list' ? styles.list : ''}`}>{filtered.map(item => <OriginalCard key={itemKey(item)} item={item} slug={entry.slug} ethUsd={ethUsd}/>)}</div> : <div className={styles.empty}><h2>{query || selectedCount ? grouped ? 'No matching products' : 'No matches in loaded items' : 'No items returned'}</h2><p>{query || selectedCount ? grouped ? 'Try another category, name or trait, or clear your filters.' : 'Try another name, token ID or trait, or load more of the collection.' : 'Try another availability filter or collection.'}</p></div>}
          <div ref={sentinel} className={styles.loadMore}>{result.hasNextPage && <button disabled={result.isFetchingNextPage} onClick={loadMore}>{result.isFetchingNextPage ? 'Loading…' : 'Load more collectibles'}<ArrowRight size={15}/></button>}{items.length > 0 && !result.hasNextPage && <p>End of available collection results</p>}</div>
        </section>
      </div>
    </div>
  </main>;
}
