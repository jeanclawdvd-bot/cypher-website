import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import path from 'node:path';
import {CollectionFulfillment,type ApprovedOffer,type FulfillmentAdapters,type PaymentEvidence,type MintEvidence,type FulfillmentTransaction} from './fulfillment';
import {LocalFulfillmentWorker,SqliteFulfillmentRepository} from './durable-fulfillment.server';

const wallet='0x'+'11'.repeat(20),contract='0x'+'22'.repeat(20),other='0x'+'33'.repeat(20);
const offer:ApprovedOffer={productId:'local-fixture',conceptId:'local-blue',collectionId:'clothing',itemType:'clothing',productKey:'local-product',editionId:'local-edition',variantId:'local-variant',chainId:31337,contract,priceMinor:'100',currency:'TEST',supplyCap:'2',gameAssetId:'local-test-asset',approved:true,legacyReference:false,unresolved:[]};
const payment=(id='one'):PaymentEvidence=>({provider:'fixture',eventId:`event-${id}`,paymentId:`payment-${id}`,orderId:id,wallet,currency:'TEST',amountMinor:'100',status:'confirmed'});
const mint=(id='one',token='900719925474099300000000000001'):MintEvidence=>({chainId:31337,contract,tokenId:token,txHash:'0x'+'44'.repeat(32),logIndex:id==='one'?1:2,blockHash:'0x'+'55'.repeat(32),finalized:true,production:false,settlementId:`settlement-${id}`,recipient:wallet,productKey:offer.productKey,editionId:offer.editionId,variantId:offer.variantId});
let directory:string,filename:string,now:number,repositories:SqliteFulfillmentRepository[],owner:string;
let granted:Set<string>,tombstones:Set<string>,adapters:FulfillmentAdapters;
function open(){const repo=new SqliteFulfillmentRepository(filename,{mode:'local',now:()=>now});repositories.push(repo);return repo;}
function service(repo:SqliteFulfillmentRepository,enabled=true){return new CollectionFulfillment(repo,adapters,enabled);}
function worker(repo:SqliteFulfillmentRepository,id='worker-one',options:Partial<{leaseMs:number;maxAttempts:number;retryMs:number;reconcileAfterMs:number}>={}){return new LocalFulfillmentWorker(repo,service(repo),{mode:'local',workerId:id,...options});}
async function create(s:CollectionFulfillment,id='one'){return s.createOrder(id,`settlement-${id}`,offer.productId,offer.conceptId,'fixture-session');}
async function paid(s:CollectionFulfillment,id='one'){await create(s,id);await s.confirmPayment(payment(id));}
async function settled(s:CollectionFulfillment,id='one',token?:string){await paid(s,id);await s.settleMint(id,mint(id,token));}
function deferred(){let resolve!:()=>void;const promise=new Promise<void>(r=>{resolve=r;});return {promise,resolve};}
beforeEach(()=>{
 const parent=path.resolve(process.cwd(),'.tmp');mkdirSync(parent,{recursive:true});directory=mkdtempSync(path.join(parent,'fulfillment-durable-'));filename=path.join(directory,'local.sqlite');
 now=100000;repositories=[];owner=wallet;granted=new Set();tombstones=new Set();
 adapters={resolveOffer:vi.fn(async()=>structuredClone(offer)),authenticate:vi.fn(async()=>({wallet,gameAccountId:'fixture-account'})),verifyPayment:vi.fn(async proof=>structuredClone(proof as PaymentEvidence)),verifyMint:vi.fn(async proof=>structuredClone(proof as MintEvidence)),currentOwner:vi.fn(async()=>owner),
  grant:vi.fn(async input=>{if(tombstones.has(input.idempotencyKey))throw Error('Grant tombstoned');if(owner!==input.principal.wallet)throw Error('Not owner');granted.add(input.idempotencyKey);}),
  revoke:vi.fn(async input=>{tombstones.add(input.grantIdempotencyKey);granted.delete(input.grantIdempotencyKey);})};
});
afterEach(()=>{
 for(const repo of repositories)try{repo.close();}catch{/* already closed to test restart */}
 const parent=path.resolve(process.cwd(),'.tmp')+path.sep;
 if(!directory.startsWith(parent)||!path.basename(directory).startsWith('fulfillment-durable-'))throw Error('Unsafe test cleanup');
 rmSync(directory,{recursive:true,force:true});
});

describe('durable local fulfillment and reconciliation outbox',()=>{
 it('requires explicit local mode and leaves default fulfillment disabled',async()=>{
  expect(()=>new SqliteFulfillmentRepository(filename,{mode:'production' as 'local'})).toThrow('local-only');
  const repo=open(),disabled=service(repo,false);
  await expect(create(disabled)).rejects.toThrow('not configured');
  await expect(disabled.confirmPayment(payment())).rejects.toThrow('not configured');
  await expect(disabled.settleMint('one',mint())).rejects.toThrow('not configured');
  await expect(disabled.deliver('one')).rejects.toThrow('not configured');
  expect(adapters.verifyPayment).not.toHaveBeenCalled();expect(adapters.verifyMint).not.toHaveBeenCalled();expect(repo.jobs()).toEqual([]);
 });
 it('persists separated payment, mint and queued delivery states through restarts',async()=>{
  const first=open(),s=service(first);await paid(s);expect(first.jobs()).toEqual([]);first.close();
  const second=open();expect((await second.transaction(tx=>tx.get('one')))?.mint).toBeNull();
  await service(second).settleMint('one',mint());expect(second.jobs()).toMatchObject([{orderId:'one',status:'pending'}]);second.close();
  const third=open();expect((await third.transaction(tx=>tx.get('one')))?.mint?.tokenId).toBe(mint().tokenId);
  expect(await worker(third).processOne()).toMatchObject({status:'completed'});expect(granted.size).toBe(1);
  expect(third.jobs()).toMatchObject([{status:'pending',nextRunAt:now+60000}]);
  expect(await worker(third).processOne()).toEqual({status:'idle'});
 });
 it('preserves unique payment and event claims after restart and rolls back partial claims',async()=>{
  const first=open();await paid(service(first));first.close();
  const second=open(),s=service(second);await create(s,'two');
  await expect(s.confirmPayment({...payment('two'),paymentId:payment().paymentId})).rejects.toThrow('already consumed');
  await expect(s.confirmPayment({...payment('two'),eventId:payment().eventId})).rejects.toThrow('already consumed');
  await expect(s.confirmPayment(payment('two'))).resolves.toMatchObject({id:'two'});
  await expect(create(s,'two')).resolves.toMatchObject({id:'two'});
  await expect(s.createOrder('three','settlement-one',offer.productId,offer.conceptId,'session')).rejects.toThrow('already allocated');
 });
 it('preserves unique token and canonical receipt claims after restart',async()=>{
  const first=open();await settled(service(first));first.close();
  const second=open(),s=service(second);await paid(s,'two');
  await expect(s.settleMint('two',mint('two'))).rejects.toThrow('already consumed');
  await expect(s.settleMint('two',{...mint('two','123'),logIndex:1})).rejects.toThrow('already consumed');
  await expect(s.settleMint('two',mint('two','123'))).resolves.toMatchObject({id:'two',delivery:'pending'});
 });
 it('rolls back settlement, unique receipt claims and queued work together if enqueue fails',async()=>{
  const repo=open();await paid(service(repo));
  const failing={transaction:<T>(action:(tx:FulfillmentTransaction)=>T|Promise<T>)=>repo.transaction(tx=>action({...tx,enqueueReconciliation:id=>{tx.enqueueReconciliation!(id);throw Error('crash before commit');}}))};
  const s=new CollectionFulfillment(failing,adapters,true);
  await expect(s.settleMint('one',mint())).rejects.toThrow('before commit');
  expect((await repo.transaction(tx=>tx.get('one')))?.mint).toBeNull();expect(repo.jobs()).toEqual([]);
  await expect(service(repo).settleMint('one',mint())).resolves.toMatchObject({delivery:'pending'});expect(repo.jobs()).toHaveLength(1);
 });
 it('claims one worker across independent connections and holds no transaction during adapter calls',async()=>{
  const first=open(),second=open();await settled(service(first));const started=deferred(),release=deferred();
  const grant=adapters.grant;
  adapters.grant=vi.fn(async input=>{started.resolve();await release.promise;await grant(input);});
  const inFlight=worker(first).processOne();await started.promise;
  expect(await worker(second,'worker-two').processOne()).toEqual({status:'idle'});
  await expect(second.transaction(tx=>{const row=tx.get('one')!;tx.put(row);return row.id;})).resolves.toBe('one');
  release.resolve();expect(await inFlight).toMatchObject({status:'completed'});expect(granted.size).toBe(1);
 });
 it('recovers an abandoned lease and rejects stale acknowledgments',async()=>{
  const first=open();await settled(service(first));const abandoned=first.claimNext('crashed',100,6)!;first.close();now+=101;
  const second=open(),replacement=second.claimNext('replacement',100,6)!;
  expect(replacement.attempts).toBe(2);expect(second.complete(abandoned,null)).toBe(false);expect(second.fail(abandoned)).toBe(false);
  await service(second).reconcile('one');expect(second.complete(replacement,60000)).toBe(true);expect(granted.size).toBe(1);
 });
 it('recovers a crash after delivery commit but before outbox acknowledgment without granting twice',async()=>{
  const first=open();await settled(service(first));first.claimNext('crashed',100);await service(first).reconcile('one');first.close();now+=101;
  const second=open();expect(await worker(second).processOne()).toMatchObject({status:'completed'});
  expect(adapters.grant).toHaveBeenCalledTimes(1);expect(granted.size).toBe(1);
 });
 it('retries a lost grant response with the identical key and no second logical entitlement',async()=>{
  const repo=open();await settled(service(repo));const grant=adapters.grant;let loseReply=true;
  adapters.grant=vi.fn(async input=>{await grant(input);if(loseReply){loseReply=false;throw Error('response lost after gateway commit');}});
  const w=worker(repo,'worker',{retryMs:100});expect(await w.processOne()).toMatchObject({status:'retry'});expect(granted.size).toBe(1);
  now+=100;expect(await w.processOne()).toMatchObject({status:'completed'});expect(granted.size).toBe(1);
  const calls=vi.mocked(adapters.grant).mock.calls;expect(calls).toHaveLength(2);expect(calls[0][0].idempotencyKey).toBe(calls[1][0].idempotencyKey);
  expect(adapters.verifyPayment).toHaveBeenCalledTimes(1);expect(adapters.verifyMint).toHaveBeenCalledTimes(1);
 });
 it('bounds exponential retries and requires explicit rescheduling after the retry limit',async()=>{
  const repo=open();await settled(service(repo));adapters.grant=vi.fn(async()=>{throw Error('unavailable');});
  const w=worker(repo,'worker',{maxAttempts:2,retryMs:100});expect(await w.processOne()).toMatchObject({status:'retry'});
  expect(repo.jobs()[0]).toMatchObject({status:'pending',attempts:1,nextRunAt:now+100});expect(await w.processOne()).toEqual({status:'idle'});
  now+=100;expect(await w.processOne()).toMatchObject({status:'dead'});expect(repo.jobs()[0]).toMatchObject({status:'dead',attempts:2});now+=3600000;expect(await w.processOne()).toEqual({status:'idle'});
  await repo.schedule('one');expect(repo.jobs()[0]).toMatchObject({status:'pending',attempts:0});
 });
 it('backs off failed revocation without exhausting a fixed-clock batch',async()=>{
  const repo=open(),s=service(repo);await settled(s);
  adapters.revoke=vi.fn(async()=>{throw Error('revocation unavailable');});
  await s.invalidate('one','refund confirmed');vi.mocked(adapters.revoke).mockClear();
  const w=worker(repo,'retry-worker',{retryMs:100});
  expect(await w.runBatch(10)).toEqual([{status:'retry',orderId:'one'},{status:'idle'}]);
  expect(adapters.revoke).toHaveBeenCalledTimes(1);
  expect(repo.jobs()[0]).toMatchObject({status:'pending',attempts:1,nextRunAt:now+100});
  now+=99;expect(await w.runBatch(10)).toEqual([{status:'idle'}]);
  now+=1;expect(await w.runBatch(10)).toEqual([{status:'retry',orderId:'one'},{status:'idle'}]);
  expect(adapters.revoke).toHaveBeenCalledTimes(2);
  expect(repo.jobs()[0]).toMatchObject({status:'pending',attempts:2,nextRunAt:now+200});
  expect(await repo.transaction(tx=>tx.get('one'))).toMatchObject({invalidated:true,delivery:'revocation_pending'});
 });
 it('retains an immediate wakeup for new invalidation during a leased revocation retry',async()=>{
  const first=open(),second=open();await settled(service(first));owner=other;
  adapters.revoke=vi.fn(async()=>{throw Error('revocation unavailable');});
  await service(first).reconcile('one');
  const started=deferred(),release=deferred();let calls=0;
  adapters.revoke=vi.fn(async()=>{if(++calls===1){started.resolve();await release.promise;}throw Error('revocation unavailable');});
  const w=worker(first,'retry-worker',{retryMs:100}),flight=w.processOne();await started.promise;
  await service(second).invalidate('one','canonical receipt invalidated');
  release.resolve();expect(await flight).toMatchObject({status:'retry'});
  expect(first.jobs()[0]).toMatchObject({status:'pending',attempts:1,nextRunAt:now});
  expect(await w.runBatch(10)).toEqual([{status:'retry',orderId:'one'},{status:'idle'}]);
  expect(first.jobs()[0]).toMatchObject({status:'pending',attempts:2,nextRunAt:now+200});
  expect(await second.transaction(tx=>tx.get('one'))).toMatchObject({invalidated:true,delivery:'revocation_pending',deliveryError:'canonical receipt invalidated'});
 });
 it('periodically rechecks delivered ownership and revokes after transfer',async()=>{
  const repo=open();await settled(service(repo));const w=worker(repo,'worker',{reconcileAfterMs:1000});await w.processOne();
  owner=other;now+=1000;expect(await w.processOne()).toMatchObject({status:'completed'});
  expect((await repo.transaction(tx=>tx.get('one')))?.delivery).toBe('revoked');expect(granted.size).toBe(0);expect(tombstones.size).toBe(1);
  expect(adapters.grant).toHaveBeenCalledTimes(1);
 });
 it('detects an ownership change during grant and compensates before recording delivery',async()=>{
  const repo=open();await settled(service(repo));const grant=adapters.grant;
  adapters.grant=vi.fn(async input=>{await grant(input);owner=other;});
  await worker(repo).processOne();expect((await repo.transaction(tx=>tx.get('one')))?.delivery).toBe('revoked');expect(granted.size).toBe(0);
 });
 it('tombstones an in-flight grant when another connection invalidates the order',async()=>{
  const first=open(),second=open();await settled(service(first));const started=deferred(),release=deferred(),grant=adapters.grant;
  adapters.grant=vi.fn(async input=>{started.resolve();await release.promise;await grant(input);});
  const flight=worker(first).processOne();await started.promise;
  await service(second).invalidate('one','canonical receipt invalidated');expect(tombstones.size).toBe(1);release.resolve();await flight;
  expect(granted.size).toBe(0);expect(await second.transaction(tx=>tx.get('one'))).toMatchObject({invalidated:true,delivery:'revoked'});
  await expect(service(second).confirmPayment(payment())).rejects.toThrow('invalidated');
 });
 it('persists failed revocation intent and retries it after restart without reopening payment evidence',async()=>{
  const first=open(),s=service(first);await settled(s);await worker(first).processOne();
  vi.mocked(adapters.revoke).mockRejectedValueOnce(Error('temporary gateway failure'));
  expect(await s.invalidate('one','refund confirmed')).toMatchObject({invalidated:true,delivery:'revocation_pending'});first.close();
  const second=open();await worker(second).processOne();expect(granted.size).toBe(0);
  expect(await second.transaction(tx=>tx.get('one'))).toMatchObject({invalidated:true,delivery:'revoked'});
  await create(service(second),'two');await expect(service(second).confirmPayment({...payment(),orderId:'two'})).rejects.toThrow('already consumed');
 });
 it.each(['success','failure'])('preserves cross-service revocation intent when a stale grant returns %s',async outcome=>{
  const first=open(),second=open();await settled(service(first));const started=deferred(),release=deferred(),grant=adapters.grant,revoke=adapters.revoke;
  adapters.grant=vi.fn(async input=>{started.resolve();await release.promise;if(outcome==='failure')throw Error('late failed grant response');await grant(input);});
  adapters.revoke=vi.fn(async()=>{throw Error('revocation unavailable');});
  const flight=worker(first).processOne();await started.promise;
  owner=other;expect(await service(second).reconcile('one')).toMatchObject({delivery:'revocation_pending'});
  owner=wallet;release.resolve();await flight;
  expect(await second.transaction(tx=>tx.get('one'))).toMatchObject({delivery:'revocation_pending',deliveryError:'Ownership changed'});
  adapters.revoke=revoke;await worker(second,'recovery').processOne();
  expect(await second.transaction(tx=>tx.get('one'))).toMatchObject({delivery:'revoked'});expect(granted.size).toBe(0);
 });
 it('preserves revocation committed after the last ownership snapshot but before delivery commit',async()=>{
  const first=open(),second=open();await settled(service(first));const grant=adapters.grant,revoke=adapters.revoke;
  let grantedResponse=false,interleaved=false;
  adapters.grant=vi.fn(async input=>{await grant(input);grantedResponse=true;});
  adapters.revoke=vi.fn(async()=>{throw Error('revocation unavailable');});
  const transaction=first.transaction.bind(first);
  first.transaction=async action=>{
   const result=await transaction(action);
   if(grantedResponse&&!interleaved&&(result as {delivery?:string})?.delivery==='pending'){
    interleaved=true;owner=other;await service(second).reconcile('one');owner=wallet;
   }
   return result;
  };
  await worker(first).processOne();expect(interleaved).toBe(true);
  expect(await second.transaction(tx=>tx.get('one'))).toMatchObject({delivery:'revocation_pending'});
  adapters.revoke=revoke;await worker(second,'recovery').processOne();expect(granted.size).toBe(0);
 });
 it('rejects asynchronous or escaped transaction callbacks and rolls back writes and claims',async()=>{
  const repo=open(),s=service(repo);await create(s);let escaped!:FulfillmentTransaction;
  await expect(repo.transaction(tx=>{escaped=tx;tx.claim('rollback-key','one');throw Error('abort');})).rejects.toThrow('abort');
  expect(()=>escaped.put({} as never)).toThrow('closed');
  await expect(repo.transaction(async tx=>{tx.claim('async-key','one');await Promise.resolve();tx.claim('late-key','one');})).rejects.toThrow('synchronous');
  await create(s,'two');expect(await repo.transaction(tx=>tx.claim('rollback-key','two'))).toBe(true);expect(await repo.transaction(tx=>tx.claim('async-key','two'))).toBe(true);
 });
});
