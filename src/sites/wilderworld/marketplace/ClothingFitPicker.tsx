import Link from 'next/link';
import { clothingFitFamily } from './clothing-fit';
import styles from './ClothingFitPicker.module.css';

export default function ClothingFitPicker({productId}:{productId:string}) {
  const family=clothingFitFamily(productId);
  if(!family)return null;
  return <nav className={styles.picker} aria-label="Choose clothing fit">
    <span>Fit</span><div>{family.fits.map(fit=><Link key={fit.productId} href={`/store/${fit.productId}`} prefetch={false} aria-current={productId===fit.productId?'page':undefined}>{fit.label}</Link>)}</div>
  </nav>;
}
