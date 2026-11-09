/** Explicit production adapter boundaries. No browser route can enable these adapters.
 * ZERO is the intended profile source; its authenticated API/database contract is not configured. */
export type ProductionIdentity = { subject: string; provider: string; authenticatedAt: string };
export type ProductionItem = { id: string; ownerSubject: string; productId: string; variantId: string; ownershipEvidence: string };
export type ConfirmedPayment = { orderId: string; providerReference: string; amountMinor: string; currency: string; confirmedAt: string };
export type SettledOwnership = { orderId: string; settlementReference: string; itemId: string; settledAt: string };
export type DeliveredEntitlement = { itemId: string; deliveryReference: string; deliveredAt: string };
export type ProductionProfileSync={provider:'zero';status:'unconfigured'|'pending'|'synced'|'failed';operationId:string|null;lastSyncedAt:string|null};
export type ProductionProfile={subject:string;provider:'zero';displayName:string;bio:string;avatarUrl:string|null;revision:string;updatedAt:string;sync:ProductionProfileSync};
export type ProductionProfilePatch={displayName?:string;bio?:string;photo?:{mimeType:'image/jpeg';bytes:Uint8Array}|null};

export interface IdentityProvider {
  readonly status: 'configured' | 'unconfigured';
  authenticate(request: Request): Promise<ProductionIdentity>;
}
export interface ProductionAccountStore {
  readonly status: 'configured' | 'unconfigured';
  readonly profileProvider:'zero';
  getInventory(identity: ProductionIdentity): Promise<ProductionItem[]>;
  getProfile(identity: ProductionIdentity): Promise<ProductionProfile>;
  /** Resolve subject from authenticated identity, validate media and use ZERO's
   * revision/idempotency contract. Local accounts cannot impersonate ZERO subjects. */
  updateProfile(identity:ProductionIdentity,patch:ProductionProfilePatch,write:{expectedRevision:string;idempotencyKey:string}):Promise<ProductionProfile>;
  getProfileSync(identity:ProductionIdentity):Promise<ProductionProfileSync>;
}
export interface ProductionFulfillment {
  readonly status: 'configured' | 'unconfigured';
  confirmPayment(orderId: string, trustedProviderReference: string): Promise<ConfirmedPayment>;
  settleOwnership(payment: ConfirmedPayment, idempotencyKey: string): Promise<SettledOwnership>;
  deliverGameEntitlement(settlement: SettledOwnership, idempotencyKey: string): Promise<DeliveredEntitlement>;
}
/** A production implementation must independently authenticate moderators and verify evidence.
 * Local roles, votes and seed purchases never satisfy production review verification. */
export interface ProductionReviewProvider {
  readonly status:'configured'|'unconfigured';
  submit(identity:ProductionIdentity,input:{productId:string;variantId:string;rating:number;title:string;body:string}):Promise<{reviewId:string;moderation:'pending'}>;
  moderate(identity:ProductionIdentity,input:{reviewId:string;decision:'published'|'rejected';reason:string;expectedRevision:number;idempotencyKey:string}):Promise<void>;
  voteHelpful(identity:ProductionIdentity,reviewId:string,helpful:boolean):Promise<{helpfulCount:number}>;
}
export class ProductionNotConfiguredError extends Error {
  readonly code = 'production_not_configured';
  constructor() { super('Production identity, ZERO profiles, payments, ownership settlement and game delivery are not connected.'); }
}
function unavailable(): never { throw new ProductionNotConfiguredError(); }
export const productionIdentity: IdentityProvider = {status:'unconfigured',async authenticate(){return unavailable();}};
export const productionAccountStore: ProductionAccountStore = {status:'unconfigured',profileProvider:'zero',async getInventory(){return unavailable();},async getProfile(){return unavailable();},async updateProfile(){return unavailable();},async getProfileSync(){return unavailable();}};
export const productionFulfillment: ProductionFulfillment = {
  status:'unconfigured',async confirmPayment(){return unavailable();},async settleOwnership(){return unavailable();},async deliverGameEntitlement(){return unavailable();},
};
export const productionReviewProvider:ProductionReviewProvider={status:'unconfigured',async submit(){return unavailable();},async moderate(){return unavailable();},async voteHelpful(){return unavailable();}};
