import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,describe,expect,it} from 'vitest';
import {DEMO_WILD_RATE,formatPreviewMoney,makeCurrencyPreviewDraft,parsePreviewMoney,previewUsdEquivalent,usdCentsToPreviewMoney} from './preview-currency';
import DemoWildPriceQuote from './DemoWildPriceQuote';

afterEach(cleanup);
describe('explicit demo currency conversion',()=>{
  it('converts USD cents at the named fixture rate, never by relabelling dollars as WILD',()=>{
    const wild=usdCentsToPreviewMoney(1200,'WILD');
    expect(formatPreviewMoney(wild)).toBe('120 WILD');
    expect(wild.amount).toBe('120000000000000000000');
    expect(formatPreviewMoney(previewUsdEquivalent(wild))).toBe('$12.00');
    expect(wild).not.toHaveProperty('chainId');
    expect(wild).not.toHaveProperty('contract');
  });
  it('preserves exact token amounts while displaying whole WILD and cent-precision USD',()=>{
    const wild=parsePreviewMoney('123456789012345678.123456789012345678','WILD');
    expect(wild.amount).toBe('123456789012345678123456789012345678');
    expect(formatPreviewMoney(wild)).toBe('123,456,789,012,345,678 WILD');
    expect(formatPreviewMoney(previewUsdEquivalent(parsePreviewMoney('0.15','WILD')))).toBe('$0.02');
    expect(()=>parsePreviewMoney('1.0000000000000000001','WILD')).toThrow();
    expect(()=>parsePreviewMoney('1.001','USD')).toThrow();
  });
  it('rejects nonpositive, malformed and unsafe source amounts',()=>{
    for(const value of ['0','-1','1e3','1,000','NaN']) expect(()=>parsePreviewMoney(value,'WILD')).toThrow();
    for(const value of [-1,0.1,Number.MAX_SAFE_INTEGER+1]) expect(()=>usdCentsToPreviewMoney(value,'WILD')).toThrow();
  });
  it('requires WILD for listings while supporting both bid currencies',()=>{
    const target={productId:'item',variantId:'finish'};
    expect(()=>makeCurrencyPreviewDraft('list',target,'100','USD')).toThrow('Listings must be priced in WILD');
    expect(makeCurrencyPreviewDraft('list',target,'100','WILD')).toMatchObject({kind:'demo_currency_draft',submitted:false,rateId:DEMO_WILD_RATE.id,amount:{currency:'WILD'}});
    expect(makeCurrencyPreviewDraft('bid',target,'10','USD').amount.currency).toBe('USD');
    expect(makeCurrencyPreviewDraft('bid',target,'100','WILD').amount.currency).toBe('WILD');
  });
  it('visibly identifies the small WILD equivalent as demo data',()=>{
    render(<DemoWildPriceQuote usdCents={500}/>);
    expect(screen.getByText(/50 WILD/).tagName).toBe('SMALL');
    expect(screen.getByText(/Demo rate/)).toBeTruthy();
    expect(screen.getByTitle(DEMO_WILD_RATE.label)).toBeTruthy();
  });
});
