import {marketTargetKey, type MarketTarget} from './market-data';
import {LOCAL_DEMO_RATE,formatLocalAmount} from '@/lib/store-backend/currency';

/** Fictional UI fixture, not a token price feed, payment quote or token identity. */
export const DEMO_WILD_RATE = Object.freeze({
  kind: 'demo_exchange_rate' as const,
  id: LOCAL_DEMO_RATE.id,
  usdCentsPerWild: Number(LOCAL_DEMO_RATE.usdCentsPerWild),
  label: 'Demo conversion: 1 WILD = $0.10. Not a live rate.',
});
export type PreviewCurrency = 'USD' | 'WILD';
export type PreviewMoney = {kind:'demo_money'; currency:PreviewCurrency; amount:string};
export type CurrencyPreviewDraft = {
  kind:'demo_currency_draft'; action:'bid'|'list'; targetKey:string;
  amount:PreviewMoney; rateId:typeof DEMO_WILD_RATE.id; submitted:false;
};
const decimals = (currency:PreviewCurrency) => currency === 'USD' ? 2 : 18;
const scale = BigInt(10) ** BigInt(18);
function atomic(amount:string):bigint {
  if (!/^(0|[1-9][0-9]*)$/.test(amount) || BigInt(amount) >= BigInt(2) ** BigInt(256)) throw new Error('Invalid preview amount');
  return BigInt(amount);
}
export function parsePreviewMoney(value:string,currency:PreviewCurrency):PreviewMoney {
  const places = decimals(currency);
  const match = value.trim().match(/^(0|[1-9][0-9]*)(?:\.([0-9]+))?$/);
  if (!match || (match[2]?.length ?? 0)>places) throw new Error(`Enter an amount with up to ${places} decimal places`);
  const amount = (BigInt(match[1])*BigInt(10)**BigInt(places)+BigInt((match[2]??'').padEnd(places,'0'))).toString();
  if (atomic(amount) === BigInt(0)) throw new Error('Amount must be greater than zero');
  return {kind:'demo_money',currency,amount};
}
export function usdCentsToPreviewMoney(cents:number|string,currency:PreviewCurrency):PreviewMoney {
  if (typeof cents==='number' && (!Number.isSafeInteger(cents) || cents<0)) throw new Error('Invalid USD cents');
  const amount = atomic(String(cents));
  return {kind:'demo_money',currency,amount:(currency==='USD'?amount:amount*scale/BigInt(DEMO_WILD_RATE.usdCentsPerWild)).toString()};
}
export function previewUsdEquivalent(money:PreviewMoney):PreviewMoney {
  const amount = atomic(money.amount);
  return {kind:'demo_money',currency:'USD',amount:(money.currency==='USD'?amount:(amount*BigInt(DEMO_WILD_RATE.usdCentsPerWild)+scale/BigInt(2))/scale).toString()};
}
export function formatPreviewMoney(money:PreviewMoney):string {
  atomic(money.amount);
  return formatLocalAmount(money.amount,money.currency);
}
export function makeCurrencyPreviewDraft(action:'bid'|'list',target:MarketTarget,value:string,currency:PreviewCurrency):CurrencyPreviewDraft {
  if (action==='list' && currency!=='WILD') throw new Error('Listings must be priced in WILD');
  return {kind:'demo_currency_draft',action,targetKey:marketTargetKey(target),amount:parsePreviewMoney(value,currency),rateId:DEMO_WILD_RATE.id,submitted:false};
}
