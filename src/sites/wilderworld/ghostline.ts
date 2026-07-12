/** Ghostline drop: two passes, identical access package, different vehicle.
 *  Single source of truth for /vehicles, /vehicles/[id], and checkout. */

export type IncludeLine = { label: string; detail?: string; children?: IncludeLine[] };

export type GhostlineMedia = {
  type: 'video' | 'image';
  src: string;
  label: string;
  alt: string;
  poster?: string;
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
  heroVideo?: string;
  thumbnailVideo?: string;
  thumbnailPoster?: string;
  poster: string;
  media: GhostlineMedia[];
};

const PERSONAL_COMPOUND: IncludeLine = {
  label: 'Personal Compound',
  detail: 'Full access · 3 months',
  children: [
    { label: 'Garage', detail: 'Display your vehicles' },
    { label: 'Apartment', detail: 'Display your collectibles' },
    { label: 'Weapon & Gear Room', detail: 'Display your weapons and gear' },
  ],
};

export const GHOSTLINE_PASSES: GhostlinePass[] = [
  {
    id: 'ghostline',
    name: 'Radeon Ghostline',
    tier: 'Standard',
    price: '$19',
    priceCents: 1900,
    blurb:
      'A street car tuned for Wiami’s alleys, bridges, and neon-lit straights. Agile, understated, and ready for whatever the city throws at it.',
    includes: [
      {
        label: '1 Vehicle',
        detail: 'Radeon Ghostline · Standard · Lifetime ownership',
      },
      PERSONAL_COMPOUND,
      { label: 'Customization', detail: 'Basic customization · Standard plate' },
    ],
    contents: [
      'Radeon Ghostline · Standard · Lifetime ownership',
      'Personal Compound · Full access · 3 months',
      'Customization · Basic customization · Standard plate',
    ],
    video: '/videos/radeon-ghostline-showcase.mp4',
    heroVideo: '/videos/radeon-ghostline-showcase.mp4',
    thumbnailVideo: '/videos/radeon-ghostline-showcase.mp4',
    thumbnailPoster: '/images/wilder-world/radeon-ghostline-showcase-poster.jpg',
    poster: 'ghostline-showcase',
    media: [
      { type: 'video', src: '/videos/radeon-ghostline-showcase.mp4', label: 'Radeon Ghostline presentation', alt: 'Radeon Ghostline presentation in Wilder World' },
      { type: 'video', src: '/videos/personal-compound-apartment.mp4', label: 'Personal Compound apartment', alt: 'Personal Compound apartment interior in Wilder World', poster: '/images/wilder-world/personal-compound-apartment-poster.jpg' },
      { type: 'video', src: '/videos/weapon-and-gear-room.mp4', label: 'Weapon & Gear Room', alt: 'Weapon and Gear Room armor bench in Wilder World', poster: '/images/wilder-world/weapon-and-gear-room-poster.jpg' },
    ],
  },
  {
    id: 'vera-solis',
    name: 'Vera Solis',
    tier: 'Premium',
    price: '$59',
    priceCents: 5900,
    blurb:
      'A sports car built to chase the edge of speed. Sleek, aggressive, and tuned to make every second on the road feel like a countdown.',
    includes: [
      {
        label: '1 Vehicle',
        detail: 'Vera Solis · Premium · Lifetime ownership',
      },
      PERSONAL_COMPOUND,
      { label: 'Customization', detail: 'Full customization · Custom plate' },
    ],
    contents: [
      'Vera Solis · Premium · Lifetime ownership',
      'Personal Compound · Full access · 3 months',
      'Customization · Full customization · Custom plate',
    ],
    video: '/videos/vera-solis-showcase.mp4',
    heroVideo: '/videos/vera-solis-showcase.mp4',
    thumbnailVideo: '/videos/vera-solis-showcase.mp4',
    thumbnailPoster: '/images/wilder-world/vera-solis-showcase-poster.jpg',
    poster: 'vera-solis-showcase',
    media: [
      { type: 'video', src: '/videos/vera-solis-showcase.mp4', label: 'Vera Solis presentation', alt: 'Vera Solis presentation in Wilder World' },
      { type: 'video', src: '/videos/personal-compound-apartment.mp4', label: 'Personal Compound apartment', alt: 'Personal Compound apartment interior in Wilder World', poster: '/images/wilder-world/personal-compound-apartment-poster.jpg' },
      { type: 'video', src: '/videos/weapon-and-gear-room.mp4', label: 'Weapon & Gear Room', alt: 'Weapon and Gear Room armor bench in Wilder World', poster: '/images/wilder-world/weapon-and-gear-room-poster.jpg' },
    ],
  },
];

export function getGhostlinePass(id: string): GhostlinePass | undefined {
  return GHOSTLINE_PASSES.find((p) => p.id === id);
}
