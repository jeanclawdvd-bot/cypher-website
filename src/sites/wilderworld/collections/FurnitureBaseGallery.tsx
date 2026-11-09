'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { CollectionNavigation } from './CollectionNavigation';
import { type FurnitureBaseRenderData } from './furniture-base-images';
import collection from './Collections.module.css';
import styles from './FurnitureBaseGallery.module.css';

export default function FurnitureBaseGallery({ data }: { data: FurnitureBaseRenderData }) {
  const [angle, setAngle] = useState<'hero' | 'front'>('hero');
  return <div className={collection.page}>
    <CollectionNavigation active="furniture" />
    <header className={collection.intro}>
      <Link href="/store/collections/furniture" className={collection.back}><ArrowLeft size={15} aria-hidden /> Furniture collection</Link>
      <p className={collection.eyebrow}>Wilder: Furniture / Render review</p>
      <h1 className={collection.heading}>The base collection</h1>
      <p>Neutral studies of the source geometry. Review shape, scale and assembly before finishes and product definitions are approved.</p>
      <p className={styles.note}>Review images only. These studies do not add products or enable purchasing.</p>
      <Link className={collection.textLink} href="/store/collections/furniture/apartment">Review the apartment inventory <ArrowUpRight size={14} aria-hidden /></Link>
    </header>
    <section className={collection.catalog} aria-label="Furniture base renders">
      <div className={collection.controls}>
        <p className={styles.count}>{data.entries.length} base {data.entries.length === 1 ? 'study' : 'studies'} ready</p>
        <div className={collection.filters} role="group" aria-label="Render angle"><button type="button" aria-pressed={angle === 'hero'} onClick={() => setAngle('hero')}>Angled view</button><button type="button" aria-pressed={angle === 'front'} onClick={() => setAngle('front')}>Front view</button></div>
      </div>
      {data.entries.length ? <div className={collection.productGrid}>{data.entries.map(entry => <article key={entry.id} className={collection.productCard} aria-label={entry.name}>
        <div className={`${collection.productImage} ${styles.render}`}><Image src={entry[angle]} alt={`${entry.name} — neutral base render, ${angle === 'hero' ? 'angled' : 'front'} view`} fill unoptimized sizes="(max-width:760px) 50vw, (max-width:1099px) 33vw, 25vw" /></div>
        <div className={collection.productMeta}><span>{entry.category}</span><span>Neutral base render</span></div>
        <h2>{entry.name}</h2>
        <details className={`${collection.details} ${styles.details}`}><summary>Source and review notes</summary>
          <p>{entry.sourceAssets.length > 1 ? 'Assembly study · Multiple source meshes. This image is not substituted for an individual part.' : 'Single source mesh study.'}</p>
          {entry.notes && <p>{entry.notes}</p>}
          <ul>{entry.sourceIds.map(id => <li key={id}><code>{id}</code></li>)}</ul>
          <ul>{entry.sourceAssets.map(asset => <li key={asset}><code>{asset}</code></li>)}</ul>
        </details>
      </article>)}</div> : <div className={collection.empty}><p>Base studies will appear here after local render review.</p></div>}
      {data.held.length > 0 && <details className={`${collection.details} ${styles.held}`}><summary>Other source definitions · {data.held.length}</summary><p>Source references outside the current verified object set, including parts, structure, scene dressing and other assemblies.</p><ul>{data.held.map((item, index) => <li key={`${item.name}-${index}`}><strong>{item.name}</strong><p>{item.reason}</p></li>)}</ul></details>}
    </section>
  </div>;
}
