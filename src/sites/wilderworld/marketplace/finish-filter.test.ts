import { describe, expect, it } from 'vitest';
import { filterProducts, marketProducts, type MarketProduct, type Variant } from './catalog';
import { deriveFinishOptions } from './finish-filter';

const variant = (id: string, name: string, swatch = '#123456'): Variant => ({ id, name, swatch, image: null, status: 'Visual concept' });
const product = (id: string, variants: Variant[]): Pick<MarketProduct, 'id' | 'variants'> => ({ id, variants });

describe('available color and material filter options', () => {
  it('counts distinct products rather than repeated variants or rows, with stable labels and color equivalence', () => {
    const a = product('a', [variant('a-1', 'Chalk', '#FFF'), variant('a-2', 'Chalk', '#ffffff'), variant('a-3', 'Graphite', '#222')]);
    const b = product('b', [variant('b-1', 'chalk', '#FFFFFF'), variant('b-2', 'Graphite', '#333333')]);
    const result = deriveFinishOptions([a, a, b]);
    expect(result).toEqual([
      { value: 'chalk', label: 'Chalk', productCount: 2, swatch: '#ffffff' },
      { value: 'graphite', label: 'Graphite', productCount: 2, swatch: null },
    ]);
    expect(deriveFinishOptions([b, a])).toEqual(result);
  });

  it('does not suggest a swatch when any matching option lacks one, and omits blank names', () => {
    expect(deriveFinishOptions([
      product('a', [variant('a-1', 'Marine', '#123456'), variant('a-2', ' ', '#ffffff')]),
      product('b', [variant('b-1', 'Marine', '')]),
    ])).toEqual([{ value: 'marine', label: 'Marine', productCount: 2, swatch: null }]);
    expect(deriveFinishOptions([])).toEqual([]);
    expect(deriveFinishOptions([product('empty', [])])).toEqual([]);
  });

  it('sorts names naturally without changing source arrays or inspecting archived/planned variants', () => {
    const source = { ...product('a', [variant('10', 'Finish 10'), variant('2', 'Finish 2'), variant('a', 'Amber')]), sourceVariants: [variant('old', 'Archived')], plannedVariants: [variant('next', 'Not yet available')] };
    const before = JSON.stringify(source);
    expect(deriveFinishOptions([source]).map(option => option.label)).toEqual(['Amber', 'Finish 2', 'Finish 10']);
    expect(JSON.stringify(source)).toBe(before);
  });

  it('covers every selectable catalog finish and round-trips to the existing filter with exact product counts', () => {
    const options = deriveFinishOptions(marketProducts);
    const names = new Set(marketProducts.flatMap(item => item.variants.map(choice => choice.name.toLowerCase())));
    expect(new Set(options.map(option => option.value))).toEqual(names);
    for (const option of options) {
      const matches = filterProducts(marketProducts, { finish: option.value });
      expect(matches.length, option.label).toBe(option.productCount);
      expect(matches.length, option.label).toBeGreaterThan(0);
    }
  });

  it('exposes all nine current options for each furniture item, including individual rug palettes', () => {
    const furniture = filterProducts(marketProducts, { department: 'furniture' });
    expect(furniture.length).toBeGreaterThan(0);
    for (const item of furniture) {
      const options = deriveFinishOptions([item]);
      expect(options, item.id).toHaveLength(9);
      expect(options.every(option => option.productCount === 1), item.id).toBe(true);
      expect(new Set(options.map(option => option.label)), item.id).toEqual(new Set(item.variants.map(choice => choice.name)));
    }
    const rugs = filterProducts(marketProducts, { department: 'furniture', subcategory: 'rugs' });
    expect(rugs.length).toBeGreaterThan(0);
    expect(deriveFinishOptions(rugs).length).toBeGreaterThan(3);
    for (const option of deriveFinishOptions(rugs)) {
      expect(filterProducts(rugs, { finish: option.value }).length, option.label).toBe(option.productCount);
    }
  });

  it('uses the supplied department/category/query/brand/fit scope independently of a selected finish', () => {
    const scope = { department: 'clothing', subcategory: 'jacket', query: 'motor drip', brand: 'MOTOR DRIP', gender: 'Women' };
    const scoped = filterProducts(marketProducts, scope);
    expect(scoped.length).toBeGreaterThan(0);
    const options = deriveFinishOptions(scoped);
    expect(options.length).toBeGreaterThan(1);
    for (const option of options) {
      expect(filterProducts(marketProducts, { ...scope, finish: option.value }).length).toBe(option.productCount);
    }
    // A stale URL may have no matches, but must not erase the alternative choices.
    expect(filterProducts(scoped, { finish: 'missing legacy finish' })).toEqual([]);
    expect(deriveFinishOptions(scoped)).toEqual(options);
  });
});
