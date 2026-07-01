import { SectionHeader } from '@/components/SectionHeader';
import styles from './page.module.css';

export default function EconomyPage() {
  return (
    <div className={styles.page}>
      <SectionHeader
        as="h1"
        eyebrow="Economy"
        title="A Real Economy"
        subtitle="Wilder World runs on a fully onchain economy with embedded utility. Earn through quests and challenges, harness in-world resources, trade digital assets and vote to shape Wiami's future."
      />

      <div className={styles.hero}>
        <img className={styles.heroImg} src="/images/wilder-world/gear.avif" alt="" aria-hidden />
      </div>

      <section className={styles.section}>
        <SectionHeader
          eyebrow="Workflow"
          title="From Resource to Revenue"
          subtitle="Mine, refine, build, and sell — every step is onchain, and every asset is yours to trade."
        />
        <div className={styles.diagram}>
          <img
            className={styles.diagramImg}
            src="/images/wilder-world/mine_workflow.avif"
            alt="Economy workflow: mine resources, refine to panels, build, then sell"
          />
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeader
          eyebrow="Mine"
          title="Harvest the Frontier"
          subtitle="Extract raw materials across Wiami's resource-rich mainland. Every haul mints as ERC-20 resource tokens, backed by $WILD."
        />
        <div className={styles.media}>
          <img className={styles.mediaImg} src="/images/wilder-world/mining.png" alt="" aria-hidden />
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeader
          eyebrow="Refine"
          title="Forge Building Panels"
          subtitle="Convert twelve core materials — over 4.5 billion resources in all, from abundant Iron to scarce Cobalt and Lithium — into ERC-1155 building panels."
        />
        <div className={styles.diagram}>
          <img
            className={styles.diagramImg}
            src="/images/wilder-world/resources.avif"
            alt="Resource breakdown across twelve materials with total supply"
          />
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeader
          eyebrow="Build"
          title="Assemble the Future"
          subtitle="Combine building panels to manufacture vehicles, gear, and structures on the assembly line — each a tradeable onchain asset."
        />
        <div className={styles.media}>
          <img className={styles.mediaImg} src="/images/wilder-world/wiami_droid_assembly_line.jpg" alt="" aria-hidden />
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeader
          eyebrow="Sell"
          title="Turn Assets to Income"
          subtitle="List your creations in Wiami's marketplaces and shops, selling to other players for $WILD."
        />
        <div className={styles.media}>
          <img className={styles.mediaImg} src="/images/wilder-world/wiami_shop_interior.png" alt="" aria-hidden />
        </div>
      </section>
    </div>
  );
}
