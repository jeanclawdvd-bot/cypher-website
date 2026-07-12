/** Ghostline drop: two passes, identical access package, different vehicle.
 *  Single source of truth for /ghostline, /ghostline/[id], and checkout. */

export type IncludeLine = { label: string; detail?: string };

export type GhostlineMedia = {
  type: 'video' | 'image';
  src: string;
  label: string;
  alt: string;
};

export type GhostlinePass = {
  id: string;
  name: string;
  tier: 'Standard' | 'Premium';
  /** PLACEHOLDER pricing — confirm before launch. */
  price: string;
  priceCents: number;
  blurb: string;
  includes: IncludeLine[];
  contents: string[];
  video: string;
  poster: string;
  media: GhostlineMedia[];
};

/** Shared access package: everything except the car is identical. */
const ACCESS: IncludeLine[] = [
  { label: 'Full compound access', detail: '3 months' },
  { label: 'Garage' },
  { label: 'Full apartment' },
  { label: 'Weapon and gun room', detail: 'Display all assets' },
];

const ACCESS_CONTENTS = [
  'Full compound access (3 months)',
  'Garage',
  'Full apartment',
  'Weapon and gun room',
];

export const GHOSTLINE_PASSES: GhostlinePass[] = [
  {
    id: 'ghostline',
    name: 'Radeon Ghostline',
    tier: 'Standard',
    price: '$59',
    priceCents: 5900,
    blurb:
      'A street car tuned for Wiami’s alleys, bridges, and neon-lit straights. Agile, understated, and ready for whatever the city throws at it.',
    includes: [{ label: '1 Vehicle', detail: 'Radeon Ghostline' }, ...ACCESS],
    contents: ['Radeon Ghostline (standard car)', ...ACCESS_CONTENTS],
    video: '/videos/wiami-race.mp4',
    poster: 'race',
    media: [
      { type: 'video', src: '/videos/wiami-race.mp4', label: 'Ghostline on the streets of Wiami', alt: 'Ghostline driving through Wiami' },
      { type: 'image', src: '/images/wilder-world/race_gameplay.png', label: 'Street-racing gameplay', alt: 'Wilder World street-racing gameplay' },
      { type: 'image', src: '/images/wilder-world/race_open_world.png', label: 'Open-world driving', alt: 'Vehicle driving through the open world of Wiami' },
    ],
  },
  {
    id: 'vera-solace',
    name: 'Vera Solace',
    tier: 'Premium',
    price: '$149',
    priceCents: 14900,
    blurb:
      'A sports car built to chase the edge of speed. Sleek, aggressive, and tuned to make every second on the road feel like a countdown.',
    includes: [{ label: '1 Vehicle', detail: 'Vera Solace \u2014 Premium' }, ...ACCESS],
    contents: ['Vera Solace (premium car)', ...ACCESS_CONTENTS],
    video: '/videos/wilder_construction.mp4',
    poster: 'build',
    media: [
      { type: 'video', src: '/videos/wilder_construction.mp4', label: 'Vera Solace presentation', alt: 'Vera Solace presentation in Wilder World' },
      { type: 'image', src: '/images/wilder-world/race_deep_customization.png', label: 'Deep customization', alt: 'Wilder World vehicle customization' },
      { type: 'image', src: '/images/wilder-world/race_nos.png', label: 'Performance', alt: 'High-performance Wilder World vehicle' },
    ],
  },
];

export function getGhostlinePass(id: string): GhostlinePass | undefined {
  return GHOSTLINE_PASSES.find((p) => p.id === id);
}
