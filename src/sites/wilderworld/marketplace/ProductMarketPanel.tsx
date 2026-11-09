'use client';

import {useEffect, useId, useMemo, useState} from 'react';
import {ArrowUpRight, ChartNoAxesCombined, LockKeyhole} from 'lucide-react';
import { MARKETPLACE_FEE_POLICY, marketplaceFeeBreakdown } from '@/lib/marketplace-fees';
import {
  actionEligibility, emptyMarket, formatMoney, marketStats, marketTargetKey,
  MARKET_RANGES, MAX_QUOTE_AGE_MS, tradeChartPoints, unconfiguredMarketAdapter, USD, validateSnapshot,
  type ChartPoint, type MarketRange, type MarketReadAdapter, type MarketSnapshot,
  type MarketTarget, type TokenMarketIdentity, type TradingContext,
} from './market-data';
import {createDemoMarket, demoChartPoints, type DemoMarket} from './demo-market';
import {DEMO_WILD_RATE,formatPreviewMoney,makeCurrencyPreviewDraft,previewUsdEquivalent,usdCentsToPreviewMoney,type CurrencyPreviewDraft,type PreviewCurrency,type PreviewMoney} from './preview-currency';
import DemoWildPriceQuote from './DemoWildPriceQuote';
import MarketOverview, {uniqueMarketVariants, type MarketVariant} from './MarketOverview';
import styles from './ProductMarketPanel.module.css';

export type ProductMarketPanelProps = {
  productId:string;
  variantId:string;
  variantName:string;
  previewPriceCents?:number|null;
  variants?:MarketVariant[];
  onVariantSelect?:(variantId:string)=>void;
  /** Only supply an identity from an approved source-to-token registry. */
  identity?:TokenMarketIdentity;
  adapter?:MarketReadAdapter;
  tradingContext?:TradingContext;
};
const unknownContext:TradingContext = {ownership:'unknown',usage:'unknown'};
const dateLabel = (iso:string) => new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
const shortAddress = (address:string) => `${address.slice(0,6)}…${address.slice(-4)}`;

function FeePreview({amount,side}:{amount:PreviewMoney;side:'buy'|'sell'}) {
  const quote=marketplaceFeeBreakdown(BigInt(amount.amount));
  const money=(value:bigint)=>formatPreviewMoney({...amount,amount:value.toString()});
  return <div className={styles.feePreview} aria-label="Marketplace fee preview">
    <dl><div><dt>{side==='sell'?`Seller marketplace fee · ${MARKETPLACE_FEE_POLICY.sellerFeeBps/100}%`:'Buyer marketplace fee · 0%'}</dt><dd>{money(side==='sell'?quote.sellerFeeMinor:BigInt(0))}</dd></div>
      <div><dt>{side==='sell'?'Proceeds after marketplace fee':'Purchase amount'}</dt><dd>{money(side==='sell'?quote.sellerProceedsMinor:quote.buyerTotalMinor)}</dd></div></dl>
    <p>Illustrative only. Any collection royalties, payment and network costs are separate and not included.</p>
  </div>;
}

function PriceChart({points,sample}:{points:ChartPoint[];sample:boolean}) {
  const gradientId = useId().replace(/:/g,'');
  if (!points.length) return <div className={styles.chartEmpty}><ChartNoAxesCombined size={30} strokeWidth={1}/><strong>Every market starts somewhere.</strong><p>Verified sales will appear here when trading is connected.</p></div>;
  const values = points.map(point=>BigInt(point.price.amount));
  const min = values.reduce((a,b)=>a<b?a:b), max = values.reduce((a,b)=>a>b?a:b);
  const spread = max-min || BigInt(1);
  const start = Date.parse(points[0].timestamp), end = Date.parse(points[points.length-1].timestamp);
  const coordinates = points.map((point,index)=>({x:40+(end===start?0.5:(Date.parse(point.timestamp)-start)/(end-start))*600,y:180-Number((values[index]-min)*BigInt(130000)/spread)/1000}));
  const line = coordinates.map((point,index)=>`${index?'L':'M'} ${point.x} ${point.y}`).join(' ');
  const area = `${line} L ${coordinates[coordinates.length-1].x} 210 L ${coordinates[0].x} 210 Z`;
  return <div className={styles.chart}>
    {sample&&<span className={styles.chartWatermark}>SAMPLE DATA</span>}
    <div className={styles.chartScale}><span>{formatMoney({amount:max.toString(),currency:points[0].price.currency})}</span><span>{formatMoney({amount:min.toString(),currency:points[0].price.currency})}</span></div>
    <svg viewBox="0 0 680 240" role="img" aria-label={sample?'Sample price chart. Illustrative values, not actual sales.':'Price chart of verified completed trades'}>
      <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff6434" stopOpacity=".22"/><stop offset="100%" stopColor="#ff6434" stopOpacity="0"/></linearGradient></defs>
      {[50,130,210].map(y=><line key={y} x1="40" x2="640" y1={y} y2={y} className={styles.gridLine}/>)}
      <path d={area} fill={`url(#${gradientId})`}/><path d={line} fill="none" stroke="#ff743d" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
      {coordinates.length===1&&<circle cx={coordinates[0].x} cy={coordinates[0].y} r="3" fill="#ff743d"/>}
    </svg>
    <div className={styles.chartDates}><span>{dateLabel(points[0].timestamp)}</span><span>{dateLabel(points[points.length-1].timestamp)}</span></div>
  </div>;
}

function TradeControls({target,snapshot,context,variantName,previewPriceCents,now,demo}:{target:MarketTarget;snapshot:MarketSnapshot;context:TradingContext;variantName:string;previewPriceCents?:number|null;now:number;demo?:DemoMarket}) {
  const [side,setSide] = useState<'buy'|'sell'>('buy');
  const [draftOpen,setDraftOpen] = useState(false);
  const [amount,setAmount] = useState('');
  const [draft,setDraft] = useState<CurrencyPreviewDraft|null>(null);
  const [paymentCurrency,setPaymentCurrency] = useState<PreviewCurrency>('USD');
  const [error,setError] = useState('');
  const [previewOpen,setPreviewOpen] = useState(false);
  const stats = demo??marketStats(snapshot,now);
  const currency:PreviewCurrency = side==='sell'?'WILD':paymentCurrency;
  const displayPrice = side==='buy'?stats.lowestAsk:stats.highestBid;
  const previewAmount = demo?usdCentsToPreviewMoney((side==='buy'?demo.lowestAsk:demo.highestBid).amount,currency):null;
  const gate = actionEligibility(side,snapshot,context,now);
  const inputId = useId();
  function saveDraft(event:React.FormEvent) {
    event.preventDefault();
    try {setDraft(makeCurrencyPreviewDraft(side==='buy'?'bid':'list',target,amount,currency));setError('');}
    catch(error){setDraft(null);setError(error instanceof Error?error.message:'Check the amount.');}
  }
  return <aside className={styles.trade} aria-label="Buy or sell this item">
    <div className={styles.tradeTabs} role="tablist" aria-label="Trade direction">
      {(['buy','sell'] as const).map(value=><button key={value} role="tab" aria-selected={side===value} onClick={()=>{setSide(value);setAmount('');setDraftOpen(false);setDraft(null);setPreviewOpen(false);setError('');}}>{value==='buy'?'Buy / Bid':'Sell / List'}</button>)}
    </div>
    <div className={styles.tradeBody}>
      <p className={styles.eyebrow}>{side==='buy'?'Lowest ask':'Highest bid'}</p>
      <div className={styles.tradePrice}>{formatMoney(displayPrice)}</div>
      {demo&&displayPrice&&<DemoWildPriceQuote usdCents={displayPrice.amount}/>}
      <p className={styles.selectedFinish}>{variantName}</p>
      {side==='buy'?<fieldset className={styles.currencyChoice}><legend>Payment currency</legend>{(['USD','WILD'] as const).map(value=><button type="button" key={value} aria-pressed={currency===value} onClick={()=>{setPaymentCurrency(value);setAmount('');setDraft(null);setError('');}}>{value}</button>)}</fieldset>:<p className={styles.currencyPolicy}>Listings are priced in WILD.</p>}
      <p className={styles.conversionNote}>{DEMO_WILD_RATE.label}</p>
      <button type="button" className={styles.tradeAction} disabled={!demo} aria-expanded={demo?previewOpen:undefined} onClick={()=>{setPreviewOpen(!previewOpen);setDraftOpen(false);}}>{demo?(side==='buy'?'Review purchase':'Review sale'):(side==='buy'?'Buy now':'Sell now')}<ArrowUpRight size={16}/></button>
      <button type="button" className={styles.draftAction} aria-expanded={draftOpen} onClick={()=>{setDraftOpen(!draftOpen);setPreviewOpen(false);setError('');}}>{side==='buy'?'Draft a bid':'Draft a listing'}</button>
      {previewOpen&&previewAmount&&<div className={styles.transactionPreview} role="status"><strong>{side==='buy'?'Sample purchase':'Sample sale'}</strong><dl><div><dt>Item</dt><dd>{variantName}</dd></div><div><dt>Quantity</dt><dd>1</dd></div><div><dt>{side==='buy'?'Example ask':'Example bid'}</dt><dd>{formatPreviewMoney(previewAmount)}</dd></div></dl><FeePreview amount={previewAmount} side={side}/><p>Simulation only. No payment or ownership transfer.</p><button type="button" onClick={()=>setPreviewOpen(false)}>Close</button></div>}
      <p className={styles.actionNote}>1% seller marketplace fee · No buyer marketplace fee.</p>
      {!draftOpen&&<p className={styles.actionNote}><LockKeyhole size={12}/>{demo?'Sample data · No funds or items move.':'Trading is coming soon.'}</p>}
      {draftOpen&&<form className={styles.draftForm} onSubmit={saveDraft}>
        <label htmlFor={inputId}>Your {side==='buy'?'bid':'asking price'} <span>{currency}</span></label>
        <input id={inputId} inputMode="decimal" autoComplete="off" placeholder="Enter amount" value={amount} onChange={event=>{setAmount(event.target.value);setDraft(null);setError('');}} aria-invalid={Boolean(error)}/>
        <p className={styles.actionNote}>Local draft for this finish only. It is not submitted or visible to buyers or sellers.</p>
        {error&&<p className={styles.formError} role="alert">{error}</p>}
        <button className={styles.saveDraft} type="submit">Save draft</button>
        {draft&&<p className={styles.draftSaved} role="status">Draft saved in this view: {formatPreviewMoney(draft.amount)}.{draft.amount.currency==='WILD'?` Approx. ${formatPreviewMoney(previewUsdEquivalent(draft.amount))} at the sample rate.`:''} No order was placed.</p>}
        {draft&&<FeePreview amount={draft.amount} side={side}/>}
      </form>}
      <details className={styles.requirements}><summary>{demo?'About this market':'Before you can trade'}</summary>{demo?<p>Prices, counterparties and sales are fictional examples for this selected item. They do not establish its value, supply or your ownership. Live trading will require verified market data and wallet settlement.</p>:<ul>{[...gate.reasons,'Order submission and final confirmation must be connected.'].map(reason=><li key={reason}>{reason}</li>)}</ul>}</details>
      {typeof previewPriceCents==='number'&&Number.isSafeInteger(previewPriceCents)&&previewPriceCents>=0&&<p className={styles.referencePrice}>Store price <strong>{formatMoney({amount:String(previewPriceCents),currency:USD})}</strong><span>Separate from resale asks and bids.</span></p>}
    </div>
  </aside>;
}

export default function ProductMarketPanel({productId,variantId,variantName,previewPriceCents,variants,onVariantSelect,identity,adapter=unconfiguredMarketAdapter,tradingContext=unknownContext}:ProductMarketPanelProps) {
  const identityKey = identity ? JSON.stringify(identity) : '';
  const target = useMemo<MarketTarget>(()=>({productId,variantId,...(identity?{identity}:{} )}),[productId,variantId,identityKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const key = marketTargetKey(target);
  const marketVariants=useMemo(()=>uniqueMarketVariants(variants??[]),[variants]);
  const hasOverview=marketVariants.length>1;
  const [scopeState,setScopeState]=useState<{key:string;scope:'all'|'selected'}>(()=>({key,scope:hasOverview?'all':'selected'}));
  const scope=hasOverview&&scopeState.key===key?scopeState.scope:'selected';
  const [snapshot,setSnapshot] = useState<MarketSnapshot>(()=>emptyMarket(target));
  const [loading,setLoading] = useState(false);
  const [sample,setSample] = useState(adapter===unconfiguredMarketAdapter);
  const [range,setRange] = useState<MarketRange>('1M');
  const [detailTab,setDetailTab] = useState<'orders'|'trades'>('orders');
  const [now,setNow] = useState(()=>Date.now());
  const [demoEpoch] = useState(()=>Date.now());
  // Fictional markets are stable at product/version scope; live target keys
  // continue to include the exact approved token identity above.
  const demo = useMemo(()=>createDemoMarket({productId,variantId},previewPriceCents,demoEpoch),[productId,variantId,previewPriceCents,demoEpoch]);
  useEffect(()=>{
    const controller = new AbortController();
    setLoading(true);setSnapshot(emptyMarket(target));setRange('1M');setDetailTab('orders');
    adapter.read(target,controller.signal).then(value=>{if(!controller.signal.aborted){setNow(Date.now());setSnapshot(validateSnapshot(value,target));}}).catch(()=>{if(!controller.signal.aborted)setSnapshot({...emptyMarket(target),status:'unavailable',message:'Market data is temporarily unavailable. Please try again later.'});}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[adapter,key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{
    if(snapshot.status!=='live'||sample)return;
    let timer:ReturnType<typeof setTimeout>;
    const tick=()=>{
      const currentTime=Date.now();setNow(currentTime);
      const deadlines=snapshot.orders.flatMap(order=>[Date.parse(order.checkedAt)+MAX_QUOTE_AGE_MS+1,Date.parse(order.expiresAt)]).filter(time=>time>currentTime);
      timer=setTimeout(tick,Math.min(30_000,...deadlines.map(time=>time-currentTime)));
    };
    tick();return()=>clearTimeout(timer);
  },[snapshot,sample]);
  const current = marketTargetKey(snapshot.target)===key?snapshot:emptyMarket(target);
  const display:MarketSnapshot = sample?{...emptyMarket(target),status:'sample',message:'Demonstration only. These are not actual prices or sales.'}:current;
  const stats = marketStats(current,now);
  const displayStats = sample?demo:stats;
  const points = sample?demoChartPoints(demo,range,demoEpoch):tradeChartPoints(current,range,now);
  const titleId = useId();
  const scopeId=useId();
  const overviewDemo=sample&&adapter===unconfiguredMarketAdapter;
  function selectOverviewVariant(id:string) {
    if (!onVariantSelect || !marketVariants.some(variant=>variant.id===id)) return;
    setScopeState({key,scope:'selected'});setRange('1M');setDetailTab('orders');
    onVariantSelect(id);
  }
  return <section className={styles.panel} aria-labelledby={titleId} data-market-key={key} data-market-mode={display.status}>
    <header className={styles.header}><div><p className={styles.eyebrow}>The marketplace</p><h2 id={titleId}>Make your move.</h2><p className={styles.subheading}>{scope==='all'?'All versions':variantName} <span>·</span> Market activity</p></div><button className={styles.sampleToggle} aria-pressed={sample} onClick={()=>setSample(!sample)}>{sample?'View live data':'View sample data'}<ArrowUpRight size={14}/></button></header>
    {hasOverview&&<div className={styles.scopeTabs} role="tablist" aria-label="Market scope">{(['all','selected'] as const).map(value=><button type="button" key={value} id={`${scopeId}-${value}`} role="tab" aria-selected={scope===value} aria-controls={`${scopeId}-panel`} onClick={()=>setScopeState({key,scope:value})}>{value==='all'?'All versions':'Selected version'}{value==='all'&&<span>{marketVariants.length}</span>}</button>)}</div>}
    {(scope==='all'?overviewDemo:sample)?<div className={styles.sampleBanner} role="status"><strong>SAMPLE DATA</strong><span>Illustrative prices and activity. Trading is not live.</span></div>:<p className={styles.marketStatus} role="status">{scope==='all'?'Awaiting verified market feeds for every version.':loading?'Checking market availability…':current.status==='live'?`Market data from ${current.provider} · Updated ${current.asOf?dateLabel(current.asOf):'—'}`:current.message}</p>}
    <div id={`${scopeId}-panel`} role={hasOverview?'tabpanel':undefined} aria-labelledby={hasOverview?`${scopeId}-${scope}`:undefined}>
    {scope==='all'?<MarketOverview productId={productId} selectedVariantId={variantId} variants={marketVariants} demo={overviewDemo} demoEpoch={demoEpoch} onVariantSelect={onVariantSelect?selectOverviewVariant:undefined}/>:<div className={styles.body}>
      <div className={styles.activity}>
        <dl className={styles.stats}>{[['Lowest ask',displayStats.lowestAsk],['Highest bid',displayStats.highestBid],['Last sale',displayStats.lastSale],[sample?'Volume · 30 days':stats.volumeWindow?`Volume · ${dateLabel(stats.volumeWindow.from)}–${dateLabel(stats.volumeWindow.to)}`:'Recorded volume',displayStats.volume]].map(([label,money])=><div key={String(label)}><dt>{String(label)}</dt><dd>{formatMoney(money as typeof stats.lastSale)}</dd></div>)}</dl>
        {sample&&<div className={styles.marketSummary}><span className={demo.changePercent>=0?styles.positive:styles.negative}>{demo.changePercent>=0?'+':''}{demo.changePercent.toFixed(1)}% <span>past month</span></span><span>{demo.salesCount} example sales · 30 days</span></div>}
        <div className={styles.chartHeading}><h3>Price history</h3><div className={styles.ranges} aria-label="Chart date range">{MARKET_RANGES.map(value=><button key={value} aria-pressed={range===value} onClick={()=>setRange(value)}>{value}</button>)}</div></div>
        <PriceChart points={points} sample={sample}/>
        <div className={styles.detailTabs} role="tablist" aria-label="Market activity detail"><button role="tab" aria-selected={detailTab==='orders'} onClick={()=>setDetailTab('orders')}>Order book</button><button role="tab" aria-selected={detailTab==='trades'} onClick={()=>setDetailTab('trades')}>Trade history</button></div>
        {detailTab==='orders'?<div className={styles.orderBook}>
          {sample?[{label:'Asks',rows:demo.asks},{label:'Bids',rows:demo.bids}].map(group=><div key={group.label}><div className={styles.bookHeader}><span>{group.label} · Demo</span><span>Price / Qty</span></div>{group.rows.map(order=><div key={order.id} className={styles.bookRow}><span>{order.label}</span><strong>{formatMoney(order.price)} <small>× {order.quantity}</small></strong></div>)}</div>):[{label:'Asks',rows:stats.asks},{label:'Bids',rows:stats.bids}].map(group=><div key={group.label}><div className={styles.bookHeader}><span>{group.label}</span><span>Price</span></div>{group.rows.length?group.rows.slice(0,5).map(order=><div key={order.id} className={styles.bookRow}><span title={order.maker}>{shortAddress(order.maker)}</span><strong>{formatMoney(order.price)}</strong></div>):<p className={styles.bookEmpty}>{current.status==='live'?`No current ${group.label.toLowerCase()}`:'Awaiting live market data'}</p>}</div>)}
        </div>:sample?<div className={styles.historyWrap}><table className={styles.history}><caption className={styles.tableCaption}>Illustrative sales · No blockchain transactions</caption><thead><tr><th>Date</th><th>Price</th><th>Qty</th><th>Record</th></tr></thead><tbody>{[...demo.sales].reverse().slice(0,10).map((sale,index)=><tr key={sale.id}><td>{dateLabel(sale.timestamp)} <span className={styles.time}>{new Date(sale.timestamp).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'UTC'})} UTC</span></td><td>{formatMoney(sale.price)}</td><td>{sale.quantity}</td><td>Demo sale {String(index+1).padStart(2,'0')}</td></tr>)}</tbody></table></div>:stats.trades.length?<div className={styles.historyWrap}><table className={styles.history}><thead><tr><th>Date</th><th>Price</th><th>Qty</th><th>Transaction</th></tr></thead><tbody>{stats.trades.slice(0,10).map(trade=><tr key={`${trade.chainId}:${trade.txHash}:${trade.logIndex}`}><td>{dateLabel(trade.timestamp)}</td><td>{formatMoney(trade.price)}</td><td>{trade.quantity}</td><td><span title={`${trade.txHash} · ${trade.provider}`}>{shortAddress(trade.txHash)}</span></td></tr>)}</tbody></table></div>:<div className={styles.historyEmpty}><strong>No verified trade history yet.</strong><p>Completed sales will show their date, price and transaction here.</p></div>}
      </div>
      <TradeControls key={`${key}:${sample}`} target={target} snapshot={display} context={tradingContext} variantName={variantName} previewPriceCents={previewPriceCents} now={now} demo={sample?demo:undefined}/>
    </div>}
    </div>
  </section>;
}
