'use client';

import {useSyncExternalStore} from 'react';
import {rateStatus,validWildRate,WILD_RATE_REFRESH_MS,type WildRateResponse} from '@/lib/wild-price';

export type WildRateState={status:'loading'|'fresh'|'stale'|'unavailable';rate:WildRateResponse['rate']};
const INITIAL:WildRateState={status:'loading',rate:null};

/** Public indicative prices only. No account data, storage or settlement quote. */
export function createWildRateStore(fetcher:typeof fetch=(...args)=>fetch(...args),clock=Date.now){
  let state:WildRateState=INITIAL,pending:Promise<void>|null=null,nextRead=0,timer:ReturnType<typeof setInterval>|null=null;
  const listeners=new Set<()=>void>();
  const publish=(next:WildRateState)=>{if(next.status===state.status&&next.rate===state.rate)return;state=next;listeners.forEach(listener=>listener());};
  function age(){if(!state.rate)return;const status=rateStatus(state.rate,clock());if(status==='unavailable')publish({status,rate:null});else if(status==='stale')publish({status,rate:state.rate});}
  async function request(){
    try{
      const response=await fetcher('/api/market/wild-price',{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(10_000)});
      if(!response.ok)throw new Error('Rate unavailable');const body:unknown=await response.json();
      if(!body||typeof body!=='object')throw new Error('Rate unavailable');
      const value=body as WildRateResponse;
      if(!['fresh','stale'].includes(value.status)||!validWildRate(value.rate,clock()))throw new Error('Rate unavailable');
      const status=value.status==='stale'?'stale':rateStatus(value.rate,clock());
      publish(status==='unavailable'?{status,rate:null}:{status,rate:value.rate});
      nextRead=clock()+WILD_RATE_REFRESH_MS;
    }catch{
      const valid=state.rate&&validWildRate(state.rate,clock());publish(valid?{status:'stale',rate:state.rate}:{status:'unavailable',rate:null});nextRead=clock()+30_000;
    }
  }
  function refresh(){age();if(clock()<nextRead)return Promise.resolve();if(!pending)pending=request().finally(()=>{pending=null;});return pending;}
  const tick=()=>{age();void refresh();};
  return {
    subscribe(listener:()=>void){listeners.add(listener);if(listeners.size===1){void refresh();timer=setInterval(tick,15_000);}return()=>{listeners.delete(listener);if(!listeners.size&&timer){clearInterval(timer);timer=null;}};},
    getSnapshot:()=>state,getServerSnapshot:()=>INITIAL,refresh,
  };
}
const store=createWildRateStore();
export function useWildUsdRate(){return useSyncExternalStore(store.subscribe,store.getSnapshot,store.getServerSnapshot);}
export function rateDescription(state:WildRateState){if(!state.rate)return 'WILD/USD market rate unavailable. USD product prices and WILD listing asks are unchanged.';return `Indicative WILD/USD via ${state.rate.provider==='defillama'?'DefiLlama':'CoinGecko'}. Updated ${state.rate.sourceUpdatedAt}. ${state.status==='stale'?'Last available rate; refresh pending. ':''}Not a payment quote.`;}
export function rateTime(state:WildRateState){return state.rate?new Date(state.rate.sourceUpdatedAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',timeZone:'UTC',hour12:false})+' UTC':'';}
