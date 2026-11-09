import type { MarketProduct } from './catalog';

export type FinishFilterOption = {
  /** Case-insensitive exact variant name, matching filterProducts' finish value. */
  value: string;
  label: string;
  productCount: number;
  /** Absent when a shared name does not describe one consistent swatch. */
  swatch: string | null;
};

type FinishProduct = Pick<MarketProduct, 'id' | 'variants'>;
const nameOrder = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

function comparableSwatch(swatch: string): string | null {
  const value = swatch.trim();
  if (!value) return null;
  if (/^#[\da-f]{3,4}$/i.test(value)) {
    return '#' + [...value.slice(1).toLowerCase()].map(character => character.repeat(2)).join('');
  }
  return /^#[\da-f]{6}([\da-f]{2})?$/i.test(value) ? value.toLowerCase() : value;
}

/**
 * Supply the visible product scope after department/category/search/label/fit,
 * but before its finish filter. Only current variants participate; archived or
 * planned alternatives must not advertise options that cannot be selected.
 */
export function deriveFinishOptions(products: readonly FinishProduct[]): FinishFilterOption[] {
  const options = new Map<string, {
    label: string;
    productIds: Set<string>;
    swatches: Set<string | null>;
  }>();
  for (const product of products) {
    for (const variant of product.variants) {
      const label = variant.name.trim();
      if (!label) continue;
      // Keep the filter's existing exact-name semantics and URL compatibility.
      const value = variant.name.toLowerCase();
      let option = options.get(value);
      if (!option) {
        option = { label, productIds: new Set(), swatches: new Set() };
        options.set(value, option);
      }
      // Stable display spelling even if callers reorder the supplied products.
      if (label < option.label) option.label = label;
      option.productIds.add(product.id);
      option.swatches.add(comparableSwatch(variant.swatch));
    }
  }
  return [...options].map(([value, option]) => ({
    value,
    label: option.label,
    productCount: option.productIds.size,
    swatch: option.swatches.size === 1 ? [...option.swatches][0] : null,
  })).sort((a, b) => nameOrder.compare(a.label, b.label) || a.value.localeCompare(b.value));
}
