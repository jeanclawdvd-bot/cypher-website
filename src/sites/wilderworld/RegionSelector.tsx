'use client';

import { useState } from 'react';
import styles from './RegionSelector.module.css';

type Region = { name: string; image: string; blurb: string };

const REGIONS: Region[] = [
  {
    name: 'The Island',
    image: '/images/wilder-world/map-island.webp',
    blurb:
      'The dense, circular heart of Wiami \u2014 neighborhoods, landmarks, and 27 bridges spanning its rivers.',
  },
  {
    name: 'The Mainland',
    image: '/images/wilder-world/map-mainland.webp',
    blurb:
      'A resource-rich frontier of 40,000 Land parcels, fueling the mining that powers the economy.',
  },
  {
    name: "No Man's Land",
    image: '/images/wilder-world/map-no-mans-land.webp',
    blurb:
      'A wild, untamed edge of volcanic regions and towering mountains \u2014 still to be revealed.',
  },
];

export default function RegionSelector() {
  const [selected, setSelected] = useState<Region>(REGIONS[0]);

  return (
    <div className={styles.mapFrame}>
      {/* Dim base map of the whole world, always visible. */}
      <img
        className={styles.base}
        src="/images/wilder-world/map-base.webp"
        alt=""
        aria-hidden
      />
      {/* Selected territory lights up on top of the base. */}
      <img
        key={selected.name}
        className={styles.highlight}
        src={selected.image}
        alt=""
        aria-hidden
      />
      <div className={styles.scrim} aria-hidden />
      <div className={styles.overlay}>
        <div className={styles.list}>
          {REGIONS.map((region) => (
            <button
              key={region.name}
              type="button"
              aria-pressed={selected.name === region.name}
              className={`${styles.item} ${
                selected.name === region.name ? styles.itemActive : ''
              }`}
              onClick={() => setSelected(region)}
            >
              {region.name}
            </button>
          ))}
        </div>
        <p className={styles.blurb}>{selected.blurb}</p>
      </div>
    </div>
  );
}
