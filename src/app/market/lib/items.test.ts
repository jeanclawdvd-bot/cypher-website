import { describe, expect, it } from 'vitest';
import type { MarketNft } from '@/lib/opensea';
import {
  countSelectedTraits,
  dedupeItems,
  filterByTraits,
  itemKey,
  shortId,
  searchLoadedItems,
  configuredTokenIdentity,
} from './items';

function nft(overrides: Partial<MarketNft> = {}): MarketNft {
  return {
    identifier: '1',
    name: 'Token 1',
    image: null,
    collectionSlug: 'wilder',
    contract: '0xabc',
    chain: 'ethereum',
    priceEth: null,
    traits: [],
    ...overrides,
  };
}

describe('itemKey', () => {
  it('combines normalized chain, contract and identifier', () => {
    expect(itemKey(nft({ contract: '0xDeF', identifier: '9' }))).toBe('ethereum:0xdef:9');
  });
});

describe('configured token market identity', () => {
  const wheels = nft({collectionSlug:'wilderworld',contract:'0xc2e9678A71e50E5AeD036e00e9c5caeb1aC5987D'});
  it('retains a uint256 identifier with the configured chain and collection', () => {
    const identifier=(BigInt(2)**BigInt(256)-BigInt(1)).toString();
    expect(configuredTokenIdentity({...wheels,identifier})).toEqual({chainId:1,contract:wheels.contract,tokenId:identifier});
  });
  it('refuses mismatched collections, chains, overflow and concept identifiers', () => {
    expect(configuredTokenIdentity({...wheels,chain:'zchain'})).toBeUndefined();
    expect(configuredTokenIdentity({...wheels,contract:'0x0000000000000000000000000000000000000001'})).toBeUndefined();
    expect(configuredTokenIdentity({...wheels,identifier:(BigInt(2)**BigInt(256)).toString()})).toBeUndefined();
    expect(configuredTokenIdentity({...wheels,identifier:'MAT-rim-chrome'})).toBeUndefined();
  });
});

describe('shortId', () => {
  it('returns short ids unchanged', () => {
    expect(shortId('12345')).toBe('12345');
  });

  it('collapses the middle of long ids', () => {
    expect(shortId('123456789012345')).toBe('123456…2345');
  });
});

describe('dedupeItems', () => {
  it('retains same token/contract on different chains and merges contract casing', () => {
    expect(dedupeItems([nft(), nft({chain:'zchain'}), nft({contract:'0xABC'})])).toHaveLength(2);
  });
  it('keeps the first occurrence of each token', () => {
    const list = [
      nft({ identifier: '1' }),
      nft({ identifier: '1' }),
      nft({ identifier: '2' }),
    ];
    const out = dedupeItems(list);
    expect(out).toHaveLength(2);
    expect(out.map((n) => n.identifier)).toEqual(['1', '2']);
  });
});

describe('searchLoadedItems', () => {
  it('matches all words across names, exact token text and trait values without inventing unloaded results', () => {
    const loaded = [nft({name:'Wilder Wheels',identifier:'8822',traits:[{type:'Finish',value:'Chrome'}]}), nft({name:'Wilder Wheels',identifier:'22'})];
    expect(searchLoadedItems(loaded,'WHEELS chrome')).toEqual([loaded[0]]);
    expect(searchLoadedItems(loaded,'8822')).toEqual([loaded[0]]);
    expect(searchLoadedItems(loaded,'gold')).toEqual([]);
    expect(searchLoadedItems(loaded,'   ')).toHaveLength(2);
  });
});

describe('filterByTraits', () => {
  const items = [
    nft({ identifier: '1', traits: [{ type: 'Color', value: 'Red' }] }),
    nft({ identifier: '2', traits: [{ type: 'Color', value: 'Blue' }] }),
    nft({
      identifier: '3',
      traits: [
        { type: 'Color', value: 'Red' },
        { type: 'Size', value: 'Large' },
      ],
    }),
  ];

  it('returns all items when nothing selected', () => {
    expect(filterByTraits(items, {})).toHaveLength(3);
  });

  it('applies OR within a single trait type', () => {
    const out = filterByTraits(items, { Color: ['Red', 'Blue'] });
    expect(out.map((n) => n.identifier)).toEqual(['1', '2', '3']);
  });

  it('applies AND across trait types', () => {
    const out = filterByTraits(items, { Color: ['Red'], Size: ['Large'] });
    expect(out.map((n) => n.identifier)).toEqual(['3']);
  });
});

describe('countSelectedTraits', () => {
  it('sums selected values across types', () => {
    expect(countSelectedTraits({ Color: ['Red', 'Blue'], Size: ['Large'] })).toBe(3);
  });
});
