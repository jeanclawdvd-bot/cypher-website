'use client';
import {formatLocalAmount,type LocalCurrency} from '@/lib/store-backend/currency';
import {usdEquivalent} from '@/lib/wild-price';
import {rateDescription,rateTime,useWildUsdRate} from './useWildUsdRate';
import quoteStyles from './WildPriceQuote.module.css';

export default function LocalCurrencyPrice({amountAtomic,currency}:{amountAtomic:string;currency:LocalCurrency}){
  return currency==='WILD'?<NativeWildPrice amountAtomic={amountAtomic}/>:<><strong>{formatLocalAmount(amountAtomic,'USD')}</strong><small className={quoteStyles.quote}>Legacy USD terms</small></>;
}
function NativeWildPrice({amountAtomic}:{amountAtomic:string}){
  const state=useWildUsdRate(),ask=formatLocalAmount(amountAtomic,'WILD');
  return <><strong>{state.rate?'≈ '+usdEquivalent(amountAtomic,state.rate):ask}</strong><small className={quoteStyles.quote} title={rateDescription(state)}>{state.rate?<>{ask}<span> · {state.status==='stale'?'Last rate':'Updated'} {rateTime(state)}{state.status==='stale'?' · stale':''}</span></>:state.status==='loading'?'USD estimate loading…':'USD estimate unavailable'}</small></>;
}
