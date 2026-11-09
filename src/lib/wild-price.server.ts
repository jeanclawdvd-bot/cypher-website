import {priceDecimal,rateStatus,WILD_PRICE_ID,WILD_RATE_SOURCES,WILD_RATE_MAX_AGE_MS,WILD_RATE_REFRESH_MS,type WildRateResponse,type WildUsdRate} from './wild-price';

type Fetcher=typeof fetch;
function record(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value);}
export function parseWildRate(data:unknown,provider:WildUsdRate['provider'],now=Date.now()):WildUsdRate|null{
  if(!record(data))return null;let value:unknown,updated:unknown;
  if(provider==='defillama'){
    const coin=record(data.coins)?data.coins['ethereum:'+WILD_PRICE_ID.contract]:null;
    if(!record(coin)||coin.symbol!=='WILD'||coin.decimals!==18||typeof coin.confidence!=='number'||!Number.isFinite(coin.confidence)||coin.confidence<0.9||coin.confidence>1)return null;
    value=coin.price;updated=coin.timestamp;
  }else{const coin=data[WILD_PRICE_ID.coingeckoId];if(!record(coin))return null;value=coin.usd;updated=coin.last_updated_at;}
  const usdPerWild=priceDecimal(value);
  if(!usdPerWild||typeof updated!=='number'||!Number.isSafeInteger(updated)||updated<=0||updated*1000>now+60_000||now-updated*1000>=WILD_RATE_MAX_AGE_MS)return null;
  return {...WILD_PRICE_ID,provider,sourceUrl:WILD_RATE_SOURCES[provider],usdPerWild,sourceUpdatedAt:new Date(updated*1000).toISOString(),fetchedAt:new Date(now).toISOString(),expiresAt:new Date(updated*1000+WILD_RATE_MAX_AGE_MS).toISOString()};
}
/** One in-flight read/cache per isolate; no historical or fixed-price fallback. */
export function createWildRateService(fetcher:Fetcher=fetch,clock=Date.now){
  let cached:WildUsdRate|null=null,nextRead=0,pending:Promise<WildRateResponse>|null=null,lastReadFailed=false;
  function current():WildRateResponse{if(!cached||rateStatus(cached,clock())==='unavailable')return {status:'unavailable',rate:null};return {status:lastReadFailed?'stale':rateStatus(cached,clock()),rate:cached};}
  async function retrieve():Promise<WildRateResponse>{
    let stale:WildUsdRate|null=null;
    for(const provider of ['defillama','coingecko'] as const){
      try{
        const response=await fetcher(WILD_RATE_SOURCES[provider],{headers:{Accept:'application/json','User-Agent':'WilderWorldStore/1.0 (indicative token price display)'},cache:'no-store',signal:AbortSignal.timeout(4500)});
        if(!response.ok){console.warn(`WILD price provider ${provider}: HTTP ${response.status}`);continue;}const size=Number(response.headers.get('content-length')??0);if(size>65536)continue;
        const text=await response.text();if(text.length>65536)continue;const rate=parseWildRate(JSON.parse(text),provider,clock());if(!rate)continue;
        if(rateStatus(rate,clock())==='fresh'){cached=rate;lastReadFailed=false;nextRead=clock()+WILD_RATE_REFRESH_MS;return current();}
        if(!stale||Date.parse(rate.sourceUpdatedAt)>Date.parse(stale.sourceUpdatedAt))stale=rate;
      }catch(error){console.warn(`WILD price provider ${provider}: ${error instanceof Error?error.message:'request failed'}`);}
    }
    if(stale&&(!cached||Date.parse(stale.sourceUpdatedAt)>Date.parse(cached.sourceUpdatedAt)))cached=stale;
    lastReadFailed=true;nextRead=clock()+30_000;return current();
  }
  return {async read(){if(clock()<nextRead)return current();if(!pending)pending=retrieve().finally(()=>{pending=null;});return pending;}};
}
const service=createWildRateService();
export const readWildRate=()=>service.read();
