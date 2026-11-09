import { describe, expect, it } from 'vitest';
import { marketNavigationSearch, storeMarketUrl } from './store-links';

describe('existing market store navigation', () => {
  it('preserves collection, uint256 token IDs and repeated query values through the legacy redirect', () => {
    const token = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
    const output = new URL(storeMarketUrl({c:'wilderworld',token, q:'blue & chrome', tag:['x','y'], absent:undefined}), 'https://example.test');
    expect(output.pathname).toBe('/store/market');
    expect(output.searchParams.get('token')).toBe(token);
    expect(output.searchParams.get('q')).toBe('blue & chrome');
    expect(output.searchParams.getAll('tag')).toEqual(['x','y']);
    expect(output.searchParams.has('absent')).toBe(false);
  });
  it('preserves search when selecting a new collection and drops previous-token bindings', () => {
    const next = new URLSearchParams(marketNavigationSearch('?c=old&q=blue&token=1&contract=0xabc&chain=old','packs'));
    expect(next.get('c')).toBe('packs'); expect(next.get('q')).toBe('blue');
    expect(next.has('token')).toBe(false); expect(next.has('contract')).toBe(false); expect(next.has('chain')).toBe(false);
  });
  it('encodes a modal identifier while keeping navigation on the current route', () => {
    const next=marketNavigationSearch('?q=chrome','wilderworld','9&x=1');
    expect(next.startsWith('?')).toBe(true);
    expect(new URLSearchParams(next).get('token')).toBe('9&x=1');
    expect(new URLSearchParams(next).has('x')).toBe(false);
  });
});
