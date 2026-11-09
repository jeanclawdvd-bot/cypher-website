/** Server-domain contract. No provider, signing key, wallet, or live payment is configured.
 * Production adapters must authenticate their inputs; browser assertions are never proof.
 * Repository transactions must be durable, serializable and enforce unique evidence keys.
 */
export type CollectionId = 'vehicles' | 'clothing' | 'furniture';
export type ItemType = 'vehicle' | 'rim_set' | 'clothing' | 'totem' | 'furniture';
export type Principal = { wallet: string; gameAccountId: string };
export type TokenReference = { chainId: number; contract: string; tokenId: string };
export type ApprovedOffer = {
  productId: string; conceptId: string; collectionId: CollectionId; itemType: ItemType;
  productKey: string; editionId: string; variantId: string;
  chainId: number | null; contract: string | null; priceMinor: string | null;
  currency: string | null; supplyCap: string | null; gameAssetId: string | null;
  approved: boolean; legacyReference: boolean; unresolved: readonly string[];
};
export type PaymentEvidence = {
  provider: string; eventId: string; paymentId: string; orderId: string;
  wallet: string; currency: string; amountMinor: string; status: 'confirmed' | 'pending' | 'refunded';
};
export type MintEvidence = TokenReference & {
  txHash: string; logIndex: number; blockHash: string; finalized: boolean;
  production: boolean;
  settlementId: string; recipient: string; productKey: string; editionId: string; variantId: string;
};
export type Order = {
  id: string; settlementId: string; principal: Principal; offer: ApprovedOffer;
  payment: PaymentEvidence | null; mint: MintEvidence | null;
  delivery: 'not_ready' | 'pending' | 'delivered' | 'failed' | 'revocation_pending' | 'revoked';
  invalidated: boolean; deliveryError: string | null;
};
export interface FulfillmentTransaction {
  get(id: string): Order | undefined;
  put(order: Order): void;
  /** Return false if another order has claimed this exact payment/event/token evidence. */
  claim(key: string, orderId: string): boolean;
  /** Persist delivery/reconciliation work atomically with the order mutation. */
  enqueueReconciliation?(orderId: string): void;
}
export interface FulfillmentRepository {
  transaction<T>(action: (tx: FulfillmentTransaction) => T | Promise<T>): Promise<T>;
}
export interface FulfillmentAdapters {
  /** Resolve ONLY from the server's approved registry, not from client-supplied offer fields. */
  resolveOffer(productId: string, conceptId: string): Promise<ApprovedOffer>;
  /** Verify a server session bound to a wallet challenge and linked game account. */
  authenticate(sessionProof: unknown): Promise<Principal>;
  /** Signature + provider lookup. Never trust webhook/body fields without verification. */
  verifyPayment(providerProof: unknown): Promise<PaymentEvidence>;
  /** Read canonical finalized receipt, decoded collection event and current chain configuration. */
  verifyMint(chainProof: unknown): Promise<MintEvidence>;
  /** Fresh authoritative ownerOf; marketplace metadata/indexer caches alone are insufficient. */
  currentOwner(token: TokenReference): Promise<string>;
  /** Idempotent, ownership-bound entitlement. Independently validate current ownership.
   * The gateway must reject a grant whose key has a revocation tombstone, including
   * requests delayed past a worker lease. Same key must never issue two grants. */
  grant(input: { idempotencyKey: string; token: TokenReference; principal: Principal; gameAssetId: string }): Promise<void>;
  /** Atomically revoke AND tombstone grantIdempotencyKey, even if grant has not arrived. */
  revoke(input: { idempotencyKey: string; grantIdempotencyKey: string; token: TokenReference; gameAccountId: string; reason: string }): Promise<void>;
}

const address = (value: string) => {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error('Invalid wallet or contract address');
  return value.toLowerCase();
};
const positiveInteger = (value: string | null) => value !== null && /^[1-9][0-9]*$/.test(value);
const uint = (value: string) => /^(0|[1-9][0-9]*)$/.test(value) && BigInt(value) < BigInt(2) ** BigInt(256);
const requireText = (value: string) => { if (!value.trim()) throw new Error('Missing identity'); };
function tokenKey(token: TokenReference) {
  if (!Number.isSafeInteger(token.chainId) || token.chainId <= 0 || !uint(token.tokenId)) throw new Error('Invalid token reference');
  return `${token.chainId}:${address(token.contract)}:${token.tokenId}`;
}
function ready(offer: ApprovedOffer) {
  const allowed: Record<CollectionId, ItemType[]> = {vehicles:['vehicle','rim_set'], clothing:['clothing','totem'], furniture:['furniture']};
  if (!allowed[offer.collectionId]?.includes(offer.itemType)) throw new Error('Wrong collection for item type');
  if (!offer.approved || offer.legacyReference || offer.unresolved.length ||
      !positiveInteger(offer.priceMinor) || !positiveInteger(offer.supplyCap) ||
      !offer.currency || !offer.gameAssetId || !offer.contract ||
      !Number.isSafeInteger(offer.chainId) || Number(offer.chainId) <= 0) throw new Error('Offer is not launch-approved');
  address(offer.contract);
  [offer.productId, offer.productKey, offer.editionId, offer.variantId, offer.conceptId].forEach(requireText);
}
function requireOrder(tx: FulfillmentTransaction, id: string) {
  const order = tx.get(id);
  if (!order) throw new Error('Unknown order');
  if (order.invalidated) throw new Error('Order invalidated');
  return order;
}
function sameEvidence(a: unknown, b: unknown) { return JSON.stringify(a) === JSON.stringify(b); }

/** One instance / one explicitly approved color per order. Quantity batching is intentionally absent. */
export class CollectionFulfillment {
  private deliveryFlights = new Map<string, Promise<Order>>();
  constructor(private repository: FulfillmentRepository, private adapters: FulfillmentAdapters,
    private enabled = false) {}
  private requireEnabled() { if (!this.enabled) throw new Error('Live fulfillment is not configured'); }

  async createOrder(id: string, settlementId: string, productId: string, conceptId: string, sessionProof: unknown) {
    if (!this.enabled) throw new Error('Live fulfillment is not configured');
    const offer = await this.adapters.resolveOffer(productId, conceptId);
    if (offer.productId !== productId || offer.conceptId !== conceptId) throw new Error('Offer identity mismatch');
    ready(offer); requireText(id); requireText(settlementId);
    const principal = await this.adapters.authenticate(sessionProof);
    principal.wallet = address(principal.wallet); requireText(principal.gameAccountId);
    return this.repository.transaction(tx => {
      const old = tx.get(id);
      if (old) {
        if (old.settlementId !== settlementId || !sameEvidence(old.principal,principal) || !sameEvidence(old.offer,offer)) throw new Error('Order identity conflict');
        return old;
      }
      if (!tx.claim(`settlement:${offer.chainId}:${settlementId}`,id)) throw new Error('Settlement already allocated');
      const order: Order = {id, settlementId, principal, offer: structuredClone(offer), payment:null, mint:null,
        delivery:'not_ready',invalidated:false,deliveryError:null};
      tx.put(order); return order;
    });
  }

  async confirmPayment(proof: unknown) {
    this.requireEnabled();
    const evidence = await this.adapters.verifyPayment(proof);
    [evidence.provider,evidence.eventId,evidence.paymentId,evidence.orderId].forEach(requireText);
    return this.repository.transaction(tx => {
      const order = requireOrder(tx,evidence.orderId);
      if (evidence.status !== 'confirmed' || address(evidence.wallet) !== order.principal.wallet ||
          evidence.currency !== order.offer.currency || evidence.amountMinor !== order.offer.priceMinor) throw new Error('Payment does not match the order');
      if (order.payment) {
        if (!sameEvidence(order.payment,evidence)) throw new Error('Conflicting payment evidence');
        return order;
      }
      if (!tx.claim(`payment:${evidence.provider}:${evidence.paymentId}`,order.id) ||
          !tx.claim(`payment-event:${evidence.provider}:${evidence.eventId}`,order.id)) throw new Error('Payment evidence already consumed');
      order.payment = structuredClone(evidence); tx.put(order); return order;
    });
  }

  /** This records a verified mint; it cannot create a token or infer mint success from payment. */
  async settleMint(orderId: string, proof: unknown) {
    this.requireEnabled();
    const evidence = await this.adapters.verifyMint(proof);
    const key = tokenKey(evidence);
    if (!/^0x[0-9a-fA-F]{64}$/.test(evidence.txHash) || !/^0x[0-9a-fA-F]{64}$/.test(evidence.blockHash) ||
        !Number.isSafeInteger(evidence.logIndex) || evidence.logIndex < 0) throw new Error('Invalid receipt identity');
    return this.repository.transaction(tx => {
      const order = requireOrder(tx,orderId), offer = order.offer;
      if (!order.payment || !evidence.finalized || evidence.production !== false || evidence.settlementId !== order.settlementId ||
          address(evidence.recipient) !== order.principal.wallet || evidence.chainId !== offer.chainId ||
          address(evidence.contract) !== address(offer.contract!) || evidence.productKey !== offer.productKey ||
          evidence.editionId !== offer.editionId || evidence.variantId !== offer.variantId) throw new Error('Mint does not match a paid order');
      if (order.mint) {
        if (!sameEvidence(order.mint,evidence)) throw new Error('Conflicting mint evidence');
        return order;
      }
      if (!tx.claim(`mint-event:${evidence.chainId}:${evidence.txHash.toLowerCase()}:${evidence.logIndex}`,orderId) ||
          !tx.claim(`token:${key}`,orderId)) throw new Error('Mint evidence already consumed');
      order.mint = structuredClone(evidence); order.delivery='pending'; tx.put(order);
      tx.enqueueReconciliation?.(order.id); return order;
    });
  }

  async deliver(orderId: string) {
    this.requireEnabled();
    const old=this.deliveryFlights.get(orderId); if(old)return old;
    const flight=this.deliverOnce(orderId); this.deliveryFlights.set(orderId,flight);
    try{return await flight;}finally{if(this.deliveryFlights.get(orderId)===flight)this.deliveryFlights.delete(orderId);}
  }

  private async deliverOnce(orderId:string):Promise<Order> {
    let order=await this.repository.transaction(tx=>requireOrder(tx,orderId));
    if(!order.mint||!order.payment)throw new Error('Mint must settle before game delivery');
    if(order.delivery==='revoked')throw new Error('Revoked delivery requires a new verified ownership binding');
    if(order.delivery==='revocation_pending')return this.revokeAndRecord(order,order.deliveryError??'Revocation pending');
    // No network call runs inside a database transaction. A leased outbox plus
    // the gateway's stable idempotency key handles cross-process retries.
    if(address(await this.adapters.currentOwner(order.mint))!==order.principal.wallet)
      return this.revokeAndRecord(order,'Ownership changed');
    order=await this.repository.transaction(tx=>requireOrder(tx,orderId));
    if(order.delivery==='delivered')return order;
    if(order.delivery==='revoked')throw new Error('Revoked delivery requires a new verified ownership binding');
    if(order.delivery==='revocation_pending')return this.revokeAndRecord(order,order.deliveryError??'Revocation pending');
    const key=tokenKey(order.mint!);
    try {
      await this.adapters.grant({idempotencyKey:`grant:${order.id}:${key}`,token:order.mint!,principal:order.principal,gameAssetId:order.offer.gameAssetId!});
      const owner=address(await this.adapters.currentOwner(order.mint!));
      const latest=await this.repository.transaction(tx=>{const row=tx.get(orderId);if(!row)throw Error('Unknown order');return row;});
      if(latest.invalidated||owner!==latest.principal.wallet||latest.delivery==='revoked'||latest.delivery==='revocation_pending')
        return this.revokeAndRecord(latest,latest.deliveryError??(latest.invalidated?'Order invalidated':'Ownership changed'));
      return this.repository.transaction(tx=>{
        const row=tx.get(orderId)!;
        // Invalidation can occur between owner verification and the commit.
        // Its atomically queued revocation remains authoritative.
        if(!row.invalidated&&row.delivery!=='revoked'&&row.delivery!=='revocation_pending'){row.delivery='delivered';row.deliveryError=null;tx.put(row);}
        return row;
      });
    } catch {
      return this.repository.transaction(tx=>{
        const row=tx.get(orderId)!;
        if(!row.invalidated&&row.delivery!=='revoked'&&row.delivery!=='revocation_pending'){row.delivery='failed';row.deliveryError='Game delivery failed; safe to retry';tx.put(row);}
        return row;
      });
    }
  }

  private async revokeAndRecord(order:Order,reason:string):Promise<Order> {
    if(!order.mint)throw Error('Mint must settle before revocation');
    const key=tokenKey(order.mint);
    // Persist intent first. A crash before or after the gateway call is retried
    // with the same revoke key and the same grant tombstone target.
    await this.repository.transaction(tx=>{
      const row=tx.get(order.id)!;
      const nextReason=row.invalidated?row.deliveryError:reason;
      const changed=row.delivery!=='revocation_pending'||row.deliveryError!==nextReason;
      if(changed){
        row.delivery='revocation_pending';row.deliveryError=nextReason;tx.put(row);
        tx.enqueueReconciliation?.(row.id);
      }
      // Retrying an existing intent must not dirty our own leased job: doing so
      // bypasses its retry delay. A genuinely new intent still wakes the worker.
    });
    try {
      await this.adapters.revoke({idempotencyKey:`revoke:${order.id}:${key}`,grantIdempotencyKey:`grant:${order.id}:${key}`,token:order.mint,gameAccountId:order.principal.gameAccountId,reason});
      return this.repository.transaction(tx=>{const row=tx.get(order.id)!;row.delivery='revoked';row.deliveryError=row.invalidated?row.deliveryError:reason;tx.put(row);return row;});
    } catch {
      return this.repository.transaction(tx=>tx.get(order.id)!);
    }
  }

  /** Worker entry point. Reconciliation may revoke; it never charges or mints. */
  async reconcile(orderId:string):Promise<Order> {
    this.requireEnabled();
    const order=await this.repository.transaction(tx=>{const row=tx.get(orderId);if(!row)throw Error('Unknown order');return row;});
    if(order.delivery==='revoked')return order;
    if(order.invalidated||order.delivery==='revocation_pending')return this.revokeAndRecord(order,order.deliveryError??'Order invalidated');
    try{return await this.deliver(orderId);}catch(error){
      const latest=await this.repository.transaction(tx=>tx.get(orderId)!);
      if(latest.invalidated)return this.revokeAndRecord(latest,latest.deliveryError??'Order invalidated');
      throw error;
    }
  }

  /** Called by an authenticated canonical-chain reconciliation worker after a reorg/refund review. */
  async invalidate(orderId: string, reason: string) {
    this.requireEnabled();
    requireText(reason);
    const order=await this.repository.transaction(tx => {
      const order=tx.get(orderId); if (!order) throw new Error('Unknown order');
      order.invalidated=true; order.delivery=order.mint?'revocation_pending':'revoked'; order.deliveryError=reason; tx.put(order);
      if(order.mint)tx.enqueueReconciliation?.(order.id); return order;
    });
    return order.mint?this.revokeAndRecord(order,reason):order;
  }
}

/** LOCAL TEST/DEMO ONLY. Production must supply durable transactions + unique constraints + outbox. */
export class LocalFulfillmentRepository implements FulfillmentRepository {
  private orders = new Map<string,Order>(); private claims = new Map<string,string>();
  private tail: Promise<unknown> = Promise.resolve();
  transaction<T>(action: (tx: FulfillmentTransaction) => T | Promise<T>): Promise<T> {
    const run=this.tail.then(async () => {
      const orders=structuredClone(this.orders), claims=structuredClone(this.claims);
      const result=await action({get:id=>orders.get(id),put:order=>orders.set(order.id,structuredClone(order)),
        claim:(key,id)=>{const old=claims.get(key);if(old && old!==id)return false;claims.set(key,id);return true;}});
      this.orders=orders;this.claims=claims;return structuredClone(result);
    });
    this.tail=run.catch(()=>undefined);return run;
  }
}
