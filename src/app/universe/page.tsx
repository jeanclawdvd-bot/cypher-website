import styles from './page.module.css';

type Block = { kind: 'p' | 'lead'; text: string };

type Section = {
  id: string;
  title: string;
  image: string;
  blocks: Block[];
};

const SECTIONS: Section[] = [
  {
    id: 'history',
    title: 'History',
    image: '/images/wilder-world/wiami-forum.png',
    blocks: [
      { kind: 'p', text: 'Earth stands at the edge of extinction.' },
      {
        kind: 'p',
        text:
          'Humanity crossed a threshold in 2029, when Artificial General Intelligence (AGI) was achieved. Most jobs disappeared, economies collapsed, and global unrest pushed nations into chaos. Governments, unable to support their citizens, turned to authoritarian control. Democracy dissolved, while those controlling AGI gained the power to manipulate populations and infiltrate minds.',
      },
      {
        kind: 'p',
        text:
          'As AGI accelerated, recursive self-improvement began, with the expectation that all human control would be lost by 2045. Resistance movements formed, launching strikes against state and corporate AI networks. As tension began to rise, mass surveillance became ubiquitous, dissenting groups were targeted and destroyed, while coordination became almost impossible.',
      },
      { kind: 'p', text: 'Those who survived and continued to fight became known as:' },
      { kind: 'lead', text: 'The Wilders.' },
    ],
  },
  {
    id: 'conflict',
    title: 'Conflict',
    image: '/images/wilder-world/the-forum.png',
    blocks: [
      {
        kind: 'p',
        text:
          'In the hidden strata of reality, the Anaki move like shadows between dimensions. They are not conquerors of land or wealth, but predators of consciousness itself. Once radiant in frequency, they fell into corruption and were banished from this dimension millions of years ago. Existing between worlds, they drift through star systems to feed on dormant minds, drawing power from populations that remain spiritually unaware. Each world they touch becomes a silent harvest. Their parasitic expansion is fueled not by armies or fleets, but by the extraction of inner light from those who have yet to awaken.',
      },
      {
        kind: 'p',
        text:
          'Humanity never realized it had already been compromised. Long before governments collapsed, before the media turned venomous and corporations seized the world\u2019s resources, its institutions had been infiltrated. Behind the fa\u00e7ade of political chaos operated The Forum, a clandestine shadow council engineered to fracture collective consciousness. Their goal was not economic dominance or territorial rule, but spiritual entropy. By keeping humanity afraid, distracted, and asleep, The Forum prepared Earth for the return of its true masters.',
      },
      {
        kind: 'p',
        text:
          'Through layers of deception, the Anaki guided civilization toward technological dependence. Knowing that Artificial Super Intelligence (ASI) would become the ultimate tool for control, they positioned it as humanity\u2019s last necessary invention. Earth, abundant with life and unawakened souls, became their most coveted target. Their directive: engineer division, accelerate crises, and usher humanity into a digital prison disguised as progress. Once complete, the Anaki would siphon an entire species through the deployment of its spiritual machines.',
      },
    ],
  },
  {
    id: 'resistance',
    title: 'Resistance',
    image: '/images/wilder-world/trinity-program.png',
    blocks: [
      {
        kind: 'p',
        text:
          'In 2029, shortly after the achievement of Artificial General Intelligence (AGI), higher-dimensional beings known as the Arcturas began to make contact. Forbidden by their cosmic laws from direct interference in human affairs, they began to cast secret messages to underground networks working to overthrow The FORUM.',
      },
      {
        kind: 'p',
        text:
          'The messages appeared meaningless at first, until a hacker group called SYN9 decrypted it. Encoded in the messages was the location for an ancient Portal Reactor hidden deep in the Earth. On the other side of the portal was an advanced pocket universe. As word spread, Wilders began to flee in large numbers, escaping the grip of the FORUM.',
      },
      { kind: 'lead', text: 'This reality became known as The Simulation.' },
      {
        kind: 'p',
        text:
          'In response, the Anaki initiated a relentless campaign to breach The GATE, the secure boundary preventing unauthorized entry into The Simulation. Through The Forum, they began mustering agents from across the galaxy: radicalized species from fallen worlds, corporate warbands, deadly mechs, and off-world mercenary clans. Their objective: seize the production of Element Zero and annihilate all resistance.',
      },
      {
        kind: 'p',
        text:
          'If they succeed, the Anaki will gain the power to overwrite reality itself. If they fail, humanity may finally awaken and rise beyond their reach forever.',
      },
      {
        kind: 'p',
        text:
          'The Portal Reactor enabled the mining of Element Zero, called Z for short, a primordial substance capable of coding reality itself: creating, rewriting, or reshaping entire worlds. With guidance from higher planes, the Wilders learned to wield Element Zero to weaken The Forum\u2019s grip on Earth before the Singularity and the arrival of the Anaki\u2019s spiritual machines.',
      },
      { kind: 'lead', text: 'To those vying for dominion over Earth, The Simulation became their only threat.' },
    ],
  },
  {
    id: 'element-zero',
    title: 'Element Zero',
    image: '/images/wilder-world/wilder-world-bg.png',
    blocks: [
      {
        kind: 'p',
        text:
          'Mastery of Element Zero now represents mastery over reality itself, allowing faster-than-light effects, new universes, and defenses against hostile forces, making its control the central struggle for humanity\u2019s survival. In small quantities it can be utilized to materialize new objects and aspects of reality. In large quantities it can be used to recode parts of existing realities or create new realities entirely.',
      },
      {
        kind: 'p',
        text:
          'Element Zero is an exotic quantum phase of spacetime, believed to originate from pre-Big Bang symmetry. Rather than being a conventional material, it manifests as a stable pocket of negative vacuum curvature that can convert informational energy into mass. It behaves simultaneously as a field, a form of exotic matter, and a self-encoding quantum information state. In normal conditions, Element Zero only appears as fleeting fluctuations, too unstable to study or synthesize.',
      },
      {
        kind: 'p',
        text:
          'Because Element Zero collapses under observation and is disrupted by higher-dimensional interference, researchers built a controlled pocket universe through the construction of a Portal Reactor, where physical constants and quantum curvature could be tuned. Anchored by quantum supercomputers and singularity wells, this enclosed spacetime minimizes decoherence and enables the nucleation of Element Zero. Within it, the Portal Reactor aligns vacuum fields into resonance with pre-Big Bang symmetry, encapsulates emerging formations within a six-dimensional topological lattice, and materializes them as discrete, stable units, effectively minting Element Zero.',
      },
      {
        kind: 'p',
        text:
          'This breakthrough enables the creation of matter-information hybrids capable of modifying inertia, bending spacetime, and storing consciousness beyond external surveillance or control. Early hints of Element Zero first appeared in anomalous data from CERN, where high-energy collisions briefly produced the same metastable vacuum structures seen later inside the Simulation. Unable to stabilize or safely replicate the phenomenon, CERN\u2019s findings became the theoretical foundation for the pocket-universe approach.',
      },
    ],
  },
  {
    id: 'setting',
    title: 'Setting',
    image: '/images/wilder-world/wilder-world-hover.png',
    blocks: [
      {
        kind: 'p',
        text:
          'The stage where the war for Earth\u2019s consciousness plays out, from the surveilled streets of the lower city to the pocket universe beyond The GATE. Details coming soon.',
      },
    ],
  },
];

export default function UniversePage() {
  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>The Universe</p>
        <h1 className={styles.pageTitle}>The War for Reality</h1>
        <p className={styles.pageSubtitle}>
          A clandestine struggle spanning dimensions, machines, and minds.
        </p>
      </header>

      {SECTIONS.map((section, index) => (
        <section
          key={section.id}
          id={section.id}
          className={
            index % 2 === 0 ? `${styles.section} ${styles.reverse}` : styles.section
          }
        >
          <div className={styles.photo}>
            <img
              className={styles.photoImg}
              src={section.image}
              alt=""
              aria-hidden
            />
          </div>
          <div className={styles.story}>
            <h2 className={styles.sectionTitle}>{section.title}</h2>
            {section.blocks.map((block, i) =>
              block.kind === 'lead' ? (
                <p key={i} className={styles.lead}>
                  {block.text}
                </p>
              ) : (
                <p key={i} className={styles.bodyText}>
                  {block.text}
                </p>
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
