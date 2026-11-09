import inventory from './pack-category-inventory.json';
import type { SelectedTraits } from '@/app/market/types';

type Row = { group: string; category: string; type: string; count: number };
export type PackCategoryOption = { id: string; label: string; count: number; traits: SelectedTraits };
type Config = { primary: 'Group' | 'Category' | 'Type'; managed: string[]; label: string };
const configs: Record<string, Config> = {
  'pack-weapons': { primary: 'Group', managed: ['Group', 'Category', 'Type'], label: 'Item type' },
  'pack-wheels': { primary: 'Category', managed: ['Category', 'Type'], label: 'System' },
  'pack-avatars': { primary: 'Type', managed: ['Type', 'Category'], label: 'Armor collection' },
};
const labels: Record<string, string> = {
  'Ranged Weapon': 'Weapons', 'Weapon Attachment': 'Attachments',
  Scope: 'Scopes', Supressor: 'Suppressors', Ironsight: 'Iron sights',
  Compensator: 'Compensators', Magazine: 'Magazines', Grip: 'Grips', Stock: 'Stocks',
};
const field = (row: Row, type: string) => row[type.toLowerCase() as keyof Pick<Row, 'group' | 'category' | 'type'>];
const unique = (values: string[]) => [...new Set(values)];
const count = (rows: Row[]) => rows.reduce((sum, row) => sum + row.count, 0);
const label = (value: string) => Object.hasOwn(labels, value) ? labels[value] : value;

/** Small, complete joint-trait inventory extracted from the reviewed token snapshot.
 * Counts are recorded copies, never live availability or approved edition supply. */
export function packCategories(slug: string, traits: SelectedTraits) {
  if (!Object.hasOwn(configs, slug)) return null;
  const config = configs[slug];
  const source = inventory[slug as keyof typeof inventory];
  const rows: Row[] = source.rows;
  const primary: PackCategoryOption[] = unique(rows.map(row => field(row, config.primary))).map(value => ({
    id: `${config.primary}:${value}`, label: label(value), count: count(rows.filter(row => field(row, config.primary) === value)), traits: { [config.primary]: [value] },
  }));
  if (slug === 'pack-weapons') primary.sort((a, b) => Number(a.label === 'Attachments') - Number(b.label === 'Attachments'));
  const selected = traits[config.primary] ?? [];
  const scoped = selected.length ? rows.filter(row => selected.includes(field(row, config.primary))) : rows;
  const secondary: PackCategoryOption[] = [];
  for (const row of scoped) {
    const type = slug === 'pack-avatars' || (slug === 'pack-weapons' && row.group === 'Ranged Weapon') ? 'Category' : 'Type';
    const value = field(row, type);
    const id = `${type}:${value}`;
    if (secondary.some(option => option.id === id)) continue;
    const matches = scoped.filter(candidate => field(candidate, type) === value);
    secondary.push({ id, label: label(value), count: count(matches), traits: {
      ...(slug === 'pack-weapons' ? { Group: [row.group] } : slug === 'pack-wheels' ? { Category: [row.category] } : selected.length ? { Type: selected } : {}),
      [type]: [value],
    } });
  }
  return { ...config, primaryTrait: config.primary, observedAt: source.observedAt, total: count(rows), scopedCount: count(scoped), primary, secondary };
}

/** Quick navigation replaces only category/type choices; material, rarity, etc. survive. */
export function selectPackCategory(slug: string, current: SelectedTraits, option?: PackCategoryOption, keepPrimary = false): SelectedTraits {
  const config = Object.hasOwn(configs, slug) ? configs[slug] : undefined;
  if (!config) return current;
  return { ...Object.fromEntries(Object.entries(current).filter(([type, values]) => values.length && (!config.managed.includes(type) || (keepPrimary && type === config.primary)))), ...option?.traits };
}

export function packOptionSelected(option: PackCategoryOption, traits: SelectedTraits) {
  return Object.entries(option.traits).every(([type, values]) => values.length === traits[type]?.length && values.every(value => traits[type].includes(value)));
}

/** Preserve advanced filters in shareable browse URLs, with bounded input. */
export function parseOriginalTraits(value: unknown): SelectedTraits {
  if (typeof value !== 'string' || value.length > 8192) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const entries = Object.entries(parsed);
    if (entries.length > 20 || entries.some(([type, values]) => !type || type.length > 100 || ['__proto__', 'prototype', 'constructor'].includes(type) || !Array.isArray(values) || values.length > 50 || values.some(value => typeof value !== 'string' || value.length > 200))) return {};
    return Object.fromEntries(entries.filter(([, values]) => values.length).map(([type, values]) => [type, unique(values)]));
  } catch { return {}; }
}
