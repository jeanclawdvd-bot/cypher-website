import { describe, expect, it } from 'vitest';
import { originalGroupCollection } from '@/lib/original-product-groups';
import { GET } from '@/app/api/market/product-groups/route';
import { packCategories, parseOriginalTraits, selectPackCategory } from './pack-categories';
import inventory from './pack-category-inventory.json';

type GroupPage = { totalProducts: number; items: Array<{ productGroup: { id: string } }>; traitCategories: Array<{ type: string; values: Array<{ count: number }> }> };

describe('Packs quick category navigation', () => {
  it('matches every joint trait count to all 24,510 exact source copies', () => {
    for (const [slug, source] of Object.entries(inventory)) {
      const collection = originalGroupCollection(slug)!;
      const counts = new Map<string, number>();
      for (const family of collection.families) for (const variant of family.variants) {
        const key = ['Group', 'Category', 'Type'].map(type => variant.traits.find(trait => trait.type === type)!.value).join('|');
        counts.set(key, (counts.get(key) ?? 0) + variant.members.length);
      }
      expect(source.observedAt).toBe(collection.observedAt);
      expect(source.rows).toHaveLength(counts.size);
      for (const row of source.rows) expect(row.count).toBe(counts.get([row.group, row.category, row.type].join('|')));
      expect(source.rows.reduce((sum, row) => sum + row.count, 0)).toBe(8170);
    }
  });

  it('uses exact existing backend values and preserves advanced edition filters', async () => {
    const weapons = packCategories('pack-weapons', {})!;
    const suppressors = weapons.secondary.find(option => option.label === 'Suppressors')!;
    expect(suppressors.traits).toEqual({ Group: ['Weapon Attachment'], Type: ['Supressor'] });
    expect(suppressors.count).toBe(1338);
    const selected = selectPackCategory('pack-weapons', { Category: ['Assault Rifle'], Type: ['Primary Weapon'], Rarity: ['Rare'], 'Primary Material': ['Aluminum'] }, suppressors);
    expect(selected).toEqual({ Group: ['Weapon Attachment'], Type: ['Supressor'], Rarity: ['Rare'], 'Primary Material': ['Aluminum'] });
    const response = await GET(new Request('http://localhost/api/market/product-groups?' + new URLSearchParams({ slug: 'pack-weapons', attributes: JSON.stringify(selected) })));
    const result = await response.json() as GroupPage;
    const expected = originalGroupCollection('pack-weapons')!.families.filter(family => family.variants.some(variant => Object.entries(selected).every(([type, values]) => variant.traits.some(trait => trait.type === type && values.includes(trait.value)))));
    expect(result.totalProducts).toBe(expected.length);
    expect(result.items.map((item: { productGroup: { id: string } }) => item.productGroup.id)).toEqual(expected.slice(0, 24).map(family => family.id));
  });

  it('every shortcut reaches actual full-catalog products, retaining full facets', async () => {
    for (const slug of Object.keys(inventory)) {
      const categories = packCategories(slug, {})!;
      for (const option of [...categories.primary, ...categories.secondary]) {
        const response = await GET(new Request('http://localhost/api/market/product-groups?' + new URLSearchParams({ slug, attributes: JSON.stringify(option.traits) })));
        const result = await response.json() as GroupPage;
        const matching = originalGroupCollection(slug)!.families.filter(family => family.variants.some(variant => Object.entries(option.traits).every(([type, values]) => variant.traits.some(trait => trait.type === type && values.includes(trait.value)))));
        expect(result.totalProducts).toBe(matching.length);
        expect(result.totalProducts).toBeGreaterThan(0);
        expect(result.traitCategories.find(trait => trait.type === 'Rarity')!.values.reduce((sum, value) => sum + value.count, 0)).toBe(8170);
        const copyCount = matching.flatMap(family => family.variants).filter(variant => Object.entries(option.traits).every(([type, values]) => variant.traits.some(trait => trait.type === type && values.includes(trait.value)))).reduce((sum, variant) => sum + variant.members.length, 0);
        expect(option.count).toBe(copyCount);
      }
    }
  });

  it('scopes system/armor subtypes correctly and resets only category choices', () => {
    const engine = packCategories('pack-wheels', { Category: ['Engine'] })!;
    expect(engine.secondary.map(option => option.label)).toEqual(['Camshaft', 'Cylinder Head', 'Engine Block', 'Pistons', 'Valves']);
    const avatar = packCategories('pack-avatars', { Type: ['Trinity MKI'] })!;
    expect(avatar.secondary.find(option => option.label === 'Helmet')).toMatchObject({ count: 483, traits: { Type: ['Trinity MKI'], Category: ['Helmet'] } });
    expect(packCategories('pack-avatars', { Type: ['Trinity MKII'] })!.secondary.find(option => option.label === 'Helmet')?.count).toBe(463);
    const selected = { Type: ['Trinity MKI'], Category: ['Helmet'], Rarity: ['Rare'] };
    expect(selectPackCategory('pack-avatars', selected, undefined, true)).toEqual({ Type: ['Trinity MKI'], Rarity: ['Rare'] });
    expect(selectPackCategory('pack-avatars', selected)).toEqual({ Rarity: ['Rare'] });
    expect(packCategories('__proto__', {})).toBeNull();
  });

  it('round-trips advanced URL filters without trusting malformed or prototype input', () => {
    const traits = { Group: ['Weapon Attachment'], Type: ['Supressor'], Rarity: ['Rare', 'Epic'] };
    expect(parseOriginalTraits(JSON.stringify(traits))).toEqual(traits);
    expect(parseOriginalTraits('{"Type":["Scope","Scope"],"Rarity":[]}')).toEqual({ Type: ['Scope'] });
    for (const bad of [undefined, [], '{}'.repeat(5000), 'null', '[]', '{', '{"Type":1}', '{"Type":[1]}', '{"__proto__":["x"]}']) expect(parseOriginalTraits(bad)).toEqual({});
  });
});
