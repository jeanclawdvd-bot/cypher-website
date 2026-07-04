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
    fetchBestListingsPage: vi.fn().mockResolvedValue(null),
    fetchBestListingsMap: vi.fn().mockResolvedValue({}),
    fetchNftsByContract: vi.fn().mockResolvedValue(null),
    fetchNftsByIdentifiers: vi.fn().mockResolvedValue([]),
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
    metadata: { name: `Pack #${tokenId}`, attributes: [] },
  };
}

/** Serves pages of `total` synthetic assets from ?limit=&offset= params. */
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

function request(query: string) {
  return new Request(`http://localhost/api/market/nfts?${query}`);
}

beforeEach(() => {
  mockedFetch.mockReset();
});

describe('GET /api/market/nfts (indexer branch)', () => {
  it('returns the first page of 50 with next="50" when more remain', async () => {
    servePages(450);
    const res = await GET(request('slug=packs'));
    const body = await res.json();
    expect(body.error).toBe(false);
    expect(body.items).toHaveLength(50);
    expect(body.items[0].identifier).toBe('0');
    expect(body.next).toBe('50');
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch.mock.calls[0][0]).toContain('limit=50');
    expect(mockedFetch.mock.calls[0][0]).toContain('offset=0');
  });

  it('walks subsequent pages via next and terminates with next=null', async () => {
    servePages(450);
    const page2 = await (await GET(request('slug=packs&next=50'))).json();
    expect(page2.items[0].identifier).toBe('50');
    expect(page2.next).toBe('100');

    const last = await (await GET(request('slug=packs&next=400'))).json();
    expect(last.items).toHaveLength(50);
    expect(last.next).toBeNull();
  });

  it('uses the short-page heuristic when total is missing', async () => {
    mockedFetch.mockResolvedValueOnce({
      items: Array.from({ length: 50 }, (_, i) => makeAsset(String(i))),
    } satisfies IndexerInventoryResponse);
    const body = await (await GET(request('slug=packs'))).json();
    expect(body.next).toBe('50');

    mockedFetch.mockResolvedValueOnce({
      items: [makeAsset('50')],
    } satisfies IndexerInventoryResponse);
    const tail = await (await GET(request('slug=packs&next=50'))).json();
    expect(tail.next).toBeNull();
  });

  it('treats a NaN or negative next cursor as offset 0', async () => {
    servePages(10);
    const body = await (await GET(request('slug=packs&next=bogus'))).json();
    expect(body.items).toHaveLength(10);
    expect(mockedFetch.mock.calls[0][0]).toContain('offset=0');

    const neg = await (await GET(request('slug=packs&next=-5'))).json();
    expect(neg.items).toHaveLength(10);
    expect(mockedFetch.mock.calls[1][0]).toContain('offset=0');
  });

  it('reports a failed page as a failed request (502, error: true)', async () => {
    mockedFetch.mockResolvedValue(null);
    const res = await GET(request('slug=packs'));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ items: [], next: null, error: true });
  });
});
