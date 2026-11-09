'use client';

import {useMemo} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {createDemoMarket, type DemoMarket} from './demo-market';
import {currencyKey, formatMoney, validateMoney, type AtomicMoney} from './market-data';
import styles from './ProductMarketPanel.module.css';

export type MarketVariant = {id:string; name:string; previewPriceCents?:number|null};
const MONTH = 30 * 86_400_000;

/** Repeated IDs must never inflate family volume or the number of versions. */
export function uniqueMarketVariants(variants:readonly MarketVariant[]):MarketVariant[] {
  const seen = new Set<string>();
  return variants.filter(variant=>{
    if (!variant.id.trim() || !variant.name.trim() || seen.has(variant.id)) return false;
    seen.add(variant.id); return true;
  });
}

/** Presentation fixtures only: never accepts connected snapshots or converts currencies. */
export function summarizeDemoMarkets(markets:readonly DemoMarket[], now:number) {
  if (!markets.length) return null;
  if (!Number.isFinite(now)) throw new Error('A valid sample window is required');
  const expectedCurrency = currencyKey(markets[0].currency);
  const targets = new Set<string>();
  let min:AtomicMoney = markets[0].lowestAsk, max:AtomicMoney = min;
  let volume = BigInt(0), salesCount = 0, unitsSold = 0;
  for (const market of markets) {
    if (market.kind !== 'demo_market' || targets.has(market.targetKey)) throw new Error('Only distinct demo markets can be combined');
    targets.add(market.targetKey);
    if (currencyKey(market.currency) !== expectedCurrency) throw new Error('Market currencies cannot be combined');
    for (const money of [market.lowestAsk,market.highestBid,market.lastSale,market.volume]) {
      validateMoney(money);
      if (currencyKey(money.currency) !== expectedCurrency) throw new Error('Market currencies cannot be combined');
    }
    if (BigInt(market.lowestAsk.amount) < BigInt(min.amount)) min=market.lowestAsk;
    if (BigInt(market.lowestAsk.amount) > BigInt(max.amount)) max=market.lowestAsk;
    // Recompute one shared window from the sample sales, rather than adding
    // potentially different reporting windows or blending price histories.
    for (const sale of market.sales) {
      const time=Date.parse(sale.timestamp);
      if (sale.kind !== 'demo_sale' || !Number.isFinite(time) || !Number.isSafeInteger(sale.quantity) || sale.quantity<1) throw new Error('Invalid demo sale');
      validateMoney(sale.price);
      if (currencyKey(sale.price.currency) !== expectedCurrency) throw new Error('Market currencies cannot be combined');
      if (time < now-MONTH || time>now) continue;
      salesCount+=1; unitsSold+=sale.quantity;
      volume+=BigInt(sale.price.amount)*BigInt(sale.quantity);
    }
  }
  const combinedVolume={amount:volume.toString(),currency:markets[0].currency};
  validateMoney(combinedVolume);
  return {minimumAsk:min,maximumAsk:max,volume:combinedVolume,salesCount,unitsSold,versionCount:markets.length};
}

type MarketOverviewProps = {
  productId:string;
  selectedVariantId:string;
  variants:readonly MarketVariant[];
  /** True only for the unconfigured adapter's explicitly selected demo mode. */
  demo:boolean;
  demoEpoch:number;
  onVariantSelect?:(variantId:string)=>void;
};

export default function MarketOverview({productId,selectedVariantId,variants,demo,demoEpoch,onVariantSelect}:MarketOverviewProps) {
  const rows=useMemo(()=>uniqueMarketVariants(variants).map(variant=>({variant,market:demo?createDemoMarket({productId,variantId:variant.id},variant.previewPriceCents,demoEpoch):null})),[productId,variants,demo,demoEpoch]);
  const summary=useMemo(()=>demo?summarizeDemoMarkets(rows.flatMap(row=>row.market?[row.market]:[]),demoEpoch):null,[rows,demo,demoEpoch]);
  return <div className={styles.overview} aria-label="All versions market overview">
    {summary?<>
      <dl className={styles.stats}>
        <div><dt>Lowest-ask range</dt><dd>{formatMoney(summary.minimumAsk)} <span className={styles.rangeDash}>–</span> {formatMoney(summary.maximumAsk)}</dd></div>
        <div><dt>Combined volume · 30 days</dt><dd>{formatMoney(summary.volume)}</dd></div>
        <div><dt>Example sales · 30 days</dt><dd>{summary.salesCount.toLocaleString('en-US')}<small>{summary.unitsSold.toLocaleString('en-US')} units</small></dd></div>
        <div><dt>Versions compared</dt><dd>{summary.versionCount}</dd></div>
      </dl>
      <p className={styles.overviewNote}>Sample data · Combined activity across editions over 30 days.</p>
    </>:<div className={styles.overviewWaiting}><strong>All-version market data is not connected yet.</strong><p>Combined activity will appear once verified feeds are available for each version. Select a version to see its individual market.</p></div>}
    <div className={styles.historyWrap}>
      <table className={`${styles.history} ${styles.variantTable}`}>
        <caption className={styles.tableCaption}>{demo?'Illustrative prices only.':'Prices remain unavailable until verified.'} Price histories stay separate for each version.</caption>
        <thead><tr><th scope="col">Version</th><th scope="col">Lowest ask</th><th scope="col">Highest bid</th><th scope="col">Last sale</th><th scope="col"><span className={styles.visuallyHidden}>View version market</span></th></tr></thead>
        <tbody>{rows.map(({variant,market})=><tr key={variant.id} data-selected={variant.id===selectedVariantId} onClick={onVariantSelect?()=>onVariantSelect(variant.id):undefined}>
          <th scope="row"><button type="button" disabled={!onVariantSelect} onClick={event=>{event.stopPropagation();onVariantSelect?.(variant.id);}} aria-label={`View ${variant.name} market`}>{variant.name}{variant.id===selectedVariantId&&<span>Selected</span>}</button></th>
          <td>{formatMoney(market?.lowestAsk)}</td><td>{formatMoney(market?.highestBid)}</td><td>{formatMoney(market?.lastSale)}</td><td><ArrowUpRight size={15} aria-hidden="true"/></td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}
