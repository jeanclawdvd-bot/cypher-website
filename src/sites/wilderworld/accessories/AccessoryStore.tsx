'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { storefrontProducts as products } from './merchandising';
import styles from './AccessoryStore.module.css';

const categories = [...new Set(products.map(p => p.category))].sort();
const hero = products.find(p => p.id === 'JCKT_010')!;

export default function AccessoryStore() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const visible = useMemo(() => products.filter(p =>
    (category === 'All' || category === p.category) &&
    `${p.id} ${p.category} ${p.variants.map(v => v.sku).join(' ')}`.toLowerCase().includes(query.toLowerCase())
  ), [query, category]);

  return <div className={styles.store}>
    <section className={styles.hero} aria-labelledby="store-heading">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>WILDER WORLD / ACCESSORIES</p>
        <h1 id="store-heading">Make it<br />your world.</h1>
        <p>Find your silhouette. Explore clothing, headwear and gear for your next identity.</p>
        <a className={styles.cta} href="#accessories">Explore the collection <span aria-hidden>↗</span></a>
        <small>Coming soon</small>
      </div>
      <Link className={styles.heroProduct} href={`/store/${hero.id}`} aria-label="View JCKT_010 jacket">
        <Image src={hero.variants[0].image} alt="Floating white and black armored jacket with orange edge lighting" width={1024} height={1024} priority />
        <span>JCKT_010 <span>BODY ACCESSORY ↗</span></span>
      </Link>
    </section>
    <section className={styles.catalog} id="accessories" aria-labelledby="collection-heading">
      <div className={styles.title}><div><p className={styles.eyebrow}>THE COLLECTION</p><h2 id="collection-heading">Built for your identity.</h2></div><p>{products.length} pieces</p></div>
      <div className={styles.filters} role="group" aria-label="Product categories">
        {['All', ...categories].map(c => <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>)}
      </div>
      <div className={styles.toolbar}>
        <input aria-label="Search accessories" placeholder="Search the collection" value={query} onChange={e => setQuery(e.target.value)} />
        <span role="status">{visible.length} products</span>
      </div>
      <div className={styles.grid}>
        {visible.map(p => {
          const image = p.variants.find(v => v.renderStatus === 'styled_sample') ?? p.variants[0];
          return <Link key={p.id} className={styles.card} href={`/store/${p.id}`} aria-label={`View ${p.id}`}>
            <div className={styles.image}><Image src={image.image} alt={p.id} width={640} height={640} sizes="(max-width: 640px) 50vw, (max-width: 1000px) 33vw, 25vw" /></div>
            <div className={styles.cardInfo}><small>{p.category}</small><h3>{p.id}</h3><p>{p.variants.length} finish{p.variants.length === 1 ? '' : 's'} <span aria-hidden>↗</span></p></div>
          </Link>;
        })}
      </div>
      {!visible.length && <div className={styles.empty}><h3>No matching accessories.</h3><button onClick={() => { setQuery(''); setCategory('All'); }}>Clear filters</button></div>}
      <p className={styles.note}>Coming soon</p>
    </section>

  </div>;
}
