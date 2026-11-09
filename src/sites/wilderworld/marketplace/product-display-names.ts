import naming from './product-display-names.json';

type NamingRecord = { sourceName: string; name: string; lore: string };
const names: Record<string, NamingRecord> = naming.products;

/** Display copy only: never changes IDs, source provenance or token mappings. */
export function productDisplayName(id: string, fallback: string): string {
  return names[id]?.name ?? fallback;
}

export function productNaming(id: string): NamingRecord | undefined {
  return names[id];
}
