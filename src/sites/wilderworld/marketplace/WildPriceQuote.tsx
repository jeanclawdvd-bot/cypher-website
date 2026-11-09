'use client';
import {wildEquivalent} from '@/lib/wild-price';
import {rateDescription,rateTime,useWildUsdRate} from './useWildUsdRate';
import styles from './WildPriceQuote.module.css';

/** The USD catalog price stays fixed; this WILD estimate follows the market. */
export default function WildPriceQuote({usdCents,compact=false}:{usdCents:number|string;compact?:boolean}) {
  const state=useWildUsdRate();
  if(compact){
    if(!state.rate)return null;
    const amount=`≈ ${wildEquivalent(usdCents,state.rate)}`;
    const details=`Estimated conversion. ${rateDescription(state)}`;
    return <small className={`${styles.quote} ${styles.compact} ${state.status==='stale'?styles.stale:''}`} title={details} aria-label={`${amount}. ${details}`} tabIndex={0}>{amount}</small>;
  }
  return <small className={styles.quote} title={rateDescription(state)}>{state.rate?<>≈ {wildEquivalent(usdCents,state.rate)}<span> · {state.status==='stale'?'Last rate':'Updated'} {rateTime(state)}{state.status==='stale'?' · stale':''}</span></>:state.status==='loading'?'WILD estimate loading…':'WILD rate unavailable'}</small>;
}
