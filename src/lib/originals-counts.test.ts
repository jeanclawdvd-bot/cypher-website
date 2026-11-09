import { describe, expect, it } from 'vitest';
import { collectionQuantity, observedInventoryQuantity, validCollectionCount } from './originals-counts';
import { getEntryBySlug } from './wilderCollections';

const entry = getEntryBySlug('pack-weapons')!;
const row = { collection: entry.slug, chainId: entry.chainId, contract: entry.contract?.toLowerCase(), tokenStandard: 'ERC-721', complete: true, errors: [], tokenCount: 8170, observedAt: '2026-11-08T06:37:01.846Z' };

describe('original collection quantities', () => {
  it('distinguishes units from item counts and never implies an edition cap', () => {
    expect(collectionQuantity(63506, 'blockscout', row.observedAt, 'ERC-1155')).toMatchObject({value:63506,kind:'erc1155-units',isSupplyCap:false});
    expect(collectionQuantity(8170, 'indexer', row.observedAt, 'ERC721')).toMatchObject({value:8170,kind:'erc721-items',isSupplyCap:false});
    expect(validCollectionCount(0)).toBe(0);
    for (const invalid of [null, undefined, '8170', -1, 1.2, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) expect(validCollectionCount(invalid)).toBeNull();
  });
  it('accepts only complete, exact-contract, exact-chain ERC721 snapshots', () => {
    expect(observedInventoryQuantity(entry, {collections:[row]})).toEqual({value:8170,kind:'erc721-items',source:'inventory-snapshot',observedAt:row.observedAt,isSupplyCap:false});
    for (const change of [{complete:false},{chainId:1},{contract:'0x0000000000000000000000000000000000000000'},{collection:'pack-wheels'},{tokenStandard:'ERC-1155'},{errors:['partial walk']},{tokenCount:-1},{observedAt:'invalid'}]) {
      expect(observedInventoryQuantity(entry, {collections:[{...row,...change}]})).toBeNull();
    }
    expect(observedInventoryQuantity(getEntryBySlug('packs')!, {collections:[row]})).toBeNull();
  });
});
