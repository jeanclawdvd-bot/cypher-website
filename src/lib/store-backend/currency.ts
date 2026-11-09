import {MARKETPLACE_FEE_POLICY,marketplaceFeeBreakdown} from '../marketplace-fees';

/** Local simulation fixture only. Never a live WILD oracle or payment authorization. */
export const LOCAL_DEMO_RATE = Object.freeze({id:'ui-demo-wild-usd-10c-v1',usdCentsPerWild:'10',wildDecimals:18,quoteLifetimeMs:300_000});
export type LocalCurrency='USD'|'WILD';
export type AtomicFeeSnapshot={feePolicyVersion:string;sellerFeeBps:number;sellerFeeAtomic:string;sellerProceedsAtomic:string};
export type LocalPurchaseQuote={id:string;listingId:string;buyerId:string;listingCurrency:LocalCurrency;listingAmountAtomic:string;paymentCurrency:LocalCurrency;paymentAmountAtomic:string;rateId:string;usdCentsPerWild:string;createdAt:string;expiresAt:string;simulated:true};
export const MAX_ATOMIC=(BigInt(2)**BigInt(256)-BigInt(1)).toString();
const scale=BigInt(10)**BigInt(LOCAL_DEMO_RATE.wildDecimals);
export function atomicAmount(value:unknown,allowZero=false):string {
  if(typeof value!=='string'||value.length>78||!/^(0|[1-9][0-9]*)$/.test(value)||BigInt(value)>BigInt(MAX_ATOMIC)||(!allowZero&&value==='0'))throw new Error('Use a canonical positive atomic amount string within uint256.');
  return value;
}
export function localCurrency(value:unknown):LocalCurrency {
  if(value!=='USD'&&value!=='WILD')throw new Error('Choose USD or WILD.');
  return value;
}
export function localAtomicFeeQuote(amount:string):AtomicFeeSnapshot {
  const fee=marketplaceFeeBreakdown(BigInt(atomicAmount(amount)));
  return {feePolicyVersion:MARKETPLACE_FEE_POLICY.version,sellerFeeBps:MARKETPLACE_FEE_POLICY.sellerFeeBps,sellerFeeAtomic:fee.sellerFeeMinor.toString(),sellerProceedsAtomic:fee.sellerProceedsMinor.toString()};
}
/** USD payment rounds upward to a cent; the seller still receives the exact WILD ask less its fee. */
export function localDemoPaymentAmount(amount:string,listingCurrency:LocalCurrency,paymentCurrency:LocalCurrency):string {
  const value=BigInt(atomicAmount(amount));localCurrency(listingCurrency);localCurrency(paymentCurrency);
  if(listingCurrency===paymentCurrency)return amount;
  const result=listingCurrency==='WILD'?(value*BigInt(LOCAL_DEMO_RATE.usdCentsPerWild)+scale-BigInt(1))/scale:value*scale/BigInt(LOCAL_DEMO_RATE.usdCentsPerWild);
  return atomicAmount(result.toString());
}
export function parseWildAmount(value:string):string {
  const parts=value.trim().match(/^(0|[1-9][0-9]*)(?:\.([0-9]{1,18}))?$/);
  if(!parts)throw new Error('Enter a positive WILD amount with up to 18 decimal places.');
  return atomicAmount((BigInt(parts[1])*scale+BigInt((parts[2]??'').padEnd(18,'0'))).toString());
}
export function formatLocalAmount(amount:string,currency:LocalCurrency):string {
  atomicAmount(amount,true);localCurrency(currency);
  // Round presentation only; listing, payment and fee amounts retain atomic precision.
  if(currency==='WILD')return `${((BigInt(amount)+scale/BigInt(2))/scale).toLocaleString('en-US')} WILD`;
  const decimals=2;
  const padded=amount.padStart(decimals+1,'0'),whole=padded.slice(0,-decimals).replace(/\B(?=(\d{3})+(?!\d))/g,',');
  return `$${whole}.${padded.slice(-decimals)}`;
}
