import { SectionHeader } from '@/components/SectionHeader';
import styles from './page.module.css';

type Feature = { title: string; description: string };

const FIGHT_FEATURES: Feature[] = [
  {
    title: 'Extract or Lose It',
    description:
      'Enter Wiami, clear Breaches, collect loot, and fight your way back to extraction. Anything in your backpack is at risk until it is banked, crafted, or stored. Go in, get rich, get out alive.',
  },
  {
    title: 'Own Your Arsenal',
    description:
      'Weapons, armor, vehicles, and cosmetics become permanent, player-owned assets once extracted and stored. At-risk backpack cargo stays separate from gear secured in storage or owned onchain.',
  },
  {
    title: 'Customize Every Weapon',
    description:
      'Weapons are a major progression system, not just stat sticks. Modify barrels, optics, magazines, ammo types, grips, skins, energy cores, recoil systems, silencers, and rare exotic parts. Build a weapon that feels personally yours.',
  },
  {
    title: 'Build Rare Loadouts',
    description:
      'Convert Shards, components, salvage, and rare drops into weapons, armor, attachments, consumables, and upgrade materials. Every run becomes progression, even when you do not find a perfect item directly.',
  },
  {
    title: 'Risk It All',
    description:
      'The longer you stay in the city, the more you can earn, but the more you stand to lose. High-value loot, rare Shards, and dangerous Breaches create real tension between greed and survival. The best rewards require real risk.',
  },
  {
    title: 'Trade in a Player Economy',
    description:
      'Trade, sell, buy, or rent gear, weapons, cosmetics, vehicles, and rare resources in an open marketplace. Loot has market value because other players want it.',
  },
  {
    title: 'Earn Real Value',
    description:
      'Own, trade, and potentially monetize what you earn in-game through rare drops, crafted gear, marketplace sales, tournaments, and seasonal rewards.',
  },
  {
    title: 'Climb the Season Ranks',
    description:
      'Every season is a new race for status, loot, and economic upside. Gain ranks, XP, achievements, limited-time gear, faction rewards, and leaderboard prizes.',
  },
];

type Placeholder = { id: string; eyebrow: string; title: string; subtitle: string };

const PLACEHOLDERS: Placeholder[] = [
  {
    id: 'race',
    eyebrow: 'Race',
    title: 'High-Speed Street Racing',
    subtitle:
      'Tear through the streets of Wiami in high-speed races. Full details coming soon.',
  },
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

export default function GameplayPage() {
  return (
    <div className={styles.page}>
      <SectionHeader
        as="h1"
        eyebrow="Gameplay"
        title="Choose How You Play"
        subtitle="Wilder World is an extraction-based open-world economy where players fight, loot, customize, trade, and own what they earn."
      />

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

        <div className={styles.featureGrid}>
          {FIGHT_FEATURES.map((feature) => (
            <article key={feature.title} className={styles.featureCard}>
              <h4 className={styles.featureTitle}>{feature.title}</h4>
              <div className={styles.featureDescWrap}>
                <p className={styles.featureDesc}>{feature.description}</p>
              </div>
            </article>
          ))}
        </div>
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
