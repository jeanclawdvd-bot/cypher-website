'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,ChevronRight} from 'lucide-react';
import type {OriginalFamily,OriginalEdition} from '@/lib/original-product-groups';
import {getEntryBySlug} from '@/lib/wilderCollections';
import {MarketHeader} from '@/sites/wilderworld/marketplace/Marketplace';
import ProductMarketPanel from '@/sites/wilderworld/marketplace/ProductMarketPanel';
import ProductRating from '@/sites/wilderworld/marketplace/ProductRating';
import ProductReviews from '@/sites/wilderworld/marketplace/ProductReviews';
import {originalCollectionEyebrow,originalCollectionName,originalItemHref} from './originals';
import typography from '@/components/SectionHeader.module.css';
import styles from './originals.module.css';

const rarityOrder=['Common','Uncommon','Rare','Epic','Legendary','WILD'];
const trait=(edition:OriginalEdition,name:string)=>edition.traits.find(t=>t.type===name)?.value??'';
const label=(edition:OriginalEdition)=>['Rarity','Primary Material','Secondary Color','Accent Color'].map(key=>trait(edition,key)).filter(Boolean).join(' · ');

export default function OriginalGroupedProduct({family,initialVariant}:{family:OriginalFamily;initialVariant?:string}) {
  const editions=[...family.variants].sort((a,b)=>rarityOrder.indexOf(trait(a,'Rarity'))-rarityOrder.indexOf(trait(b,'Rarity'))||label(a).localeCompare(label(b)));
  const defaultId=editions.find(v=>v.id===initialVariant)?.id??editions[0].id;
  const [variantId,setVariantId]=useState(defaultId);
  const [motion,setMotion]=useState(false);
  const [failed,setFailed]=useState(false);
  const edition=editions.find(v=>v.id===variantId)??editions[0];
  const rarity=trait(edition,'Rarity');
  const entry=getEntryBySlug(family.slug)!;
  const productId=`original-family:${family.chainId}:${family.contract}:${family.id}`;
  const collectionHref=`/store/market?c=${encodeURIComponent(family.slug)}`;
  const copyHref=originalItemHref(family.slug,{identifier:edition.members[0].tokenId,contract:family.contract,chain:family.chain});
  const variantOptions=editions.map(v=>({id:v.id,name:label(v)}));
  function choose(id:string) {
    if(!editions.some(v=>v.id===id))return;
    setVariantId(id);setMotion(false);setFailed(false);
    const url=new URL(window.location.href);url.searchParams.set('variant',id);window.history.replaceState(null,'',url);
  }
  useEffect(()=>{const read=()=>{const id=new URLSearchParams(window.location.search).get('variant');setVariantId(editions.some(v=>v.id===id)?id!:defaultId);setMotion(false);setFailed(false);};window.addEventListener('popstate',read);return()=>window.removeEventListener('popstate',read);},[family.id,defaultId]); // eslint-disable-line react-hooks/exhaustive-deps
  return <main className={styles.page}>
    <MarketHeader department="existing" collectionSlug={family.slug}/>
    <div className={styles.content}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Wilder World</Link><ChevronRight size={12}/><Link href={collectionHref}>{originalCollectionName(entry)}</Link><ChevronRight size={12}/><span>{family.name}</span></nav>
      <div className={styles.productLayout}>
        <section className={styles.gallery} aria-label="Product images">
          <div className={styles.productMedia} data-product-hero>{failed?<span className={styles.mediaMissing}>Artwork unavailable</span>:motion&&edition.animationUrl?<video key={edition.id} src={edition.animationUrl} poster={edition.image??undefined} controls autoPlay muted loop playsInline onError={()=>{setMotion(false);}}/>:edition.image?<img key={edition.id} src={edition.image} alt={`${family.name} · ${label(edition)}`} onError={()=>setFailed(true)}/>:<span className={styles.mediaMissing}>Artwork unavailable</span>}<span className={styles.mediaTag}>Original collection</span></div>
          {edition.animationUrl&&<div className={styles.galleryTabs}><button aria-pressed={!motion} onClick={()=>setMotion(false)}>Product</button><button aria-pressed={motion} onClick={()=>setMotion(true)}>Motion</button></div>}
        </section>
        <section className={styles.productInfo} aria-label="Product information">
          <Link href={collectionHref} className={styles.kicker}>{originalCollectionEyebrow(entry)}</Link>
          <h1 className={typography.title}>{family.name}</h1>
          <ProductRating productId={productId} variantIds={editions.map(v=>v.id)}/>
          <p className={styles.productDescription}>{family.description}</p>
          <div className={styles.editionPicker}>
            <p className={styles.kicker}>Choose your version</p>
            <div className={styles.rarityChoices} aria-label="Rarity">{rarityOrder.filter(r=>editions.some(v=>trait(v,'Rarity')===r)).map(r=><button key={r} aria-pressed={rarity===r} onClick={()=>choose(editions.find(v=>trait(v,'Rarity')===r)!.id)}>{r}</button>)}</div>
            <label htmlFor="original-edition-finish">Material & color</label>
            <select id="original-edition-finish" value={edition.id} onChange={e=>choose(e.target.value)}>{editions.filter(v=>trait(v,'Rarity')===rarity).map(v=><option key={v.id} value={v.id}>{label(v)}</option>)}</select>
            <dl className={styles.traits} aria-live="polite">{edition.traits.filter(t=>['Primary Material','Secondary Color','Accent Color'].includes(t.type)).map(t=><div key={t.type}><dt>{t.type}</dt><dd>{t.value}</dd></div>)}</dl>
          </div>
          <div className={styles.priceBlock}><p>Selected edition · {rarity}</p><strong>{edition.members.length.toLocaleString()} copies recorded</strong><p className={styles.editionCountNote}>Across {family.variants.length} versions, {family.count.toLocaleString()} copies of this item were observed on {new Date(family.observedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})}. These are recorded items, not live listings or edition caps.</p></div>
          <div className={styles.purchaseActions}><a className={styles.primary} href="#item-market">Explore the market<ArrowUpRight size={17}/></a><Link className={styles.secondary} href={copyHref}>View an original copy<ArrowUpRight size={16}/></Link></div>
        </section>
      </div>
      <section className={styles.productDetails}><header><p className={styles.kicker}>The details</p><h2 className={typography.title}>Built for your loadout.</h2></header><div className={styles.detailColumns}><dl className={styles.traits}>{family.traits.map(t=><div key={t.type}><dt>{t.type}</dt><dd>{t.value}</dd></div>)}</dl><div className={styles.collectibleNotes}><h3>One item. Different editions.</h3><p>Switch versions to see the matching rarity, material and colors. Each version has its own market; a listing always refers to a specific owned copy.</p><h3>In the simulation</h3><p>Availability and use follow the original collection and current game build. Appearance traits do not establish performance bonuses, upgrade effects or compatibility.</p></div></div></section>
      <div id="item-market" className={styles.productMarket}>
        <ProductMarketPanel productId={productId} variantId={edition.id} variantName={`${family.name} · ${label(edition)}`} variants={variantOptions} onVariantSelect={choose}/>
        <ProductReviews preview key={productId} productId={productId} variantId={edition.id} variantName={label(edition)} variantOptions={variantOptions}/>
      </div>
    </div>
  </main>;
}
