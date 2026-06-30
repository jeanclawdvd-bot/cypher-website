import { SectionHeader } from '@/components/SectionHeader';
import ImageAccordion, { type AccordionItem } from '@/components/ImageAccordion';
import styles from './page.module.css';

const INDUSTRIES: AccordionItem[] = [
  {
    id: 'land',
    title: 'Land',
    description:
      'Claim and develop onchain parcels across Wiami, the foundation of mining and the $WILD economy.',
    image: '/images/wilder-world/mining.png',
  },
  {
    id: 'wheels',
    title: 'Wheels',
    description:
      'Collect, customize, and race a garage of high performance vehicles built for the streets.',
    image: '/images/wilder-world/race_gameplay.png',
  },
  {
    id: 'beasts',
    title: 'Beasts',
    description:
      'Hunt, tame, and trade the creatures that roam the wilds beyond the city limits.',
    image: '/images/wilder-world/meow.png',
  },
  {
    id: 'moto',
    title: 'Moto',
    description:
      'Tear through Wiami on customizable motorcycles tuned for speed and style.',
    image: '/images/wilder-world/race_burnout.png',
  },
  {
    id: 'pals',
    title: 'PALs',
    description:
      'Companion bots that fight, craft, and explore alongside you across the simulation.',
    image: '/images/wilder-world/trinity.png',
  },
  {
    id: 'crafts',
    title: 'Crafts',
    description:
      'Forge weapons, gear, and upgrades from the resources you gather and salvage.',
    image: '/images/wilder-world/gear.avif',
  },
  {
    id: 'cribs',
    title: 'Cribs',
    description:
      'Design and own living spaces that showcase your collection and status in Wiami.',
    image: '/images/wilder-world/build_construction.png',
  },
  {
    id: 'airwild',
    title: 'AIRWILD',
    description:
      'Take to the skies with aircraft and drones that open the world from above.',
    image: '/images/wilder-world/wilder-world-bg.png',
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
