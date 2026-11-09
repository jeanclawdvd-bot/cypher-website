import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { WILDER_INDUSTRIES } from '@/lib/wilderCollections';
import { originalCollectionArtwork, originalCollectionName, originalPackPresentation } from '@/app/store/market/originals';
import typography from '@/components/SectionHeader.module.css';
import styles from './ExistingCollections.module.css';
import homepage from '../Landing.module.css';

const collectionNames: Record<string, string> = {
  'land-the-island': 'The Island', 'wheels-genesis': 'Genesis Wheels',
  'moto-genesis': 'Genesis Moto', 'crafts-genesis': 'Genesis Crafts',
  'cribs-genesis': 'Genesis Cribs', packs: 'Sealed packs',
};

export const originalDiscoveryIds=['lamborghini',...WILDER_INDUSTRIES.filter(industry=>industry.id!=='lamborghini').map(industry=>industry.id)];
export function OriginalDiscoveryCard({id}:{id:string}) {
  const industry=WILDER_INDUSTRIES.find(item=>item.id===id);
  if(!industry)return null;
  return <article className={styles.feedBanner} aria-label={`Originals: ${industry.name}`}>
    <Link className={styles.feedArtwork} href={`/store/market?c=${encodeURIComponent(industry.collections[0].slug)}`} aria-label={`Explore ${industry.name}`}>
      <img src={originalCollectionArtwork(industry.collections[0])} alt="" loading="lazy"/>
      <ArrowUpRight size={24} aria-hidden/>
    </Link>
    <div className={styles.feedCopy}>
      <p className={styles.feedKicker}>{industry.id==='packs'?'Sealed Packs':'Explore the originals'}</p>
      <h3 className={`${typography.title} ${styles.feedTitle}`}>{industry.id==='packs'?'Wilder Packs':industry.name}</h3>
      <div className={styles.feedLinks}>{industry.collections.map(collection=><Link key={collection.id} href={`/store/market?c=${encodeURIComponent(collection.slug)}`}><span>{originalPackPresentation(collection)?originalCollectionName(collection):collection.label??collectionNames[collection.id]??industry.name}</span><ArrowUpRight size={14} aria-hidden/></Link>)}</div>
    </div>
  </article>;
}

/** Collection-level discovery only: industry art never stands in for a token. */
export function ExistingCollections({ compact = false }: { compact?: boolean }) {
  return <section id="existing-collections" className={`${styles.section} ${compact ? styles.compact : ''}`} aria-labelledby="existing-collections-title">
    <header className={styles.heading}>
      <h2 id="existing-collections-title" className={typography.title}>Explore the originals</h2>
      <Link href="/store/market">Browse collections <ArrowUpRight size={16} aria-hidden /></Link>
    </header>
    <div className={styles.grid}>
      {WILDER_INDUSTRIES.filter(industry=>industry.id!=='packs'&&industry.id!=='lamborghini').map(industry => <article key={industry.id} className={styles.card}>
        <Link className={styles.art} href={`/store/market?c=${encodeURIComponent(industry.collections[0].slug)}`} aria-label={`Explore ${industry.name}`}>
          <img src={originalCollectionArtwork(industry.collections[0])} alt="" loading="lazy" />
          <h3 className={homepage.gameplayTitle}>{industry.id==='packs'?'Wilder Packs':industry.name}</h3><ArrowUpRight size={19} aria-hidden />
        </Link>
        <div className={styles.links}>{industry.collections.map(collection => <Link key={collection.id} href={`/store/market?c=${encodeURIComponent(collection.slug)}`}>
          <span>{originalPackPresentation(collection)?originalCollectionName(collection):collection.label ?? collectionNames[collection.id] ?? industry.name}</span><ArrowUpRight size={13} aria-hidden />
        </Link>)}</div>
      </article>)}
    </div>
  </section>;
}
