import { describe, it, expect, vi } from 'vitest';
import { CollectionFulfillment, LocalFulfillmentRepository, type ApprovedOffer, type PaymentEvidence,
  type MintEvidence, type FulfillmentAdapters } from './fulfillment';

const wallet='0x'+'11'.repeat(20), contract='0x'+'22'.repeat(20), other='0x'+'33'.repeat(20);
const offer: ApprovedOffer={productId:'test-only-shirt',conceptId:'test-blue',collectionId:'clothing',itemType:'clothing',
  productKey:'local-product',editionId:'local-blue-edition',variantId:'local-approved-blue',chainId:31337,contract,
  priceMinor:'100',currency:'TEST',supplyCap:'2',gameAssetId:'test-only-game-asset',approved:true,legacyReference:false,unresolved:[]};
const payment: PaymentEvidence={provider:'test',eventId:'payment-event',paymentId:'pay-1',orderId:'order-1',wallet,
  currency:'TEST',amountMinor:'100',status:'confirmed'};
const mint: MintEvidence={chainId:31337,contract,tokenId:'100000000000000000000000000000000000000000000000000000000001',
  txHash:'0x'+'44'.repeat(32),logIndex:2,blockHash:'0x'+'55'.repeat(32),finalized:true,production:false,settlementId:'settlement-1',
  recipient:wallet,productKey:offer.productKey,editionId:offer.editionId,variantId:offer.variantId};
function setup(overrides: Partial<FulfillmentAdapters>={}, enabled=true) {
  const repository=new LocalFulfillmentRepository();
  const adapters: FulfillmentAdapters={resolveOffer:vi.fn(async()=>structuredClone(offer)),
    authenticate:vi.fn(async()=>({wallet,gameAccountId:'test-account'})),
    verifyPayment:vi.fn(async()=>structuredClone(payment)),verifyMint:vi.fn(async()=>structuredClone(mint)),
    currentOwner:vi.fn(async()=>wallet),grant:vi.fn(async()=>{}),revoke:vi.fn(async()=>{}),...overrides};
  const service=new CollectionFulfillment(repository,adapters,enabled);
  const create=(id='order-1',settlement='settlement-1')=>service.createOrder(id,settlement,offer.productId,offer.conceptId,'authenticated-test-session');
  return {repository,adapters,service,create};
}
async function paid() {const s=setup();await s.create();await s.service.confirmPayment('signed-test-webhook');return s;}
async function settled(){const s=await paid();await s.service.settleMint('order-1','canonical-test-receipt');return s;}

describe('collection fulfillment authority and state separation',()=>{
  it('is disabled by default and never treats authentication as a launch approval',async()=>{
    const s=setup({},false);await expect(s.create()).rejects.toThrow('not configured');
    const pending=setup({resolveOffer:async()=>({...offer,unresolved:['game color mapping'],approved:false})});
    await expect(pending.create()).rejects.toThrow('not launch-approved');
  });
  it.each(['priceMinor','supplyCap','chainId','contract','gameAssetId'] as const)('rejects missing launch value %s',async field=>{
    const s=setup({resolveOffer:async()=>({...offer,[field]:null})});await expect(s.create()).rejects.toThrow();
  });
  it('rejects legacy remint placeholders, invalid collection types and concept substitutions',async()=>{
    await expect(setup({resolveOffer:async()=>({...offer,legacyReference:true})}).create()).rejects.toThrow();
    await expect(setup({resolveOffer:async()=>({...offer,itemType:'rim_set'})}).create()).rejects.toThrow('Wrong collection');
    await expect(setup({resolveOffer:async()=>({...offer,conceptId:'different'})}).create()).rejects.toThrow('identity mismatch');
  });
  it('requires authenticated session and provider evidence',async()=>{
    await expect(setup({authenticate:async()=>{throw Error('Invalid session')}}).create()).rejects.toThrow('Invalid session');
    const s=setup({verifyPayment:async()=>{throw Error('Bad webhook signature')}});await s.create();
    await expect(s.service.confirmPayment({confirmed:true})).rejects.toThrow('Bad webhook');
  });
  it('does not deliver or settle a mint from payment alone',async()=>{
    const s=setup();await s.create();await expect(s.service.settleMint('order-1',mint)).rejects.toThrow('paid order');
    const order=await s.service.confirmPayment(payment);expect(order.mint).toBeNull();expect(order.delivery).toBe('not_ready');
    await expect(s.service.deliver('order-1')).rejects.toThrow('Mint must settle');expect(s.adapters.grant).not.toHaveBeenCalled();
  });
  it.each([{amountMinor:'1'},{wallet:other},{currency:'USD'},{status:'pending'},{status:'refunded'}])('rejects payment mismatch %o',async change=>{
    const s=setup({verifyPayment:async()=>({...payment,...change} as PaymentEvidence)});await s.create();
    await expect(s.service.confirmPayment('proof')).rejects.toThrow('does not match');
  });
  it('makes exact webhook retries idempotent while preventing payment reuse across orders',async()=>{
    const s=await paid();await s.service.confirmPayment('retry');await s.create('order-2','settlement-2');
    s.adapters.verifyPayment=async()=>({...payment,orderId:'order-2',eventId:'new-event'});
    await expect(s.service.confirmPayment('replayed-payment')).rejects.toThrow('already consumed');
  });
  it('prevents settlement reuse and order identity mutation',async()=>{
    const s=setup();await s.create();await expect(s.create('order-2','settlement-1')).rejects.toThrow('already allocated');
    await expect(s.create('order-1','settlement-2')).rejects.toThrow('identity conflict');
  });
  it('does not permit settlement reuse through another collection contract',async()=>{
    const s=setup();await s.create();s.adapters.resolveOffer=async()=>({...offer,contract:other});
    await expect(s.create('order-2','settlement-1')).rejects.toThrow('already allocated');
  });
  it.each([{finalized:false},{production:true},{chainId:1},{contract:other},{recipient:other},{editionId:'other-edition'},
    {productKey:'other-product'},{variantId:'unapproved-color'},{settlementId:'other-settlement'},{tokenId:'1e10'},{logIndex:-1}])('rejects mint mismatch %o',async change=>{
    const s=await paid();s.adapters.verifyMint=async()=>({...mint,...change});
    await expect(s.service.settleMint('order-1','proof')).rejects.toThrow();
  });
  it('retains long token IDs as exact strings and makes mint/delivery retries idempotent',async()=>{
    const s=await settled();const retry=await s.service.settleMint('order-1','retry');expect(retry.mint?.tokenId).toBe(mint.tokenId);
    const results=await Promise.all([s.service.deliver('order-1'),s.service.deliver('order-1')]);
    expect(results.every(r=>r.delivery==='delivered')).toBe(true);expect(s.adapters.grant).toHaveBeenCalledTimes(1);
  });
  it('rejects shared token or receipt evidence across independently paid orders',async()=>{
    const s=await settled();await s.create('order-2','settlement-2');
    s.adapters.verifyPayment=async()=>({...payment,orderId:'order-2',eventId:'event-2',paymentId:'pay-2'});
    await s.service.confirmPayment('proof');s.adapters.verifyMint=async()=>({...mint,settlementId:'settlement-2'});
    await expect(s.service.settleMint('order-2','proof')).rejects.toThrow('already consumed');
  });
  it('retries game delivery without reminting or charging again',async()=>{
    const s=await settled();vi.mocked(s.adapters.grant).mockRejectedValueOnce(Error('temporary game outage'));
    expect((await s.service.deliver('order-1')).delivery).toBe('failed');
    expect((await s.service.deliver('order-1')).delivery).toBe('delivered');
    expect(s.adapters.verifyPayment).toHaveBeenCalledTimes(1);expect(s.adapters.verifyMint).toHaveBeenCalledTimes(1);
    const calls=vi.mocked(s.adapters.grant).mock.calls;expect(calls[0][0].idempotencyKey).toBe(calls[1][0].idempotencyKey);
  });
  it('rechecks ownership even after delivery and revokes a transferred entitlement',async()=>{
    const s=await settled();await s.service.deliver('order-1');s.adapters.currentOwner=async()=>other;
    expect((await s.service.deliver('order-1')).delivery).toBe('revoked');expect(s.adapters.revoke).toHaveBeenCalledTimes(1);
  });
  it('supports canonical-chain invalidation without making payment or mint proofs spendable again',async()=>{
    const s=await settled();await s.service.deliver('order-1');await s.service.invalidate('order-1','canonical receipt invalidated');
    await expect(s.service.deliver('order-1')).rejects.toThrow('invalidated');expect(s.adapters.revoke).toHaveBeenCalled();
  });
  it('rolls back claims and state after transaction failure',async()=>{
    const repo=new LocalFulfillmentRepository();await expect(repo.transaction(tx=>{tx.claim('key','a');throw Error('rollback')})).rejects.toThrow();
    expect(await repo.transaction(tx=>tx.claim('key','b'))).toBe(true);
  });
});
