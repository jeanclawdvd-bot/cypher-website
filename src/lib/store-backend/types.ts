/** Local-only DTOs. These records are never blockchain ownership or payment evidence. */
import type {AtomicFeeSnapshot,LocalCurrency} from './currency';
export type StorePrice=AtomicFeeSnapshot&{amountAtomic:string;currency:LocalCurrency;priceCents:number|null;sellerFeeCents:number|null;sellerProceedsCents:number|null};
export type StoreProfile = { id: string; email: string; displayName: string; bio: string; createdAt: string;avatarUrl?:string|null;profileSource?:'local'|'zero';zeroSyncStatus?:'unconfigured'|'pending'|'synced'|'failed' };
export type ItemUsage = 'unlocked' | 'equipped' | 'installed' | 'placed';
export type StoreInventoryItem = {
  id: string; productId: string; variantId: string; name: string; variantName: string;
  acquiredAt: string; usage: ItemUsage; listingId: string | null; source: 'local_seed';
};
export type StoreListing = StorePrice & {
  id: string; itemId: string; productId: string; variantId: string; name: string; variantName: string;
  status: 'active' | 'cancelled' | 'sold';
  createdAt: string; sellerId: string; sellerName: string; simulated: true;
};
export type StoreSale = StorePrice & {
  id: string; listingId: string; itemId: string; productId: string; variantId: string;
  createdAt: string; buyerId: string; sellerId: string;
  quoteId:string|null;paymentCurrency:LocalCurrency;paymentAmountAtomic:string;quoteRateId:string|null;quoteUsdCentsPerWild:string|null;quoteExpiresAt:string|null;
  sellerName: string; buyerName: string; simulated: true;
  paymentStatus: 'simulated'; settlementStatus: 'simulated'; entitlementStatus: 'not_issued';
};
export type StoreReview = {
  id: string; productId: string; variantId: string; authorDisplayName: string; rating: number;
  title: string; body: string; createdAt: string; moderation: 'pending' | 'published' | 'rejected';
  ownershipAtSubmission: boolean; localPurchaseId: string | null; helpfulCount: number;
  moderationRevision: number; viewerHelpful?: boolean;
};
export type StoreAccount = {
  mode: 'local'; user: StoreProfile; inventory: StoreInventoryItem[]; listings: StoreListing[];
  purchases: StoreSale[]; sales: StoreSale[]; reviews: StoreReview[];
  /** Current responses always include this; older local snapshots may omit it. */
  seedClaimed?: boolean;
};
export type StoreSession = { mode: 'local'; user: StoreProfile | null; csrfToken?: string; canModerate?: boolean };
export type StoreLinkedWallet={id:string;address:string;chainId:1;linkedAt:string;proofType:'eip191'};
export type StoreWalletChallenge={id:string;address:string;chainId:1;origin:string;domain:string;nonce:string;message:string;issuedAt:string;expiresAt:string};
export type StoreErrorCode = 'not_found' | 'unavailable' | 'invalid_request' | 'unauthorized' | 'forbidden' | 'conflict' | 'rate_limited' | 'internal_error';
export type StoreEnvironment = { STORE_DB?: D1Database; STORE_MODE?: string };

/** Production must implement its own authenticated identity, entitlement and settlement adapters.
 * Nothing in this local adapter authorizes minting, real payment, or game entitlement delivery. */
export interface ProductionAccountBoundary {
  resolveAuthenticatedIdentity(request: Request): Promise<{ subject: string; provider: string } | null>;
  verifyItemOwnership(subject: string, itemId: string): Promise<boolean>;
  settlePaidTransfer(input: { subject: string; listingId: string; paymentReference: string; idempotencyKey: string }): Promise<{ settlementReference: string }>;
}
