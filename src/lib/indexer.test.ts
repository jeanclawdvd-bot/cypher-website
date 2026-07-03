import { describe, expect, it } from 'vitest';
import type { MarketNft } from './opensea';
import { normalizeIndexerAsset, resolveMediaUrl, type IndexerAsset } from './indexer';

function makeAsset(overrides: Partial<IndexerAsset> = {}): IndexerAsset {
  return {
    id: 'asset-1',
    collectionAddress: '0xabc123',
    collectionName: 'Test Collection',
    tokenId: '42',
    ownerAddress: '0xowner',
    chainId: 1,
    tokenStandard: 'ERC721',
    balance: '1',
    tokenUri: 'ipfs://QmMeta/42.json',
    metadata: {
      name: 'Test Token #42',
      description: 'A test token',
      image: 'ipfs://QmImage/42.png',
      attributes: [
        { trait_type: 'Background', value: 'Blue' },
        { trait_type: 'Level', value: 7 },
      ],
    },
    ...overrides,
  };
}

describe('resolveMediaUrl', () => {
  it('rewrites ipfs:// URIs to the public gateway', () => {
    expect(resolveMediaUrl('ipfs://QmCid/x.png')).toBe('https://ipfs.io/ipfs/QmCid/x.png');
  });

  it('collapses the ipfs://ipfs/ double prefix to a single /ipfs/ segment', () => {
    expect(resolveMediaUrl('ipfs://ipfs/QmCid')).toBe('https://ipfs.io/ipfs/QmCid');
  });

  it('passes https URLs through unchanged', () => {
    expect(resolveMediaUrl('https://example.com/a.png')).toBe('https://example.com/a.png');
  });

  it('passes http URLs through unchanged', () => {
    expect(resolveMediaUrl('http://example.com/a.png')).toBe('http://example.com/a.png');
  });

  it('returns null for null, undefined, and empty string', () => {
    expect(resolveMediaUrl(null)).toBeNull();
    expect(resolveMediaUrl(undefined)).toBeNull();
    expect(resolveMediaUrl('')).toBeNull();
  });

  it('returns null for non-http(s)/non-ipfs schemes', () => {
    expect(resolveMediaUrl('data:image/png;base64,AAAA')).toBeNull();
    expect(resolveMediaUrl('ar://some-id')).toBeNull();
  });
});

describe('normalizeIndexerAsset', () => {
  it('maps a fully-populated asset to the MarketNft shape', () => {
    const result: MarketNft = normalizeIndexerAsset(makeAsset(), 'test-slug', 'ethereum');
    expect(result).toEqual({
      identifier: '42',
      name: 'Test Token #42',
      image: 'https://ipfs.io/ipfs/QmImage/42.png',
      collectionSlug: 'test-slug',
      contract: '0xabc123',
      chain: 'ethereum',
      priceEth: null,
      traits: [
        { type: 'Background', value: 'Blue' },
        { type: 'Level', value: '7' },
      ],
    });
  });

  it('falls back to #<tokenId> with null image and empty traits when metadata is null', () => {
    const result = normalizeIndexerAsset(makeAsset({ metadata: null }), 'test-slug', 'ethereum');
    expect(result.name).toBe('#42');
    expect(result.image).toBeNull();
    expect(result.traits).toEqual([]);
  });

  it('returns empty traits when metadata.attributes is null', () => {
    const asset = makeAsset({
      metadata: { name: 'Named', image: 'https://example.com/a.png', attributes: null },
    });
    const result = normalizeIndexerAsset(asset, 'test-slug', 'ethereum');
    expect(result.traits).toEqual([]);
    expect(result.name).toBe('Named');
  });

  it('skips attribute entries without a trait_type and keeps the rest', () => {
    const asset = makeAsset({
      metadata: {
        name: 'Named',
        attributes: [
          { trait_type: '', value: 'ignored' },
          { trait_type: 'Kept', value: 'yes' },
        ],
      },
    });
    const result = normalizeIndexerAsset(asset, 'test-slug', 'ethereum');
    expect(result.traits).toEqual([{ type: 'Kept', value: 'yes' }]);
  });
});
