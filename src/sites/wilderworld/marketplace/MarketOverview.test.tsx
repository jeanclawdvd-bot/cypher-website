import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {useState} from 'react';
import MarketOverview, {summarizeDemoMarkets, uniqueMarketVariants} from './MarketOverview';
import ProductMarketPanel from './ProductMarketPanel';
import {createDemoMarket} from './demo-market';
import {emptyMarket,marketTargetKey,USD,type MarketReadAdapter} from './market-data';

const epoch=Date.parse('2026-11-08T12:00:00Z');
const variants=[{id:'silver',name:'Silver',previewPriceCents:1200},{id:'gold',name:'Gold',previewPriceCents:2400}];
afterEach(()=>{cleanup();vi.useRealTimers();});

describe('all-version demo market summary',()=>{
  it('totals exact sample sales within one 30-day window, never averages prices into a chart',()=>{
    const markets=variants.map(variant=>createDemoMarket({productId:'item',variantId:variant.id},variant.previewPriceCents,epoch));
    const summary=summarizeDemoMarkets(markets,epoch)!;
    const sales=markets.flatMap(market=>market.sales).filter(sale=>Date.parse(sale.timestamp)>=epoch-30*86_400_000&&Date.parse(sale.timestamp)<=epoch);
    expect(summary.volume.amount).toBe(sales.reduce((total,sale)=>total+BigInt(sale.price.amount)*BigInt(sale.quantity),BigInt(0)).toString());
    expect(summary.salesCount).toBe(sales.length);
    expect(summary.unitsSold).toBe(sales.reduce((total,sale)=>total+sale.quantity,0));
    expect(summary.minimumAsk.amount).toBe(markets.map(market=>market.lowestAsk.amount).sort((a,b)=>Number(BigInt(a)-BigInt(b)))[0]);
    expect(summary.maximumAsk.amount).toBe(markets.map(market=>market.lowestAsk.amount).sort((a,b)=>Number(BigInt(b)-BigInt(a)))[0]);
    render(<MarketOverview productId="item" variants={variants} selectedVariantId="silver" demo demoEpoch={epoch}/>);
    expect(screen.getByText(/Sample data · Combined activity/)).toBeTruthy();
    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.queryByRole('img',{name:/price chart/i})).toBeNull();
    expect(screen.getByText(/Price histories stay separate/)).toBeTruthy();
  });
  it('rejects mixed currencies and repeated target markets instead of inflating totals',()=>{
    const a=createDemoMarket({productId:'item',variantId:'silver'},1200,epoch);
    const b=createDemoMarket({productId:'item',variantId:'gold'},2400,epoch);
    expect(()=>summarizeDemoMarkets([a,a],epoch)).toThrow(/distinct demo/);
    expect(()=>summarizeDemoMarkets([a,{...b,volume:{...b.volume,currency:{...USD,symbol:'EUR'}}}],epoch)).toThrow(/currencies/);
    expect(()=>summarizeDemoMarkets([a,{...b,sales:[{...b.sales[0],price:{...b.sales[0].price,currency:{...USD,symbol:'EUR'}}}]}],epoch)).toThrow(/currencies/);
    expect(uniqueMarketVariants([...variants,variants[0],{id:' ',name:'Bad'}])).toEqual(variants);
    expect(summarizeDemoMarkets([],epoch)).toBeNull();
  });
  it('keeps connected overview quantities blank until per-version feeds are verified',()=>{
    render(<MarketOverview productId="item" variants={variants} selectedVariantId="silver" demo={false} demoEpoch={epoch}/>);
    expect(screen.getByText('All-version market data is not connected yet.')).toBeTruthy();
    expect(screen.queryByText('Combined volume · 30 days')).toBeNull();
    expect(screen.queryByText(/Sample data · Combined activity/)).toBeNull();
    expect(screen.getAllByText('—')).toHaveLength(6);
  });
});

describe('product market scope selection',()=>{
  it('opens a chosen version, clears drafts across scope changes, and resets activity on another version',async()=>{
    function Harness(){
      const [selected,setSelected]=useState(variants[0]);
      return <ProductMarketPanel productId="item" variantId={selected.id} variantName={selected.name} previewPriceCents={selected.previewPriceCents} variants={variants} onVariantSelect={id=>setSelected(variants.find(variant=>variant.id===id)!)}/>;
    }
    render(<Harness/>);
    expect(screen.getByRole('tab',{name:/All versions/})).toHaveAttribute('aria-selected','true');
    expect(screen.queryByRole('button',{name:'Review purchase'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'View Gold market'}));
    expect(screen.getByRole('tab',{name:'Selected version'})).toHaveAttribute('aria-selected','true');
    expect(screen.getByRole('region',{name:'Make your move.'})).toHaveAttribute('data-market-key',marketTargetKey({productId:'item',variantId:'gold'}));
    fireEvent.click(screen.getByRole('button',{name:'Draft a bid'}));
    fireEvent.change(screen.getByLabelText(/Your bid/),{target:{value:'25'}});
    fireEvent.click(screen.getByRole('button',{name:'Save draft'}));
    expect(screen.getByText(/No order was placed/)).toBeTruthy();
    fireEvent.click(screen.getByRole('tab',{name:/All versions/}));
    fireEvent.click(screen.getByRole('tab',{name:'Selected version'}));
    expect(screen.queryByText(/No order was placed/)).toBeNull();
    expect(screen.queryByLabelText(/Your bid/)).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'1Y'}));
    fireEvent.click(screen.getByRole('tab',{name:'Trade history'}));
    fireEvent.click(screen.getByRole('tab',{name:/All versions/}));
    fireEvent.click(screen.getByRole('button',{name:'View Silver market'}));
    await waitFor(()=>expect(screen.getByRole('button',{name:'1M'})).toHaveAttribute('aria-pressed','true'));
    expect(screen.getByRole('tab',{name:'Order book'})).toHaveAttribute('aria-selected','true');
    expect(screen.getByRole('region',{name:'Make your move.'})).toHaveAttribute('data-market-key',marketTargetKey({productId:'item',variantId:'silver'}));
  });
  it('does not fabricate an all-version aggregate for a configured adapter, even in manual demo mode',async()=>{
    const adapter:MarketReadAdapter={id:'connected-test',read:vi.fn(async target=>emptyMarket(target))};
    await act(async()=>{render(<ProductMarketPanel productId="item" variantId="silver" variantName="Silver" variants={variants} adapter={adapter}/>);});
    expect(screen.getByText('All-version market data is not connected yet.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'View sample data'}));
    expect(screen.queryByText('Combined volume · 30 days')).toBeNull();
    expect(screen.queryByText(/Sample data · Combined activity/)).toBeNull();
    expect(screen.queryByRole('button',{name:'Review purchase'})).toBeNull();
  });
  it('preserves exact onchain target identity when switching out of an overview',async()=>{
    const identity={chainId:9369,contract:'0x'+'12'.repeat(20),tokenId:'123'};
    const adapter:MarketReadAdapter={id:'identity-test',read:vi.fn(async target=>emptyMarket(target))};
    await act(async()=>{render(<ProductMarketPanel productId="item" variantId="silver" variantName="Silver" identity={identity} variants={variants} adapter={adapter}/>);});
    fireEvent.click(screen.getByRole('tab',{name:'Selected version'}));
    expect(screen.getByRole('region',{name:'Make your move.'})).toHaveAttribute('data-market-key',marketTargetKey({productId:'item',variantId:'silver',identity}));
    expect(adapter.read).toHaveBeenCalledWith({productId:'item',variantId:'silver',identity},expect.any(AbortSignal));
    expect(within(screen.getByRole('complementary',{name:'Buy or sell this item'})).getByRole('button',{name:'Buy now'})).toBeDisabled();
  });
});
