import {render,screen} from '@testing-library/react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {WILD_PRICE_ID} from '@/lib/wild-price';
import {parseWildRate} from '@/lib/wild-price.server';
import WildPriceQuote from './WildPriceQuote';
import LocalCurrencyPrice from './LocalCurrencyPrice';
import {useWildUsdRate} from './useWildUsdRate';
vi.mock('./useWildUsdRate',async importOriginal=>({...await importOriginal<typeof import('./useWildUsdRate')>(),useWildUsdRate:vi.fn()}));
const now=Date.parse('2026-11-08T12:00:00Z');
const rate=(price=.05)=>parseWildRate({coins:{['ethereum:'+WILD_PRICE_ID.contract]:{price,timestamp:now/1000,symbol:'WILD',decimals:18,confidence:.99}}},'defillama',now)!;
beforeEach(()=>vi.mocked(useWildUsdRate).mockClear().mockReturnValue({status:'fresh',rate:rate()}));
describe('USD anchored catalog and native WILD asks',()=>{
  it('keeps compact card quotes concise with rate details in the accessible tooltip',()=>{
    vi.mocked(useWildUsdRate).mockReturnValue({status:'stale',rate:rate()});
    const {rerender}=render(<WildPriceQuote usdCents={1200} compact/>);
    const quote=screen.getByText('≈ 240 WILD');
    expect(quote.textContent).toBe('≈ 240 WILD');
    expect(quote.getAttribute('title')).toContain('Last available rate');
    expect(quote.getAttribute('aria-label')).toContain('Not a payment quote');
    vi.mocked(useWildUsdRate).mockReturnValue({status:'unavailable',rate:null});
    rerender(<WildPriceQuote usdCents={1200} compact/>);
    expect(screen.queryByText(/WILD/)).toBeNull();
  });
  it('updates the small WILD equivalent without changing the source dollar price',()=>{
    const {rerender}=render(<><strong>$12</strong><WildPriceQuote usdCents={1200}/></>);expect(screen.getByText(/240 WILD/).tagName).toBe('SMALL');expect(screen.getByText(/Updated 12:00 UTC/)).toBeTruthy();
    vi.mocked(useWildUsdRate).mockReturnValue({status:'fresh',rate:rate(.04)});rerender(<><strong>$12</strong><WildPriceQuote usdCents={1200}/></>);expect(screen.getByText(/300 WILD/)).toBeTruthy();expect(screen.getByText('$12')).toBeTruthy();expect(screen.queryByText(/Demo rate/)).toBeNull();
  });
  it('keeps the native ask fixed while its indicative dollar price changes',()=>{
    const {rerender}=render(<LocalCurrencyPrice amountAtomic="240000000000000000000" currency="WILD"/>);expect(screen.getByText('≈ $12.00')).toBeTruthy();expect(screen.getByText(/240 WILD/)).toBeTruthy();
    vi.mocked(useWildUsdRate).mockReturnValue({status:'fresh',rate:rate(.04)});rerender(<LocalCurrencyPrice amountAtomic="240000000000000000000" currency="WILD"/>);expect(screen.getByText('≈ $9.60')).toBeTruthy();expect(screen.getByText(/240 WILD/)).toBeTruthy();
  });
  it('fails closed without hiding native prices and identifies stale source time',()=>{
    vi.mocked(useWildUsdRate).mockReturnValue({status:'unavailable',rate:null});const {rerender}=render(<><WildPriceQuote usdCents={1200}/><LocalCurrencyPrice amountAtomic="240000000000000000000" currency="WILD"/></>);
    expect(screen.getByText('WILD rate unavailable')).toBeTruthy();expect(screen.getByText('USD estimate unavailable')).toBeTruthy();expect(screen.getByText('240 WILD').tagName).toBe('STRONG');expect(screen.queryByText(/\$/)).toBeNull();
    vi.mocked(useWildUsdRate).mockReturnValue({status:'stale',rate:rate()});rerender(<WildPriceQuote usdCents={1200}/>);expect(screen.getByText(/Last rate 12:00 UTC · stale/)).toBeTruthy();
  });
  it('does not convert historical USD listing terms',()=>{
    render(<LocalCurrencyPrice amountAtomic="1200" currency="USD"/>);expect(screen.getByText('$12.00')).toBeTruthy();expect(screen.getByText('Legacy USD terms')).toBeTruthy();expect(useWildUsdRate).not.toHaveBeenCalled();
  });
});
