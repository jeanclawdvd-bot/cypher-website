/** Indicative market data for display only. Never a payment or settlement quote. */
export const WILD_PRICE_ID={symbol:'WILD',currency:'USD',chainId:1,contract:'0x2a3bff78b79a009976eea096a51a948a3dc00e34',coingeckoId:'wilder-world'} as const;
export const WILD_RATE_REFRESH_MS=60_000;
export const WILD_RATE_FRESH_MS=5*60_000;
export const WILD_RATE_MAX_AGE_MS=15*60_000;
export const WILD_RATE_SOURCES={defillama:'https://coins.llama.fi/prices/current/ethereum:'+WILD_PRICE_ID.contract,coingecko:'https://api.coingecko.com/api/v3/simple/price?ids=wilder-world&vs_currencies=usd&include_last_updated_at=true&precision=full'} as const;
export type WildUsdRate={symbol:'WILD';currency:'USD';chainId:1;contract:typeof WILD_PRICE_ID.contract;provider:'defillama'|'coingecko';sourceUrl:string;usdPerWild:string;sourceUpdatedAt:string;fetchedAt:string;expiresAt:string};
export type WildRateResponse={status:'fresh'|'stale'|'unavailable';rate:WildUsdRate|null};
const SCALE=BigInt(10)**BigInt(18);
export function priceDecimal(value:unknown):string|null{
  if(typeof value!=='number'||!Number.isFinite(value)||value<=0||value>Number.MAX_SAFE_INTEGER)return null;
  const raw=value.toString(),text=raw.includes('e')?value.toFixed(18).replace(/0+$/,'').replace(/\.$/,''):raw;return rateAtomic(text)>BigInt(0)?text:null;
}
function rateAtomic(value:string){if(!/^(0|[1-9][0-9]*)(?:\.[0-9]{1,18})?$/.test(value))return BigInt(0);const [whole,fraction='']=value.split('.');return BigInt(whole)*SCALE+BigInt(fraction.padEnd(18,'0'));}
export function rateStatus(rate:WildUsdRate,now=Date.now()):'fresh'|'stale'|'unavailable'{const age=now-Date.parse(rate.sourceUpdatedAt);return age< -60_000||age>WILD_RATE_MAX_AGE_MS||Date.parse(rate.expiresAt)<=now?'unavailable':age>WILD_RATE_FRESH_MS?'stale':'fresh';}
export function validWildRate(value:unknown,now=Date.now()):value is WildUsdRate{
  if(!value||typeof value!=='object')return false;const r=value as WildUsdRate;
  if(r.symbol!=='WILD'||r.currency!=='USD'||r.chainId!==1||r.contract!==WILD_PRICE_ID.contract||!['defillama','coingecko'].includes(r.provider)||r.sourceUrl!==WILD_RATE_SOURCES[r.provider]||typeof r.usdPerWild!=='string'||r.usdPerWild.length>40||rateAtomic(r.usdPerWild)<=BigInt(0))return false;
  const source=Date.parse(r.sourceUpdatedAt),fetched=Date.parse(r.fetchedAt),expires=Date.parse(r.expiresAt);
  return Number.isFinite(source)&&Number.isFinite(fetched)&&Number.isFinite(expires)&&fetched<=now+60_000&&source<=fetched+60_000&&expires===source+WILD_RATE_MAX_AGE_MS&&rateStatus(r,now)!=='unavailable';
}
function integerAmount(value:number|string){if(typeof value==='number'&&(!Number.isSafeInteger(value)||value<0))throw new Error('Invalid price');const text=String(value);if(!/^(0|[1-9][0-9]*)$/.test(text)||text.length>78)throw new Error('Invalid price');return BigInt(text);}
function formatHundredths(value:bigint,trim=false){const raw=value.toString().padStart(3,'0'),whole=raw.slice(0,-2).replace(/\B(?=(\d{3})+(?!\d))/g,','),fraction=raw.slice(-2);return whole+(trim&&fraction==='00'?'':'.'+fraction);}
export function wildEquivalent(usdCents:number|string,rate:WildUsdRate){const cents=integerAmount(usdCents),denominator=rateAtomic(rate.usdPerWild)*BigInt(100);if(denominator<=BigInt(0))throw new Error('Invalid rate');return ((cents*SCALE+denominator/BigInt(2))/denominator).toLocaleString('en-US')+' WILD';}
export function usdEquivalent(wildAtomic:string,rate:WildUsdRate){const units=integerAmount(wildAtomic),value=rateAtomic(rate.usdPerWild);if(value<=BigInt(0))throw new Error('Invalid rate');const denominator=SCALE*SCALE;return '$'+formatHundredths((units*value*BigInt(100)+denominator/BigInt(2))/denominator);}
