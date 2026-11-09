'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { AccessoryProduct } from './merchandising';
import car from '../GhostlineStore.module.css';
import styles from './AccessoryDetail.module.css';

export default function AccessoryDetail({ product }: { product: AccessoryProduct }) {
  const [index, setIndex] = useState(Math.max(0, product.variants.findIndex(v => v.renderStatus === 'styled_sample')));
  const selected = product.variants[index];
  return <div className={`${car.page} ${styles.page}`}>
    <Link href="/store#accessories" className={styles.back}>← All accessories</Link>
    <div className={`${car.detailRow} ${styles.row}`}>
      <div className={car.detailMedia}>
        <div className={styles.viewer}>
          <Image key={selected.image} src={selected.image} alt={`${product.id}, finish ${index + 1}`} fill priority sizes="(max-width: 980px) 100vw, 58vw" />
        </div>
        {product.variants.length > 1 && <div className={styles.thumbnails} aria-label="Available finishes">
          {product.variants.map((v, i) => <button key={v.sku} aria-label={`View finish ${i + 1}`} aria-pressed={i === index} onClick={() => setIndex(i)}>
            <Image src={v.image} alt="" width={100} height={100} />
          </button>)}
        </div>}
      </div>
      <div className={`${car.detailInfo} ${styles.info}`}>
        <p className={styles.category}>{product.category}</p>
        <h1 className={car.detailName}>{product.id}</h1>
        <p className={car.detailBlurb}>A new expression of your Wilder World identity.</p>
        {product.variants.length > 1 && <p className={styles.finish} aria-live="polite">Finish {String(index + 1).padStart(2, '0')} <span>/ {String(product.variants.length).padStart(2, '0')}</span></p>}
        <div className={styles.action}>
          <button className="sci-btn sci-btn-primary" disabled>Coming soon</button>
          <p>Coming soon</p>
        </div>
        <div className={styles.details}>
          <p><span>Collection</span><span>Avatar accessories</span></p>
          <p><span>Category</span><span>{product.category}</span></p>
        </div>
      </div>
    </div>
  </div>;
}
