import {describe,expect,it} from 'vitest';
import {createDemoMarket,demoChartPoints} from './demo-market';
import {actionEligibility,emptyMarket,marketTargetKey,validateSnapshot} from './market-data';
const target={productId:'test-product',variantId:'test-color'};
const now=Date.parse('2026-11-07T12:34:00Z');
describe('explicit demonstration market',()=>{
  it('keeps fixtures stable for an exact variant and varies between variants',()=>{
    const demo=createDemoMarket(target,1200,now);
    expect(createDemoMarket(target,1200,now)).toEqual(demo);
    expect(createDemoMarket({...target,variantId:'another-color'},1200,now).points).not.toEqual(demo.points);
    expect(demo.targetKey).toBe(marketTargetKey(target));
    expect(demo.asks).toHaveLength(5);expect(demo.bids).toHaveLength(5);
    expect(BigInt(demo.lowestAsk.amount)).toBeGreaterThan(BigInt(demo.highestBid.amount));
  });
  it('shows useful range-specific histories without future sales or fake transactions',()=>{
    const demo=createDemoMarket(target,null,now);
    const month=demoChartPoints(demo,'1M',now),year=demoChartPoints(demo,'1Y',now);
    expect(month.length).toBeGreaterThan(20);expect(year.length).toBeGreaterThan(month.length);
    expect(demo.points.every(point=>point.source==='sample'&&Date.parse(point.timestamp)<=now)).toBe(true);
    expect(demo.sales.every(sale=>sale.kind==='demo_sale'&&!('txHash' in sale))).toBe(true);
    expect(demo.asks.every(order=>order.kind==='demo_order'&&!('maker' in order))).toBe(true);
    const volume=demo.sales.filter(sale=>Date.parse(sale.timestamp)>=now-30*86400000).reduce((total,sale)=>total+BigInt(sale.price.amount)*BigInt(sale.quantity),BigInt(0));
    expect(demo.volume.amount).toBe(volume.toString());
  });
  it('cannot populate verified trading or acquire settlement permission',()=>{
    const demo=createDemoMarket(target,1200,now);
    const empty={...emptyMarket(target),status:'sample' as const};
    expect(actionEligibility('buy',empty,{ownership:'verified',usage:'unlocked'},now).canPrepare).toBe(false);
    expect(actionEligibility('sell',empty,{ownership:'verified',usage:'unlocked'},now).canSubmit).toBe(false);
    expect(()=>validateSnapshot({...empty,orders:demo.asks as never},target,now)).toThrow(/Non-live/);
  });
});
