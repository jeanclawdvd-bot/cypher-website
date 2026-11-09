'use client';

import { getProductEditionProposal, getProposedEdition } from './limited-editions';
import styles from './EditionSummary.module.css';

export default function EditionSummary({productId,variantId}:{productId:string;variantId?:string}) {
  const product=getProductEditionProposal(productId);
  const edition=variantId?getProposedEdition(productId,variantId):undefined;
  if(!product)return null;
  return <section className={styles.edition} aria-label="Limited edition details">
    <h3>Edition details</h3>
    <div className={styles.summary}>
      <span className={styles.tier}><i style={{background:edition?.tierColor}} aria-hidden/>{edition?.tierLabel??'Select a finish'}</span>
      <span className={styles.quantity}>{edition?.proposedSupplyCap.toLocaleString('en-US')??'—'} planned</span>
    </div>
    <details className={styles.compare}><summary>Compare editions <span aria-hidden>+</span></summary>
      <p>One item in your selected finish. {product.proposedSupplyCap.toLocaleString('en-US')} units planned across all {product.variants.length} editions.</p>
      <div className={styles.tableWrap}><table><caption>Planned supply, subject to final release confirmation.</caption><thead><tr><th>Finish</th><th>Rarity</th><th>Units</th></tr></thead><tbody>{product.variants.map(row=><tr key={row.variantId} data-selected={row.variantId===variantId}><td>{row.variantName}</td><td style={{color:row.tierColor}}>{row.tierLabel}</td><td>{row.proposedSupplyCap.toLocaleString('en-US')}</td></tr>)}</tbody></table></div>
      <p>These quantities include all sale and reserved units. Existing collections keep their original editions.</p>
    </details>
  </section>;
}
