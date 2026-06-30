'use client';

import { useState } from 'react';
import styles from './Landing.module.css';

type Faction = { name: string; image: string };
type FactionGroup = { side: string; factions: Faction[] };

const FACTION_GROUPS: FactionGroup[] = [
  {
    side: 'Rebel',
    factions: [
      { name: 'Gharic', image: '/images/wilder-world/trinity-program.png' },
      { name: 'Trinity', image: '/images/wilder-world/wiami-forum.png' },
      { name: 'Sylo', image: '/images/wilder-world/sylo.png' },
    ],
  },
  {
    side: 'Agent',
    factions: [
      { name: 'Wape', image: '/images/wilder-world/the-forum.png' },
      { name: 'Spartan', image: '/images/wilder-world/wilder-world-bg.png' },
    ],
  },
];

export default function FactionSelector() {
  const [selected, setSelected] = useState<Faction>(
    FACTION_GROUPS[0].factions[0]
  );

  return (
    <div className={styles.frame}>
      <img className={styles.bg} src={selected.image} alt="" aria-hidden />
      <div className={styles.scrimDiagonal} aria-hidden />
      <div className={styles.overlay}>
        <div className={styles.factionGroups}>
          {FACTION_GROUPS.map((group) => (
            <div key={group.side} className={styles.factionGroup}>
              <p className={styles.factionSide}>{group.side}</p>
              <div className={styles.factionList}>
                {group.factions.map((faction) => (
                  <button
                    key={faction.name}
                    type="button"
                    aria-pressed={selected.name === faction.name}
                    className={`${styles.factionItem} ${
                      selected.name === faction.name
                        ? styles.factionItemActive
                        : ''
                    }`}
                    onClick={() => setSelected(faction)}
                  >
                    {faction.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
