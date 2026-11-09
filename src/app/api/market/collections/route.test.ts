vi.mock('@/lib/originals-data', async (importActual) => { const actual=await importActual<typeof import('@/lib/originals-data')>(); return {...actual,fetchExplorerPage:vi.fn().mockResolvedValue(null),fetchExplorerItem:vi.fn().mockResolvedValue(null),fetchExplorerCollection:vi.fn().mockResolvedValue(null)}; });
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
import { fetchExplorerCollection } from '@/lib/originals-data';
import { GET } from './route';
import { objectArray, objectValue } from '../testResponse';

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

function findCollection(body: unknown, slug: string) {
  return objectArray(objectValue(body).collections).find((c) => c.slug === slug);
}

beforeEach(() => {
  mockedFetch.mockReset();
  vi.mocked(fetchExplorerCollection).mockReset().mockResolvedValue(null);
});

describe('GET /api/market/collections (indexer entries)', () => {
  it('resolves names case-insensitively but uses ERC1155 units rather than design counts', async () => {
    mockedFetch.mockImplementation(async (path: string) =>
      path.startsWith('/v1/inventory/collections')
        ? collectionsEnvelope
        : inventoryEnvelope
    );
    vi.mocked(fetchExplorerCollection).mockImplementation(async entry => entry.slug === 'packs' ? {totalSupply:63506,owners:190,tokenStandard:'ERC-1155',image:null,provenance:{source:'blockscout',retrievedAt:'2026-11-08T12:00:00Z',marketData:'unavailable'}} : null);

    const body = await (await GET()).json();
    const packs = findCollection(body, 'packs');
    expect(packs).toBeDefined();
    expect(packs?.name).toBe('Wilder Packs');
    expect(packs?.totalSupply).toBe(63506);
    expect(packs?.quantity).toMatchObject({value:63506,kind:'erc1155-units',source:'blockscout',isSupplyCap:false});
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
    expect(packs?.name).toBe('Wilder Packs');
    expect(packs?.totalSupply).toBeNull();
    expect(packs?.image).toBeNull();
  });

  it('does not infer ERC1155 units from one token design or its inventory total', async () => {
    mockedFetch.mockImplementation(async path => path.startsWith('/v1/inventory/collections') ? {collections:[{...collectionsEnvelope.collections[0],totalItems:1}]} : {...inventoryEnvelope,total:1});
    const packs = findCollection(await (await GET()).json(), 'packs');
    expect(packs?.totalSupply).toBeNull();
    expect(packs?.quantity).toBeNull();
  });

  it('falls back to explorer quantity, owners, and image even when indexer detail exists without totals', async () => {
    mockedFetch.mockImplementation(async path => path.startsWith('/v1/inventory/collections') ? {collections:[{collectionAddress:PACKS_CONTRACT,collectionName:'Packs'}]} : null);
    vi.mocked(fetchExplorerCollection).mockImplementation(async entry => entry.slug === 'packs' ? {totalSupply:63506,owners:190,tokenStandard:'ERC-1155',image:'https://example.com/original.png',provenance:{source:'blockscout',retrievedAt:'2026-11-08T12:00:00Z',marketData:'unavailable'}} : null);
    const packs = findCollection(await (await GET()).json(), 'packs');
    expect(packs).toMatchObject({totalSupply:63506,owners:190,image:'https://example.com/original.png'});
  });

  it('preserves a verified zero ERC721 count and accepts inventory envelope total only for ERC721', async () => {
    const contract='0x693de821fc5999ac3738720f53763fe8aafaf6ac';
    mockedFetch.mockImplementation(async path => path.startsWith('/v1/inventory/collections') ? {collections:[{collectionAddress:contract,totalItems:0}]} : {items:[],total:10});
    vi.mocked(fetchExplorerCollection).mockImplementation(async entry => entry.slug === 'pack-weapons' ? {totalSupply:100,owners:5,tokenStandard:'ERC-721',image:null,provenance:{source:'blockscout',retrievedAt:'2026-11-08T12:00:00Z',marketData:'unavailable'}} : null);
    expect(findCollection(await (await GET()).json(), 'pack-weapons')).toMatchObject({totalSupply:0,quantity:{source:'indexer',kind:'erc721-items'}});
    mockedFetch.mockImplementation(async path => path.startsWith('/v1/inventory/collections') ? {collections:[{collectionAddress:contract}]} : {items:[],total:10});
    expect(findCollection(await (await GET()).json(), 'pack-weapons')).toMatchObject({totalSupply:10,quantity:{source:'indexer',kind:'erc721-items'}});
  });

  it('uses completed dated ERC721 inventory as fallback without confusing it with a cap', async () => {
    mockedFetch.mockResolvedValue(null);
    const weapons=findCollection(await (await GET()).json(), 'pack-weapons');
    expect(weapons).toMatchObject({totalSupply:8170,quantity:{source:'inventory-snapshot',kind:'erc721-items',isSupplyCap:false}});
    expect(objectValue(weapons?.quantity).observedAt).toMatch(/^2026-11-08T/);
  });

  it('ignores a mismatched collection inventory total and media', async () => {
    mockedFetch.mockImplementation(async path => path.startsWith('/v1/inventory/collections') ? null : inventoryEnvelope);
    vi.mocked(fetchExplorerCollection).mockImplementation(async entry => entry.slug === 'pack-weapons' ? {totalSupply:8190,owners:5,tokenStandard:'ERC-721',image:null,provenance:{source:'blockscout',retrievedAt:'2026-11-08T12:00:00Z',marketData:'unavailable'}} : null);
    expect(findCollection(await (await GET()).json(), 'pack-weapons')).toMatchObject({totalSupply:8190,image:null,quantity:{source:'blockscout'}});
  });

  it('does not use an ERC721 snapshot when the live provider contradicts its standard', async () => {
    mockedFetch.mockResolvedValue(null);
    vi.mocked(fetchExplorerCollection).mockImplementation(async entry => entry.slug === 'pack-weapons' ? {totalSupply:null,owners:5,tokenStandard:'ERC-1155',image:null,provenance:{source:'blockscout',retrievedAt:'2026-11-08T12:00:00Z',marketData:'unavailable'}} : null);
    expect(findCollection(await (await GET()).json(), 'pack-weapons')).toMatchObject({totalSupply:null,quantity:null});
  });
});
