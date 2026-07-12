/** Ghostline drop: two passes, identical access package, different vehicle.
 *  Single source of truth for /ghostline, /ghostline/[id], and checkout. */

export type IncludeLine = { label: string; detail?: string };

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
    name: 'Ghostline',
    tier: 'Standard',
    price: '$59',
    priceCents: 5900,
    blurb:
      'The standard way in. The Ghostline gets you on the streets of Wiami with a full compound behind you: garage for the car, apartment to live in, and a weapon and gun room to display everything you extract. Three months of full compound access, minted to your account at purchase.',
    includes: [{ label: '1 Vehicle', detail: 'Ghostline' }, ...ACCESS],
    contents: ['Ghostline (standard car)', ...ACCESS_CONTENTS],
    video: '/videos/wiami-race.mp4',
    poster: 'race',
  },
  {
    id: 'vera-solace',
    name: 'Vera Solace',
    tier: 'Premium',
    price: '$149',
    priceCents: 14900,
    blurb:
      'The premium way in. The Vera Solace is the car people move out of the way for, backed by the same full compound: garage, apartment, and a weapon and gun room to display everything you own. Three months of full compound access, minted to your account at purchase.',
    includes: [{ label: '1 Vehicle', detail: 'Vera Solace \u2014 Premium' }, ...ACCESS],
    contents: ['Vera Solace (premium car)', ...ACCESS_CONTENTS],
    video: '/videos/wilder_construction.mp4',
    poster: 'build',
  },
];

export function getGhostlinePass(id: string): GhostlinePass | undefined {
  return GHOSTLINE_PASSES.find((p) => p.id === id);
}
