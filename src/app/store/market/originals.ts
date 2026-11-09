import type { MarketNft } from '@/lib/opensea';
import { getEntryBySlug, WILDER_INDUSTRIES, type WilderCollectionEntry } from '@/lib/wilderCollections';

const names: Record<string, string> = { 'land-the-island': 'The Island', 'wheels-genesis': 'Genesis Wheels', 'moto-genesis': 'Genesis Moto', 'crafts-genesis': 'Genesis Crafts', 'cribs-genesis': 'Genesis Cribs', packs: 'Sealed Packs' };
const artwork: Record<string, string> = { land: 'industries_land_hero.png.webp', wheels: 'industries_wheels_hero.png.webp', beasts: 'industries_beasts_hero.png.webp', moto: 'industries_moto_hero.png.webp', pals: 'industries_gens_hero.jpg.webp', crafts: 'industries_crafts_hero.png.webp', cribs: 'industries_cribs_hero.png.webp', kicks: 'industries_kicks_hero.png.webp', packs: 'industries_avatars_hero.png.webp' };

const packPresentation: Record<string, { title:string; eyebrow:string; description:string; artwork:string }> = {
  packs: { title:'Wilder Packs', eyebrow:'Season 1', description:'Sealed packs containing weapons, vehicle mods and avatar armor.', artwork:'/images/marketplace/original-collections/wilder-packs-season-one.png' },
  'pack-weapons': { title:'Weapons', eyebrow:'Season 1', description:'Weapons and weapon attachments revealed from opening a Wilder Pack.', artwork:'/images/wilder-world/industries_weapons_hero.jpg.webp' },
  'pack-wheels': { title:'Mods', eyebrow:'Season 1', description:'Vehicle mods revealed from opening a Wilder Pack.', artwork:'/images/wilder-world/industries_wheels_hero.png.webp' },
  'pack-avatars': { title:'Avatar Gear', eyebrow:'Season 1', description:'Avatar armor revealed from opening a Wilder Pack.', artwork:'/images/wilder-world/industries_avatars_hero.png.webp' },
};

/** Store presentation only; original contracts, slugs and token metadata stay intact. */
export function originalPackPresentation(entry: WilderCollectionEntry) { return packPresentation[entry.slug]; }
const genesisCollectionSlugs = new Set(['wilder-land-the-island', 'wilderworld', 'wilderbeasts-wolf', 'wilderbeasts-wape', 'wilder-moto', 'wilderpals-gen', 'wilder-crafts-genesis', 'wilder-cribs-genesis', 'aws0']);
export function originalCollectionEyebrow(entry: WilderCollectionEntry): string {
  return originalPackPresentation(entry) ? 'Wilder Packs' : genesisCollectionSlugs.has(entry.slug) ? 'Genesis' : 'Originals';
}

export function originalCollectionName(entry: WilderCollectionEntry): string {
  return originalPackPresentation(entry)?.title ?? entry.name ?? entry.label ?? names[entry.id] ?? WILDER_INDUSTRIES.find(i => i.collections.some(c => c.id === entry.id))?.name ?? 'Original collection';
}

/** Industry photography is collection art, never a token preview. */
export function originalCollectionArtwork(entry: WilderCollectionEntry): string | undefined {
  if (entry.slug === 'wilder-lamborghini-temerario') return '/images/marketplace/original-collections/lamborghini-temerario.webp';
  const pack = originalPackPresentation(entry);
  if (pack) return pack.artwork;
  const industry = WILDER_INDUSTRIES.find(i => i.collections.some(c => c.id === entry.id));
  return industry && artwork[industry.id] ? `/images/wilder-world/${artwork[industry.id]}` : undefined;
}

export function originalItemHref(slug: string, item: Pick<MarketNft, 'identifier' | 'contract' | 'chain' | 'productGroup'>): string {
  if(item.productGroup){
    const href=`/store/market/${encodeURIComponent(slug)}/group/${encodeURIComponent(item.productGroup.id)}`;
    return item.productGroup.selectedEditionId?`${href}?${new URLSearchParams({variant:item.productGroup.selectedEditionId})}`:href;
  }
  const params = new URLSearchParams({ contract: item.contract, chain: item.chain });
  return `/store/market/${encodeURIComponent(slug)}/${encodeURIComponent(item.identifier)}?${params.toString()}`;
}

/** Never let a deep link switch a collection to an unrelated contract or chain. */
export function originalItemSeed(slug: string, tokenId: string, contract?: string, chain?: string): MarketNft | null {
  const entry = getEntryBySlug(slug);
  if (!entry?.contract || !/^(0|[1-9][0-9]*)$/.test(tokenId) || tokenId.length > 78 || BigInt(tokenId) >= BigInt(2) ** BigInt(256)) return null;
  if (contract && contract.toLowerCase() !== entry.contract.toLowerCase()) return null;
  if (chain && chain !== entry.chain) return null;
  return { identifier: tokenId, name: `${originalCollectionName(entry)} #${tokenId}`, image: null, collectionSlug: slug, contract: entry.contract, chain: entry.chain, priceEth: null, traits: [] };
}
