import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import type { IndexerAsset, IndexerInventoryResponse } from '@/lib/indexer';

vi.mock('@/lib/indexer', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/indexer')>();
  return { ...actual, indexerFetch: vi.fn() };
});
vi.mock('@/lib/opensea', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/opensea')>();
  return { ...actual, openseaFetch: vi.fn().mockResolvedValue(null) };
});

import { indexerFetch } from '@/lib/indexer';
import { GET } from './route';

// `indexerFetch` is generic, so type the mock against a concrete signature.
const mockedFetch = indexerFetch as MockedFunction<
  (path: string) => Promise<unknown>
>;

function makeAsset(tokenId: string, tier: string): IndexerAsset {
  return {
    id: `asset-${tokenId}`,
    collectionAddress: '0x5ce3a764cc43e891d8bd068dd16c1b08db4ad0d4',
    collectionName: 'Packs',
    tokenId,
    ownerAddress: '0xowner',
    chainId: 9369,
    tokenStandard: 'ERC721',
    balance: '1',
    tokenUri: null,
    metadata: {
      name: `Pack #${tokenId}`,
      attributes: [{ trait_type: 'Tier', value: tier }],
    },
  };
}

function servePages(all: IndexerAsset[]) {
  mockedFetch.mockImplementation(async (path: string) => {
    const params = new URLSearchParams(path.split('?')[1] ?? '');
    const limit = parseInt(params.get('limit') ?? '50', 10);
    const offset = parseInt(params.get('offset') ?? '0', 10);
    const page: IndexerInventoryResponse = {
      items: all.slice(offset, offset + limit),
      total: all.length,
      limit,
      offset,
    };
    return page;
  });
}

const request = new Request('http://localhost/api/market/traits?slug=packs');

beforeEach(() => {
  mockedFetch.mockReset();
});

describe('GET /api/market/traits (indexer branch)', () => {
  it('aggregates trait counts across all pages', async () => {
    // 450 assets: 300 Gold, 150 Silver — spread across 3 pages of 200.
    const all = Array.from({ length: 450 }, (_, i) =>
      makeAsset(String(i), i < 300 ? 'Gold' : 'Silver')
    );
    servePages(all);

    const body = await (await GET(request)).json();
    expect(mockedFetch).toHaveBeenCalledTimes(3);
    expect(body.categories).toEqual([
      {
        type: 'Tier',
        values: [
          { value: 'Gold', count: 300 },
          { value: 'Silver', count: 150 },
        ],
      },
    ]);
  });

  it('sorts values count-desc and types alphabetically', async () => {
    const all = [
      {
        ...makeAsset('1', 'Gold'),
        metadata: {
          name: 'Pack #1',
          attributes: [
            { trait_type: 'Zone', value: 'North' },
            { trait_type: 'Tier', value: 'Gold' },
          ],
        },
      },
      makeAsset('2', 'Gold'),
      makeAsset('3', 'Silver'),
    ];
    servePages(all);

    const body = await (await GET(request)).json();
    expect(body.categories.map((c: { type: string }) => c.type)).toEqual([
      'Tier',
      'Zone',
    ]);
    expect(body.categories[0].values[0]).toEqual({ value: 'Gold', count: 2 });
  });

  it('degrades to empty categories when a page fails mid-walk', async () => {
    mockedFetch
      .mockResolvedValueOnce({
        items: Array.from({ length: 200 }, (_, i) => makeAsset(String(i), 'Gold')),
        total: 400,
        limit: 200,
        offset: 0,
      } satisfies IndexerInventoryResponse)
      .mockResolvedValueOnce(null);

    const body = await (await GET(request)).json();
    expect(body).toEqual({ categories: [] });
  });
});
