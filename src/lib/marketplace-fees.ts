/** Approved marketplace policy for the local preview. No payment or payout is executed. */
export const MARKETPLACE_FEE_POLICY = Object.freeze({
  version: '2026-11-08-seller-1pct',
  sellerFeeBps: 100,
  buyerFeeBps: 0,
});

/** Round once to the nearest currency minor unit, half up, with no minimum fee. */
export function marketplaceFeeBreakdown(amountMinor: bigint, sellerFeeBps: number = MARKETPLACE_FEE_POLICY.sellerFeeBps) {
  if (typeof amountMinor !== 'bigint' || amountMinor < BigInt(0)) throw new Error('Invalid marketplace amount.');
  if (!Number.isSafeInteger(sellerFeeBps) || sellerFeeBps < 0 || sellerFeeBps > 10_000) throw new Error('Invalid marketplace fee rate.');
  const sellerFeeMinor = (amountMinor * BigInt(sellerFeeBps) + BigInt(5_000)) / BigInt(10_000);
  return { sellerFeeMinor, sellerProceedsMinor: amountMinor - sellerFeeMinor, buyerTotalMinor: amountMinor };
}

export type LocalMarketplaceFeeQuote = {
  feePolicyVersion: string;
  sellerFeeBps: number;
  sellerFeeCents: number;
  sellerProceedsCents: number;
};

export function localMarketplaceFeeQuote(priceCents: number): LocalMarketplaceFeeQuote {
  if (!Number.isSafeInteger(priceCents) || priceCents < 1 || priceCents > 100_000_000) throw new Error('Invalid local listing price.');
  const quote = marketplaceFeeBreakdown(BigInt(priceCents));
  return {
    feePolicyVersion: MARKETPLACE_FEE_POLICY.version,
    sellerFeeBps: MARKETPLACE_FEE_POLICY.sellerFeeBps,
    sellerFeeCents: Number(quote.sellerFeeMinor),
    sellerProceedsCents: Number(quote.sellerProceedsMinor),
  };
}
