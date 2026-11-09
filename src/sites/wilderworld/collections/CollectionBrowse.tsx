'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Armchair, CarFront, Circle, Gem, Search } from 'lucide-react';
import { CollectionNavigation } from './CollectionNavigation';
import { browseSections, productStatusLabel, productTypeLabel, type BrowseSection, type RegistryProduct } from './store-registry';
import styles from './Collections.module.css';
import { findStandaloneBaseRender, getCollectionImage } from './furniture-base-images';

export function ProductPlaceholder({ product }: { product: RegistryProduct }) {
  const Icon = product.itemType === 'vehicle' ? CarFront : product.itemType === 'rim_set' ? Circle : product.itemType === 'totem' ? Gem : Armchair;
  return <div className={styles.placeholder}><Icon aria-hidden /><span>Photography in progress</span></div>;
}

export default function CollectionBrowse({ section, products }: { section: BrowseSection; products: RegistryProduct[] }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [visible, setVisible] = useState(24);
  const copy = browseSections[section];
  const types = [...new Set(products.map(product => product.itemType))];
  const filtered = useMemo(() => products.filter(product => (type === 'all' || product.itemType === type) && `${product.name} ${product.sourceIds.join(' ')}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [products, type, query]);
  return <div className={styles.page}>
    <CollectionNavigation active={section} />
    <header className={styles.intro}>
      <p className={styles.eyebrow}>Wilder Market / Collection preview</p>
      <h1 className={styles.heading}>{copy.name}</h1>
      <p>{copy.description}</p>
      {section === 'vehicles' && <Link className={styles.textLink} href="/vehicles">Explore the featured vehicles <ArrowUpRight size={14} aria-hidden /></Link>}
      {section === 'furniture' && <div className={styles.reviewLinks}><Link className={styles.textLink} href="/store/collections/furniture/apartment">Review the apartment inventory <ArrowUpRight size={14} aria-hidden /></Link><Link className={styles.textLink} href="/store/collections/furniture/base-renders">Review neutral base renders <ArrowUpRight size={14} aria-hidden /></Link></div>}
      {section === 'totems' && <p>Trinity is an existing collectible reference, not a new mint. Ownership verification will be connected before any owner features become available.</p>}
    </header>
    <section className={styles.catalog} aria-label={`${copy.name} catalog`}>
      <div className={styles.controls}>
        <div className={styles.filters} role="group" aria-label="Item type">
          <button type="button" aria-pressed={type === 'all'} onClick={() => { setType('all'); setVisible(24); }}>All {copy.name.toLowerCase()}</button>
          {types.length > 1 && types.map(itemType => <button key={itemType} type="button" aria-pressed={type === itemType} onClick={() => { setType(itemType); setVisible(24); }}>{itemType === 'rim_set' ? 'Rims' : itemType === 'vehicle' ? 'Complete vehicles' : productTypeLabel(products.find(product => product.itemType === itemType)!)}</button>)}
        </div>
        <label className={styles.search}><Search size={16} aria-hidden /><input type="search" aria-label={`Search ${copy.name.toLowerCase()}`} placeholder={`Search ${copy.name.toLowerCase()}`} value={query} onChange={event => { setQuery(event.target.value); setVisible(24); }} /></label>
      </div>
      <p className={styles.count} aria-live="polite">{filtered.length} {filtered.length === 1 ? 'item' : 'items'} in review · Purchasing unavailable</p>
      {filtered.length ? <div className={styles.productGrid}>{filtered.slice(0, visible).map(product => <article key={product.id} className={styles.productCard} aria-label={product.name}>
        <Link href={`/store/items/${product.id}`} className={styles.productImage} aria-label={`View ${product.name}`}>
          {getCollectionImage(product) ? <Image src={getCollectionImage(product)!} alt="" fill unoptimized sizes="(max-width:760px) 50vw, (max-width:1099px) 33vw, 25vw" /> : <ProductPlaceholder product={product} />}
        </Link>
        <div className={styles.productMeta}><span>{productTypeLabel(product)}</span><span>{productStatusLabel(product)}</span></div>
        <h2><Link href={`/store/items/${product.id}`}>{product.name}</Link></h2>
        {product.collectionId === 'furniture' && findStandaloneBaseRender(product.sourceAssets) && <p className={styles.mediaCaption}>Neutral base render</p>}
      </article>)}</div> : <div className={styles.empty}><p>No items match this search.</p><button type="button" className="sci-btn sci-btn-ghost" onClick={() => { setQuery(''); setType('all'); }}>Clear filters</button></div>}
      {filtered.length > visible && <button type="button" className={`sci-btn sci-btn-ghost ${styles.loadMore}`} onClick={() => setVisible(count => count + 24)}>Show more items <ArrowUpRight size={16} aria-hidden /></button>}
    </section>
  </div>;
}
