'use client';

import { useState } from 'react';
import styles from './Neighborhoods.module.css';

const MAP = '/images/wilder-world/island-landplots.webp';
const ZOOM = 1.9;

type Neighborhood = {
  name: string;
  tag: string;
  /* Zoom focus on the landplots map (percent of the image), or full island. */
  x: number;
  y: number;
  full?: boolean;
  /* Optional dedicated thumbnail image; falls back to the zoomed map. */
  thumb?: string;
  /* Optional dedicated large (right-side) image; falls back to the zoomed map. */
  shot?: string;
  blurb: string;
};

const NEIGHBORHOODS: Neighborhood[] = [
  {
    name: 'District ZERO',
    tag: 'Industrial',
    x: 20,
    y: 24,
    thumb: '/images/wilder-world/island_neighborhood_outline_DistrictZERO.jpg',
    blurb:
      "Wiami's industrial heart. Foundries, fabrication, and logistics run around the clock, refining the resources mined across the world into the goods, gear, and machines that keep the city alive.",
  },
  {
    name: 'Haven Heights',
    tag: 'Innovation',
    x: 30,
    y: 32,
    thumb: '/images/wilder-world/island_neighborhood_outline_HavenHeights.jpg',
    shot: '/images/wilder-world/island_shot_haven_heights.png',
    blurb:
      'Where innovation meets artistry. Fashion houses, auto ateliers, and cybernetics labs push the edge of style and self. Couture, custom wheels, and chrome are born on these streets.',
  },
  {
    name: 'Tranquility Gardens',
    tag: 'Sustainability',
    x: 40,
    y: 39,
    thumb: '/images/wilder-world/island_neighborhood_outline_TranquilityGardens.jpg',
    blurb:
      "Wiami's green lung. Vertical farms, eco-retail, and living architecture make this the city's sustainability hub, proving the simulation can grow as gracefully as it builds.",
  },
  {
    name: 'Little Meow',
    tag: 'Culture',
    x: 45,
    y: 45,
    thumb: '/images/wilder-world/island_neighborhood_outline_LittleMeow.jpg',
    shot: '/images/wilder-world/island_shot_little_meow.png',
    blurb:
      'Rebellious, loud, and alive: the home of the Wilders. Entertainment-driven and fiercely independent, this is where culture is made and the spirit of the resistance burns brightest.',
  },
  {
    name: 'Space Mind',
    tag: 'Consciousness',
    x: 52,
    y: 53,
    thumb: '/images/wilder-world/island_neighborhood_outline_SpaceMind.jpg',
    blurb:
      'Where technology meets the soul. A district devoted to consciousness expansion, blending neural tech and spirituality to explore what the mind can become inside the simulation.',
  },
  {
    name: 'NEXUS',
    tag: 'Finance',
    x: 62,
    y: 60,
    thumb: '/images/wilder-world/island_neighborhood_outline_Nexus.jpg',
    shot: '/images/wilder-world/island_shot_nexus.png',
    blurb:
      'The crypto-financial core. Skyscrapers, DAOs, and data centers concentrate the on-chain economy, the place where capital, code, and governance converge.',
  },
  {
    name: 'Flashing Lights',
    tag: 'Nightlife',
    x: 73,
    y: 67,
    thumb: '/images/wilder-world/island_neighborhood_outline_FlashingLights.jpg',
    blurb:
      "Neon-soaked and never dark. Wiami's nightlife and immersive entertainment district: clubs, arenas, and experiences that run until dawn.",
  },
  {
    name: 'North Star',
    tag: 'Luxury',
    x: 86,
    y: 75,
    thumb: '/images/wilder-world/island_neighborhood_outline_NorthStar.jpg',
    blurb:
      "Serene, exclusive, and above it all. The luxury residential zone of quiet streets, skyline views, and rarefied calm where Wiami's elite reside.",
  },
];

function zoomStyle(n: Neighborhood) {
  if (n.full) {
    return { transform: 'scale(1)', transformOrigin: 'center' };
  }
  return { transform: `scale(${ZOOM})`, transformOrigin: `${n.x}% ${n.y}%` };
}

export default function Neighborhoods() {
  const [active, setActive] = useState(0);
  const current = NEIGHBORHOODS[active];

  return (
    <div className={styles.wrap}>
      <div className={styles.info}>
        <div className={styles.head}>
          <p className={styles.tag}>{current.tag}</p>
          <h3 className={styles.name}>{current.name}</h3>
          <p className={styles.blurb}>{current.blurb}</p>
        </div>
        <div className={styles.thumbs}>
          {NEIGHBORHOODS.map((n, i) => (
            <button
              key={n.name}
              type="button"
              aria-pressed={i === active}
              aria-label={n.name}
              title={n.name}
              className={`${styles.thumb} ${i === active ? styles.thumbActive : ''}`}
              onClick={() => setActive(i)}
            >
              <img
                className={styles.thumbImg}
                src={n.thumb ?? MAP}
                alt=""
                aria-hidden
                style={n.thumb ? undefined : zoomStyle(n)}
              />
            </button>
          ))}
        </div>
      </div>
      <div className={styles.stage}>
        <img
          key={current.name}
          className={styles.stageImg}
          src={current.shot ?? MAP}
          alt=""
          aria-hidden
          style={current.shot ? undefined : zoomStyle(current)}
        />
        <span className={styles.stageTag}>{current.name}</span>
      </div>
    </div>
  );
}
