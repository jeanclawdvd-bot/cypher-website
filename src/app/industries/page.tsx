import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SectionHeader } from '@/components/SectionHeader';
import ImageAccordion, { type AccordionItem } from '@/components/ImageAccordion';
import { WILDER_INDUSTRIES } from '@/lib/wilderCollections';
import { MobileImage } from '@/sites/wilderworld/MobileImage';
import styles from './page.module.css';

const INDUSTRIES: AccordionItem[] = [
  {
    id: 'land',
    title: 'Land',
    description:
      'Claim and develop onchain parcels across Wiami, the foundation of mining resources you can sell for real money.',
    image: '/images/wilder-world/industries_land.png',
  },
  {
    id: 'avatars',
    title: 'Avatars',
    description:
      'Create and own your onchain identity with customizable avatars that represent you across Wiami.',
    image: '/images/wilder-world/industries_avatars.png',
  },
  {
    id: 'wheels',
    title: 'Wheels',
    description:
      'Collect, customize, and race a garage of high performance vehicles built for the streets.',
    image: '/images/wilder-world/race_gameplay.png',
  },
  {
    id: 'weapons',
    title: 'Weapons',
    description:
      'Build, mod, and own an arsenal of firearms and gear, from assault rifles to rare exotic loadouts.',
    image: '/images/wilder-world/weapons_ww_assult_riffle.jpg',
  },
  {
    id: 'beasts',
    title: 'Beasts',
    description:
      'Hunt, tame, and trade the creatures that roam the wilds beyond the city limits.',
    image: '/images/wilder-world/industries_beasts.png',
  },
  {
    id: 'moto',
    title: 'Moto',
    description:
      'Tear through Wiami on customizable motorcycles tuned for speed and style.',
    image: '/images/wilder-world/industries_moto.png',
  },
  {
    id: 'pals',
    title: 'PALs',
    description:
      'Companion bots that fight, craft, and explore alongside you across the simulation.',
    image: '/images/wilder-world/industry_pals.png',
  },
  {
    id: 'crafts',
    title: 'Crafts',
    description:
      'Forge weapons, gear, and upgrades from the resources you gather and salvage.',
    image: '/images/wilder-world/industries_crafts.jpg',
  },
  {
    id: 'cribs',
    title: 'Cribs',
    description:
      'Design and own living spaces that showcase your collection and status in Wiami.',
    image: '/images/wilder-world/industries_cribs.png',
  },
  {
    id: 'kicks',
    title: 'Kicks',
    description:
      'Lace up exclusive, collectible footwear that sets your style apart on the streets of Wiami.',
    image: '/images/wilder-world/industries_kicks.png',
  },
];

// Collection header ("banner") images pulled from OpenSea and saved locally by
// scripts/fetch-industry-heroes.mjs. Industries without a tradeable collection
// (Avatars, Weapons) fall back to a placeholder.
const HERO_IMAGES: Record<string, string> = {
  land: '/images/wilder-world/industries_land_hero.png',
  avatars: '/images/wilder-world/industries_avatars_hero.png',
  wheels: '/images/wilder-world/industries_wheels_hero.png',
  weapons: '/images/wilder-world/industries_weapons_hero.jpg',
  beasts: '/images/wilder-world/industries_beasts_hero.png',
  moto: '/images/wilder-world/industries_moto_hero.png',
  pals: '/images/wilder-world/industries_gens_hero.jpg',
  crafts: '/images/wilder-world/industries_crafts_hero.png',
  cribs: '/images/wilder-world/industries_cribs_hero.png',
  kicks: '/images/wilder-world/industries_kicks_hero.png',
};

const PACK_INDUSTRY_COLLECTIONS: Record<string, string> = {
  avatars: 'pack-avatars',
  weapons: 'pack-weapons',
};

export default function IndustriesPage() {
  return (
    <div className={styles.page}>
      <SectionHeader
        as="h1"
        eyebrow="Industries"
        title="Own Every Industry"
        subtitle="Wilder World is built on player-owned industries like Land, Wheels, Beasts, Moto, PALs, Crafts, Cribs and AIRWILD. Each is a living market where you create, trade and own the assets that power Wiami."
      />

      <div className={styles.hero}>
        <MobileImage
          className={styles.heroImg}
          src="/images/wilder-world/industries.avif"
          alt=""
          aria-hidden
        />
      </div>

      <SectionHeader
        eyebrow="Verticals"
        title="Explore the Industries"
        subtitle="Every vertical is its own onchain market with assets you can create, upgrade, trade and truly own."
      />

      <ImageAccordion items={INDUSTRIES} mobileOptimized />

      <div className={styles.industryList}>
        {INDUSTRIES.map((it) => {
          const industry = WILDER_INDUSTRIES.find((i) => i.id === it.id);
          const slug = industry?.collections[0]?.slug ?? PACK_INDUSTRY_COLLECTIONS[it.id];
          const href = slug ? `/market?c=${slug}` : '/market';
          const heroImage = HERO_IMAGES[it.id];
          return (
            <section key={it.id} id={`industry-${it.id}`} className={styles.industry}>
              <h2 className={styles.industryTitle}>{it.title}</h2>
              <div className={styles.industryHero} aria-hidden>
                {heroImage ? (
                  <MobileImage className={styles.industryHeroImg} src={heroImage} alt="" />
                ) : (
                  <span className={styles.industryHeroLabel}>{it.title} hero</span>
                )}
              </div>
              <Link href={href} className={`sci-btn sci-btn-primary ${styles.industryButton}`}>
                View on Market
                <ArrowRight size={15} />
              </Link>
            </section>
          );
        })}
      </div>
    </div>
  );
}
