import { writeFileSync, statSync, readFileSync } from 'node:fs';

const d = JSON.parse(readFileSync('scripts/traits-data.json', 'utf8'));

const header = `/* ---------------------------------------------------------------------------
   Static, pre-fetched OpenSea trait categories for every Wilder collection,
   keyed by OpenSea collection slug.

   Collection traits are effectively static (minted, immutable NFT attributes),
   so the market embeds them here instead of fetching /api/market/traits at
   runtime. This removes the filter-panel loading state and makes collection
   switching instant.

   Regenerate after a new collection launches (or a mint changes) with:
     node scripts/gen-traits.mjs && node scripts/emit-traits.mjs
   --------------------------------------------------------------------------- */
import type { TraitCategory } from '@/app/api/market/traits/route';

export const WILDER_TRAITS: Record<string, TraitCategory[]> = `;

const footer = `;

/** Static trait categories for a collection slug. Empty array when unknown. */
export function getStaticTraits(slug: string): TraitCategory[] {
  return WILDER_TRAITS[slug] ?? [];
}
`;

writeFileSync('src/lib/wilderTraits.ts', header + JSON.stringify(d) + footer);
console.log('wrote src/lib/wilderTraits.ts', statSync('src/lib/wilderTraits.ts').size, 'bytes');
