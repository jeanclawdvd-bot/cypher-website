'use client';

import { useState } from 'react';
import styles from './KeyLocations.module.css';

type Location = { name: string; image: string; blurb: string };

const LOCATIONS: Location[] = [
  {
    name: 'The Beginning',
    image: '/images/wilder-world/key_the_beginning.jpg',
    blurb:
      'The spawn point where every Wilder first drops into Wiami, taking their first steps into the living simulation.',
  },
  {
    name: 'The Trenches',
    image: '/images/wilder-world/key_the_trenches.jpg',
    blurb:
      'A gritty frontline district where the fiercest street combat and high-stakes extraction runs play out nightly.',
  },
  {
    name: 'Hydrolink',
    image: '/images/wilder-world/key_hydrolink.jpg',
    blurb:
      'The canal network and ring-tech waterworks that keep the elevated city of Wiami alive, flowing, and moving.',
  },
  {
    name: 'DROID',
    image: '/images/wilder-world/key_droid.jpg',
    blurb:
      'A robotics and machine-culture hub humming with autonomous bots, builders, and the tech that runs Wiami.',
  },
  {
    name: 'The Armory',
    image: '/images/wilder-world/key_the_armory.jpg',
    blurb:
      'The place where weapons, armor, and gear are acquired, modded, and stored before heading out on a run.',
  },
  {
    name: 'Agora Alley',
    image: '/images/wilder-world/key_agora_alley.jpg',
    blurb:
      'A bustling market street for trade, culture, and gathering in the crowded, neon-lit heart of downtown Wiami.',
  },
  {
    name: 'Train Station',
    image: '/images/wilder-world/key_train_station.jpg',
    blurb:
      'The central transit hub linking every district of the Island to one another and the world beyond the GATE.',
  },
  {
    name: 'Trinity Island',
    image: '/images/wilder-world/key_trinity_island.jpg',
    blurb:
      'A landmark island tied to the Trinity program, holding some of the deepest lore and secrets of the simulation.',
  },
  {
    name: 'Kadon Cafe',
    image: '/images/wilder-world/key_kadon_cafe.jpg',
    blurb:
      'A beloved cafe and gathering spot where Wilders meet, trade stories, and plan their next move over the counter.',
  },
];

export default function KeyLocations() {
  const [selected, setSelected] = useState<Location>(LOCATIONS[0]);

  return (
    <div className={styles.frame}>
      <img
        key={selected.name}
        className={styles.bg}
        src={selected.image}
        alt=""
        aria-hidden
      />
      <div className={styles.scrim} aria-hidden />
      <div className={styles.overlay}>
        <div className={styles.list}>
          {LOCATIONS.map((location) => (
            <button
              key={location.name}
              type="button"
              aria-pressed={selected.name === location.name}
              className={`${styles.item} ${
                selected.name === location.name ? styles.itemActive : ''
              }`}
              onClick={() => setSelected(location)}
            >
              {location.name}
            </button>
          ))}
        </div>
        <p className={styles.blurb}>{selected.blurb}</p>
      </div>
    </div>
  );
}
