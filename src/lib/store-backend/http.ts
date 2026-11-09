import { knownProductVariant, knownReviewProductVariant, LOCAL_SEED_ITEMS } from './catalog';
import {atomicAmount,localCurrency,localAtomicFeeQuote,localDemoPaymentAmount,LOCAL_DEMO_RATE,type LocalPurchaseQuote} from './currency';
import { constantTimeEqual, csrfForSession, hashPassword, opaqueId, opaqueToken, readSessionCookie, sessionCookie, SESSION_SECONDS, tokenHash, verifyPassword } from './crypto';
import {makeWalletChallenge,publicWalletChallenge,verifyWalletChallenge,walletAddress,type WalletChallengeRecord} from './wallets';
import {PROFILE_PHOTO_BODY_LIMIT,validateProfilePhoto} from './profile-photo';
import type { StoreEnvironment, StoreErrorCode, StoreInventoryItem, StoreListing, StoreProfile, StoreReview, StoreSale, StoreLinkedWallet } from './types';

const PREFIX = '/api/store/v1';
const USER_COLUMNS = `u.id,u.email,u.display_name AS displayName,u.bio,u.created_at AS createdAt,
  (SELECT '/api/store/v1/profile/photo?v='||digest FROM store_profile_photos WHERE user_id=u.id) AS avatarUrl,
  'local' AS profileSource,'unconfigured' AS zeroSyncStatus`;
const LISTING_QUERY = `SELECT l.id,l.item_id AS itemId,i.product_id AS productId,i.variant_id AS variantId,
  i.name,i.variant_name AS variantName,l.price_cents AS priceCents,l.currency,l.amount_atomic AS amountAtomic,l.seller_fee_atomic AS sellerFeeAtomic,l.seller_proceeds_atomic AS sellerProceedsAtomic,l.status,l.created_at AS createdAt,
  l.fee_policy_version AS feePolicyVersion,l.seller_fee_bps AS sellerFeeBps,l.seller_fee_cents AS sellerFeeCents,l.seller_proceeds_cents AS sellerProceedsCents,
  l.seller_id AS sellerId,u.display_name AS sellerName FROM store_listings l
  JOIN store_items i ON i.id=l.item_id JOIN store_users u ON u.id=l.seller_id`;
const SALE_QUERY = `SELECT s.id,s.listing_id AS listingId,s.item_id AS itemId,s.product_id AS productId,
  s.variant_id AS variantId,s.price_cents AS priceCents,s.currency,s.amount_atomic AS amountAtomic,s.seller_fee_atomic AS sellerFeeAtomic,s.seller_proceeds_atomic AS sellerProceedsAtomic,s.quote_id AS quoteId,s.payment_currency AS paymentCurrency,s.payment_amount_atomic AS paymentAmountAtomic,q.rate_id AS quoteRateId,q.usd_cents_per_wild AS quoteUsdCentsPerWild,q.expires_at AS quoteExpiresAt,s.created_at AS createdAt,
  s.fee_policy_version AS feePolicyVersion,s.seller_fee_bps AS sellerFeeBps,s.seller_fee_cents AS sellerFeeCents,s.seller_proceeds_cents AS sellerProceedsCents,
  s.buyer_id AS buyerId,s.seller_id AS sellerId,b.display_name AS buyerName,u.display_name AS sellerName
  ,s.payment_status AS paymentStatus,s.settlement_status AS settlementStatus,s.entitlement_status AS entitlementStatus
  FROM store_sales s JOIN store_users b ON b.id=s.buyer_id JOIN store_users u ON u.id=s.seller_id LEFT JOIN store_purchase_quotes q ON q.id=s.quote_id`;
const QUOTE_QUERY=`SELECT id,listing_id AS listingId,buyer_id AS buyerId,listing_currency AS listingCurrency,listing_amount_atomic AS listingAmountAtomic,payment_currency AS paymentCurrency,payment_amount_atomic AS paymentAmountAtomic,rate_id AS rateId,usd_cents_per_wild AS usdCentsPerWild,created_at AS createdAt,expires_at AS expiresAt FROM store_purchase_quotes`;
const WALLET_QUERY='SELECT id,address,chain_id AS chainId,linked_at AS linkedAt FROM store_wallet_links';
const WALLET_CHALLENGE_QUERY='SELECT id,user_id AS userId,session_hash AS sessionHash,address,chain_id AS chainId,origin,domain,nonce,issued_at AS issuedAt,expires_at AS expiresAt,consumed_at AS consumedAt FROM store_wallet_challenges';
const REVIEW_QUERY = `SELECT r.id,r.product_id AS productId,r.variant_id AS variantId,u.display_name AS authorDisplayName,
  r.rating,r.title,r.body,r.created_at AS createdAt,r.moderation,r.ownership_at_submission AS ownershipAtSubmission,
  r.local_purchase_id AS localPurchaseId,r.moderation_revision AS moderationRevision,
  (SELECT COUNT(*) FROM store_review_votes WHERE review_id=r.id) AS helpfulCount
  FROM store_reviews r JOIN store_users u ON u.id=r.user_id`;
type Auth = { user: StoreProfile; token: string };
class ApiError extends Error {
  constructor(readonly status: number, readonly code: StoreErrorCode, message: string) { super(message); }
}
const bad = (message = 'Invalid request.') => new ApiError(400, 'invalid_request', message);
const conflict = (message: string) => new ApiError(409, 'conflict', message);
function requireCurrentCatalogItem(productId: string, variantId: string): void {
  if (!knownProductVariant(productId, variantId)) throw conflict('This product or finish is no longer offered in the current catalog.');
}
function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
}
function ok(data: Record<string, unknown> = {}, status = 200, headers?: HeadersInit): Response { return json({mode:'local',...data},status,headers); }
function stmt(db: D1Database, sql: string, ...values: (string | number | null)[]): D1PreparedStatement { return db.prepare(sql).bind(...values); }
async function rows<T>(db: D1Database, sql: string, ...values: (string | number | null)[]): Promise<T[]> {
  return (await stmt(db,sql,...values).all<T>()).results;
}
function textValue(value: unknown, name: string, min: number, max: number): string {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) throw bad(`Invalid ${name}.`);
  return value.trim();
}
function exactKeys(body: Record<string,unknown>, required: string[], optional: string[] = []): void {
  if (required.some(key => !Object.prototype.hasOwnProperty.call(body,key)) || Object.keys(body).some(key => !required.includes(key) && !optional.includes(key))) throw bad('Unexpected or missing request fields.');
}
async function readBody(request: Request, url: URL, maximumBytes=16384): Promise<Record<string, unknown>> {
  // Drain bounded input before returning a header rejection. Leaving a request body
  // unread can break the next request on Wrangler's local keep-alive connection.
  // No authentication or write occurs until both header checks have passed.
  const invalidOrigin=request.headers.get('origin') !== url.origin || request.headers.get('sec-fetch-site') === 'cross-site';
  const invalidContentType=!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '');
  if (Number(request.headers.get('content-length') ?? 0) > maximumBytes) {
    await request.body?.cancel();
    throw new ApiError(413,'invalid_request','Request too large.');
  }
  const reader=request.body?.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});
  let content='',size=0;
  if (!reader) throw bad('JSON body required.');
  try {
    for (;;) {
      const chunk=await reader.read(); if(chunk.done) break;
      size+=chunk.value.byteLength;
      if(size>maximumBytes) { await reader.cancel(); throw new ApiError(413,'invalid_request','Request too large.'); }
      content+=decoder.decode(chunk.value,{stream:true});
    }
    content+=decoder.decode();
  } catch(error) { if(error instanceof ApiError) throw error; throw bad('Invalid request body.'); }
  finally { reader.releaseLock(); }
  if (invalidOrigin) throw new ApiError(403,'forbidden','Same-origin request required.');
  if (invalidContentType) throw new ApiError(415,'invalid_request','JSON content type required.');
  let result: unknown;
  try { result = JSON.parse(content); } catch { throw bad('Invalid JSON.'); }
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw bad('JSON object required.');
  return result as Record<string, unknown>;
}
function emailValue(value: unknown): string {
  const email = textValue(value,'email',3,254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bad('Invalid email.');
  return email;
}
function passwordValue(value: unknown): string {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128) throw bad('Password must be 12–128 characters.');
  return value;
}
function amountValue(value:unknown):string {try{return atomicAmount(value);}catch{throw bad('Invalid atomic amount. Use a positive integer string within uint256.');}}
function currencyValue(value:unknown){try{return localCurrency(value);}catch{throw bad('Choose USD or WILD.');}}
async function rateLimit(db: D1Database, bucket: string, maximum: number, windowSeconds = 60): Promise<void> {
  const now = Math.floor(Date.now()/1000), boundary = now-windowSeconds;
  const record = await stmt(db,`INSERT INTO store_rate_limits(bucket,window_start,attempts) VALUES(?,?,1)
    ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN window_start<=? THEN 1 ELSE attempts+1 END,
    window_start=CASE WHEN window_start<=? THEN excluded.window_start ELSE window_start END RETURNING attempts`,tokenHash(bucket),now,boundary,boundary).first<{attempts:number}>();
  if (!record || record.attempts > maximum) throw new ApiError(429,'rate_limited','Too many attempts. Please wait and try again.');
}
async function authenticate(db: D1Database, request: Request, required = true): Promise<Auth | null> {
  const token = readSessionCookie(request);
  const user = token ? await stmt(db,`SELECT ${USER_COLUMNS} FROM store_sessions s JOIN store_users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.expires_at>?`,tokenHash(token),new Date().toISOString()).first<StoreProfile>() : null;
  if (!token || !user) {
    if (required) throw new ApiError(401,'unauthorized','Sign in to your local account.');
    return null;
  }
  return {user,token};
}
async function authorizeWrite(db: D1Database, request: Request): Promise<Auth> {
  const auth = (await authenticate(db,request))!;
  if (!constantTimeEqual(request.headers.get('x-csrf-token') ?? '',csrfForSession(auth.token))) throw new ApiError(403,'forbidden','Session confirmation is missing or expired.');
  await rateLimit(db,`write:${auth.user.id}`,90);
  return auth;
}
async function inventory(db: D1Database, userId: string): Promise<StoreInventoryItem[]> {
  return rows<StoreInventoryItem>(db,`SELECT i.id,i.product_id AS productId,i.variant_id AS variantId,i.name,
    i.variant_name AS variantName,i.acquired_at AS acquiredAt,i.usage,i.source,
    (SELECT id FROM store_listings WHERE item_id=i.id AND status='active') AS listingId
    FROM store_items i WHERE i.owner_id=? ORDER BY i.acquired_at DESC,i.id`,userId);
}
async function listings(db: D1Database, where: string, ...values: (string | number | null)[]): Promise<StoreListing[]> {
  return (await rows<Omit<StoreListing,'simulated'>>(db,`${LISTING_QUERY} ${where}`, ...values)).map(row=>({...row,simulated:true}));
}
async function sales(db: D1Database, where: string, ...values: (string | number | null)[]): Promise<StoreSale[]> {
  return (await rows<Omit<StoreSale,'simulated'>>(db,`${SALE_QUERY} ${where}`,...values)).map(row=>({...row,simulated:true}));
}
async function reviews(db: D1Database, where: string, ...values: (string | number | null)[]): Promise<StoreReview[]> {
  return (await rows<StoreReview>(db,`${REVIEW_QUERY} ${where}`,...values)).map(row=>({...row,ownershipAtSubmission:!!row.ownershipAtSubmission}));
}
async function linkedWallets(db:D1Database,userId:string):Promise<StoreLinkedWallet[]> {
  return (await rows<Omit<StoreLinkedWallet,'proofType'>>(db,`${WALLET_QUERY} WHERE user_id=? ORDER BY linked_at DESC,id`,userId))
    .map(wallet=>({...wallet,address:walletAddress(wallet.address),proofType:'eip191' as const}));
}
async function canModerate(db: D1Database, userId: string): Promise<boolean> {
  return !!await stmt(db,'SELECT user_id FROM store_moderators WHERE user_id=?',userId).first();
}
async function requireModerator(db: D1Database, auth: Auth): Promise<void> {
  if (!await canModerate(db,auth.user.id)) throw new ApiError(403,'forbidden','Local moderator access required.');
}
async function createSession(db: D1Database, request: Request, userId: string, initial: D1PreparedStatement[] = []): Promise<string> {
  const token = opaqueToken(), now = new Date(), expires = new Date(now.getTime()+SESSION_SECONDS*1000);
  const previous = readSessionCookie(request);
  await db.batch([...initial,
    ...(previous ? [stmt(db,'DELETE FROM store_sessions WHERE token_hash=?',tokenHash(previous))] : []),
    stmt(db,'INSERT INTO store_sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)',tokenHash(token),userId,now.toISOString(),expires.toISOString())]);
  return token;
}

/** Intercepts only the dedicated local API prefix; fails closed outside a loopback local server. */
export async function handleStoreApi(request: Request, env: StoreEnvironment): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== PREFIX && !url.pathname.startsWith(`${PREFIX}/`)) return null;
  if (env.STORE_MODE !== 'local' || !['localhost','127.0.0.1','[::1]','::1'].includes(url.hostname)) return json({error:{code:'not_found',message:'Not found.'}},404);
  if (!env.STORE_DB) return json({error:{code:'unavailable',message:'The local account database is not connected.'}},503);
  const db=env.STORE_DB, path=url.pathname.slice(PREFIX.length), method=request.method.toUpperCase();
  try {
    const body = ['POST','PATCH','PUT','DELETE'].includes(method) ? await readBody(request,url,method==='PUT'&&path==='/profile/photo'?PROFILE_PHOTO_BODY_LIMIT:16384) : null;
    if (method==='GET' && path==='/session') {
      const auth=await authenticate(db,request,false);
      return ok({user:auth?.user??null,...(auth?{csrfToken:csrfForSession(auth.token),canModerate:await canModerate(db,auth.user.id)}:{})});
    }
    if (method==='POST' && (path==='/register' || path==='/login')) {
      exactKeys(body!,path==='/register'?['email','password','displayName']:['email','password']);
      const email=emailValue(body!.email), password=passwordValue(body!.password);
      await rateLimit(db,'auth:all',120,600);
      await rateLimit(db,`auth:${email}`,12,600);
      let user: StoreProfile, token: string;
      if (path==='/register') {
        const displayName=textValue(body!.displayName,'display name',1,60), now=new Date().toISOString(),id=opaqueId('user');
        if (await stmt(db,'SELECT id FROM store_users WHERE email=?',email).first()) throw conflict('An account already uses that email.');
        const credentials=await hashPassword(password);
        try {
          token=await createSession(db,request,id,[stmt(db,`INSERT INTO store_users(id,email,display_name,password_salt,password_hash,created_at) VALUES(?,?,?,?,?,?)`,id,email,displayName,credentials.salt,credentials.hash,now)]);
        } catch(error) {
          if (await stmt(db,'SELECT id FROM store_users WHERE email=?',email).first()) throw conflict('An account already uses that email.');
          throw error;
        }
        user={id,email,displayName,bio:'',createdAt:now,avatarUrl:null,profileSource:'local',zeroSyncStatus:'unconfigured'};
      } else {
        const record=await stmt(db,`SELECT ${USER_COLUMNS},u.password_salt AS salt,u.password_hash AS hash FROM store_users u WHERE email=?`,email).first<StoreProfile & {salt:string;hash:string}>();
        const valid=await verifyPassword(password,record?.salt??'0'.repeat(48),record?.hash??'0'.repeat(64));
        if (!record || !valid) throw new ApiError(401,'unauthorized','Email or password is incorrect.');
        user={id:record.id,email:record.email,displayName:record.displayName,bio:record.bio,createdAt:record.createdAt,avatarUrl:record.avatarUrl,profileSource:'local',zeroSyncStatus:'unconfigured'};
        token=await createSession(db,request,user.id);
      }
      return ok({user,csrfToken:csrfForSession(token)},path==='/register'?201:200,{'Set-Cookie':sessionCookie(token,url)});
    }
    if (method==='POST' && path==='/logout') {
      exactKeys(body!,[]);
      const auth=await authorizeWrite(db,request);
      await stmt(db,'DELETE FROM store_sessions WHERE token_hash=?',tokenHash(auth.token)).run();
      return ok({user:null},200,{'Set-Cookie':sessionCookie('',url,true)});
    }
    if (method==='GET' && path==='/account') {
      const auth=(await authenticate(db,request))!;
      const [items,ownListings,purchases,ownSales,ownReviews,seedClaim]=await Promise.all([
        inventory(db,auth.user.id),listings(db,'WHERE l.seller_id=? ORDER BY l.created_at DESC',auth.user.id),
        sales(db,'WHERE s.buyer_id=? ORDER BY s.created_at DESC',auth.user.id),sales(db,'WHERE s.seller_id=? ORDER BY s.created_at DESC',auth.user.id),
        reviews(db,'WHERE r.user_id=? ORDER BY r.created_at DESC',auth.user.id),
        stmt(db,'SELECT user_id FROM store_seed_claims WHERE user_id=?',auth.user.id).first()]);
      return ok({user:auth.user,inventory:items,listings:ownListings,purchases,sales:ownSales,reviews:ownReviews,seedClaimed:!!seedClaim});
    }
    if(method==='GET' && path==='/wallets') {
      const auth=(await authenticate(db,request))!;
      return ok({wallets:await linkedWallets(db,auth.user.id),assetSyncStatus:'unconfigured',gameDeliveryStatus:'unconfigured'});
    }
    if(method==='POST' && path==='/wallets/challenges') {
      exactKeys(body!,['address','chainId']);
      const auth=await authorizeWrite(db,request);
      if(body!.chainId!==1)throw bad('Choose Ethereum Mainnet (chain 1).');
      let address:string;try{address=walletAddress(body!.address);}catch{throw bad('Enter a valid Ethereum wallet address.');}
      await rateLimit(db,`wallet-challenges:${auth.user.id}`,10);
      const challenge=makeWalletChallenge({userId:auth.user.id,sessionHash:tokenHash(auth.token),address,url});
      await stmt(db,'INSERT INTO store_wallet_challenges(id,user_id,session_hash,address,chain_id,origin,domain,nonce,issued_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?)',challenge.id,challenge.userId,challenge.sessionHash,challenge.address,challenge.chainId,challenge.origin,challenge.domain,challenge.nonce,challenge.issuedAt,challenge.expiresAt).run();
      return ok({challenge:publicWalletChallenge(challenge)},201);
    }
    if(method==='POST' && path==='/wallets/link') {
      exactKeys(body!,['challengeId','signature']);
      const auth=await authorizeWrite(db,request),challengeId=textValue(body!.challengeId,'wallet challenge',1,100);
      if(typeof body!.signature!=='string'||!/^0x(?:[0-9a-fA-F]{128}|[0-9a-fA-F]{130})$/.test(body!.signature))throw bad('Invalid wallet signature.');
      await rateLimit(db,`wallet-verification:${auth.user.id}`,15);
      const challenge=await stmt(db,`${WALLET_CHALLENGE_QUERY} WHERE id=? AND user_id=? AND session_hash=? AND origin=? AND domain=?`,challengeId,auth.user.id,tokenHash(auth.token),url.origin,url.host).first<WalletChallengeRecord>();
      if(!challenge||challenge.consumedAt||challenge.chainId!==1||Date.parse(challenge.expiresAt)<=Date.now())throw conflict('Wallet confirmation expired or was already used. Start again.');
      if(!verifyWalletChallenge(challenge,body!.signature))throw bad('The signature does not match this wallet confirmation.');
      const id=opaqueId('wallet'),now=new Date().toISOString();
      // Conditional insertion and nonce consumption share a transaction. The second
      // statement consumes only the challenge actually used by this new link.
      let inserted:boolean;
      try {
        const results=await db.batch([
          stmt(db,`INSERT INTO store_wallet_links(id,user_id,address,chain_id,challenge_id,signature_hash,linked_at)
            SELECT ?,user_id,address,chain_id,id,?,? FROM store_wallet_challenges
            WHERE id=? AND user_id=? AND session_hash=? AND origin=? AND chain_id=1 AND consumed_at IS NULL AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')
            AND EXISTS(SELECT 1 FROM store_sessions s WHERE s.token_hash=store_wallet_challenges.session_hash AND s.user_id=store_wallet_challenges.user_id AND s.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
            id,tokenHash(body!.signature),now,challenge.id,auth.user.id,tokenHash(auth.token),url.origin),
          stmt(db,`UPDATE store_wallet_challenges SET consumed_at=? WHERE id=? AND consumed_at IS NULL
            AND EXISTS(SELECT 1 FROM store_wallet_links WHERE id=? AND challenge_id=?)`,now,challenge.id,id,challenge.id),
        ]);
        inserted=results[0].meta.changes===1;
      }catch(error){if(/UNIQUE/i.test(String(error)))throw conflict('This wallet is already linked to an account.');throw error;}
      if(!inserted)throw conflict('Wallet confirmation expired or was already used. Start again.');
      return ok({wallet:(await linkedWallets(db,auth.user.id)).find(wallet=>wallet.id===id),assetSyncStatus:'unconfigured',gameDeliveryStatus:'unconfigured'},201);
    }
    const unlinkWalletMatch=/^\/wallets\/([A-Za-z0-9_-]+)$/.exec(path);
    if(method==='DELETE' && unlinkWalletMatch) {
      exactKeys(body!,[]);
      const auth=await authorizeWrite(db,request),id=unlinkWalletMatch[1];
      const wallet=await stmt(db,'SELECT address FROM store_wallet_links WHERE id=? AND user_id=?',id,auth.user.id).first<{address:string}>();
      if(!wallet)throw new ApiError(404,'not_found','Linked wallet not found.');
      await db.batch([
        stmt(db,'DELETE FROM store_wallet_links WHERE id=? AND user_id=?',id,auth.user.id),
        stmt(db,'UPDATE store_wallet_challenges SET consumed_at=? WHERE user_id=? AND address=? AND consumed_at IS NULL',new Date().toISOString(),auth.user.id,wallet.address),
      ]);
      return ok({removed:true});
    }
    if (method==='PATCH' && path==='/profile') {
      exactKeys(body!,[],['displayName','bio']);
      if (!Object.keys(body!).length) throw bad('No profile changes supplied.');
      const auth=await authorizeWrite(db,request);
      const displayName=body!.displayName===undefined?auth.user.displayName:textValue(body!.displayName,'display name',1,60);
      const bio=body!.bio===undefined?auth.user.bio:textValue(body!.bio,'bio',0,500);
      await stmt(db,'UPDATE store_users SET display_name=?,bio=? WHERE id=?',displayName,bio,auth.user.id).run();
      return ok({user:await stmt(db,`SELECT ${USER_COLUMNS} FROM store_users u WHERE u.id=?`,auth.user.id).first<StoreProfile>()});
    }
    if(method==='GET' && path==='/profile/photo') {
      const auth=(await authenticate(db,request))!;
      const photo=await stmt(db,'SELECT image_base64 AS base64 FROM store_profile_photos WHERE user_id=?',auth.user.id).first<{base64:string}>();
      if(!photo)throw new ApiError(404,'not_found','Profile photo not found.');
      return new Response(Buffer.from(photo.base64,'base64'),{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin','Content-Security-Policy':"default-src 'none'; sandbox"}});
    }
    if(method==='PUT' && path==='/profile/photo') {
      exactKeys(body!,['dataUrl']);
      const auth=await authorizeWrite(db,request);
      await rateLimit(db,`profile-photo:${auth.user.id}`,10);
      let photo;try{photo=validateProfilePhoto(body!.dataUrl);}catch(error){throw bad(error instanceof Error?error.message:'Invalid profile photo.');}
      await stmt(db,`INSERT INTO store_profile_photos(user_id,mime_type,image_base64,digest,width,height,updated_at) VALUES(?,?,?,?,?,?,?)
        ON CONFLICT(user_id) DO UPDATE SET mime_type=excluded.mime_type,image_base64=excluded.image_base64,digest=excluded.digest,width=excluded.width,height=excluded.height,updated_at=excluded.updated_at`,
        auth.user.id,photo.mimeType,photo.base64,photo.digest,photo.width,photo.height,new Date().toISOString()).run();
      return ok({user:await stmt(db,`SELECT ${USER_COLUMNS} FROM store_users u WHERE u.id=?`,auth.user.id).first<StoreProfile>()});
    }
    if(method==='DELETE' && path==='/profile/photo') {
      exactKeys(body!,[]);
      const auth=await authorizeWrite(db,request);
      await stmt(db,'DELETE FROM store_profile_photos WHERE user_id=?',auth.user.id).run();
      return ok({user:await stmt(db,`SELECT ${USER_COLUMNS} FROM store_users u WHERE u.id=?`,auth.user.id).first<StoreProfile>()});
    }
    if (method==='POST' && path==='/seed') {
      exactKeys(body!,[]);
      const auth=await authorizeWrite(db,request),now=new Date().toISOString();
      if (!LOCAL_SEED_ITEMS.length) throw new ApiError(503,'unavailable','No approved catalog identities are available for test copies.');
      try {
        await db.batch([stmt(db,'INSERT INTO store_seed_claims(user_id,created_at) VALUES(?,?)',auth.user.id,now),
          ...LOCAL_SEED_ITEMS.map(item=>stmt(db,`INSERT INTO store_items(id,owner_id,product_id,variant_id,name,variant_name,source,usage,acquired_at,created_at)
            VALUES(?,?,?,?,?,?,'local_seed','unlocked',?,?)`,opaqueId('item'),auth.user.id,item.productId,item.variantId,item.name,item.variantName,now,now))]);
      } catch(error) {
        if (await stmt(db,'SELECT user_id FROM store_seed_claims WHERE user_id=?',auth.user.id).first()) throw conflict('Your one-time local test items have already been created.');
        throw error;
      }
      return ok({created:LOCAL_SEED_ITEMS.length,inventory:await inventory(db,auth.user.id),message:'Local test copies only. No blockchain assets or game entitlements were created.'},201);
    }
    if (method==='GET' && path==='/listings') {
      const productId=url.searchParams.get('productId'),variantId=url.searchParams.get('variantId');
      if (variantId && !productId) throw bad('Product is required with variant.');
      if (productId && !knownProductVariant(productId,variantId??undefined)) throw bad('Unknown product or variant.');
      const active=await listings(db,`WHERE l.status='active'${productId?' AND i.product_id=?':''}${variantId?' AND i.variant_id=?':''} ORDER BY l.created_at DESC LIMIT 100`,...(productId?[productId,...(variantId?[variantId]:[])]:[]));
      return ok({listings:active.filter(listing=>knownProductVariant(listing.productId,listing.variantId))});
    }
    if (method==='POST' && path==='/listings') {
      exactKeys(body!,['itemId','amountAtomic','currency']);
      if(body!.currency!=='WILD')throw bad('New listings must be priced in WILD.');
      const auth=await authorizeWrite(db,request),itemId=textValue(body!.itemId,'item',1,100),price=amountValue(body!.amountAtomic),id=opaqueId('listing');
      const owned=await stmt(db,'SELECT usage,product_id AS productId,variant_id AS variantId FROM store_items WHERE id=? AND owner_id=?',itemId,auth.user.id).first<{usage:string;productId:string;variantId:string}>();
      if (!owned) throw new ApiError(403,'forbidden','Only your own local inventory can be listed.');
      if (owned.usage!=='unlocked') throw conflict('Remove the item from use before listing it.');
      requireCurrentCatalogItem(owned.productId,owned.variantId);
      const fee=localAtomicFeeQuote(price);
      try { await stmt(db,`INSERT INTO store_listings(id,item_id,seller_id,amount_atomic,currency,created_at,fee_policy_version,seller_fee_bps,seller_fee_atomic,seller_proceeds_atomic)
        VALUES(?,?,?,?,'WILD',?,?,?,?,?)`,id,itemId,auth.user.id,price,new Date().toISOString(),fee.feePolicyVersion,fee.sellerFeeBps,fee.sellerFeeAtomic,fee.sellerProceedsAtomic).run(); }
      catch(error) {
        if (/item_unavailable|UNIQUE|constraint/i.test(String(error))) throw conflict('This item is already listed or no longer available.');
        throw error;
      }
      return ok({listing:(await listings(db,'WHERE l.id=?',id))[0]},201);
    }
    const cancelMatch=/^\/listings\/([A-Za-z0-9_-]+)\/cancel$/.exec(path);
    if (method==='POST' && cancelMatch) {
      exactKeys(body!,[]);
      const auth=await authorizeWrite(db,request),id=cancelMatch[1];
      const listing=(await listings(db,'WHERE l.id=?',id))[0];
      if (!listing) throw new ApiError(404,'not_found','Listing not found.');
      if (listing.sellerId!==auth.user.id) throw new ApiError(403,'forbidden','Only the seller can cancel this listing.');
      if (listing.status==='sold') throw conflict('The listing has already sold.');
      if (listing.status==='active') await stmt(db,"UPDATE store_listings SET status='cancelled',closed_at=? WHERE id=? AND seller_id=? AND status='active'",new Date().toISOString(),id,auth.user.id).run();
      const updated=(await listings(db,'WHERE l.id=?',id))[0];
      if (updated.status==='sold') throw conflict('The listing has already sold.');
      return ok({listing:updated});
    }
    const quoteMatch=/^\/listings\/([A-Za-z0-9_-]+)\/quote$/.exec(path);
    if(method==='POST'&&quoteMatch){
      exactKeys(body!,['paymentCurrency','expectedCurrency','expectedAmountAtomic']);
      const auth=await authorizeWrite(db,request),listingId=quoteMatch[1],paymentCurrency=currencyValue(body!.paymentCurrency),expectedCurrency=currencyValue(body!.expectedCurrency),expected=amountValue(body!.expectedAmountAtomic);
      const listing=(await listings(db,'WHERE l.id=?',listingId))[0];
      if(!listing)throw new ApiError(404,'not_found','Listing not found.');
      if(listing.sellerId===auth.user.id)throw conflict('You cannot buy your own listing.');
      if(listing.status!=='active')throw conflict('This listing is no longer available.');
      requireCurrentCatalogItem(listing.productId,listing.variantId);
      if(listing.currency!==expectedCurrency||listing.amountAtomic!==expected)throw conflict('The displayed ask does not match this listing. Refresh before buying.');
      let paymentAmount:string;
      try{paymentAmount=localDemoPaymentAmount(expected,expectedCurrency,paymentCurrency);}catch{throw bad('This amount cannot be represented in the selected payment currency.');}
      const id=opaqueId('quote'),now=new Date(),expires=new Date(now.getTime()+LOCAL_DEMO_RATE.quoteLifetimeMs);
      try{await stmt(db,`INSERT INTO store_purchase_quotes(id,listing_id,buyer_id,listing_currency,listing_amount_atomic,payment_currency,payment_amount_atomic,rate_id,usd_cents_per_wild,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,id,listingId,auth.user.id,expectedCurrency,expected,paymentCurrency,paymentAmount,LOCAL_DEMO_RATE.id,LOCAL_DEMO_RATE.usdCentsPerWild,now.toISOString(),expires.toISOString()).run();}
      catch(error){if(/quote_invalid|constraint/i.test(String(error)))throw conflict('This listing is no longer available for a quote.');throw error;}
      const quote=await stmt(db,`${QUOTE_QUERY} WHERE id=?`,id).first<Omit<LocalPurchaseQuote,'simulated'>>();
      return ok({quote:{...quote,simulated:true},message:'Fictional exchange-rate fixture. No payment is authorized.'},201);
    }
    const buyMatch=/^\/listings\/([A-Za-z0-9_-]+)\/buy$/.exec(path);
    if (method==='POST' && buyMatch) {
      exactKeys(body!,['idempotencyKey','quoteId','expectedAmountAtomic','expectedCurrency','paymentCurrency','expectedPaymentAmountAtomic']);
      const auth=await authorizeWrite(db,request),listingId=buyMatch[1],key=textValue(body!.idempotencyKey,'idempotency key',8,128),quoteId=textValue(body!.quoteId,'quote',1,100);
      if (!/^[A-Za-z0-9_-]+$/.test(key)) throw bad('Invalid idempotency key.');
      const expected=amountValue(body!.expectedAmountAtomic),expectedCurrency=currencyValue(body!.expectedCurrency),paymentCurrency=currencyValue(body!.paymentCurrency),expectedPayment=amountValue(body!.expectedPaymentAmountAtomic);
      const fingerprint=tokenHash(JSON.stringify({listingId,quoteId,expectedAmountAtomic:expected,expectedCurrency,paymentCurrency,expectedPaymentAmountAtomic:expectedPayment}));
      const replay=async ():Promise<Response|null>=> {
        const existing=await stmt(db,'SELECT id,request_fingerprint AS fingerprint FROM store_sales WHERE buyer_id=? AND idempotency_key=?',auth.user.id,key).first<{id:string;fingerprint:string}>();
        if (!existing) return null;
        if (existing.fingerprint!==fingerprint) throw conflict('That request key was already used for a different purchase request.');
        return ok({sale:(await sales(db,'WHERE s.id=?',existing.id))[0],replayed:true});
      };
      const repeated=await replay(); if(repeated) return repeated;
      const quote=await stmt(db,`${QUOTE_QUERY} WHERE id=? AND buyer_id=? AND listing_id=?`,quoteId,auth.user.id,listingId).first<LocalPurchaseQuote>();
      if(!quote||quote.listingAmountAtomic!==expected||quote.listingCurrency!==expectedCurrency||quote.paymentCurrency!==paymentCurrency||quote.paymentAmountAtomic!==expectedPayment)throw conflict('The purchase confirmation does not match your quote. Request a new quote.');
      if(Date.parse(quote.expiresAt)<=Date.now())throw conflict('This quote expired. Request a new quote before buying.');
      const listing=(await listings(db,'WHERE l.id=?',listingId))[0];
      if (!listing) throw new ApiError(404,'not_found','Listing not found.');
      if (listing.sellerId===auth.user.id) throw conflict('You cannot buy your own listing.');
      if (listing.status!=='active') throw conflict('This listing is no longer available.');
      requireCurrentCatalogItem(listing.productId,listing.variantId);
      if (expected!==listing.amountAtomic||expectedCurrency!==listing.currency) throw conflict('The displayed ask does not match this listing. Refresh before buying.');
      const id=opaqueId('sale');
      try {
        await stmt(db,`INSERT INTO store_sales(id,listing_id,item_id,product_id,variant_id,buyer_id,seller_id,price_cents,currency,amount_atomic,idempotency_key,request_fingerprint,created_at,fee_policy_version,seller_fee_bps,seller_fee_cents,seller_proceeds_cents,seller_fee_atomic,seller_proceeds_atomic,quote_id,payment_currency,payment_amount_atomic)
          SELECT ?,l.id,i.id,i.product_id,i.variant_id,?,l.seller_id,l.price_cents,l.currency,l.amount_atomic,?,?,?,l.fee_policy_version,l.seller_fee_bps,l.seller_fee_cents,l.seller_proceeds_cents,l.seller_fee_atomic,l.seller_proceeds_atomic,q.id,q.payment_currency,q.payment_amount_atomic
          FROM store_listings l JOIN store_items i ON i.id=l.item_id JOIN store_purchase_quotes q ON q.listing_id=l.id WHERE l.id=? AND l.amount_atomic=? AND l.currency=? AND q.id=? AND q.buyer_id=?`,
        id,auth.user.id,key,fingerprint,new Date().toISOString(),listingId,expected,expectedCurrency,quoteId,auth.user.id).run();
      } catch(error) {
        const retried=await replay(); if(retried) return retried;
        if (/listing_unavailable|quote_unavailable|UNIQUE|constraint/i.test(String(error))) throw conflict('This listing or quote is no longer available.');
        throw error;
      }
      const sale=(await sales(db,'WHERE s.id=?',id))[0];
      if(!sale) throw conflict('This listing is no longer available at the displayed ask.');
      return ok({sale,replayed:false,message:'Local simulated transfer complete. No money moved and no blockchain transaction was submitted.'},201);
    }
    const lockMatch=/^\/inventory\/([A-Za-z0-9_-]+)\/lock$/.exec(path);
    if (method==='POST' && lockMatch) {
      exactKeys(body!,['usage']);
      if (typeof body!.usage!=='string' || !['unlocked','equipped','installed','placed'].includes(body!.usage)) throw bad('Invalid item usage state.');
      const auth=await authorizeWrite(db,request),id=lockMatch[1];
      const item=(await inventory(db,auth.user.id)).find(entry=>entry.id===id);
      if (!item) throw new ApiError(403,'forbidden','Only your own local item can change usage state.');
      if (item.listingId) throw conflict('Cancel the active listing before changing item usage.');
      try { await stmt(db,'UPDATE store_items SET usage=? WHERE id=? AND owner_id=?',String(body!.usage),id,auth.user.id).run(); }
      catch(error) { if (/item_listed/i.test(String(error))) throw conflict('Cancel the active listing before changing item usage.'); throw error; }
      const updated=(await inventory(db,auth.user.id)).find(entry=>entry.id===id);
      if(!updated) throw conflict('This item no longer belongs to this account.');
      return ok({item:updated});
    }
    if (method==='GET' && path==='/reviews') {
      const productId=url.searchParams.get('productId');
      if (!productId || !knownReviewProductVariant(productId)) throw bad('Unknown product.');
      const auth=await authenticate(db,request,false);
      const votes=auth ? new Set((await rows<{review_id:string}>(db,'SELECT v.review_id FROM store_review_votes v JOIN store_reviews r ON r.id=v.review_id WHERE v.user_id=? AND r.product_id=?',auth.user.id,productId)).map(v=>v.review_id)) : new Set<string>();
      const published=(await reviews(db,"WHERE r.product_id=? AND r.moderation='published' ORDER BY r.created_at DESC LIMIT 200",productId)).map(review=>({...review,viewerHelpful:votes.has(review.id)}));
      return ok({status:'live',provider:'local-store',asOf:new Date().toISOString(),reviews:published,message:'Local test reviews only. Production reviews are not connected.'});
    }
    if (method==='GET' && path==='/moderation/reviews') {
      const auth=(await authenticate(db,request))!;await requireModerator(db,auth);
      const state=url.searchParams.get('status')??'pending';
      if(!['pending','published','rejected'].includes(state)) throw bad('Invalid moderation state.');
      return ok({reviews:await reviews(db,'WHERE r.moderation=? AND r.user_id<>? ORDER BY r.created_at ASC LIMIT 200',state,auth.user.id)});
    }
    const moderationMatch=/^\/reviews\/([A-Za-z0-9_-]+)\/moderation$/.exec(path);
    if(method==='POST' && moderationMatch) {
      exactKeys(body!,['decision','reason','expectedRevision','idempotencyKey']);
      const auth=await authorizeWrite(db,request);await requireModerator(db,auth);
      const decision=body!.decision,revision=body!.expectedRevision;
      if(!['published','rejected'].includes(String(decision)) || typeof revision!=='number' || !Number.isSafeInteger(revision) || revision<0) throw bad('Invalid moderation decision.');
      const reason=textValue(body!.reason,'moderation reason',3,500),key=textValue(body!.idempotencyKey,'idempotency key',8,128),reviewId=moderationMatch[1];
      if(!/^[A-Za-z0-9_-]+$/.test(key)) throw bad('Invalid idempotency key.');
      const fingerprint=tokenHash(JSON.stringify({reviewId,decision,revision,reason}));
      const replay=async()=>{
        const existing=await stmt(db,'SELECT fingerprint FROM store_review_decisions WHERE moderator_id=? AND idempotency_key=?',auth.user.id,key).first<{fingerprint:string}>();
        if(existing && existing.fingerprint!==fingerprint) throw conflict('Request key already used for a different moderation decision.');
        return !!existing;
      };
      if(await replay()) return ok({review:(await reviews(db,'WHERE r.id=?',reviewId))[0],replayed:true});
      const target=await stmt(db,'SELECT user_id AS userId,moderation_revision AS revision FROM store_reviews WHERE id=?',reviewId).first<{userId:string;revision:number}>();
      if(!target) throw new ApiError(404,'not_found','Review not found.');
      if(target.userId===auth.user.id) throw new ApiError(403,'forbidden','Another moderator must review your submission.');
      if(target.revision!==revision) throw conflict('Review changed. Refresh the moderation queue.');
      try {await stmt(db,'INSERT INTO store_review_decisions(id,review_id,moderator_id,decision,reason,expected_revision,idempotency_key,fingerprint,created_at) VALUES(?,?,?,?,?,?,?,?,?)',opaqueId('decision'),reviewId,auth.user.id,String(decision),reason,revision,key,fingerprint,new Date().toISOString()).run();}
      catch(error){if(await replay())return ok({review:(await reviews(db,'WHERE r.id=?',reviewId))[0],replayed:true});if(/review_revision_or_self|UNIQUE/i.test(String(error)))throw conflict('Review changed. Refresh the moderation queue.');throw error;}
      return ok({review:(await reviews(db,'WHERE r.id=?',reviewId))[0],replayed:false});
    }
    const helpfulMatch=/^\/reviews\/([A-Za-z0-9_-]+)\/helpful$/.exec(path);
    if(method==='POST' && helpfulMatch) {
      exactKeys(body!,['helpful']);if(typeof body!.helpful!=='boolean')throw bad('Helpful must be true or false.');
      const auth=await authorizeWrite(db,request),id=helpfulMatch[1];
      const target=await stmt(db,'SELECT user_id AS userId,moderation FROM store_reviews WHERE id=?',id).first<{userId:string;moderation:string}>();
      if(!target || target.moderation!=='published')throw new ApiError(404,'not_found','Published review not found.');
      if(target.userId===auth.user.id)throw new ApiError(403,'forbidden','You cannot vote for your own review.');
      try {if(body!.helpful)await stmt(db,'INSERT OR IGNORE INTO store_review_votes(review_id,user_id,created_at) VALUES(?,?,?)',id,auth.user.id,new Date().toISOString()).run();else await stmt(db,'DELETE FROM store_review_votes WHERE review_id=? AND user_id=?',id,auth.user.id).run();}
      catch(error){if(/review_vote_ineligible/i.test(String(error)))throw conflict('Review is no longer available.');throw error;}
      const count=await stmt(db,'SELECT COUNT(*) AS count FROM store_review_votes WHERE review_id=?',id).first<{count:number}>();
      return ok({reviewId:id,helpfulCount:count?.count??0,viewerHelpful:body!.helpful});
    }
    if (method==='POST' && path==='/reviews') {
      exactKeys(body!,['productId','variantId','rating','title','body']);
      const auth=await authorizeWrite(db,request),productId=textValue(body!.productId,'product',1,250),variantId=textValue(body!.variantId,'variant',1,250);
      if (!knownReviewProductVariant(productId,variantId)) throw bad('Unknown product or variant.');
      const rating=body!.rating;
      if (typeof rating!=='number' || !Number.isInteger(rating) || rating<1 || rating>5) throw bad('Rating must be a whole number from 1 to 5.');
      const title=textValue(body!.title,'review title',1,120),content=textValue(body!.body,'review body',1,5000),id=opaqueId('review');
      // A family/edition review does not establish ownership of any member token.
      const localInventorySubject=knownProductVariant(productId,variantId)?1:0;
      await rateLimit(db,`reviews:${auth.user.id}`,10,3600);
      try {
        await stmt(db,`INSERT INTO store_reviews(id,user_id,product_id,variant_id,rating,title,body,created_at,ownership_at_submission,local_purchase_id)
          VALUES(?,?,?,?,?,?,?,?,EXISTS(SELECT 1 FROM store_items WHERE ?=1 AND owner_id=? AND product_id=? AND variant_id=?),
            (SELECT id FROM store_sales WHERE ?=1 AND buyer_id=? AND product_id=? AND variant_id=? ORDER BY created_at DESC LIMIT 1))`,
        id,auth.user.id,productId,variantId,rating,title,content,new Date().toISOString(),localInventorySubject,auth.user.id,productId,variantId,localInventorySubject,auth.user.id,productId,variantId).run();
      } catch(error) { if(/UNIQUE/i.test(String(error))) throw conflict('You already submitted a review for this local product variant.'); throw error; }
      return ok({review:(await reviews(db,'WHERE r.id=?',id))[0],message:'Submitted for local moderation; not published.'},201);
    }
    throw new ApiError(404,'not_found','Not found.');
  } catch(error) {
    if (error instanceof ApiError) return json({error:{code:error.code,message:error.message}},error.status,error.status===429?{'Retry-After':'600'}:undefined);
    // Never expose SQL, passwords, hashes, session tokens or internal error details.
    return json({error:{code:'internal_error',message:'The local store could not complete this request.'}},500);
  }
}
