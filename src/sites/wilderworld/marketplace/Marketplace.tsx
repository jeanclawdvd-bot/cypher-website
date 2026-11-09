'use client';
import ProductRating from './ProductRating';
import EditionSummary from './EditionSummary';
import WildPriceQuote from './WildPriceQuote';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowUpRight, Search, Grid2X2, List, SlidersHorizontal, X, Armchair, CarFront, Gem, ChevronLeft, ChevronRight, Shirt, RotateCcw } from 'lucide-react';
import { departments, departmentName, storefrontDepartment, browseDepartment, subcategoryName, marketProducts, browseProducts as filterProducts, findMarketProduct, featuredMaterial, productHref, type MarketProduct, type Variant } from './catalog';
import { clothingStyleName } from './clothing-fit';
import { deriveFinishOptions } from './finish-filter';
import { useMobileFilterDialog } from './useMobileFilterDialog';
import styles from './Marketplace.module.css';
import typography from '@/components/SectionHeader.module.css';
import { StoreDiscovery, homeProductIds } from '../accessories/StoreBrowse';
import GameProductDetails, { ProductMaterialPicker } from './GameProductDetails';
import { approvedProductEditorials } from './campaign-media';
import { ExistingCollections, OriginalDiscoveryCard, originalDiscoveryIds } from './ExistingCollections';
import ProductMarketPanel from './ProductMarketPanel';
import ProductReviews from './ProductReviews';
import StoreAccountLink from './StoreAccountLink';
import LocalListingPanel from './LocalListingPanel';
import MobilePurchaseBar from './MobilePurchaseBar';
import ShoppingLogo from './ShoppingLogo';
import SearchDepartmentSelect from './SearchDepartmentSelect';
import { ALL_ENTRIES } from '@/lib/wilderCollections';
import { useDragScroll } from '../accessories/useDragScroll';
import { useCatalogLimit } from './useCatalogLimit';

const searchDepartments = [...departments.map(item=>({value:item.id,label:item.name})), {value:'existing',label:'Originals'}];

// Compact labels belong only to this rail; collection names and identities stay canonical.
const originalNavLabels: Record<string, string> = {
  'wilder-land-the-island': 'The Island',
  wilderworld: 'Wheels',
  'wilderbeasts-wolf': 'Wolf',
  'wilderbeasts-wape': 'Wape',
  'wilder-moto': 'Moto',
  'wilderpals-gen': 'GEN',
  'wilder-crafts-genesis': 'Crafts',
  'wilder-cribs-genesis': 'Cribs',
  aws0: 'AWS 0',
  aws1: 'AWS 1',
  'air-wild': 'AWS 2',
  packs: 'Packs',
  'pack-weapons': 'Weapons',
  'pack-wheels': 'Mods',
  'pack-avatars': 'Gear',
};
const packCollectionSlugs = new Set(['packs', 'pack-weapons', 'pack-wheels', 'pack-avatars']);
const packCollections = ALL_ENTRIES.filter(entry => packCollectionSlugs.has(entry.slug));

function ProductImage({product,src,compact=false,emptyLabel='Image coming soon'}:{product:MarketProduct;src?:string|null;compact?:boolean;emptyLabel?:string}) {
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[src,product.image]);
  const image=src===undefined?product.image:src;
  const media=product.variants.find(variant=>variant.image===image);
  const Icon=product.department==='vehicles'?CarFront:product.department==='clothing'?Shirt:product.department==='statues'||product.department==='totems'?Gem:Armchair;
  return image&&!failed?<img src={compact?(media?.thumbnail??image):image} srcSet={media?.srcSet} sizes={compact?'(max-width: 640px) 46vw, (max-width: 1100px) 30vw, 22vw':'(max-width: 900px) 90vw, 45vw'} alt={product.name} loading="lazy" onError={()=>setFailed(true)}/>:<div className={styles.noImage}><Icon size={54} strokeWidth={.7}/><span>{emptyLabel}</span></div>;
}

export function MarketHeader({query='',department='all',category='all',collectionSlug,onQueryChange}:{query?:string;department?:string;category?:string;collectionSlug?:string;onQueryChange?:(query:string)=>void}) {
  const router=useRouter();
  const departmentRail=useRef<HTMLDivElement>(null);
  const [departmentEdges,setDepartmentEdges]=useState({left:false,right:false});
  const showDepartmentArrows=departmentEdges.left||departmentEdges.right;
  useDragScroll(departmentRail);
  useEffect(()=>{
    const rail=departmentRail.current;
    if(!rail)return;
    const measure=()=>{
      const left=rail.scrollLeft>1;
      const right=rail.scrollLeft+rail.clientWidth<rail.scrollWidth-1;
      setDepartmentEdges(current=>current.left===left&&current.right===right?current:{left,right});
    };
    const observer=typeof ResizeObserver==='undefined'?undefined:new ResizeObserver(measure);
    observer?.observe(rail);
    window.addEventListener('resize',measure);
    rail.addEventListener('scroll',measure,{passive:true});
    measure();
    return()=>{observer?.disconnect();window.removeEventListener('resize',measure);rail.removeEventListener('scroll',measure);};
  },[]);
  useEffect(()=>{
    const rail=departmentRail.current;
    const current=rail?.querySelector<HTMLElement>('[aria-current="page"]');
    if(!rail||!current||!rail.clientWidth)return;
    const viewport=rail.getBoundingClientRect();
    const item=current.getBoundingClientRect();
    if(item.left>=viewport.left&&item.right<=viewport.right)return;
    const centered=rail.scrollLeft+item.left-viewport.left-(rail.clientWidth-item.width)/2;
    rail.scrollLeft=Math.max(0,Math.min(centered,rail.scrollWidth-rail.clientWidth));
  },[department,category,collectionSlug,showDepartmentArrows]);
  const scrollDepartments=(direction:number)=>{
    const rail=departmentRail.current;
    if(rail)rail.scrollBy({left:direction*rail.clientWidth*.75,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  };
  const [search,setSearch]=useState(query);
  const [searchDepartment,setSearchDepartment]=useState(department==='none'?'all':department);
  useEffect(()=>setSearch(query),[query]);
  useEffect(()=>setSearchDepartment(department==='none'?'all':department),[department]);
  const updateSearch=(value:string)=>{setSearch(value);if(searchDepartment===department)onQueryChange?.(value);};
  return <header className={styles.shoppingHeader}><div className={styles.marketHeader}>
    <ShoppingLogo />
    <form action={searchDepartment==='existing'?'/store/market':'/store/browse'} role="search" className={styles.search} onSubmit={event=>{
      event.preventDefault();
      if(onQueryChange&&searchDepartment===department){onQueryChange(search);return;}
      // Keep the current page visible while the client router changes scope.
      // A native form submission reloads the entire shopping shell and search.
      const params=new URLSearchParams();
      if(searchDepartment==='existing'){
        if(collectionSlug)params.set('c',collectionSlug);
      }else if(searchDepartment!=='all')params.set('department',searchDepartment);
      if(search.trim())params.set('q',search.trim());
      const path=searchDepartment==='existing'?'/store/market':'/store/browse';
      router.push(path+(params.size?'?'+params.toString():''));
    }}>
      {searchDepartment==='existing'&&collectionSlug&&<input type="hidden" name="c" value={collectionSlug}/>}
      <SearchDepartmentSelect value={searchDepartment} options={searchDepartments} onChange={setSearchDepartment}/>
      <label className={styles.srOnly} htmlFor="market-search">Search products</label>
      <input id="market-search" type="search" name="q" value={search} onChange={event=>updateSearch(event.target.value)} placeholder="Search products"/>
      {search&&<button type="button" onClick={()=>updateSearch('')} aria-label="Clear search"><X size={16} aria-hidden/></button>}
      <button type="submit" aria-label="Search products"><Search size={19} aria-hidden/></button>
    </form>
    <div className={styles.headerActions}><StoreAccountLink/><a href="https://store.epicgames.com/p/wilder-world-wilder-world-alpha-b4ccf8?lang=en-US" className={`sci-btn sci-btn-primary ${styles.playNow}`} target="_blank" rel="noopener noreferrer">Play Now <ArrowUpRight size={16} aria-hidden/></a></div>
  </div><nav className={styles.departmentNav} aria-label="Shopping navigation"><div ref={departmentRail} className={styles.departmentNavLinks} role="region" aria-label="Shopping categories" tabIndex={0}><Link href="/store/browse" aria-current={department==='all'?'page':undefined}>All products</Link>{departments.flatMap(d=>[<Link key={d.id} href={`/store/collections/${d.id}`} aria-current={department===d.id&&category==='all'?'page':undefined}>{d.name}</Link>,...(d.id==='clothing'?[{id:'eyewear',name:'Glasses'},{id:'hats',name:'Hats'},{id:'helmets',name:'Helmets'}].map(item=><Link key={item.id} href={`/store/collections/clothing?category=${item.id}`} aria-current={department==='clothing'&&category===item.id?'page':undefined}>{item.name}</Link>):[])])}{packCollections.map(entry=><Link key={entry.id} href={`/store/market?c=${encodeURIComponent(entry.slug)}`} prefetch={false} aria-current={department==='existing'&&collectionSlug===entry.slug?'page':undefined}>{originalNavLabels[entry.slug]}</Link>)}</div>{(departmentEdges.left||departmentEdges.right)&&<div className={styles.departmentNavActions}><button type="button" aria-label="Scroll categories left" disabled={!departmentEdges.left} onClick={()=>scrollDepartments(-1)}><ChevronLeft size={17} aria-hidden/></button><button type="button" aria-label="Scroll categories right" disabled={!departmentEdges.right} onClick={()=>scrollDepartments(1)}><ChevronRight size={17} aria-hidden/></button></div>}</nav>
  </header>;
}

export function ProductCard({product,list=false,preferredFinish}:{product:MarketProduct;list?:boolean;preferredFinish?:string}) {
  const finish=preferredFinish?.toLowerCase()??'all';
  const preferred=finish!=='all'?product.variants.find(v=>v.name.toLowerCase()===finish):undefined;
  const choice=preferred??featuredMaterial(product);
  return <article aria-label={product.name} className={`${styles.productCard} ${list?styles.listCard:''}`}>
    <Link href={productHref(product,choice)} className={styles.productImage} data-product-type={product.subcategory==='cars'?'vehicle':product.subcategory==='rims'?'rim':undefined}><ProductImage product={product} compact src={choice?.image} emptyLabel={choice?`${choice.name} · Image coming soon`:'Image coming soon'}/></Link>
    <div className={styles.productCopy}><p className={styles.productCategory}>{product.brand??subcategoryName(product.subcategory)}</p>
      <h2 className={styles.productName}><Link href={productHref(product,choice)}>{clothingStyleName(product.id,product.name)}</Link></h2>
      {list&&<p className={styles.listDescription}>{product.description}</p>}
      <div className={styles.productBottom}><span className={styles.productPrice}>{product.priceCents!==null?<><strong title="USD price for one selected finish.">${(product.priceCents/100).toFixed(product.priceCents%100?2:0)}</strong><WildPriceQuote usdCents={product.priceCents} compact/></>:<span className={styles.release}>{product.status==='Existing collectible'?'Existing collectible':product.status==='Source candidate'?'Coming soon':'Coming soon'}</span>}</span><ArrowUpRight size={16} aria-hidden/></div>
    </div>
  </article>;
}

function ProductRail({title,subtitle,products,href}:{title:string;subtitle:string;products:MarketProduct[];href:string}) {
  return <section className={styles.railSection}><div className={styles.sectionHeading}><div><p className={styles.kicker}>{subtitle}</p><h2 className={typography.title}>{title}</h2></div><Link href={href}>View collection <ArrowRight size={17}/></Link></div><div className={styles.rail}>{products.map(p=><ProductCard key={p.id} product={p}/>)}</div></section>;
}

export function MarketplaceHome() {
  const selectedProducts = homeProductIds.flatMap(id => marketProducts.find(product => product.id === id) ?? []);
  return <main className={styles.page}>
    <MarketHeader />
    <StoreDiscovery>{selectedProducts.map(product => <ProductCard key={product.id} product={product} />)}</StoreDiscovery>
    <ExistingCollections />
    <HomeProductCatalog />
  </main>;
}

function HomeProductCatalog() {
  const products = useMemo(() => filterProducts(marketProducts, { sort: 'featured' }), []);
  const [limit, setLimit] = useCatalogLimit('home', products.length);
  const sentinel = useRef<HTMLDivElement>(null);
  const hasMore = limit < products.length;
  const loadMore = () => setLimit(current => Math.min(current + 24, products.length));
  useEffect(() => {
    const target = sentinel.current;
    if (!target || !hasMore || typeof IntersectionObserver === 'undefined') return;
    let requested = false;
    const observer = new IntersectionObserver(entries => {
      if (requested || !entries.some(entry => entry.isIntersecting)) return;
      requested = true;
      setLimit(current => Math.min(current + 24, products.length));
    }, { rootMargin: '600px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [limit, hasMore, products.length]);
  return <section id="all-products" className={styles.homeCatalog} aria-labelledby="home-catalog-heading">
    <header className={`${styles.sectionHeading} ${styles.homeCatalogHeading}`}>
      <h2 id="home-catalog-heading" className={typography.title}>All products</h2>
      <Link href="/store/browse">Filter &amp; sort <SlidersHorizontal size={16} aria-hidden /></Link>
    </header>
    <div className={styles.resultsGrid}>{products.slice(0, limit).map(product => <ProductCard key={product.id} product={product} />)}</div>
    <div ref={sentinel} className={styles.loadMore} data-testid="home-product-load-sentinel">
      <p role="status">{hasMore ? `${Math.min(limit, products.length)} of ${products.length} products` : `You've seen all ${products.length} products`}</p>
      {hasMore && <button type="button" className={styles.primary} onClick={loadMore}>Show more products <ArrowRight size={16} aria-hidden /></button>}
    </div>
  </section>;
}

export function MarketplaceBrowse({initialDepartment='all',initialCategory='all',initialQuery='',initialFinish='all',initialBrand='all',initialSort='featured',initialView='grid',initialGender='all'}:{initialDepartment?:string;initialCategory?:string;initialQuery?:string;initialFinish?:string;initialBrand?:string;initialSort?:string;initialView?:string;initialGender?:string}) {
  const requestedDepartment=browseDepartment(initialDepartment,initialCategory);
  const [department]=useState(departments.some(d=>d.id===requestedDepartment)?requestedDepartment:'all'),[category,setCategory]=useState(requestedDepartment==='rims'&&initialCategory==='rims'?'all':initialCategory),[query,setQuery]=useState(initialQuery),[finish,setFinish]=useState(initialFinish),[brand,setBrand]=useState(initialBrand),[sort,setSort]=useState(initialSort),[view,setView]=useState(initialView),[gender,setGender]=useState(['Men','Women'].includes(initialGender)?initialGender:'all'),[filtersOpen,setFiltersOpen]=useState(false);
  const result=useMemo(()=>filterProducts(marketProducts,{department,subcategory:category,query,brand,finish,sort,gender}),[department,category,query,brand,finish,sort,gender]);
  const [limit,setLimit]=useCatalogLimit(JSON.stringify(['browse',department,category,query,brand,finish,sort,gender]),result.length);
  const finishOptions=useMemo(()=>deriveFinishOptions(filterProducts(marketProducts,{department,subcategory:category,query,brand,gender})),[department,category,query,brand,gender]);
  const selectedFinish=finishOptions.find(option=>option.value===finish.toLowerCase());
  const filterId=useId(),filterPanel=useRef<HTMLElement|null>(null),filterTrigger=useRef<HTMLButtonElement|null>(null),filterBackdrop=useRef<HTMLButtonElement|null>(null);
  const mobileFilters=useMobileFilterDialog({open:filtersOpen,onClose:()=>setFiltersOpen(false),panel:filterPanel,trigger:filterTrigger,backdrop:filterBackdrop});
  const modalFiltersOpen=mobileFilters&&filtersOpen;
  const loadSentinel=useRef<HTMLDivElement>(null);
  const activeDepartment=departments.find(d=>d.id===department);
  const brands=[...new Set(marketProducts.filter(p=>p.department==='clothing').map(p=>p.brand).filter((s):s is string=>!!s))];
  useEffect(()=>{
    const target=loadSentinel.current;
    if(!target||limit>=result.length||typeof IntersectionObserver==='undefined')return;
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting))setLimit(current=>Math.min(current+24,result.length));
    },{rootMargin:'600px 0px'});
    observer.observe(target);
    return()=>observer.disconnect();
  },[limit,result]);
  useEffect(()=>{const pathname=department==='rims'&&location.pathname==='/store/collections/vehicles'?'/store/collections/rims':location.pathname;const params=new URLSearchParams();if(department!=='all'&&!pathname.endsWith('/'+department))params.set('department',department);if(category!=='all')params.set('category',category);if(query)params.set('q',query);if(finish!=='all')params.set('finish',finish);if(brand!=='all')params.set('brand',brand);if(sort!=='featured')params.set('sort',sort);if(view==='list')params.set('view',view);if(gender!=='all')params.set('gender',gender);window.history.replaceState(null,'',pathname+(params.size?'?'+params.toString():''));},[department,category,query,finish,brand,sort,view,gender]);
  useEffect(()=>{const saved=localStorage.getItem('ww-market-view');if(!new URLSearchParams(location.search).has('view')&&saved==='list')setView('list');},[]);
  const clear=()=>{setCategory('all');setQuery('');setBrand('all');setFinish('all');setGender('all');};
  return <main className={styles.page}><MarketHeader department={department} category={category} query={query} onQueryChange={setQuery}/><div className={styles.browseContent}>
    <div className={styles.breadcrumb}><Link href="/store">Store</Link><ChevronRight size={12}/><span>{departmentName(department)}</span>{category!=='all'&&<><ChevronRight size={12}/><span>{subcategoryName(category)}</span></>}</div>
    <header className={styles.browseHeading}><div><h1 className={typography.title}>{query?`Results for “${query}”`:category!=='all'?subcategoryName(category):departmentName(department)}</h1><p>{activeDepartment?.tagline??'Every detail of your digital life, in one place.'}</p></div></header>
    <div className={styles.browseLayout}>
      {modalFiltersOpen&&<button ref={filterBackdrop} type="button" tabIndex={-1} className={styles.filterBackdrop} aria-label="Close filters backdrop" onClick={()=>setFiltersOpen(false)}/>}
      <aside id={filterId} ref={filterPanel} tabIndex={-1} hidden={mobileFilters&&!filtersOpen} role={modalFiltersOpen?'dialog':undefined} aria-modal={modalFiltersOpen?true:undefined} className={`${styles.sidebar} ${modalFiltersOpen?styles.sidebarOpen:''}`} aria-label="Product filters" onClick={event=>{if(modalFiltersOpen&&event.target instanceof Element&&event.target.closest('a[href]'))setFiltersOpen(false);}}><div className={styles.sidebarTitle}>Filters<button aria-label="Close filters" onClick={()=>setFiltersOpen(false)}><X size={18}/></button></div>
        <h2>Department</h2><Link className={department==='all'?styles.activeFilter:''} href="/store/browse">All departments</Link>{departments.map(d=><Link key={d.id} href={`/store/collections/${d.id}`} className={department===d.id?styles.activeFilter:''}>{d.name}<span>{filterProducts(marketProducts,{department:d.id}).length}</span></Link>)}
        {activeDepartment&&<><h2>Category</h2><button className={category==='all'?styles.activeFilter:''} onClick={()=>setCategory('all')}>All {activeDepartment.name.toLowerCase()}</button>{activeDepartment.subs.map(s=><button key={s.id} className={category===s.id?styles.activeFilter:''} onClick={()=>setCategory(s.id)}>{s.name}<span>{filterProducts(marketProducts,{department,subcategory:s.id}).length}</span></button>)}</>}
        {(department==='furniture'||department==='all')&&<><h2 id="finish-filter-heading">Colors &amp; materials</h2><select aria-labelledby="finish-filter-heading" value={selectedFinish?.value??finish} onChange={event=>setFinish(event.target.value)}><option value="all">All options</option>{finish!=='all'&&!selectedFinish&&<option value={finish}>{finish} (0 results)</option>}{finishOptions.map(option=><option key={option.value} value={option.value}>{option.label} ({option.productCount})</option>)}</select></>}
        {department==='clothing'&&<><h2>Shop by fit</h2>{['all','Men','Women'].map(g=><button key={g} className={gender===g?styles.activeFilter:''} onClick={()=>setGender(g)}>{g==='all'?'All fits':g}</button>)}</>}{(department==='clothing'||department==='all')&&<><h2>Brands</h2><select aria-label="Filter by brand" value={brand} onChange={e=>setBrand(e.target.value)}><option value="all">All brands</option>{brands.map(b=><option key={b}>{b}</option>)}</select></>}
        <button className={styles.reset} onClick={clear}><RotateCcw size={13}/> Reset filters</button>
      </aside>
      <section className={styles.results} aria-label="Product results"><div className={styles.resultsToolbar}><button ref={filterTrigger} className={styles.mobileFilter} aria-expanded={modalFiltersOpen} aria-controls={filterId} aria-haspopup="dialog" onClick={()=>setFiltersOpen(true)}><SlidersHorizontal size={16}/> Filters</button><p aria-live="polite">{result.length} {result.length===1?'result':'results'}</p><select aria-label="Sort products" value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Featured</option><option value="name">Name: A–Z</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="variants">Most options</option></select><div className={styles.viewToggle}><button aria-label="Grid view" aria-pressed={view==='grid'} onClick={()=>{setView('grid');localStorage.setItem('ww-market-view','grid');}}><Grid2X2 size={17}/></button><button aria-label="List view" aria-pressed={view==='list'} onClick={()=>{setView('list');localStorage.setItem('ww-market-view','list');}}><List size={18}/></button></div></div>
        {(category!=='all'||finish!=='all'||brand!=='all'||gender!=='all'||query)&&<div className={styles.activeChips}>{category!=='all'&&<button onClick={()=>setCategory('all')}>{subcategoryName(category)} <X size={12}/></button>}{finish!=='all'&&<button aria-label="Remove color or material filter" onClick={()=>setFinish('all')}>{selectedFinish?.label??finish} <X size={12}/></button>}{brand!=='all'&&<button onClick={()=>setBrand('all')}>{brand} <X size={12}/></button>}{gender!=='all'&&<button aria-label="Remove fit filter" onClick={()=>setGender('all')}>{gender} <X size={12}/></button>}{query&&<button onClick={()=>setQuery('')}>“{query}” <X size={12}/></button>}</div>}
        {result.length?<div className={view==='grid'?styles.resultsGrid:styles.resultsList}>{result.slice(0,limit).flatMap((p,index)=>[<ProductCard key={p.id} product={p} list={view==='list'} preferredFinish={finish}/>,...(department==='all'&&!query&&category==='all'&&finish==='all'&&brand==='all'&&sort==='featured'&&(index+1)%12===0&&originalDiscoveryIds[Math.floor(index/12)]?[<OriginalDiscoveryCard key={`original-${Math.floor(index/12)}`} id={originalDiscoveryIds[Math.floor(index/12)]}/>]:[])])}</div>:<div className={styles.empty}><Search size={30}/><h2>No matches just yet.</h2><p>Try another color, material, name or category.</p><button className={styles.primary} onClick={clear}>Clear filters <ArrowRight size={16}/></button></div>}
        {result.length>0&&<div ref={loadSentinel} className={styles.loadMore} data-testid="product-load-sentinel"><p role="status">{limit<result.length?`Showing ${Math.min(limit,result.length)} of ${result.length} · More products load as you scroll`:`You've seen all ${result.length} products`}</p>{result.length>limit&&<button className={styles.primary} onClick={()=>setLimit(n=>Math.min(n+24,result.length))}>Show more products <ArrowRight size={16}/></button>}</div>}
      </section>
    </div>
  </div></main>;
}

export function MarketplaceProduct({id,initialVariant}:{id:string;initialVariant?:string}) {
  const product=findMarketProduct(id)!;
  const section=storefrontDepartment(product);
  const defaultVariant=product.variants.find(v=>v.id===initialVariant)??featuredMaterial(product);
  const [variantId,setVariantId]=useState(defaultVariant?.id);
  const variant=product.variants.find(v=>v.id===variantId);
  const [galleryImage,setGalleryImage]=useState<string>();
  const selectedImage=variant?variant.image:product.image;
  const image=galleryImage!==undefined?galleryImage:selectedImage;
  const gallery=[...new Set([product.image,...product.gallery].filter((s):s is string=>!!s))];
  const editorials=approvedProductEditorials(product.id,variant?.id).filter(item=>item.image!==selectedImage&&!gallery.includes(item.image));
  const editorial=galleryImage===undefined?undefined:editorials.find(item=>item.image===image);
  const related=marketProducts.filter(p=>storefrontDepartment(p)===section&&p.id!==product.id).slice(0,5);
  const isLegacy=product.status==='Existing collectible';
  const isSource=product.status==='Source candidate';
  function selectVariant(next:Variant) {
    setVariantId(next.id);setGalleryImage(undefined);
    const url=new URL(window.location.href);url.searchParams.set('variant',next.id);
    window.history.replaceState(null,'',url);
  }
  useEffect(()=>{
    const readVariant=()=>{
      const requested=new URLSearchParams(window.location.search).get('variant');
      const next=product.variants.find(v=>v.id===requested)??defaultVariant;
      setVariantId(next?.id);setGalleryImage(undefined);
    };
    window.addEventListener('popstate',readVariant);
    return()=>window.removeEventListener('popstate',readVariant);
  },[product,defaultVariant]);
  return <main className={styles.page}>
    <MarketHeader department={section}/>
    <div className={`${styles.browseContent} ${styles.productDetailContent}`}>
      <div className={styles.breadcrumb}><Link href="/store">Store</Link><ChevronRight size={12}/><Link href={`/store/collections/${section}`}>{departmentName(section)}</Link><ChevronRight size={12}/><span>{product.name}</span></div>
      <div className={styles.detailLayout}>
        <section className={styles.detailMedia} aria-label="Product imagery">
          <div className={styles.detailImage} data-product-hero data-product-type={product.subcategory==='cars'?'vehicle':product.subcategory==='rims'?'rim':undefined} data-image-kind={editorial?'editorial':'product'}><span className={styles.detailImageLabel}>{editorial?'Editorial':departmentName(section)}</span>{editorial?<img src={editorial.image} alt={`${product.name} — ${editorial.alt}`} style={{objectPosition:editorial.position}}/>:<ProductImage product={product} src={image} emptyLabel={variant?`${variant.name} · Image coming soon`:'Image coming soon'}/>}</div>
          {(gallery.length>1||editorials.length>0)&&<div className={styles.thumbnails} aria-label="Product gallery" data-product-type={product.subcategory==='cars'?'vehicle':product.subcategory==='rims'?'rim':undefined}><button aria-label="View selected finish" aria-pressed={!galleryImage} onClick={()=>setGalleryImage(undefined)}>{selectedImage&&<img src={selectedImage} alt=""/>}</button>{gallery.filter(src=>src!==selectedImage).map((src,i)=><button aria-label={`View image ${i+1}`} aria-pressed={image===src} key={src} onClick={()=>setGalleryImage(src)}><img src={src} alt=""/></button>)}{editorials.map((item,i)=><button key={item.id} aria-label={`View Editorial ${i+1}`} aria-pressed={image===item.image} onClick={()=>setGalleryImage(item.image)} data-image-kind="editorial"><img src={item.image} alt="" style={{objectPosition:item.position}}/></button>)}</div>}
        </section>
        <section className={styles.detailCopy} aria-label="Product information">
          <div className={styles.detailEyebrow}><Link href={`/store/collections/${section}`} className={styles.detailBrand}>{product.brand??'Wilder World'}</Link><span>{subcategoryName(product.subcategory)}</span></div>
          <h1 className={typography.title}>{product.name}</h1>
          <ProductRating productId={product.id} variantIds={product.variants.map(option=>option.id)}/>
          <p className={styles.detailDescription}>{product.description}</p>
          <div className={styles.detailPrice}><div><strong>{product.priceCents!==null?`$${(product.priceCents/100).toFixed(product.priceCents%100?2:0)}`:isLegacy?'Existing collectible':isSource?'Coming soon':'Coming soon'}</strong>{product.priceCents!==null&&<WildPriceQuote usdCents={product.priceCents}/>}</div>{product.priceCents!==null&&<span>USD</span>}</div>
          <ProductMaterialPicker productId={product.id} options={product.variants} selectedId={variant?.id} onSelect={nextId=>selectVariant(product.variants.find(option=>option.id===nextId)!)}/>
          <aside className={styles.purchasePanel} aria-label="Availability">
            <button disabled>{isLegacy?'Owner access coming soon':'Coming soon'}</button>
            {product.department==='vehicles'&&product.subcategory==='cars'&&<Link href={`/vehicles/${product.sourceIds[0]}`} className={styles.shopLink}>Explore the vehicle <ArrowUpRight size={16}/></Link>}
          </aside>
          <EditionSummary productId={product.id} variantId={variant?.id}/>
          <GameProductDetails productId={product.id} variantId={variant?.id} story={product.description}/>
          {isLegacy&&<details className={styles.detailAccordion}><summary>About these material studies</summary><p>Visual material studies only. These are not additional editions or colors granted to existing owners.</p>{product.imageSourceReference&&<a href={product.imageSourceReference} target="_blank" rel="noreferrer">Official Trinity Totem reference <ArrowUpRight size={13}/></a>}</details>}
        </section>
      </div>
      {variant&&<ProductMarketPanel productId={product.id} variantId={variant.id} variantName={variant.name} previewPriceCents={product.priceCents} variants={product.variants.map(option=>({id:option.id,name:option.name,previewPriceCents:product.priceCents}))} onVariantSelect={nextId=>{const next=product.variants.find(option=>option.id===nextId);if(next)selectVariant(next);}}/>}
      {variant&&<LocalListingPanel productId={product.id} variantId={variant.id} variantName={variant.name}/>}
      <ProductReviews preview key={product.id} productId={product.id} variantId={variant?.id} variantName={variant?.name} variantOptions={product.variants}/>
      {related.length>0&&<ProductRail title={`More ${departmentName(section).toLowerCase()}`} subtitle={departmentName(section)} products={related} href={`/store/collections/${section}`}/>}
    </div>
    <MobilePurchaseBar priceCents={product.priceCents} selection={variant?.name} label="Coming soon" disabled/>
  </main>;
}
