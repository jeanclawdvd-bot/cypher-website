import {marketTargetKey, USD, type AtomicMoney, type ChartPoint, type MarketRange, type MarketTarget} from './market-data';

/** Presentation fixtures only. Deliberately not a MarketSnapshot or executable order. */
export type DemoOrder = {kind:'demo_order'; id:string; label:string; price:AtomicMoney; quantity:number};
export type DemoSale = {kind:'demo_sale'; id:string; timestamp:string; price:AtomicMoney; quantity:number};
export type DemoMarket = {
  kind:'demo_market'; targetKey:string; currency:typeof USD; asOf:string;
  asks:DemoOrder[]; bids:DemoOrder[]; sales:DemoSale[]; points:ChartPoint[];
  lowestAsk:AtomicMoney; highestBid:AtomicMoney; lastSale:AtomicMoney;
  volume:AtomicMoney; salesCount:number; changePercent:number;
};
const DAY = 86_400_000;
function hash(value:string) { let result=2166136261; for(const char of value)result=Math.imul(result^char.charCodeAt(0),16777619); return result>>>0; }
function money(amount:number):AtomicMoney{return {amount:String(Math.max(1,Math.round(amount))),currency:USD};}

export function createDemoMarket(target:MarketTarget, previewPriceCents?:number|null, now=Date.now()):DemoMarket {
  const key=marketTargetKey(target),seed=hash(key);
  if(!Number.isFinite(now))throw new Error('A valid demo date is required');
  // None of these presentation values are price proposals, supply caps or token records.
  const fallback=/vehicle|wilderworld|wheels|land|cribs/i.test(target.productId)?125000:/furniture|statue|rim/i.test(target.productId)?18000:4500;
  const reference=typeof previewPriceCents==='number'&&Number.isSafeInteger(previewPriceCents)&&previewPriceCents>0&&previewPriceCents<100_000_000?previewPriceCents:fallback;
  const base=reference*(1+(seed%37)/100);
  const trend=(seed%2===0?1:-1)*(0.08+(seed%15)/100);
  const end=Math.floor(now/3_600_000)*3_600_000;
  const sales:DemoSale[]=[];
  // A daily series plus intraday observations make all ranges useful, without future dates.
  for(let index=0;index<390;index++){
    const timestamp=end-(389-index)*DAY-18*3_600_000;
    const progress=index/389;
    const wave=Math.sin(index*.49+seed%29)*.035+Math.cos(index*.13)*.025;
    sales.push({kind:'demo_sale',id:`demo-sale-${seed}-${index}`,timestamp:new Date(timestamp).toISOString(),price:money(base*(1-trend+trend*progress+wave)),quantity:1+(index+seed)%3});
  }
  for(let index=0;index<9;index++)sales.push({kind:'demo_sale',id:`demo-sale-${seed}-intraday-${index}`,timestamp:new Date(end-(8-index)*2*3_600_000).toISOString(),price:money(base*(1+Math.sin(index*.7+seed%17)*.018)),quantity:1});
  const lastSale=sales[sales.length-1].price;
  const last=Number(lastSale.amount);
  const rows=(side:'ask'|'bid'):DemoOrder[]=>Array.from({length:5},(_,index)=>({kind:'demo_order',id:`demo-${side}-${seed}-${index}`,label:`Demo ${side==='ask'?'seller':'buyer'} ${String(index+1).padStart(2,'0')}`,price:money(last*(side==='ask'?1.035+index*.025:.965-index*.025)),quantity:1+(seed+index)%4}));
  const asks=rows('ask'),bids=rows('bid');
  const recent=sales.filter(sale=>Date.parse(sale.timestamp)>=now-30*DAY);
  const start=Number(recent[0]?.price.amount??lastSale.amount);
  return {kind:'demo_market',targetKey:key,currency:USD,asOf:new Date(end).toISOString(),asks,bids,sales,
    points:sales.map(sale=>({timestamp:sale.timestamp,price:sale.price,source:'sample'})),lowestAsk:asks[0].price,highestBid:bids[0].price,lastSale,
    volume:{amount:recent.reduce((total,sale)=>total+BigInt(sale.price.amount)*BigInt(sale.quantity),BigInt(0)).toString(),currency:USD},
    salesCount:recent.reduce((count,sale)=>count+sale.quantity,0),changePercent:Math.round((last-start)/start*1000)/10};
}

export function demoChartPoints(demo:DemoMarket,range:MarketRange,now=Date.now()):ChartPoint[]{
  const days=range==='1M'?30:range==='3M'?90:range==='1Y'?365:Infinity;
  return demo.points.filter(point=>Date.parse(point.timestamp)<=now&&Date.parse(point.timestamp)>=now-days*DAY);
}
