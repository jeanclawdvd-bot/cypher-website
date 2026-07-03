import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import type { IndexerAsset, IndexerInventoryResponse } from '@/lib/indexer';

vi.mock('@/lib/indexer', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/indexer')>();
  return { ...actual, indexerFetch: vi.fn() };
});
vi.mock('@/lib/opensea', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/opensea')>();
  return {
    ...actual,
    openseaFetch: vi.fn().mockResolvedValue(null),
    fetchNftByContract: vi.fn().mockResolvedValue(null),
    fetchBestListingsMap: vi.fn().mockResolvedValue({}),
  };
});

import { indexerFetch } from '@/lib/indexer';
import { GET } from './route';

// `indexerFetch` is generic, so type the mock against a concrete signature.
const mockedFetch = indexerFetch as MockedFunction<
  (path: string) => Promise<unknown>
>;

function makeAsset(tokenId: string): IndexerAsset {
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
      image: 'https://example.com/img.png',
      attributes: [{ trait_type: 'Tier', value: 'Gold' }],
    },
  };
}

function servePages(total: number) {
  const all = Array.from({ length: total }, (_, i) => makeAsset(String(i)));
  mockedFetch.mockImplementation(async (path: string) => {
    const params = new URLSearchParams(path.split('?')[1] ?? '');
    const limit = parseInt(params.get('limit') ?? '50', 10);
    const offset = parseInt(params.get('offset') ?? '0', 10);
    const page: IndexerInventoryResponse = {
      items: all.slice(offset, offset + limit),
      total,
      limit,
      offset,
    };
    return page;
  });
}

function request(identifier: string) {
  return new Request(
    `http://localhost/api/market/item?slug=packs&identifier=${identifier}`
  );
}

beforeEach(() => {
  mockedFetch.mockReset();
});

describe('GET /api/market/item (indexer branch)', () => {
  it('finds a token beyond the first page', async () => {
    servePages(450);
    const res = await GET(request('433'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.item.identifier).toBe('433');
    expect(body.item.name).toBe('Pack #433');
    expect(body.item.priceEth).toBeNull();
    expect(body.item.openseaUrl).toBe('');
    // 433 lives on the third page (offset 400).
    expect(mockedFetch).toHaveBeenCalledTimes(3);
  });

  it('stops paging as soon as the token is found', async () => {
    servePages(450);
    await GET(request('7'));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it('returns { item: null } after genuine exhaustion', async () => {
    servePages(450);
    const res = await GET(request('99999'));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ item: null });
    expect(mockedFetch).toHaveBeenCalledTimes(3);
  });

  it('returns { item: null } when a page fails mid-walk', async () => {
    mockedFetch
      .mockResolvedValueOnce({
        items: Array.from({ length: 200 }, (_, i) => makeAsset(String(i))),
        total: 400,
        limit: 200,
        offset: 0,
      } satisfies IndexerInventoryResponse)
      .mockResolvedValueOnce(null);
    const res = await GET(request('350'));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ item: null });
  });

  it('caps the walk at 50 pages when the API misbehaves', async () => {
    // Full pages forever with a lying total: the cap must stop the loop.
    mockedFetch.mockImplementation(async () => ({
      items: Array.from({ length: 200 }, (_, i) => makeAsset(String(i))),
    }));
    const res = await GET(request('99999'));
    expect(res.status).toBe(404);
    expect(mockedFetch).toHaveBeenCalledTimes(50);
  });
});
