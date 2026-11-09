'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { findIndividualProduct } from './fashion';
import { findMarketProduct } from '../marketplace/catalog';
import { getGhostlinePass } from '../ghostline';

export const DEMO_BAG_KEY = 'wilderworld.demo-bag.v1';
const CHANGE_EVENT = 'wilderworld:demo-bag';
export type BagSelection = { productId: string; colorwayId?: string };
export type DemoBagItem = BagSelection & { key: string; quantity: number };
let memory = '[]';

export function resolveBagProduct(item: BagSelection) {
  const product = findIndividualProduct(item.productId);
  if (product && product.id === item.productId) {
    const color = findMarketProduct(product.id)?.variants.find(c => c.id === item.colorwayId);
    if (item.colorwayId && !color) return undefined;
    return { name: product.name, image: color ? color.image : product.image, detail: color?.name ?? product.categoryLabel,
      sku: product.sourceSku, price: product.price, priceCents: product.priceCents, href: `/store/${product.id}${color ? `?color=${encodeURIComponent(color.id)}` : ''}`, vehicle: false };
  }
  const vehicle = getGhostlinePass(item.productId);
  if (vehicle && !item.colorwayId) return { name: vehicle.name, image: vehicle.thumbnailPoster ?? `/images/wilder-world/mobile/${vehicle.poster}_mobile.webp`, detail: `${vehicle.tier} Pass`, sku: vehicle.id, price: vehicle.price, priceCents: vehicle.priceCents, href: `/vehicles/${vehicle.id}`, vehicle: true };
  return undefined;
}

export function parseDemoBag(raw: string): DemoBagItem[] {
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const clean = new Map<string, DemoBagItem>();
    for (const item of data) {
      if (!item || typeof item.productId !== 'string' || (item.colorwayId !== undefined && typeof item.colorwayId !== 'string') || !Number.isInteger(item.quantity) || item.quantity < 1 || !resolveBagProduct(item)) continue;
      const key = `${item.productId}::${item.colorwayId ?? 'original'}`;
      clean.set(key, { key, productId: item.productId, colorwayId: item.colorwayId, quantity: Math.min(99, item.quantity + (clean.get(key)?.quantity ?? 0)) });
    }
    return [...clean.values()];
  } catch { return []; }
}

function snapshot() {
  try { return window.localStorage.getItem(DEMO_BAG_KEY) ?? '[]'; } catch { return memory; }
}
function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => { window.removeEventListener('storage', onChange); window.removeEventListener(CHANGE_EVENT, onChange); };
}
function update(transform: (items: DemoBagItem[]) => DemoBagItem[]) {
  memory = JSON.stringify(transform(parseDemoBag(snapshot())));
  try { window.localStorage.setItem(DEMO_BAG_KEY, memory); } catch { /* In-memory bag remains available when storage is disabled. */ }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useDemoBag() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => '[]');
  const items = useMemo(() => parseDemoBag(raw), [raw]);
  return {
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalCents: items.reduce((sum, item) => sum + resolveBagProduct(item)!.priceCents * item.quantity, 0),
    addItem(selection: BagSelection) {
      if (!resolveBagProduct(selection)) return;
      const key = `${selection.productId}::${selection.colorwayId ?? 'original'}`;
      update(items => items.some(item => item.key === key)
        ? items.map(item => item.key === key ? { ...item, quantity: Math.min(99, item.quantity + 1) } : item)
        : [...items, { ...selection, key, quantity: 1 }]);
    },
    removeItem(key: string) { update(items => items.filter(item => item.key !== key)); },
    changeQuantity(key: string, delta: number) {
      if (!Number.isInteger(delta)) return;
      update(items => items.map(item => item.key === key ? { ...item, quantity: Math.min(99, item.quantity + delta) } : item).filter(item => item.quantity > 0));
    },
    clearBag() { update(() => []); },
  };
}
