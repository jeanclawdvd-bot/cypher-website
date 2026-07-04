import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import type { IndexerInventoryResponse } from '@/lib/indexer';

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

// Checksum-cased on purpose: the route must match case-insensitively against
// the lowercase contract configured in wilderCollections.
const PACKS_CONTRACT = '0x5CE3A764cc43E891D8Bd068dd16C1b08Db4Ad0d4';

const collectionsEnvelope = {
  collections: [
    {
      collectionAddress: PACKS_CONTRACT,
      collectionName: 'Wilder Packs',
      totalItems: 7589,
      totalHolders: 1200,
    },
  ],
};

const inventoryEnvelope: IndexerInventoryResponse = {
  items: [
    {
      id: 'asset-1',
      collectionAddress: PACKS_CONTRACT.toLowerCase(),
      collectionName: 'Wilder Packs',
      tokenId: '1',
      ownerAddress: '0xowner',
      chainId: 9369,
      tokenStandard: 'ERC721',
      balance: '1',
      tokenUri: null,
      metadata: {
        name: 'Pack #1',
        image: 'https://example.com/pack.png',
        attributes: [],
      },
    },
  ],
  total: 7589,
  limit: 50,
  offset: 0,
};

function findCollection(body: { collections: Array<{ slug: string }> }, slug: string) {
  return body.collections.find((c) => c.slug === slug) as
    | Record<string, unknown>
    | undefined;
}

beforeEach(() => {
  mockedFetch.mockReset();
});

describe('GET /api/market/collections (indexer entries)', () => {
  it('resolves name/totalSupply from the collections envelope (case-insensitive address)', async () => {
    mockedFetch.mockImplementation(async (path: string) =>
      path.startsWith('/v1/inventory/collections')
        ? collectionsEnvelope
        : inventoryEnvelope
    );

    const body = await (await GET()).json();
    const packs = findCollection(body, 'packs');
    expect(packs).toBeDefined();
    expect(packs?.name).toBe('Wilder Packs');
    expect(packs?.totalSupply).toBe(7589);
    expect(packs?.image).toBe('https://example.com/pack.png');
    expect(packs?.floorPrice).toBeNull();
    expect(packs?.priceEth).toBeUndefined();
  });

  it('falls back to the config label and null supply when the indexer fails', async () => {
    mockedFetch.mockResolvedValue(null);

    const body = await (await GET()).json();
    const packs = findCollection(body, 'packs');
    expect(packs).toBeDefined();
    // The packs entry has no `label`, so the fallback is the slug itself.
    expect(packs?.name).toBe('packs');
    expect(packs?.totalSupply).toBeNull();
    expect(packs?.image).toBeNull();
  });
});
