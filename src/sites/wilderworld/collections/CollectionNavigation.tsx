import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { SectionHeader } from '@/components/SectionHeader';
import landing from '../Landing.module.css';
import browse from '../accessories/StoreBrowse.module.css';
import styles from './Collections.module.css';

export const collectionLinks = [
  { id: 'vehicles', name: 'Vehicles', href: '/store/collections/vehicles', note: 'Vehicles & rims', image: '/images/wilder-world/radeon-ghostline-showcase-first-frame.jpg.webp', position: '53% center' },
  { id: 'clothing', name: 'Clothing', href: '/store/collections/clothing', note: 'Independent styles', image: '/images/accessories/lifestyle/jackets-v3.webp', position: '74% center' },
  { id: 'furniture', name: 'Furniture', href: '/store/collections/furniture', note: 'Spaces to make your own', image: '/images/wilder-world/personal-compound-apartment-first-frame.jpg.webp', position: '68% center' },
  { id: 'statues', name: 'Statues', href: '/store/collections/statues', note: 'Sculptures & guild objects', image: '/images/marketplace/statue-classical-bust.webp', position: 'center' },
  { id: 'totems', name: 'Totems', href: '/store/collections/totems', note: 'Wearable objects · In development', image: null, position: 'center' },
] as const;

export function CollectionNavigation({ active }: { active?: string }) {
  return <nav className={styles.collectionNav} aria-label="Store collections">
    <Link href="/store" className={styles.marketLink}>Wilder Market</Link>
    <div>{collectionLinks.map(link => <Link key={link.id} href={link.href} aria-current={active === link.id ? 'page' : undefined}>{link.name}</Link>)}</div>
  </nav>;
}

export function CollectionOverview() {
  return <section id="collections" className={`${browse.discovery} ${styles.overview}`} aria-label="Explore collections">
    <SectionHeader eyebrow="Wilder Market" title="Made for your world." subtitle="What you wear. What you drive. Where you belong." />
    <div className={browse.gallery}>
      {collectionLinks.map(link => <Link key={link.id} href={link.href} className={`${landing.gameplayCard} ${browse.categoryCard} ${styles.collectionCard}`} aria-label={`Explore ${link.name}`}>
        {link.image ? <Image src={link.image} alt="" fill unoptimized className={browse.editorial} style={{ objectPosition: link.position }} sizes="(max-width:640px) 100vw, (max-width:1099px) 50vw, 25vw" /> : <div className={styles.futureCover} aria-hidden><span>W / W</span></div>}
        <span className={styles.overviewCaption}><span className={styles.cardNote}>{link.note}</span><span className={browse.cardCaption}><span className={`${landing.gameplayTitle} ${browse.categoryTitle}`}>{link.name}</span><ArrowUpRight size={22} aria-hidden /></span></span>
      </Link>)}
    </div>
  </section>;
}
