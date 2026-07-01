import { SectionHeader } from '@/components/SectionHeader';
import ImageAccordion, { type AccordionItem } from '@/components/ImageAccordion';
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
        <img
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

      <ImageAccordion items={INDUSTRIES} />
    </div>
  );
}
