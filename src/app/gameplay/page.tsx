import { SectionHeader } from '@/components/SectionHeader';
import GameplayPillars from '@/sites/wilderworld/GameplayPillars';
import styles from './page.module.css';

type Feature = { title: string; description: string; image?: string };

const FIGHT_FEATURES: Feature[] = [
  {
    title: 'Extract or Lose It',
    description:
      'Clear Breaches and fight your way back to extraction. The longer you stay, the more you can earn and the more you stand to lose.',
    image: '/images/wilder-world/fight_corner.png',
  },
  {
    title: 'Own Your Arsenal',
    description:
      'Weapons, armor, vehicles, and cosmetics become permanent, player-owned assets once extracted and secured onchain.',
    image: '/images/wilder-world/trinity_boot.png',
  },
  {
    title: 'Customize Every Weapon',
    description:
      'Weapons are a major progression system. Modify barrels, optics, magazines, ammo, grips, skins, energy cores, and rare exotic parts.',
    image: '/images/wilder-world/weapon_dmg.png',
  },
  {
    title: 'Build Rare Loadouts',
    description:
      'Convert Shards, salvage, and rare drops into weapons, armor, and upgrades. Every run becomes progression, even without a perfect drop.',
    image: '/images/wilder-world/Consumables_RPG_Warheads_01.jpg',
  },
  {
    title: 'Trade & Earn',
    description:
      'Trade, sell, buy, and rent gear, cosmetics, vehicles, and rare resources in an open, player-driven marketplace.',
    image: '/images/wilder-world/wild_gold_gray.png',
  },
  {
    title: 'Climb the Season Ranks',
    description:
      'Every season is a new race for status and loot. Gain ranks, XP, limited-time gear, faction rewards, and leaderboard prizes.',
    image: '/images/wilder-world/trinity_sniper.png',
  },
];

const RACE_FEATURES: Feature[] = [
  {
    title: 'Open World',
    description:
      'Race anywhere across Wiami\u2019s streets, highways, and hidden routes in a fully open world.',
    image: '/images/wilder-world/race_open_world.png',
  },
  {
    title: 'Race Modes',
    description:
      'Compete across circuits, sprints, time trials, and high-stakes street events.',
    image: '/images/wilder-world/race_modes.png',
  },
  {
    title: 'Deep Customization',
    description:
      'Tune performance and style \u2014 engines, drivetrain, liveries, rims, and more.',
    image: '/images/wilder-world/race_deep_customization.png',
  },
  {
    title: 'NOS',
    description:
      'Trigger nitrous boosts for explosive bursts of speed when it matters most.',
    image: '/images/wilder-world/race_nos.png',
  },
  {
    title: 'Maintenance',
    description:
      'Manage damage, repairs, fuel, and wear \u2014 keep your machine race-ready.',
    image: '/images/wilder-world/race_maintenance.png',
  },
  {
    title: '100+ Vehicles',
    description:
      'Collect and drive a roster of 100+ vehicles, each with its own feel.',
    image: '/images/wilder-world/race_100_vehicles.png',
  },
];

const OPEN_WORLD_FEATURES: Feature[] = [
  {
    title: 'Missions',
    description:
      'Take on RPG-driven missions and quests woven throughout the open world.',
    image: '/images/wilder-world/Wiami_Missions.png',
  },
  {
    title: 'Street Art',
    description:
      'Discover and create street art that brings the walls of Wiami to life.',
    image: '/images/wilder-world/wiami_space_man.avif',
  },
  {
    title: 'Social Experiences',
    description:
      'Meet up, hang out, and share moments with other players across the city.',
    image: '/images/wilder-world/wiami_social_experiences.png',
  },
  {
    title: 'Shopping',
    description:
      'Browse storefronts and marketplaces for gear, fashion, and rare assets.',
    image: '/images/wilder-world/Wiami_Shopping.png',
  },
  {
    title: 'Nightlife',
    description:
      'Dive into clubs, venues, and after-dark experiences across the city.',
    image: '/images/wilder-world/wiami_nightlife.jpg',
  },
  {
    title: 'Police Encounters',
    description:
      'Outrun and outwit the law in high-stakes encounters across the streets.',
    image: '/images/wilder-world/wiami_police.png',
  },
];

const BUILD_FEATURES: Feature[] = [
  {
    title: 'Mine',
    description:
      'Extract resources from the land to fuel crafting and the $WILD economy.',
  },
  {
    title: 'Build',
    description:
      'Construct and customize everything from vehicles to virtual real estate.',
    image: '/images/wilder-world/wiami_buildings_construction.png',
  },
  {
    title: 'Sell',
    description:
      'Trade and sell your creations and assets in a player-driven marketplace.',
    image: '/images/wilder-world/wiami_sell.png',
  },
];

function FeatureGrid({ features }: { features: Feature[] }) {
  return (
    <div className={styles.featureGrid}>
      {features.map((feature) => (
        <article key={feature.title} className={styles.featureCard}>
          {feature.image ? (
            <>
              <img
                className={styles.featureBg}
                src={feature.image}
                alt=""
                aria-hidden
              />
              <div className={styles.featureScrim} aria-hidden />
            </>
          ) : null}
          <h4 className={styles.featureTitle}>{feature.title}</h4>
          <div className={styles.featureDescWrap}>
            <p className={styles.featureDesc}>{feature.description}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function GameplayPage() {
  return (
    <div className={styles.page}>
      <SectionHeader
        as="h1"
        eyebrow="Gameplay"
        title="Choose How You Play"
        subtitle="Wilder World is an extraction-based open-world economy where players fight, loot, customize, trade, and own what they earn."
      />

      <GameplayPillars />

      <section id="fight" className={styles.modeSection}>
        <SectionHeader
          eyebrow="Fight"
          title="Extraction FPS"
          subtitle="Intense first and third person combat, missions, and extraction."
        />

        <div className={styles.media}>
          <video
            className={styles.mediaVideo}
            src="/videos/wiami-fight.mp4"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden
          />
        </div>

        <header className={styles.featuresHead}>
          <p className={styles.featuresEyebrow}>Features</p>
          <h3 className={styles.featuresTitle}>Survive the Breaches</h3>
        </header>

        <FeatureGrid features={FIGHT_FEATURES} />
      </section>

      <section id="race" className={styles.modeSection}>
        <SectionHeader
          eyebrow="Race"
          title="High-Speed Street Racing"
          subtitle="Tear through the streets of Wiami in high-speed, high-stakes street races."
        />

        <div className={styles.media}>
          <img
            className={styles.mediaVideo}
            src="/images/wilder-world/race_burnout.png"
            alt=""
            aria-hidden
          />
        </div>

        <header className={styles.featuresHead}>
          <p className={styles.featuresEyebrow}>Features</p>
          <h3 className={styles.featuresTitle}>Rule the Streets</h3>
        </header>

        <FeatureGrid features={RACE_FEATURES} />
      </section>

      <section id="explore" className={styles.modeSection}>
        <SectionHeader
          eyebrow="Explore"
          title="A Living Open World"
          subtitle="Roam a massive open world driven by RPG missions, culture, and discovery."
        />

        <div className={styles.media}>
          <img
            className={styles.mediaVideo}
            src="/images/wilder-world/open_world_city.jpg"
            alt=""
            aria-hidden
          />
        </div>

        <header className={styles.featuresHead}>
          <p className={styles.featuresEyebrow}>Features</p>
          <h3 className={styles.featuresTitle}>Live in Wiami</h3>
        </header>

        <FeatureGrid features={OPEN_WORLD_FEATURES} />
      </section>

      <section id="build" className={styles.modeSection}>
        <SectionHeader
          eyebrow="Build"
          title="Own and Build Everything"
          subtitle="Own and build everything from land to vehicles in a player-owned economy."
        />

        <div className={styles.media}>
          <img
            className={styles.mediaVideo}
            src="/images/wilder-world/build_construction.png"
            alt=""
            aria-hidden
          />
        </div>

        <header className={styles.featuresHead}>
          <p className={styles.featuresEyebrow}>Features</p>
          <h3 className={styles.featuresTitle}>Shape Your World</h3>
        </header>

        <FeatureGrid features={BUILD_FEATURES} />
      </section>
    </div>
  );
}
