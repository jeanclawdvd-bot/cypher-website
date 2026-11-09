import { readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleStoreApi } from './http';
import {MAX_ATOMIC,localAtomicFeeQuote,type LocalPurchaseQuote} from './currency';
import * as catalog from './catalog';
import reviewIdentities from './original-review-identities.json';
import {createReviewDraft} from '@/sites/wilderworld/marketplace/product-reviews';
import {Wallet} from 'ethers';
import * as walletProof from './wallets';
import {PHOTO_DATA_URL,PHOTO_FIXTURE} from './profile-photo.fixture';
import type { StoreEnvironment, StoreInventoryItem, StoreListing, StoreSale, StoreSession } from './types';

// Executes the real migration, constraints and triggers. Only Cloudflare's D1
// transport is adapted; HTTP validation and business logic are not mocked.
class SqliteStatement {
  constructor(readonly db: DatabaseSync, readonly sql: string, readonly values: SQLInputValue[] = []) {}
  bind(...values: SQLInputValue[]) { return new SqliteStatement(this.db, this.sql, values); }
  execute() {
    const statement = this.db.prepare(this.sql);
    const results = statement.columns().length ? statement.all(...this.values) : [];
    const info = statement.columns().length ? null : statement.run(...this.values);
    return { success: true, results, meta: { changes: Number(info?.changes ?? 0), last_row_id: Number(info?.lastInsertRowid ?? 0), duration: 0, rows_read: results.length, rows_written: Number(info?.changes ?? 0) } };
  }
  async first(column?: string) {
    const value = this.db.prepare(this.sql).get(...this.values);
    return value ? (column ? value[column] ?? null : value) : null;
  }
  async all() { return this.execute(); }
  async run() { return this.execute(); }
  async raw() { return this.db.prepare(this.sql).all(...this.values).map(row => Object.values(row)); }
}
function d1Adapter(database: DatabaseSync): D1Database {
  return {
    prepare: (sql: string) => new SqliteStatement(database, sql),
    batch: async (statements: SqliteStatement[]) => {
      database.exec('BEGIN IMMEDIATE');
      try { const results = statements.map(statement => statement.execute()); database.exec('COMMIT'); return results; }
      catch (error) { database.exec('ROLLBACK'); throw error; }
    },
    exec: async (sql: string) => { database.exec(sql); return { count: 1, duration: 0 }; },
  } as unknown as D1Database;
}

const ORIGIN = 'http://127.0.0.1:8792';
const PASSWORD = 'Local audit password 2026!';
type Auth = { cookie: string; csrf: string; id: string };
type JsonResponse = { response: Response; body: Record<string, any> };
let database: DatabaseSync;
let env: StoreEnvironment;
let seller: Auth;
let buyer: Auth;
let otherBuyer: Auth;

async function request(path: string, options: { method?: string; body?: unknown; auth?: Auth; headers?: Record<string, string>; origin?: string; environment?: StoreEnvironment; url?: string } = {}): Promise<JsonResponse> {
  const method = options.method ?? (options.body === undefined ? 'GET' : 'POST');
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET' && method !== 'HEAD') headers.Origin = options.origin ?? ORIGIN;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.auth) { headers.Cookie = options.auth.cookie; headers['X-CSRF-Token'] = options.auth.csrf; }
  Object.assign(headers, options.headers);
  const response = await handleStoreApi(new Request(`${options.url ?? ORIGIN}/api/store/v1${path}`, { method, headers, ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }) }), options.environment ?? env);
  if (!response) throw new Error(`Store API did not handle ${path}`);
  return { response, body: await response.json() };
}
async function register(email: string, name: string): Promise<Auth> {
  const result = await request('/register', { body: { email, displayName: name, password: PASSWORD } });
  expect(result.response.status, JSON.stringify(result.body)).toBe(201);
  const session = result.body as StoreSession;
  const cookie = result.response.headers.get('set-cookie')!;
  expect(cookie).toContain('HttpOnly'); expect(cookie).toContain('SameSite=Strict');
  expect(session.user?.id).toBeTruthy(); expect(session.csrfToken).toBeTruthy();
  return { cookie: cookie.split(';')[0], csrf: session.csrfToken!, id: session.user!.id };
}
async function seed(auth = seller): Promise<StoreInventoryItem[]> {
  const result = await request('/seed', { body: {}, auth });
  expect(result.response.status, JSON.stringify(result.body)).toBeLessThan(300);
  expect(result.body.created).toBe(3);
  return result.body.inventory;
}
async function list(item: StoreInventoryItem, auth = seller, amount: string|number = '12345'): Promise<StoreListing> {
  const result = await request('/listings', { body: { itemId: item.id, amountAtomic:String(amount),currency:'WILD' }, auth });
  expect(result.response.status, JSON.stringify(result.body)).toBe(201);
  return result.body.listing;
}
const quotes=new Map<string,Promise<JsonResponse>>();
async function quote(listing:StoreListing,auth=buyer,paymentCurrency='WILD'){
  const key=JSON.stringify([listing.id,auth.id,paymentCurrency]);
  if(!quotes.has(key))quotes.set(key,request(`/listings/${listing.id}/quote`,{auth,body:{paymentCurrency,expectedCurrency:listing.currency,expectedAmountAtomic:listing.amountAtomic}}));
  return quotes.get(key)!;
}
async function buy(listing: StoreListing, auth = buyer, key = crypto.randomUUID(), extras: Record<string, unknown> = {}) {
  const result=await quote(listing,auth,String(extras.paymentCurrency??'WILD'));
  if(result.response.status!==201)return result;
  const q=result.body.quote as LocalPurchaseQuote;
  return request(`/listings/${listing.id}/buy`, { body: { idempotencyKey: key,quoteId:q.id,expectedAmountAtomic:listing.amountAtomic,expectedCurrency:listing.currency,paymentCurrency:q.paymentCurrency,expectedPaymentAmountAtomic:q.paymentAmountAtomic,...extras }, auth });
}
function migrateCurrency(){database.exec('BEGIN IMMEDIATE');try{database.exec(readFileSync('migrations/store/0004_local_wild_currency.sql','utf8'));database.exec('COMMIT');}catch(error){database.exec('ROLLBACK');throw error;}}
function count(table: string) { return Number(database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()!.count); }

beforeEach(async () => {
  quotes.clear();
  database = new DatabaseSync(':memory:');
  database.exec(readFileSync('migrations/store/0001_local_store.sql', 'utf8'));
  database.exec(readFileSync('migrations/store/0002_local_reviews.sql', 'utf8'));
  database.exec(readFileSync('migrations/store/0003_local_marketplace_fees.sql', 'utf8'));
  migrateCurrency();
  database.exec(readFileSync('migrations/store/0005_local_wallet_links.sql','utf8'));
  database.exec(readFileSync('migrations/store/0006_local_profile_photos.sql','utf8'));
  env = { STORE_MODE: 'local', STORE_DB: d1Adapter(database) };
  seller = await register('seller@example.test', 'Local seller');
  buyer = await register('buyer@example.test', 'Local buyer');
  otherBuyer = await register('other@example.test', 'Other buyer');
}, 20_000);
afterEach(() => {database?.close();vi.restoreAllMocks();});

describe('local store HTTP and SQLite integration security', () => {
  it('persists a private profile photo, replaces and removes it without writing to ZERO',async()=>{
    const created=await request('/profile/photo',{method:'PUT',auth:seller,body:{dataUrl:PHOTO_DATA_URL}});
    expect(created.response.status,JSON.stringify(created.body)).toBe(200);
    expect(created.body.user).toMatchObject({profileSource:'local',zeroSyncStatus:'unconfigured'});
    expect(created.body.user.avatarUrl).toMatch(/^\/api\/store\/v1\/profile\/photo\?v=[a-f0-9]{64}$/);
    expect((await request('/account',{auth:seller})).body.user.avatarUrl).toBe(created.body.user.avatarUrl);
    expect((await request('/session',{auth:seller})).body.user.avatarUrl).toBe(created.body.user.avatarUrl);
    const image=await handleStoreApi(new Request(ORIGIN+created.body.user.avatarUrl,{headers:{Cookie:seller.cookie}}),env);
    expect(image!.status).toBe(200);
    expect(image!.headers.get('content-type')).toBe('image/jpeg');
    expect(image!.headers.get('cache-control')).toContain('no-store');
    expect(image!.headers.get('x-content-type-options')).toBe('nosniff');
    expect(image!.headers.get('cross-origin-resource-policy')).toBe('same-origin');
    expect(Buffer.from(await image!.arrayBuffer()).toString('base64')).toBe(PHOTO_FIXTURE);
    // A JPEG comment changes the stored file without introducing a new format.
    const original=Buffer.from(PHOTO_FIXTURE,'base64');
    const replacement=Buffer.concat([original.subarray(0,2),Buffer.from([0xff,0xfe,0,3,65]),original.subarray(2)]);
    const replaced=await request('/profile/photo',{method:'PUT',auth:seller,body:{dataUrl:'data:image/jpeg;base64,'+replacement.toString('base64')}});
    expect(replaced.response.status).toBe(200);expect(replaced.body.user.avatarUrl).not.toBe(created.body.user.avatarUrl);
    expect(count('store_profile_photos')).toBe(1);
    const edited=await request('/profile',{method:'PATCH',auth:seller,body:{displayName:'New profile name',bio:'Local changes'}});
    expect(edited.body.user).toMatchObject({displayName:'New profile name',avatarUrl:replaced.body.user.avatarUrl,profileSource:'local',zeroSyncStatus:'unconfigured'});
    const removed=await request('/profile/photo',{method:'DELETE',auth:seller,body:{}});
    expect(removed.body.user.avatarUrl).toBeNull();expect(count('store_profile_photos')).toBe(0);
    expect((await request('/profile/photo',{auth:seller})).response.status).toBe(404);
  });
  it('isolates profile images by authenticated owner and rejects forged ownership, invalid data or oversized bodies',async()=>{
    expect((await request('/profile/photo',{method:'PUT',auth:seller,body:{dataUrl:PHOTO_DATA_URL}})).response.status).toBe(200);
    expect((await request('/profile/photo')).response.status).toBe(401);
    expect((await request(`/profile/photo?userId=${seller.id}`,{auth:buyer})).response.status).toBe(404);
    expect((await request('/account',{auth:buyer})).body.user.avatarUrl).toBeNull();
    expect((await request('/profile/photo',{method:'PUT',body:{dataUrl:PHOTO_DATA_URL}})).response.status).toBe(401);
    expect((await request('/profile/photo',{method:'PUT',auth:seller,headers:{'X-CSRF-Token':''},body:{dataUrl:PHOTO_DATA_URL}})).response.status).toBe(403);
    expect((await request('/profile/photo',{method:'PUT',auth:seller,origin:'https://attacker.invalid',body:{dataUrl:PHOTO_DATA_URL}})).response.status).toBe(403);
    expect((await request('/profile/photo',{method:'DELETE',auth:buyer,body:{userId:seller.id}})).response.status).toBe(400);
    expect((await request('/profile/photo',{method:'PUT',auth:buyer,body:{userId:seller.id,dataUrl:PHOTO_DATA_URL}})).response.status).toBe(400);
    for(const dataUrl of ['https://attacker.invalid/photo.jpg','data:image/jpeg;base64,'+Buffer.from('<svg/>').toString('base64'),'data:image/svg+xml;base64,PHN2Zy8+']){
      expect((await request('/profile/photo',{method:'PUT',auth:seller,body:{dataUrl}})).response.status).toBe(400);
    }
    expect((await request('/profile/photo',{method:'PUT',auth:seller,body:{dataUrl:'x'.repeat(350*1024)}})).response.status).toBe(413);
    expect((await request('/profile',{method:'PATCH',auth:seller,body:{bio:'x'.repeat(17000)}})).response.status).toBe(413);
    expect((await request('/profile',{method:'PATCH',auth:seller,body:{zeroSyncStatus:'synced',avatarUrl:'https://attacker.invalid'}})).response.status).toBe(400);
    expect(count('store_profile_photos')).toBe(1);
    expect(database.prepare('SELECT image_base64 FROM store_profile_photos WHERE user_id=?').get(seller.id)!.image_base64).toBe(PHOTO_FIXTURE);
  });
  it('allows a bounded photo above the ordinary JSON limit without enlarging other write routes',async()=>{
    const original=Buffer.from(PHOTO_FIXTURE,'base64'),comment=Buffer.alloc(18004,65);
    comment[0]=0xff;comment[1]=0xfe;comment.writeUInt16BE(18002,2);
    const image=Buffer.concat([original.subarray(0,2),comment,original.subarray(2)]);
    const dataUrl='data:image/jpeg;base64,'+image.toString('base64');
    expect(dataUrl.length).toBeGreaterThan(16384);
    expect((await request('/profile/photo',{method:'PUT',auth:seller,body:{dataUrl}})).response.status).toBe(200);
    expect((await request('/profile',{method:'PATCH',auth:seller,body:{dataUrl}})).response.status).toBe(413);
    expect(count('store_profile_photos')).toBe(1);
  });
  // Fixed, public test keys only; never used with a provider or real wallet.
  const testWallet=new Wallet('0x'+'11'.repeat(32));
  const wrongWallet=new Wallet('0x'+'22'.repeat(32));
  async function challenge(auth=seller,address=testWallet.address){
    const response=await request('/wallets/challenges',{auth,body:{address,chainId:1}});
    expect(response.response.status,JSON.stringify(response.body)).toBe(201);
    return response.body.challenge;
  }
  async function link(ch:Record<string,any>,auth=seller,signature?:string){
    return request('/wallets/link',{auth,body:{challengeId:ch.id,signature:signature??await testWallet.signMessage(ch.message)}});
  }
  it('links a mainnet wallet using an account-bound personal-sign challenge without creating ownership or entitlement',async()=>{
    const ch=await challenge(seller,testWallet.address.toLowerCase());
    expect(ch).toMatchObject({address:testWallet.address,chainId:1,domain:'127.0.0.1:8792',origin:ORIGIN});
    expect(ch.nonce).toMatch(/^[0-9a-f]{32}$/);
    expect(Date.parse(ch.expiresAt)-Date.parse(ch.issuedAt)).toBe(300_000);
    expect(ch.message).toContain(walletProof.WALLET_LINK_STATEMENT);
    expect(ch.message).toContain(`\nChain ID: 1\nNonce: ${ch.nonce}\n`);
    expect(ch.message).toContain(`urn:wilderworld:local-account:${seller.id}`);
    const linked=await link(ch);
    expect(linked.response.status,JSON.stringify(linked.body)).toBe(201);
    expect(linked.body.wallet).toMatchObject({address:testWallet.address,chainId:1,proofType:'eip191'});
    const wallets=await request('/wallets',{auth:seller});
    expect(wallets.body).toMatchObject({wallets:[linked.body.wallet],assetSyncStatus:'unconfigured',gameDeliveryStatus:'unconfigured'});
    expect((await request('/wallets',{auth:buyer})).body.wallets).toEqual([]);
    expect(count('store_items')).toBe(0);expect(count('store_sales')).toBe(0);
    expect(database.prepare('SELECT consumed_at FROM store_wallet_challenges WHERE id=?').get(ch.id)!.consumed_at).toBeTruthy();
    expect((await request('/wallets',{auth:seller,url:'https://wilder.example'})).response.status).toBe(404);
    expect((await request('/wallets',{auth:seller,environment:{...env,STORE_MODE:'production'}})).response.status).toBe(404);
  });
  it('requires account authentication, exact origin, CSRF, valid mainnet addresses and server-owned challenge fields',async()=>{
    expect((await request('/wallets')).response.status).toBe(401);
    expect((await request('/wallets/challenges',{body:{address:testWallet.address,chainId:1}})).response.status).toBe(401);
    for(const change of [{chainId:5},{chainId:'1'},{address:'0x'+'0'.repeat(40)},{address:'not-an-address'},{domain:'attacker.test'},{userId:buyer.id},{message:'Sign this'}]){
      expect((await request('/wallets/challenges',{auth:seller,body:{address:testWallet.address,chainId:1,...change}})).response.status).toBe(400);
    }
    for(const headers of [{'X-CSRF-Token':''},{Origin:'https://attacker.test'}] as Record<string,string>[]){
      expect((await request('/wallets/challenges',{auth:seller,headers,body:{address:testWallet.address,chainId:1}})).response.status).toBe(403);
    }
    expect(count('store_wallet_challenges')).toBe(0);
  });
  it('rejects other accounts, ports, messages and signers before consuming the exact wallet proof',async()=>{
    const ch=await challenge(),signature=await testWallet.signMessage(ch.message);
    expect((await link(ch,buyer,signature)).response.status).toBe(409);
    expect((await request('/wallets/link',{auth:seller,url:'http://127.0.0.1:9999',origin:'http://127.0.0.1:9999',body:{challengeId:ch.id,signature}})).response.status).toBe(409);
    expect((await link(ch,seller,await wrongWallet.signMessage(ch.message))).response.status).toBe(400);
    for(const message of [ch.message.replace('Chain ID: 1','Chain ID: 5'),ch.message.replace(ch.nonce,'f'.repeat(32)),ch.message.replace(ORIGIN,'https://attacker.test')]){
      expect((await link(ch,seller,await testWallet.signMessage(message))).response.status).toBe(400);
    }
    expect((await request('/wallets/link',{auth:seller,body:{challengeId:ch.id,signature,address:wrongWallet.address}})).response.status).toBe(400);
    expect(database.prepare('SELECT consumed_at FROM store_wallet_challenges WHERE id=?').get(ch.id)!.consumed_at).toBeNull();
    expect((await link(ch,seller,signature)).response.status).toBe(201);
    expect((await link(ch,seller,signature)).response.status).toBe(409);
    expect(count('store_wallet_links')).toBe(1);
  });
  it('binds a wallet confirmation to the requesting session, not merely the account',async()=>{
    const ch=await challenge();
    const login=await request('/login',{body:{email:'seller@example.test',password:PASSWORD}});
    const newSession={id:seller.id,csrf:login.body.csrfToken,cookie:login.response.headers.get('set-cookie')!.split(';')[0]};
    expect((await link(ch,newSession)).response.status).toBe(409);
    expect(count('store_wallet_links')).toBe(0);
    expect((await link(await challenge(newSession),newSession)).response.status).toBe(201);
  });
  it('rejects expired wallet challenges and rechecks expiry and session revocation at atomic insertion',async()=>{
    const expired=await challenge();
    database.prepare('UPDATE store_wallet_challenges SET issued_at=?,expires_at=? WHERE id=?').run('2000-01-01T00:00:00.000Z','2000-01-01T00:05:00.000Z',expired.id);
    expect((await link(expired)).response.status).toBe(409);
    const verify=walletProof.verifyWalletChallenge;
    const racing=await challenge();
    vi.spyOn(walletProof,'verifyWalletChallenge').mockImplementationOnce((record,signature)=>{
      const valid=verify(record,signature);
      database.prepare('UPDATE store_wallet_challenges SET issued_at=?,expires_at=? WHERE id=?').run('2000-01-01T00:00:00.000Z','2000-01-01T00:05:00.000Z',record.id);
      return valid;
    });
    expect((await link(racing)).response.status).toBe(409);
    const revoked=await challenge();
    vi.spyOn(walletProof,'verifyWalletChallenge').mockImplementationOnce((record,signature)=>{
      const valid=verify(record,signature);
      database.prepare('DELETE FROM store_sessions WHERE user_id=?').run(seller.id);
      return valid;
    });
    expect((await link(revoked)).response.status).toBe(409);
    expect(count('store_wallet_links')).toBe(0);
    expect(database.prepare('SELECT COUNT(*) AS count FROM store_wallet_challenges WHERE consumed_at IS NOT NULL').get()!.count).toBe(0);
  });
  it('atomically consumes a wallet challenge once and keeps address uniqueness across competing accounts',async()=>{
    const ch=await challenge(),signature=await testWallet.signMessage(ch.message);
    const replayRace=await Promise.all([link(ch,seller,signature),link(ch,seller,signature)]);
    expect(replayRace.map(result=>result.response.status).sort()).toEqual([201,409]);
    const walletId=replayRace.find(result=>result.response.status===201)!.body.wallet.id;
    expect((await request(`/wallets/${walletId}`,{method:'DELETE',auth:seller,body:{}})).response.status).toBe(200);
    const [first,second]=await Promise.all([challenge(seller),challenge(buyer)]);
    const uniquenessRace=await Promise.all([link(first),link(second,buyer)]);
    expect(uniquenessRace.map(result=>result.response.status).sort()).toEqual([201,409]);
    expect(count('store_wallet_links')).toBe(1);
    expect(database.prepare('SELECT COUNT(*) AS count FROM store_wallet_challenges WHERE consumed_at IS NOT NULL').get()!.count).toBe(2);
  });
  it('allows only the linked account to unlink and revokes outstanding proofs for that address',async()=>{
    const ch=await challenge(),linked=await link(ch),id=linked.body.wallet.id;
    const pending=await challenge();
    expect((await request(`/wallets/${id}`,{method:'DELETE',auth:buyer,body:{}})).response.status).toBe(404);
    expect((await request(`/wallets/${id}`,{method:'DELETE',auth:seller,headers:{'X-CSRF-Token':''},body:{}})).response.status).toBe(403);
    expect((await request(`/wallets/${id}`,{method:'DELETE',auth:seller,body:{}})).response.status).toBe(200);
    expect((await request('/wallets',{auth:seller})).body.wallets).toEqual([]);
    expect((await link(ch)).response.status).toBe(409);
    expect((await link(pending)).response.status).toBe(409);
    expect((await link(await challenge(buyer),buyer)).response.status).toBe(201);
    expect(count('store_items')).toBe(0);
  });
  it('rate-limits failed wallet proof verification without consuming the legitimate challenge',async()=>{
    const ch=await challenge(),signature=await wrongWallet.signMessage(ch.message);
    for(let attempt=0;attempt<15;attempt++)expect((await link(ch,seller,signature)).response.status).toBe(400);
    const blocked=await link(ch,seller,signature);
    expect(blocked.response.status).toBe(429);
    expect(blocked.response.headers.get('retry-after')).toBeTruthy();
    expect(count('store_wallet_links')).toBe(0);
    expect(database.prepare('SELECT consumed_at FROM store_wallet_challenges WHERE id=?').get(ch.id)!.consumed_at).toBeNull();
  });
  it('accepts exact grouped original reviews but never promotes them to tradable inventory or verification',async()=>{
    const [productId,variants]=Object.entries(reviewIdentities.families)[0],variantId=variants[0];
    const [item]=await seed(),listing=await list(item),existingQuote=(await quote(listing)).body.quote as LocalPurchaseQuote;
    // Even an out-of-band historical test row cannot turn a whole family into an owned token.
    database.prepare('UPDATE store_items SET product_id=?,variant_id=? WHERE id=?').run(productId,variantId,item.id);
    const submitted=await request('/reviews',{auth:seller,body:{productId,variantId,rating:4,title:'Edition review',body:'Reviewing this exact original finish in the local preview.'}});
    expect(submitted.response.status).toBe(201);
    expect(submitted.body.review).toMatchObject({productId,variantId,moderation:'pending',ownershipAtSubmission:false,localPurchaseId:null});
    expect(submitted.body.review.verifiedPurchase).not.toBe(true);expect(submitted.body.review.verifiedOwnership).not.toBe(true);
    expect((await request('/reviews?'+new URLSearchParams({productId}))).body.reviews).toEqual([]);
    expect((await request('/listings?'+new URLSearchParams({productId,variantId}))).response.status).toBe(400);
    expect((await request('/listings',{auth:seller,body:{itemId:item.id,currency:'WILD',amountAtomic:'100'}})).response.status).toBe(409);
    expect((await request('/listings')).body.listings).toEqual([]);
    expect((await request(`/listings/${listing.id}/quote`,{auth:buyer,body:{paymentCurrency:'WILD',expectedCurrency:listing.currency,expectedAmountAtomic:listing.amountAtomic}})).response.status).toBe(409);
    expect((await request(`/listings/${listing.id}/buy`,{auth:buyer,body:{idempotencyKey:'no-family-trade',quoteId:existingQuote.id,expectedAmountAtomic:listing.amountAtomic,expectedCurrency:listing.currency,paymentCurrency:existingQuote.paymentCurrency,expectedPaymentAmountAtomic:existingQuote.paymentAmountAtomic}})).response.status).toBe(409);
    expect(count('store_sales')).toBe(0);
    database.prepare('INSERT INTO store_moderators(user_id,granted_at) VALUES(?,?)').run(buyer.id,new Date().toISOString());
    const approved=await request(`/reviews/${submitted.body.review.id}/moderation`,{auth:buyer,body:{decision:'published',reason:'Reviewed local edition feedback',expectedRevision:0,idempotencyKey:'grouped-review-approve'}});
    expect(approved.response.status).toBe(200);
    expect((await request('/reviews?'+new URLSearchParams({productId}))).body.reviews).toMatchObject([{productId,variantId,ownershipAtSubmission:false,localPurchaseId:null}]);
  });

  it('rejects grouped reviews for unknown identities or another family edition',async()=>{
    const [[productId,variants],[,otherVariants]]=Object.entries(reviewIdentities.families);
    const review={productId,variantId:variants[0],rating:5,title:'Review',body:'Local review with a specific original edition.'};
    for(const identity of [{productId:'original-family:unknown'},{productId:productId.replace(':9369:',':1:')},{variantId:otherVariants[0]},{variantId:'unknown-edition'}]){
      expect((await request('/reviews',{auth:seller,body:{...review,...identity}})).response.status).toBe(400);
    }
    expect((await request('/reviews',{auth:seller,body:{...review,verifiedPurchase:true}})).response.status).toBe(400);
    expect(count('store_reviews')).toBe(0);
  });

  it('honors catalog removals for new listings, quotes and unsettled buys while preserving ownership and history', async () => {
    const items=await seed();
    const held=await list(items[0]);
    const retained=await list(items[1]);
    const existingQuote=(await quote(held)).body.quote as LocalPurchaseQuote;
    const known=catalog.knownProductVariant;
    vi.spyOn(catalog,'knownProductVariant').mockImplementation((productId,variantId)=>
      productId!==items[2].productId && !(productId===items[0].productId && variantId===items[0].variantId) && known(productId,variantId));
    const removedListing=await request('/listings',{auth:seller,body:{itemId:items[2].id,currency:'WILD',amountAtomic:'100'}});
    expect(removedListing.response.status).toBe(409);
    expect(removedListing.body.error.message).toContain('no longer offered');
    expect((await request('/listings')).body.listings.map((entry:StoreListing)=>entry.id)).toEqual([retained.id]);
    expect((await request('/listings?'+new URLSearchParams({productId:items[0].productId}))).body.listings).toEqual([]);
    const newQuote=await request(`/listings/${held.id}/quote`,{auth:buyer,body:{paymentCurrency:'USD',expectedCurrency:held.currency,expectedAmountAtomic:held.amountAtomic}});
    expect(newQuote.response.status).toBe(409);
    const purchase=await request(`/listings/${held.id}/buy`,{auth:buyer,body:{idempotencyKey:'removed-finish-purchase',quoteId:existingQuote.id,expectedAmountAtomic:held.amountAtomic,expectedCurrency:held.currency,paymentCurrency:existingQuote.paymentCurrency,expectedPaymentAmountAtomic:existingQuote.paymentAmountAtomic}});
    expect(purchase.response.status).toBe(409);
    expect(count('store_sales')).toBe(0);
    const account=(await request('/account',{auth:seller})).body;
    expect(account.inventory).toHaveLength(3);
    expect(account.listings.map((entry:StoreListing)=>entry.id)).toContain(held.id);
    expect((await request(`/listings/${held.id}/cancel`,{auth:seller,body:{}})).response.status).toBe(200);
    expect((await buy(retained)).response.status).toBe(201);
  });

  it('replays an already settled purchase exactly even if its catalog entry is later removed', async () => {
    const [item]=await seed();const listing=await list(item);const key='settled-before-removal';
    const purchase=await buy(listing,buyer,key);expect(purchase.response.status).toBe(201);
    const known=catalog.knownProductVariant;
    vi.spyOn(catalog,'knownProductVariant').mockImplementation((productId,variantId)=>productId!==item.productId && known(productId,variantId));
    const replay=await buy(listing,buyer,key);
    expect(replay.response.status).toBe(200);
    expect(replay.body).toMatchObject({replayed:true,sale:purchase.body.sale});
    expect(count('store_sales')).toBe(1);
    expect((await request('/account',{auth:buyer})).body.purchases).toEqual([purchase.body.sale]);
  });

  it('publishes only with a separate moderator, auditable revision and replay-safe decision', async()=>{
    const [item]=await seed();
    const submitted=await request('/reviews',{auth:seller,body:{productId:item.productId,variantId:item.variantId,rating:4,title:'Detailed review',body:'A real local review for moderation.'}});
    const id=submitted.body.review.id;
    const action={decision:'published',reason:'Reviewed local preview',expectedRevision:0,idempotencyKey:'review-decision-001'};
    expect((await request(`/reviews/${id}/moderation`,{auth:buyer,body:action})).response.status).toBe(403);
    database.prepare('INSERT INTO store_moderators(user_id,granted_at) VALUES(?,?)').run(seller.id,new Date().toISOString());
    expect((await request(`/reviews/${id}/moderation`,{auth:seller,body:action})).response.status).toBe(403);
    database.prepare('INSERT INTO store_moderators(user_id,granted_at) VALUES(?,?)').run(buyer.id,new Date().toISOString());
    expect((await request('/session',{auth:buyer})).body.canModerate).toBe(true);
    expect((await request('/moderation/reviews',{auth:buyer})).body.reviews).toHaveLength(1);
    const published=await request(`/reviews/${id}/moderation`,{auth:buyer,body:action});
    expect(published.response.status).toBe(200);expect(published.body.review.moderation).toBe('published');expect(published.body.review.moderationRevision).toBe(1);
    expect((await request(`/reviews/${id}/moderation`,{auth:buyer,body:action})).body.replayed).toBe(true);
    expect(count('store_review_decisions')).toBe(1);
    expect((await request(`/reviews/${id}/moderation`,{auth:buyer,body:{...action,decision:'rejected'}})).response.status).toBe(409);
    expect((await request(`/reviews/${id}/moderation`,{auth:buyer,body:{...action,idempotencyKey:'another-decision'}})).response.status).toBe(409);
    expect((await request(`/reviews?productId=${item.productId}`)).body.reviews).toHaveLength(1);
    expect(()=>database.prepare('DELETE FROM store_review_decisions').run()).toThrow('decision_immutable');
    const rejected=await request(`/reviews/${id}/moderation`,{auth:buyer,body:{...action,decision:'rejected',expectedRevision:1,idempotencyKey:'reject-decision-002'}});
    expect(rejected.response.status).toBe(200);expect(count('store_review_decisions')).toBe(2);
    expect((await request(`/reviews?productId=${item.productId}`)).body.reviews).toHaveLength(0);
  });
  it('accepts one helpful vote per signed-in non-author, supports undo and hides pending reviews',async()=>{
    const [item]=await seed();
    const submitted=await request('/reviews',{auth:seller,body:{productId:item.productId,variantId:item.variantId,rating:5,title:'Good fit',body:'Local test of helpful review voting.'}});
    const id=submitted.body.review.id;
    expect((await request(`/reviews/${id}/helpful`,{auth:buyer,body:{helpful:true}})).response.status).toBe(404);
    database.prepare('INSERT INTO store_moderators(user_id,granted_at) VALUES(?,?)').run(buyer.id,new Date().toISOString());
    await request(`/reviews/${id}/moderation`,{auth:buyer,body:{decision:'published',reason:'Reviewed locally',expectedRevision:0,idempotencyKey:'vote-review-approve'}});
    expect((await request(`/reviews/${id}/helpful`,{body:{helpful:true}})).response.status).toBe(401);
    expect((await request(`/reviews/${id}/helpful`,{auth:seller,body:{helpful:true}})).response.status).toBe(403);
    for(let i=0;i<2;i++)expect((await request(`/reviews/${id}/helpful`,{auth:buyer,body:{helpful:true}})).body.helpfulCount).toBe(1);
    expect((await request(`/reviews/${id}/helpful`,{auth:otherBuyer,body:{helpful:true}})).body.helpfulCount).toBe(2);
    expect((await request(`/reviews?productId=${item.productId}`,{auth:buyer})).body.reviews[0]).toMatchObject({helpfulCount:2,viewerHelpful:true});
    expect((await request(`/reviews/${id}/helpful`,{auth:buyer,body:{helpful:false}})).body.helpfulCount).toBe(1);
    expect((await request(`/reviews?productId=${item.productId}`,{auth:buyer})).body.reviews[0].viewerHelpful).toBe(false);
    expect(()=>database.prepare('INSERT INTO store_review_votes(review_id,user_id,created_at) VALUES(?,?,?)').run(id,seller.id,new Date().toISOString())).toThrow('review_vote_ineligible');
  });
  it('rejects production, remote hosts and absent local bindings without exposing account data', async () => {
    for (const options of [
      { environment: { ...env, STORE_MODE: 'production' } },
      { environment: { STORE_DB: env.STORE_DB } },
      { environment: { STORE_MODE: 'local' } },
      { url: 'https://wilder.example' },
      { url: 'http://localhost.attacker.test' },
      { url: 'http://127.0.0.1.attacker.test' },
    ]) {
      const result = await request('/account', { ...options, auth: seller });
      expect(result.response.status).toBeGreaterThanOrEqual(400);
      expect(result.body.user).toBeUndefined(); expect(result.body.inventory).toBeUndefined();
    }
    expect(count('store_items')).toBe(0);
  });

  it('stores salted password hashes and opaque session hashes, never the password or raw session', async () => {
    const users = database.prepare('SELECT * FROM store_users').all();
    expect(new Set(users.map(user => user.password_salt)).size).toBe(3);
    expect(new Set(users.map(user => user.password_hash)).size).toBe(3);
    expect(JSON.stringify(users)).not.toContain(PASSWORD);
    const sessions = JSON.stringify(database.prepare('SELECT * FROM store_sessions').all());
    expect(sessions).not.toContain(seller.cookie.split('=')[1]);
    const account = await request('/account', { auth: seller });
    expect(account.response.status).toBe(200);
    expect(JSON.stringify(account.body)).not.toMatch(/password_hash|password_salt|token_hash/);
    expect(account.response.headers.get('cache-control')).toContain('no-store');
  });

  it('enforces exact origins, JSON and session CSRF on mutations, including anonymous login', async () => {
    const attempts: { origin?: string; headers?: Record<string, string> }[] = [
      { origin: 'https://attacker.test' },
      { origin: 'http://127.0.0.1:8793' },
      { headers: { Origin: '' } },
      { headers: { 'X-CSRF-Token': '' } },
      { headers: { 'X-CSRF-Token': buyer.csrf } },
      { headers: { 'Content-Type': 'text/plain' } },
    ];
    for (const options of attempts) {
      const result = await request('/profile', { method: 'PATCH', body: { displayName: 'Changed', bio: '' }, auth: seller, ...options });
      expect(result.response.status).toBeGreaterThanOrEqual(400);
    }
    const login = await request('/login', { body: { email: 'seller@example.test', password: PASSWORD }, origin: 'https://attacker.test' });
    expect(login.response.status).toBeGreaterThanOrEqual(400);
    expect((await request('/profile', { method: 'PATCH', body: { bio: 'x'.repeat(17_000) }, auth: seller })).response.status).toBe(413);
    const account = await request('/account', { auth: seller });
    expect(account.body.user.displayName).toBe('Local seller');
  });

  it('revokes logout sessions and rejects expired sessions on protected writes', async () => {
    const loggedOut = await request('/logout', { body: {}, auth: seller });
    expect(loggedOut.response.status).toBe(200);
    expect(loggedOut.response.headers.get('set-cookie')).toContain('Max-Age=0');
    expect((await request('/account', { auth: seller })).response.status).toBe(401);
    expect((await request('/seed', { body: {}, auth: seller })).response.status).toBe(401);
    database.prepare('UPDATE store_sessions SET expires_at=? WHERE user_id=?').run('2000-01-01T00:00:00.000Z', buyer.id);
    expect((await request('/profile', { method: 'PATCH', body: { displayName: 'Expired', bio: '' }, auth: buyer })).response.status).toBe(401);
  });

  it('keeps profiles and seed inventory account-scoped and prevents repeat grants', async () => {
    const updated = await request('/profile', { method: 'PATCH', body: { displayName: 'Updated seller', bio: 'Local test account.' }, auth: seller });
    expect(updated.response.status).toBe(200);
    expect((await request('/account', { auth: buyer })).body.user.displayName).toBe('Local buyer');
    const inventory = await seed();
    expect(inventory).toHaveLength(3);
    expect(inventory.every(item => item.source === 'local_seed')).toBe(true);
    expect((await request('/account', { auth: buyer })).body.inventory).toHaveLength(0);
    expect((await request('/seed', { body: {}, auth: seller })).response.status).toBe(409);
    expect(count('store_items')).toBe(3);
  });

  it('reports the one-time starter claim after every starter item is sold, independently of current ownership', async () => {
    expect((await request('/account', {auth:seller})).body.seedClaimed).toBe(false);
    const items=await seed();
    expect((await request('/account', {auth:seller})).body.seedClaimed).toBe(true);
    for(const item of items) expect((await buy(await list(item))).response.status).toBe(201);
    const sellerAccount=await request('/account',{auth:seller});
    expect(sellerAccount.body.inventory).toEqual([]);
    expect(sellerAccount.body.seedClaimed).toBe(true);
    const buyerAccount=await request('/account',{auth:buyer});
    expect(buyerAccount.body.inventory).toHaveLength(3);
    expect(buyerAccount.body.seedClaimed).toBe(false);
    expect((await request('/seed',{auth:seller,body:{}})).response.status).toBe(409);
    expect(count('store_seed_claims')).toBe(1);
  });

  it('blocks non-owner listings, cancellation and usage changes and duplicate active listings', async () => {
    const [item] = await seed();
    const unauthorized = await request('/listings', { body: { itemId: item.id, amountAtomic: '123',currency:'WILD' }, auth: buyer });
    expect(unauthorized.response.status).toBeGreaterThanOrEqual(400);
    const listing = await list(item);
    expect((await request('/listings', { body: { itemId: item.id, amountAtomic: '456',currency:'WILD' }, auth: seller })).response.status).toBe(409);
    expect((await request(`/listings/${listing.id}/cancel`, { body: {}, auth: buyer })).response.status).toBeGreaterThanOrEqual(400);
    expect((await request(`/inventory/${item.id}/lock`, { body: { usage: 'equipped' }, auth: buyer })).response.status).toBeGreaterThanOrEqual(400);
    expect(count('store_listings')).toBe(1);
    expect(database.prepare('SELECT status FROM store_listings WHERE id=?').get(listing.id)!.status).toBe('active');
  });

  it('rejects invalid money and extra authority fields instead of silently accepting them', async () => {
    const [item] = await seed();
    for (const amountAtomic of [0, -1, 1.1, Number.MAX_SAFE_INTEGER, null,'0','-1','01','1e18','1.1',(BigInt(MAX_ATOMIC)+BigInt(1)).toString()]) {
      expect((await request('/listings', { body: { itemId: item.id, amountAtomic,currency:'WILD' }, auth: seller })).response.status).toBe(400);
    }
    expect((await request('/listings', { body: { itemId: item.id, amountAtomic: '100',currency:'WILD', sellerId: buyer.id }, auth: seller })).response.status).toBe(400);
    for(const injected of [{sellerFeeCents:0},{sellerFeeBps:0},{sellerProceedsCents:100},{feePolicyVersion:'legacy-zero'}]){
      expect((await request('/listings', { body: {itemId:item.id,amountAtomic:'100',currency:'WILD',...injected},auth:seller})).response.status).toBe(400);
    }
    expect(count('store_listings')).toBe(0);
  });

  it('snapshots the one-percent fee on new listings and returns exact proceeds in sale and replay records',async()=>{
    const [item]=await seed();const listing=await list(item,seller,12_350);
    const fee={feePolicyVersion:'2026-11-08-seller-1pct',sellerFeeBps:100,sellerFeeAtomic:'124',sellerProceedsAtomic:'12226'};
    expect(listing).toMatchObject(fee);
    expect((await request('/listings')).body.listings.find((entry:StoreListing)=>entry.id===listing.id)).toMatchObject(fee);
    const key=crypto.randomUUID();
    const purchase=await buy(listing,buyer,key,{expectedAmountAtomic:'12350'});
    expect(purchase.response.status).toBe(201);expect(purchase.body.sale).toMatchObject({...fee,amountAtomic:'12350',currency:'WILD',priceCents:null});
    expect(BigInt(purchase.body.sale.sellerFeeAtomic)+BigInt(purchase.body.sale.sellerProceedsAtomic)).toBe(BigInt(purchase.body.sale.amountAtomic));
    const replay=await buy(listing,buyer,key,{expectedAmountAtomic:'12350'});
    expect(replay.body.sale).toEqual(purchase.body.sale);
    expect((await request('/account',{auth:seller})).body.sales[0]).toMatchObject(fee);
    expect((await request('/account',{auth:buyer})).body.purchases[0]).toMatchObject(fee);
    expect(purchase.body.sale).toMatchObject({paymentStatus:'simulated',settlementStatus:'simulated',entitlementStatus:'not_issued'});
  });

  it('rejects fee tampering at both the request and database boundaries',async()=>{
    const [item]=await seed();const listing=await list(item);
    expect((await buy(listing,buyer,crypto.randomUUID(),{sellerFeeCents:0})).response.status).toBe(400);
    for(const assignment of ["seller_fee_atomic='0'","seller_proceeds_atomic=amount_atomic","seller_fee_bps=0","fee_policy_version='legacy-zero'"]){
      expect(()=>database.prepare(`UPDATE store_listings SET status='cancelled',${assignment} WHERE id=?`).run(listing.id)).toThrow(/listing_immutable/);
    }
    expect(database.prepare('SELECT status FROM store_listings WHERE id=?').get(listing.id)!.status).toBe('active');
    const q=(await quote(listing)).body.quote;
    expect(()=>database.prepare(`INSERT INTO store_sales(id,listing_id,item_id,product_id,variant_id,buyer_id,seller_id,amount_atomic,currency,idempotency_key,request_fingerprint,created_at,fee_policy_version,seller_fee_bps,seller_fee_atomic,seller_proceeds_atomic,quote_id,payment_currency,payment_amount_atomic)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run('tampered-sale',listing.id,item.id,item.productId,item.variantId,buyer.id,seller.id,listing.amountAtomic,'WILD','tampered-key','test',new Date().toISOString(),'legacy-zero',0,'0',listing.amountAtomic,q.id,'WILD',listing.amountAtomic)).toThrow(/listing_fee_mismatch/);
    expect(count('store_sales')).toBe(0);
    const purchase=await buy(listing);expect(purchase.response.status).toBe(201);
    expect(()=>database.prepare("UPDATE store_sales SET seller_fee_atomic='0' WHERE id=?").run(purchase.body.sale.id)).toThrow(/sale_immutable/);
  });

  it('migrates existing listings and sales without retroactive fees, then charges only newly listed items',async()=>{
    database.close();database=new DatabaseSync(':memory:');
    database.exec(readFileSync('migrations/store/0001_local_store.sql','utf8'));
    database.exec(readFileSync('migrations/store/0002_local_reviews.sql','utf8'));
    database.exec(readFileSync('migrations/store/0006_local_profile_photos.sql','utf8'));
    env={STORE_MODE:'local',STORE_DB:d1Adapter(database)};
    seller=await register('legacy-seller@example.test','Legacy seller');buyer=await register('legacy-buyer@example.test','Legacy buyer');
    const items=await seed();const createdAt='2026-11-07T00:00:00Z';
    for(const [index,id] of ['legacy-active','legacy-sold'].entries())database.prepare('INSERT INTO store_listings(id,item_id,seller_id,price_cents,created_at) VALUES(?,?,?,?,?)').run(id,items[index].id,seller.id,10_000,createdAt);
    database.prepare(`INSERT INTO store_sales(id,listing_id,item_id,product_id,variant_id,buyer_id,seller_id,price_cents,currency,idempotency_key,request_fingerprint,created_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run('legacy-sale','legacy-sold',items[1].id,items[1].productId,items[1].variantId,buyer.id,seller.id,10_000,'USD','legacy-key','legacy-fingerprint',createdAt);
    database.prepare("INSERT INTO store_reviews(id,user_id,product_id,variant_id,rating,title,body,created_at,ownership_at_submission,local_purchase_id) VALUES('legacy-review',?,?,?,?,?,?,?,?,?)").run(buyer.id,items[1].productId,items[1].variantId,5,'Legacy review','Retain the historical sale reference',createdAt,1,'legacy-sale');
    const oldSale=database.prepare('SELECT * FROM store_sales WHERE id=?').get('legacy-sale');
    database.exec(readFileSync('migrations/store/0003_local_marketplace_fees.sql','utf8'));
    migrateCurrency();
    expect(database.prepare('SELECT * FROM store_sales WHERE id=?').get('legacy-sale')).toMatchObject(oldSale!);
    const legacyFee={feePolicyVersion:'legacy-zero',sellerFeeBps:0,sellerFeeCents:0,sellerProceedsCents:10_000};
    const account=await request('/account',{auth:seller});
    expect(account.body.sales[0]).toMatchObject({...legacyFee,id:'legacy-sale',createdAt});
    const active=account.body.listings.find((entry:StoreListing)=>entry.id==='legacy-active') as StoreListing;
    expect(active).toMatchObject({...legacyFee,currency:'USD',amountAtomic:'10000',priceCents:10000});
    expect(database.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    expect(database.prepare("SELECT local_purchase_id FROM store_reviews WHERE id='legacy-review'").get()!.local_purchase_id).toBe('legacy-sale');
    const purchase=await buy(active,buyer);expect(purchase.response.status).toBe(201);expect(purchase.body.sale).toMatchObject(legacyFee);
    const newListing=await list(items[2],seller,10_000);
    expect(newListing).toMatchObject({feePolicyVersion:'2026-11-08-seller-1pct',sellerFeeBps:100,sellerFeeAtomic:'100',sellerProceedsAtomic:'9900',currency:'WILD',priceCents:null});
  });


  it('validates SQL fee rounding across carries and atomic-unit boundaries',async()=>{
    const [item]=await seed();
    for(const amount of ['1','49','50','99','100','149','150','9950','99999999999999999999999999999999999999999999999950']){
      const listing=await list(item,seller,amount);expect(listing).toMatchObject(localAtomicFeeQuote(amount));
      expect((await request(`/listings/${listing.id}/cancel`,{auth:seller,body:{}})).response.status).toBe(200);
    }
  });

  it('keeps uint256-sized WILD asks and fees exact without converting them through numbers',async()=>{
    const [item]=await seed();const listing=await list(item,seller,MAX_ATOMIC);
    expect(listing).toMatchObject({amountAtomic:MAX_ATOMIC,currency:'WILD',priceCents:null,...localAtomicFeeQuote(MAX_ATOMIC)});
    const q=(await quote(listing,buyer,'USD')).body.quote;
    expect(q.paymentAmountAtomic).toBe(((BigInt(MAX_ATOMIC)+BigInt(10)**BigInt(17)-BigInt(1))/(BigInt(10)**BigInt(17))).toString());
    const purchase=await buy(listing,buyer,crypto.randomUUID(),{paymentCurrency:'USD'});
    expect(purchase.response.status).toBe(201);
    expect(purchase.body.sale).toMatchObject({amountAtomic:MAX_ATOMIC,currency:'WILD',paymentCurrency:'USD',paymentAmountAtomic:q.paymentAmountAtomic,...localAtomicFeeQuote(MAX_ATOMIC)});
    expect(BigInt(purchase.body.sale.sellerFeeAtomic)+BigInt(purchase.body.sale.sellerProceedsAtomic)).toBe(BigInt(MAX_ATOMIC));
  });

  it('requires explicit WILD listing currency and rejects the former cents API and client-defined rates',async()=>{
    const [item]=await seed();
    for(const currency of ['USD','ETH','wild',null])expect((await request('/listings',{auth:seller,body:{itemId:item.id,amountAtomic:'100',currency}})).response.status).toBe(400);
    expect((await request('/listings',{auth:seller,body:{itemId:item.id,priceCents:100}})).response.status).toBe(400);
    const listing=await list(item);
    const body={paymentCurrency:'USD',expectedCurrency:'WILD',expectedAmountAtomic:listing.amountAtomic};
    for(const patch of [{paymentCurrency:'ETH'},{rateId:'fake'},{usdCentsPerWild:'1'},{paymentAmountAtomic:'1'}])expect((await request(`/listings/${listing.id}/quote`,{auth:buyer,body:{...body,...patch}})).response.status).toBe(400);
    expect((await request(`/listings/${listing.id}/quote`,{auth:buyer,body:{...body,expectedCurrency:'USD'}})).response.status).toBe(409);
    expect(count('store_sales')).toBe(0);
  });

  it('binds immutable quotes to one buyer, listing, ask and payment currency',async()=>{
    const items=await seed();const listing=await list(items[0]);const other=await list(items[1]);
    const q=(await quote(listing)).body.quote;
    const body={idempotencyKey:'quoted-purchase-001',quoteId:q.id,expectedAmountAtomic:listing.amountAtomic,expectedCurrency:'WILD',paymentCurrency:'WILD',expectedPaymentAmountAtomic:q.paymentAmountAtomic};
    for(const patch of [{expectedCurrency:'USD'},{expectedAmountAtomic:'1'},{paymentCurrency:'USD'},{expectedPaymentAmountAtomic:'1'},{quoteId:'missing-quote'}])expect((await request(`/listings/${listing.id}/buy`,{auth:buyer,body:{...body,...patch}})).response.status).toBe(409);
    expect((await request(`/listings/${listing.id}/buy`,{auth:otherBuyer,body})).response.status).toBe(409);
    expect((await request(`/listings/${other.id}/buy`,{auth:buyer,body})).response.status).toBe(409);
    expect(()=>database.prepare("UPDATE store_purchase_quotes SET payment_currency='USD' WHERE id=?").run(q.id)).toThrow(/quote_immutable/);
    expect(()=>database.prepare('DELETE FROM store_purchase_quotes WHERE id=?').run(q.id)).toThrow(/quote_immutable/);
    expect(()=>database.prepare("INSERT INTO store_purchase_quotes SELECT 'tampered-quote',listing_id,buyer_id,listing_currency,listing_amount_atomic,payment_currency,'1',rate_id,usd_cents_per_wild,created_at,expires_at FROM store_purchase_quotes WHERE id=?").run(q.id)).toThrow(/quote_invalid/);
    expect(count('store_sales')).toBe(0);
    expect((await request(`/listings/${listing.id}/buy`,{auth:buyer,body})).response.status).toBe(201);
  });

  it('rejects expired quotes without consuming a key, but replays an already settled exact request after expiry',async()=>{
    const [item]=await seed();const listing=await list(item);const q=(await quote(listing)).body.quote;const key=crypto.randomUUID();
    const clock=vi.spyOn(Date,'now').mockReturnValue(Date.parse(q.expiresAt)+1);
    expect((await buy(listing,buyer,key)).response.status).toBe(409);expect(count('store_sales')).toBe(0);
    clock.mockRestore();const sale=await buy(listing,buyer,key);expect(sale.response.status).toBe(201);
    vi.spyOn(Date,'now').mockReturnValue(Date.parse(q.expiresAt)+1);
    const replay=await buy(listing,buyer,key);expect(replay.response.status).toBe(200);expect(replay.body.sale).toEqual(sale.body.sale);
    expect((await buy(listing,buyer,key,{expectedPaymentAmountAtomic:'1'})).response.status).toBe(409);
  });

  it('records USD payment rounding independently from the exact WILD seller proceeds',async()=>{
    const [item]=await seed();const listing=await list(item,seller,'1');const result=await buy(listing,buyer,crypto.randomUUID(),{paymentCurrency:'USD'});
    expect(result.response.status).toBe(201);
    expect(result.body.sale).toMatchObject({amountAtomic:'1',currency:'WILD',sellerFeeAtomic:'0',sellerProceedsAtomic:'1',paymentCurrency:'USD',paymentAmountAtomic:'1',priceCents:null,quoteRateId:'ui-demo-wild-usd-10c-v1',quoteUsdCentsPerWild:'10'});
  });

  it('enforces expiry inside SQLite at the atomic transfer boundary',async()=>{
    const [item]=await seed();const listing=await list(item);const q=(await quote(listing)).body.quote;
    database.prepare("INSERT INTO store_purchase_quotes SELECT 'short-quote',listing_id,buyer_id,listing_currency,listing_amount_atomic,payment_currency,payment_amount_atomic,rate_id,usd_cents_per_wild,?,? FROM store_purchase_quotes WHERE id=?").run(new Date().toISOString(),new Date(Date.now()+150).toISOString(),q.id);
    await new Promise(resolve=>setTimeout(resolve,200));
    expect(()=>database.prepare(`INSERT INTO store_sales(id,listing_id,item_id,product_id,variant_id,buyer_id,seller_id,amount_atomic,currency,idempotency_key,request_fingerprint,created_at,fee_policy_version,seller_fee_bps,seller_fee_atomic,seller_proceeds_atomic,quote_id,payment_currency,payment_amount_atomic)
      SELECT 'expired-sale',l.id,i.id,i.product_id,i.variant_id,?,l.seller_id,l.amount_atomic,l.currency,'expired-key','test',?,l.fee_policy_version,l.seller_fee_bps,l.seller_fee_atomic,l.seller_proceeds_atomic,q.id,q.payment_currency,q.payment_amount_atomic FROM store_listings l JOIN store_items i ON i.id=l.item_id JOIN store_purchase_quotes q ON q.listing_id=l.id WHERE q.id='short-quote'`).run(buyer.id,new Date().toISOString())).toThrow(/quote_unavailable/);
    expect(count('store_sales')).toBe(0);expect(database.prepare('SELECT owner_id FROM store_items WHERE id=?').get(item.id)!.owner_id).toBe(seller.id);
  });

  it('rejects large-amount fee and proceeds tampering directly in SQLite',async()=>{
    const [item]=await seed();const fee=localAtomicFeeQuote(MAX_ATOMIC);
    for(const [feeAmount,proceeds] of [['0',MAX_ATOMIC],[fee.sellerFeeAtomic,(BigInt(fee.sellerProceedsAtomic)-BigInt(1)).toString()]])expect(()=>database.prepare(`INSERT INTO store_listings(id,item_id,seller_id,currency,amount_atomic,created_at,fee_policy_version,seller_fee_bps,seller_fee_atomic,seller_proceeds_atomic) VALUES('bad-listing',?,?,'WILD',?,?,?,100,?,?)`).run(item.id,seller.id,MAX_ATOMIC,new Date().toISOString(),fee.feePolicyVersion,feeAmount,proceeds)).toThrow(/listing_fee_invalid/);
    expect(count('store_listings')).toBe(0);
  });
  it('prevents self-purchase without changing the item, listing or sales ledger', async () => {
    const [item] = await seed(); const listing = await list(item);
    expect((await buy(listing, seller)).response.status).toBeGreaterThanOrEqual(400);
    expect(count('store_sales')).toBe(0);
    expect(database.prepare('SELECT owner_id FROM store_items WHERE id=?').get(item.id)!.owner_id).toBe(seller.id);
    expect(database.prepare('SELECT status FROM store_listings WHERE id=?').get(listing.id)!.status).toBe('active');
  });

  it('settles exactly once when two buyers race, transferring only to the winner', async () => {
    const [item] = await seed(); const listing = await list(item);
    const results = await Promise.all([buy(listing, buyer), buy(listing, otherBuyer)]);
    expect(results.filter(result => result.response.status < 300)).toHaveLength(1);
    expect(results.filter(result => result.response.status === 409)).toHaveLength(1);
    const sale = results.find(result => result.response.status < 300)!.body.sale as StoreSale;
    expect(count('store_sales')).toBe(1); expect(sale.simulated).toBe(true);
    expect(sale.paymentStatus).toBe('simulated'); expect(sale.settlementStatus).toBe('simulated'); expect(sale.entitlementStatus).toBe('not_issued');
    expect(sale.amountAtomic).toBe('12345');expect(sale.priceCents).toBeNull();
    expect(sale).toMatchObject({sellerFeeBps:100,sellerFeeAtomic:'123',sellerProceedsAtomic:'12222'});
    expect(database.prepare('SELECT owner_id FROM store_items WHERE id=?').get(item.id)!.owner_id).toBe(sale.buyerId);
    expect(database.prepare('SELECT status FROM store_listings WHERE id=?').get(listing.id)!.status).toBe('sold');
    expect((await request('/account', { auth: seller })).body.inventory).toHaveLength(2);
  });

  it('returns exact purchase retries, conflicts on changed idempotent requests and scopes keys by buyer', async () => {
    const items = await seed(); const first = await list(items[0]); const second = await list(items[1]);
    const key = crypto.randomUUID();
    const purchase = await buy(first, buyer, key, { expectedAmountAtomic: first.amountAtomic });
    expect(purchase.response.status).toBeLessThan(300);
    const replay = await buy(first, buyer, key, { expectedAmountAtomic: first.amountAtomic });
    expect(replay.response.status).toBe(200); expect(replay.body.replayed).toBe(true);
    expect(replay.body.sale.id).toBe(purchase.body.sale.id);
    expect((await buy(second, buyer, key, { expectedAmountAtomic: second.amountAtomic })).response.status).toBe(409);
    expect((await buy(first, buyer, key,{expectedPaymentAmountAtomic:'1'})).response.status).toBe(409);
    expect((await buy(second, otherBuyer, key, { expectedAmountAtomic: second.amountAtomic })).response.status).toBeLessThan(300);
    expect(count('store_sales')).toBe(2);
  });

  it('does not accept stale price confirmations and does not consume their idempotency key', async () => {
    const [item] = await seed(); const listing = await list(item); const key = crypto.randomUUID();
    expect((await buy(listing, buyer, key, { expectedAmountAtomic: '1' })).response.status).toBe(409);
    expect(count('store_sales')).toBe(0);
    expect((await buy(listing, buyer, key, { expectedAmountAtomic: listing.amountAtomic })).response.status).toBeLessThan(300);
  });

  it('reconciles concurrent identical retries to the same sale rather than transferring twice', async () => {
    const [item] = await seed(); const listing = await list(item); const key = crypto.randomUUID();
    const replies = await Promise.all([buy(listing, buyer, key), buy(listing, buyer, key)]);
    expect(replies.map(reply => reply.response.status).sort()).toEqual([200, 201]);
    expect(replies[0].body.sale.id).toBe(replies[1].body.sale.id);
    expect(count('store_sales')).toBe(1);
    expect(database.prepare('SELECT owner_id FROM store_items WHERE id=?').get(item.id)!.owner_id).toBe(buyer.id);
  });

  it('serializes cancellation versus purchase into one final state', async () => {
    const [item] = await seed(); const listing = await list(item);
    const [purchase, cancellation] = await Promise.all([
      buy(listing, buyer),
      request(`/listings/${listing.id}/cancel`, { body: {}, auth: seller }),
    ]);
    const state = database.prepare('SELECT status FROM store_listings WHERE id=?').get(listing.id)!.status;
    const owner = database.prepare('SELECT owner_id FROM store_items WHERE id=?').get(item.id)!.owner_id;
    if (state === 'sold') {
      expect(purchase.response.status).toBe(201); expect(cancellation.response.status).toBe(409);
      expect(owner).toBe(buyer.id); expect(count('store_sales')).toBe(1);
    } else {
      expect(state).toBe('cancelled'); expect(purchase.response.status).toBe(409); expect(cancellation.response.status).toBe(200);
      expect(owner).toBe(seller.id); expect(count('store_sales')).toBe(0);
    }
  });

  it('grants only one complete seed batch when concurrent seed requests race', async () => {
    const replies = await Promise.all([
      request('/seed', { body: {}, auth: seller }),
      request('/seed', { body: {}, auth: seller }),
    ]);
    expect(replies.map(reply => reply.response.status).sort()).toEqual([201, 409]);
    expect(count('store_seed_claims')).toBe(1); expect(count('store_items')).toBe(3);
  });

  it('rate limits repeated invalid logins without creating sessions', async () => {
    let result: JsonResponse | undefined;
    for (let attempt = 0; attempt < 12; attempt++) result = await request('/login', { body: { email: 'seller@example.test', password: 'Incorrect audit password!' } });
    expect(result!.response.status).toBe(429);
    expect(result!.response.headers.get('retry-after')).toBeTruthy();
    expect(count('store_sessions')).toBe(3);
  });

  it('enforces installed/equipped/placed locks and requires cancellation before changing listed usage', async () => {
    const items = await seed();
    expect((await request(`/inventory/${items[0].id}/lock`, { body: { usage: ['installed'] }, auth: seller })).response.status).toBe(400);
    for (let index = 0; index < 3; index++) {
      const item = items[index]; const usage = ['equipped', 'placed', 'installed'][index];
      expect((await request(`/inventory/${item.id}/lock`, { body: { usage }, auth: seller })).response.status).toBe(200);
      expect((await request('/listings', { body: { itemId: item.id, amountAtomic: '100',currency:'WILD' }, auth: seller })).response.status).toBe(409);
      expect((await request(`/inventory/${item.id}/lock`, { body: { usage: 'unlocked' }, auth: seller })).response.status).toBe(200);
    }
    const listing = await list(items[0]);
    expect((await request(`/inventory/${items[0].id}/lock`, { body: { usage: 'installed' }, auth: seller })).response.status).toBe(409);
    expect((await request(`/listings/${listing.id}/cancel`, { body: {}, auth: seller })).response.status).toBe(200);
    expect((await buy(listing)).response.status).toBe(409);
    expect((await request(`/inventory/${items[0].id}/lock`, { body: { usage: 'installed' }, auth: seller })).response.status).toBe(200);
  });

  it('keeps review submissions pending, excludes them from public totals and rejects client verification claims', async () => {
    const [item] = await seed();
    const review = { productId: item.productId, variantId: item.variantId, rating: 5, title: 'Local review', body: 'Testing a local preview product.' };
    const created = await request('/reviews', { body: review, auth: seller });
    expect(created.response.status).toBe(201);
    expect(created.body.review.moderation).toBe('pending');
    expect(created.body.review.ownershipAtSubmission).toBe(true);
    const account = await request('/account', { auth: seller });
    expect(account.body.reviews).toHaveLength(1);
    const publicReviews = await request(`/reviews?productId=${encodeURIComponent(item.productId)}`);
    expect(publicReviews.response.status).toBe(200);
    expect(publicReviews.body.reviews).toHaveLength(0);
    expect((await request('/reviews', { body: { ...review, verifiedPurchase: true, moderation: 'published' }, auth: buyer })).response.status).toBe(400);
    expect((await request('/reviews', { body: { ...review, variantId: 'unknown-color' }, auth: buyer })).response.status).toBe(400);
    expect(count('store_reviews')).toBe(1);
  });

  it('accepts the product review form text boundaries while keeping empty or oversized reviews out of storage',async()=>{
    const [item]=await seed();
    const target={productId:item.productId,variantIds:[item.variantId]};
    const review={variantId:item.variantId,rating:5,title:'T'.repeat(120),body:'界'.repeat(5000)};
    const draft=createReviewDraft(target,review);
    const submitted=await request('/reviews',{auth:seller,body:{productId:draft.productId,variantId:draft.variantId,rating:draft.rating,title:draft.title,body:draft.body}});
    expect(submitted.response.status,JSON.stringify(submitted.body)).toBe(201);
    expect(submitted.body.review).toMatchObject({title:review.title,body:review.body,moderation:'pending'});
    const shortDraft=createReviewDraft(target,{...review,title:'Fit',body:'Good'});
    expect((await request('/reviews',{auth:buyer,body:{productId:target.productId,variantId:item.variantId,rating:shortDraft.rating,title:shortDraft.title,body:shortDraft.body}})).response.status).toBe(201);
    for(const invalid of [{title:'T'.repeat(121),body:'Good'},{title:'Fit',body:'B'.repeat(5001)},{title:'   ',body:'Good'},{title:'Fit',body:' \n\t '}]){
      expect((await request('/reviews',{auth:otherBuyer,body:{productId:target.productId,variantId:item.variantId,rating:5,...invalid}})).response.status).toBe(400);
    }
    expect(count('store_reviews')).toBe(2);
    expect((await request('/reviews?'+new URLSearchParams({productId:item.productId}))).body.reviews).toEqual([]);
  });
});
