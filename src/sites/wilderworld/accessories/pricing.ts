import prices from './prices.json';

type AccessoryPrice = { priceCents: number; tier: string; rationale: string };
const productPrices = prices.products as Record<string, AccessoryPrice>;
const usd = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2,
});

export function formatUsd(priceCents: number) {
  return usd.format(priceCents / 100);
}

export function getAccessoryPrice(productId: string) {
  const price = productPrices[productId];
  if (!price || !Number.isSafeInteger(price.priceCents) || price.priceCents <= 0) {
    throw new Error(`Missing or invalid accessory price: ${productId}`);
  }
  return { ...price, currency: 'USD' as const, price: formatUsd(price.priceCents) };
}
