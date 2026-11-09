'use client';
import ProductRating from '../marketplace/ProductRating';
import EditionSummary from '../marketplace/EditionSummary';
import WildPriceQuote from '../marketplace/WildPriceQuote';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, ShoppingBag, ChevronRight } from 'lucide-react';
import { individualStoreProducts } from './fashion';
import { findMarketProduct } from '../marketplace/catalog';
import { useDemoBag } from './useDemoBag';
import DemoBag from './DemoBag';
import landing from '../Landing.module.css';
import GameProductDetails, { ProductMaterialPicker } from '../marketplace/GameProductDetails';
import { approvedProductEditorials } from '../marketplace/campaign-media';
import ProductMarketPanel from '../marketplace/ProductMarketPanel';
import ProductReviews from '../marketplace/ProductReviews';
import LocalListingPanel from '../marketplace/LocalListingPanel';
import MobilePurchaseBar from '../marketplace/MobilePurchaseBar';
import ClothingFitPicker from '../marketplace/ClothingFitPicker';
import { clothingStyleName } from '../marketplace/clothing-fit';
import styles from './ProductDetail.module.css';

type Product = (typeof individualStoreProducts)[number];

export default function ProductDetail({ product }: { product: Product }) {
  const marketProduct = findMarketProduct(product.id)!;
  const materialOptions = marketProduct.variants;
  const defaultColor = materialOptions.find(color => color.id === (marketProduct.defaultVariantId??product.defaultColorId)) ?? materialOptions[0];
  const [colorId, setColorId] = useState(defaultColor?.id);
  const [mediaId, setMediaId] = useState('product');
  const [bagOpen, setBagOpen] = useState(false);
  const { count, addItem } = useDemoBag();
  useEffect(() => {
    const readColor = () => {
      const requested = new URLSearchParams(window.location.search).get('color');
      setColorId(materialOptions.find(color => color.id === requested)?.id ?? defaultColor?.id);
      setMediaId('product');
    };
    readColor();
    window.addEventListener('popstate', readColor);
    return () => window.removeEventListener('popstate', readColor);
  }, [product, defaultColor?.id]);
  const color = materialOptions.find(item => item.id === colorId) ?? defaultColor;
  const originalColor = marketProduct.sourceVariants?.find(item=>item.id===colorId)?.image===color?.image?product.colorways.find(item => item.id === colorId):undefined;
  const editorials = approvedProductEditorials(product.id,color?.id);
  const media = [{ id: 'product', image: color ? color.image : product.image, alt: product.name, label: 'Product', campaign:false, position:undefined }, ...editorials];
  const active = media.find(item => item.id === mediaId) ?? media[0];
  function selectColor(id: string) {
    setColorId(id); setMediaId('product');
    const url = new URL(window.location.href);
    url.searchParams.set('color', id);
    window.history.replaceState(null, '', url);
  }
  return <>
    <main className={styles.page}>
      <nav className={styles.toolbar} aria-label="Product navigation"><div className={styles.breadcrumb}><Link href="/store"><ArrowLeft size={14}/> Store</Link><ChevronRight size={12}/><Link href={`/store/collections/clothing?category=${product.category}`}>{product.categoryLabel}</Link></div><button type="button" onClick={() => setBagOpen(true)} aria-label={`Open bag, ${count} items`}><ShoppingBag size={17} /> Bag ({count})</button></nav>
      <div className={styles.layout}>
        <section className={styles.media} aria-label="Product imagery">
          <div className={`${styles.viewer} ${active.id !== 'product' ? styles.editorial : ''}`} data-product-hero data-image-kind={active.id==='product'?'product':'editorial'}><span className={styles.imageLabel}>{active.id==='product'?'The wardrobe':'Editorial'}</span>{active.image?<Image key={active.image} src={active.image} alt={active.id==='product'?product.name:`${product.name} — ${active.alt}`} fill priority unoptimized style={{objectPosition:active.position}} sizes="(max-width: 900px) 100vw, 58vw" />:<div className={styles.pendingImage}><span style={{background:color?.swatch}}/><strong>{color?.name}</strong><p>Image coming soon</p></div>}</div>
          {media.length > 1 && <div className={styles.thumbnails} aria-label="Product gallery">{media.filter(item=>item.image).map((item,index) => <button type="button" key={item.id} onClick={() => setMediaId(item.id)} aria-label={item.id==='product'?'View Product':`View Editorial ${index}`} aria-pressed={active.id === item.id} className={item.id === 'product' ? styles.productThumb : ''} data-image-kind={item.id==='product'?'product':'editorial'}><Image src={item.image!} alt="" fill unoptimized sizes="100px" /></button>)}</div>}
        </section>
        <section className={styles.info} aria-label="Product information">
          <p className={styles.eyebrow}><Link href={`/store/collections/clothing?brand=${encodeURIComponent(product.brand)}`}>{product.brand}</Link> <span>{[marketProduct.gender !== 'Unisex' && marketProduct.gender, product.categoryLabel].filter(Boolean).join(' / ')}</span></p>
          <h1 className={`${landing.heading} ${styles.heading}`}>{clothingStyleName(product.id,product.name)}</h1>
          <ProductRating productId={product.id} variantIds={materialOptions.map(option=>option.id)}/>
          <p className={styles.blurb}>{product.description}</p>
          <div className={styles.price}><div><strong>{product.price}</strong><WildPriceQuote usdCents={product.priceCents}/></div><span>USD</span></div>
          <ClothingFitPicker productId={product.id}/>
          <ProductMaterialPicker productId={product.id} options={materialOptions} selectedId={color?.id} onSelect={selectColor} regionLabel="Color" label="Color"/>
          <button className={`sci-btn sci-btn-primary ${styles.addButton}`} type="button" onClick={() => { addItem({ productId: product.id, colorwayId: color?.id }); setBagOpen(true); }}>Add to bag <ArrowUpRight size={17} strokeWidth={2.2} /></button>
          <p className={styles.preview}>Coming soon</p>
          <EditionSummary productId={product.id} variantId={color?.id}/>
          <GameProductDetails productId={product.id} variantId={color?.id} story={product.lore} specifications={[
            {label:'Collection',value:product.collection},
            {label:'Finish',value:originalColor?.finish ?? color?.name ?? product.trim},
            {label:'Material',value:originalColor?.material ?? color?.materialSpec?.family ?? product.material},
          ]}/>
        </section>
      </div>
      {color&&<ProductMarketPanel productId={product.id} variantId={color.id} variantName={color.name} previewPriceCents={marketProduct.priceCents} variants={materialOptions.map(option=>({id:option.id,name:option.name,previewPriceCents:marketProduct.priceCents}))} onVariantSelect={selectColor}/>}
      {color&&<LocalListingPanel productId={product.id} variantId={color.id} variantName={color.name}/>}
      <ProductReviews preview key={product.id} productId={product.id} variantId={color?.id} variantName={color?.name} variantOptions={materialOptions}/>
    </main>
    <MobilePurchaseBar priceCents={marketProduct.priceCents} selection={color?.name} label="Add to bag" hidden={bagOpen} onBuy={()=>{addItem({productId:product.id,colorwayId:color?.id});setBagOpen(true);}}/>
    <DemoBag open={bagOpen} onClose={() => setBagOpen(false)} />
  </>;
}
