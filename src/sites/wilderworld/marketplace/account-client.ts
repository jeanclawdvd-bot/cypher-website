import {atomicAmount,formatLocalAmount,localCurrency,localDemoPaymentAmount,parseWildAmount,LOCAL_DEMO_RATE,type AtomicFeeSnapshot,type LocalCurrency,type LocalPurchaseQuote} from '@/lib/store-backend/currency';
import {marketplaceFeeBreakdown} from '@/lib/marketplace-fees';
export type {LocalCurrency,LocalPurchaseQuote};
/** Browser client for the loopback-only store preview. Never a wallet or payment API. */
export type LocalUser={id:string;email:string;displayName:string;bio:string;createdAt:string;avatarUrl?:string|null;profileSource?:'local';zeroSyncStatus?:'unconfigured'};
export type LocalSession={mode:'local';user:LocalUser|null;csrfToken?:string;canModerate?:boolean};
export type LocalInventoryItem={id:string;productId:string;variantId:string;name:string;variantName:string;acquiredAt:string;usage:'unlocked'|'equipped'|'placed'|'installed';listingId?:string|null};
export type LocalFeeQuote=AtomicFeeSnapshot;
export type LocalPrice=LocalFeeQuote&{amountAtomic:string;currency:LocalCurrency;priceCents:number|null;sellerFeeCents:number|null;sellerProceedsCents:number|null};
export type LocalListing=LocalPrice&{id:string;itemId:string;productId:string;variantId:string;status:'active'|'cancelled'|'sold';createdAt:string;sellerId:string;sellerName:string;simulated:true};
export type LocalSale=LocalPrice&{id:string;listingId:string;productId:string;variantId:string;createdAt:string;buyerId:string;sellerId:string;sellerName?:string;buyerName?:string;simulated:true;quoteId:string|null;paymentCurrency:LocalCurrency;paymentAmountAtomic:string;quoteRateId:string|null;quoteUsdCentsPerWild:string|null;quoteExpiresAt:string|null};
export type LocalBuyConfirmation={idempotencyKey:string;quoteId:string;expectedAmountAtomic:string;expectedCurrency:LocalCurrency;paymentCurrency:LocalCurrency;expectedPaymentAmountAtomic:string};
export type LocalReview={id:string;productId:string;variantId:string;rating:number;title:string;body:string;moderation:'pending'|'published'|'rejected';createdAt:string};
export type ModerationReview=LocalReview&{authorDisplayName:string;moderationRevision:number};
export type LocalLinkedWallet={id:string;address:string;chainId:1;linkedAt:string;proofType:'eip191'};
export type LocalWalletChallenge={id:string;address:string;chainId:1;domain:string;origin:string;nonce:string;message:string;issuedAt:string;expiresAt:string};
export type LocalWallets={mode:'local';wallets:LocalLinkedWallet[];assetSyncStatus:'unconfigured';gameDeliveryStatus:'unconfigured'};
export type LocalAccount={mode:'local';user:LocalUser;inventory:LocalInventoryItem[];listings:LocalListing[];purchases:LocalSale[];sales:LocalSale[];reviews:LocalReview[];seedClaimed?:boolean};
export const STORE_ACCOUNT_EVENT='ww-account-change';
const PREFIX='/api/store/v1';
export class StoreApiError extends Error {
  constructor(message:string,public status:number,public code:string){super(message);this.name='StoreApiError';}
}
function record(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value);}
async function request<T>(path:string,options:{method?:string;body?:unknown;csrfToken?:string;signal?:AbortSignal}={}):Promise<T>{
  let response:Response;
  try {response=await fetch(PREFIX+path,{method:options.method??'GET',credentials:'same-origin',cache:'no-store',signal:options.signal,headers:{Accept:'application/json',...(options.body!==undefined?{'Content-Type':'application/json'}:{}),...(options.csrfToken?{'X-CSRF-Token':options.csrfToken}:{})},...(options.body!==undefined?{body:JSON.stringify(options.body)}:{})});}
  catch(error){if(error instanceof Error&&error.name==='AbortError')throw error;throw new StoreApiError('The local account service could not be reached. Try again.',0,'network');}
  let data:unknown;
  try {data=await response.json();}catch{throw new StoreApiError('The local account service returned an unreadable response.',response.status,'invalid_response');}
  if(!response.ok){const detail=record(data)?data.error:null;const message=typeof detail==='string'?detail:record(detail)&&typeof detail.message==='string'?detail.message:'The request could not be completed.';const code=record(detail)&&typeof detail.code==='string'?detail.code:'request_failed';throw new StoreApiError(message,response.status,code);}
  if(!record(data)||data.mode!=='local')throw new StoreApiError('Local preview accounts are unavailable on this site.',response.status,'wrong_mode');
  return data as T;
}
function csrf(token:string|undefined):string{if(!token)throw new StoreApiError('Sign in again before making this change.',401,'session_required');return token;}
export function notifyStoreAccount(){if(typeof window!=='undefined')window.dispatchEvent(new Event(STORE_ACCOUNT_EVENT));}
export function isSessionExpired(error:unknown){return error instanceof StoreApiError&&(error.status===401||error.code==='session_required');}
export function accountErrorMessage(error:unknown){return error instanceof Error?error.message:'Something went wrong. Please try again.';}
export function validateAuth(input:{email:string;password:string;displayName?:string},register:boolean){
  const email=input.email.trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid email address.');
  if(!input.password)throw new Error('Enter your password.');
  if(register&&(input.password.length<12||input.password.length>128))throw new Error('Use a password between 12 and 128 characters.');
  if(register&&(!input.displayName?.trim()||input.displayName.trim().length>60))throw new Error('Choose a display name between 1 and 60 characters.');
  return {email,password:input.password,...(register?{displayName:input.displayName!.trim()}:{})};
}
export const listingAmountAtomic=parseWildAmount;
export const localMoney=(value:{amountAtomic:string;currency:LocalCurrency})=>formatLocalAmount(value.amountAtomic,value.currency);
export function canListLocalItem(item:LocalInventoryItem){return item.usage==='unlocked'&&!item.listingId;}
/** Validate stored fees without applying today's policy to historical records. */
export function hasLocalFeeQuote(value:Partial<LocalPrice>):value is LocalPrice{
  try{
    atomicAmount(value.amountAtomic);localCurrency(value.currency);atomicAmount(value.sellerFeeAtomic,true);atomicAmount(value.sellerProceedsAtomic,true);
    if(typeof value.feePolicyVersion!=='string'||!value.feePolicyVersion||!Number.isSafeInteger(value.sellerFeeBps)||value.sellerFeeBps! < 0||value.sellerFeeBps! > 10000)return false;
    const expected=marketplaceFeeBreakdown(BigInt(value.amountAtomic!),value.sellerFeeBps!);
    if(BigInt(value.sellerFeeAtomic!)!==expected.sellerFeeMinor||BigInt(value.sellerProceedsAtomic!)!==expected.sellerProceedsMinor)return false;
    if(value.currency==='WILD')return value.priceCents===null&&value.sellerFeeCents===null&&value.sellerProceedsCents===null;
    return Number.isSafeInteger(value.priceCents)&&String(value.priceCents)===value.amountAtomic&&String(value.sellerFeeCents)===value.sellerFeeAtomic&&String(value.sellerProceedsCents)===value.sellerProceedsAtomic;
  }catch{return false;}
}
export function validLocalQuote(quote:LocalPurchaseQuote,listing:LocalListing,buyerId:string,paymentCurrency:LocalCurrency):boolean{
  try{return quote.simulated===true&&quote.listingId===listing.id&&quote.buyerId===buyerId&&quote.listingCurrency===listing.currency&&quote.listingAmountAtomic===listing.amountAtomic&&quote.paymentCurrency===paymentCurrency&&quote.rateId===LOCAL_DEMO_RATE.id&&quote.usdCentsPerWild===LOCAL_DEMO_RATE.usdCentsPerWild&&quote.paymentAmountAtomic===localDemoPaymentAmount(listing.amountAtomic,listing.currency,paymentCurrency)&&Number.isFinite(Date.parse(quote.expiresAt))&&Date.parse(quote.expiresAt)>Date.parse(quote.createdAt);}catch{return false;}
}
export const localUsd=(cents:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
export const storeAccountApi={
  wallets:(signal?:AbortSignal)=>request<LocalWallets>('/wallets',{signal}),
  walletChallenge:(body:{address:string;chainId:1},token?:string)=>request<{mode:'local';challenge:LocalWalletChallenge}>('/wallets/challenges',{method:'POST',body,csrfToken:csrf(token)}),
  linkWallet:(body:{challengeId:string;signature:string},token?:string)=>request<{mode:'local';wallet:LocalLinkedWallet}>('/wallets/link',{method:'POST',body,csrfToken:csrf(token)}),
  unlinkWallet:(id:string,token?:string)=>request<{mode:'local';removed:true}>(`/wallets/${encodeURIComponent(id)}`,{method:'DELETE',body:{},csrfToken:csrf(token)}),
  session:(signal?:AbortSignal)=>request<LocalSession>('/session',{signal}),
  account:(signal?:AbortSignal)=>request<LocalAccount>('/account',{signal}),
  register:(body:{email:string;password:string;displayName:string})=>request<LocalSession>('/register',{method:'POST',body}),
  login:(body:{email:string;password:string})=>request<LocalSession>('/login',{method:'POST',body}),
  logout:(token?:string)=>request<{mode:'local'}>('/logout',{method:'POST',body:{},csrfToken:csrf(token)}),
  uploadProfilePhoto:(dataUrl:string,token?:string)=>request<{mode:'local';user:LocalUser}>('/profile/photo',{method:'PUT',body:{dataUrl},csrfToken:csrf(token)}),
  removeProfilePhoto:(token?:string)=>request<{mode:'local';user:LocalUser}>('/profile/photo',{method:'DELETE',body:{},csrfToken:csrf(token)}),
  profile:(body:{displayName:string;bio:string},token?:string)=>request<{mode:'local';user:LocalUser}>('/profile',{method:'PATCH',body,csrfToken:csrf(token)}),
  seed:(token?:string)=>request<{mode:'local'}>('/seed',{method:'POST',body:{},csrfToken:csrf(token)}),
  createListing:(body:{itemId:string;amountAtomic:string;currency:'WILD'},token?:string)=>request<{mode:'local';listing:LocalListing}>('/listings',{method:'POST',body,csrfToken:csrf(token)}),
  cancelListing:(id:string,token?:string)=>request<{mode:'local'}>(`/listings/${encodeURIComponent(id)}/cancel`,{method:'POST',body:{},csrfToken:csrf(token)}),
  listings:(productId:string,variantId:string,signal?:AbortSignal)=>request<{mode:'local';listings:LocalListing[]}>(`/listings?${new URLSearchParams({productId,variantId})}`,{signal}),
  quote:(id:string,body:{paymentCurrency:LocalCurrency;expectedCurrency:LocalCurrency;expectedAmountAtomic:string},token?:string)=>request<{mode:'local';quote:LocalPurchaseQuote}>(`/listings/${encodeURIComponent(id)}/quote`,{method:'POST',body,csrfToken:csrf(token)}),
  buy:(id:string,body:LocalBuyConfirmation,token?:string)=>request<{mode:'local';sale:LocalSale;replayed:boolean}>(`/listings/${encodeURIComponent(id)}/buy`,{method:'POST',body,csrfToken:csrf(token)}),
  review:(body:{productId:string;variantId:string;rating:number;title:string;body:string},token?:string)=>request<{mode:'local';review:LocalReview}>('/reviews',{method:'POST',body,csrfToken:csrf(token)}),
  moderationQueue:(status:string,signal?:AbortSignal)=>request<{mode:'local';reviews:ModerationReview[]}>(`/moderation/reviews?${new URLSearchParams({status})}`,{signal}),
  moderate:(id:string,body:{decision:'published'|'rejected';reason:string;expectedRevision:number;idempotencyKey:string},token?:string)=>request<{mode:'local';review:ModerationReview;replayed:boolean}>(`/reviews/${encodeURIComponent(id)}/moderation`,{method:'POST',body,csrfToken:csrf(token)}),
  helpful:(id:string,helpful:boolean,token?:string)=>request<{mode:'local';reviewId:string;helpfulCount:number;viewerHelpful:boolean}>(`/reviews/${encodeURIComponent(id)}/helpful`,{method:'POST',body:{helpful},csrfToken:csrf(token)}),
};
