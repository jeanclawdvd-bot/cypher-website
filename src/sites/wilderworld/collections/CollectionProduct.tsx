import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CollectionNavigation } from './CollectionNavigation';
import { ProductPlaceholder } from './CollectionBrowse';
import { browseSections, productStatusLabel, productTypeLabel, sectionForProduct, type RegistryProduct } from './store-registry';
import styles from './Collections.module.css';
import { findStandaloneBaseRender, getCollectionImage } from './furniture-base-images';
import { findFrankWilderTotem } from '../marketplace/frank-wilder-totems';

export default function CollectionProduct({ product }: { product: RegistryProduct }) {
  const section = sectionForProduct(product);
  const legacy = product.status === 'legacy_reference';
  const frankWilder = findFrankWilderTotem(product.id);
  const baseRender = product.collectionId === 'furniture' ? findStandaloneBaseRender(product.sourceAssets) : undefined;
  const image = getCollectionImage(product);
  return <div className={styles.page}>
    <CollectionNavigation active={section} />
    <div className={styles.detail}>
      <Link href={`/store/collections/${section}`} className={styles.back}><ArrowLeft size={15} aria-hidden /> All {browseSections[section].name.toLowerCase()}</Link>
      <div className={styles.detailGrid}>
        <div>
          <div className={styles.detailMedia}>{image ? <Image src={image} alt={product.name} fill unoptimized priority sizes="(max-width:760px) 100vw, 55vw" /> : <ProductPlaceholder product={product} />}</div>
          {baseRender && <p className={styles.preview}>Neutral base render · Source geometry study. Final materials remain in review.</p>}
          {!baseRender && product.evidence?.imageKind === 'cached_editor_thumbnail' && <p className={styles.preview}>Original game asset preview. Final product photography is pending.</p>}
          {product.evidence?.imageKind === 'source_geometry_studio_render' && <p className={styles.preview}>Original rim geometry · Neutral silver finish study.</p>}
        </div>
        <div>
          <p className={styles.eyebrow}>{productTypeLabel(product)} / {productStatusLabel(product)}</p>
          <h1 className={`${styles.heading} ${styles.detailHeading}`}>{product.name}</h1>
          <p className={styles.description}>{product.description}</p>
          <strong className={styles.availability}>{legacy ? 'Existing collectible reference' : 'In development'}</strong>
          <button type="button" className={`sci-btn sci-btn-primary ${styles.purchase}`} disabled>{legacy ? 'Ownership check unavailable' : 'Purchasing unavailable'}</button>
          <p className={styles.preview}>{legacy ? 'This is a reference for an existing collectible. Your ownership has not been verified. Owner access is not connected yet.' : 'Final artwork, product details and release terms are still being reviewed. This preview does not create an order or grant ownership.'}</p>
          <dl className={styles.facts}>
            <div><dt>Department</dt><dd>{browseSections[section].name}</dd></div>
            <div><dt>Item</dt><dd>{productTypeLabel(product)}</dd></div>
            <div><dt>Catalog ID</dt><dd>{product.id}</dd></div>
            {product.itemType === 'rim_set' && <><div><dt>Proposed set</dt><dd>{product.setContents?.quantity === 4 ? '4 rim positions · FL / FR / RL / RR' : 'To be confirmed'}</dd></div><div><dt>Vehicle fitment</dt><dd>To be verified</dd></div></>}
            {product.itemType === 'totem' && <div><dt>{frankWilder?'Digital model':'Base format'}</dt><dd>{frankWilder?'Integration pending':'Chain + pendant'}</dd></div>}
          </dl>
          <details className={styles.details}><summary>Product readiness</summary>
            <p>{product.collectionId === 'furniture' ? 'Placement, dimensions and the final game object must be verified before release.' : product.itemType === 'rim_set' ? 'The proposed set includes metal rims only, with no tires, brakes or performance parts. Final set geometry and compatibility with each vehicle still need verification.' : 'Exact game mapping and ownership delivery must be approved before release.'}</p>
            {!!product.unresolved?.length && <ul>{product.unresolved.map((item, index) => <li key={index}>{item}</li>)}</ul>}
          </details>
          <details className={styles.details}><summary>Source reference</summary><p>Catalog references are preserved for review. They do not assign onchain token IDs or authorize a new edition.</p><ul>{product.sourceIds.map(id => <li key={id}><code>{id}</code></li>)}</ul>{baseRender && product.image && <div className={styles.sourcePreview}><Image src={product.image} alt={`${product.name} original source preview`} width={256} height={256} unoptimized /><p>Original source preview</p></div>}</details>
        </div>
      </div>
    </div>
  </div>;
}
