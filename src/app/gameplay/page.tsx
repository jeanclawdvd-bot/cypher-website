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

type Placeholder = { id: string; eyebrow: string; title: string; subtitle: string };

const PLACEHOLDERS: Placeholder[] = [
  {
    id: 'explore',
    eyebrow: 'Explore',
    title: 'A Living Open World',
    subtitle:
      'Roam a massive open world driven by RPG missions and discovery. Full details coming soon.',
  },
  {
    id: 'build',
    eyebrow: 'Build',
    title: 'Own and Build Everything',
    subtitle:
      'Own and build everything from land to vehicles. Full details coming soon.',
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

      {PLACEHOLDERS.map((mode) => (
        <section key={mode.id} id={mode.id} className={styles.modeSection}>
          <SectionHeader
            eyebrow={mode.eyebrow}
            title={mode.title}
            subtitle={mode.subtitle}
          />
          <div className={styles.comingSoon}>
            <span className={styles.comingSoonLabel}>Coming Soon</span>
          </div>
        </section>
      ))}
    </div>
  );
}
