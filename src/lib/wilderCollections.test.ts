import { describe, expect, it } from 'vitest';
import { ALL_ENTRIES, getEntryBySlug, getEntrySource } from './wilderCollections';

const ZCHAIN_SLUG_TO_CONTRACT: Record<string, string> = {
  packs: '0x5ce3a764cc43e891d8bd068dd16c1b08db4ad0d4',
  'pack-weapons': '0x693de821fc5999ac3738720f53763fe8aafaf6ac',
  'pack-wheels': '0x6c6e92c542b525043926028cbfa61bfe0e76e69b',
  'pack-avatars': '0xa5908ee83b7f61e92e0a68b22372cbca78751cb2',
};

describe('wilderCollections config invariants', () => {
  describe('indexer-backed Z-Chain entries', () => {
    const indexerEntries = ALL_ENTRIES.filter((e) => getEntrySource(e) === 'indexer');

    it('has exactly 4 indexer entries', () => {
      expect(indexerEntries).toHaveLength(4);
    });

    it('every indexer entry is on Z-Chain (chainId 9369, chain "zchain", explicit source)', () => {
      for (const entry of indexerEntries) {
        expect(entry.chainId).toBe(9369);
        expect(entry.chain).toBe('zchain');
        expect(entry.source).toBe('indexer');
      }
    });

    it('slug/contract pairs match the indexer registry exactly', () => {
      const actual = Object.fromEntries(indexerEntries.map((e) => [e.slug, e.contract]));
      expect(actual).toEqual(ZCHAIN_SLUG_TO_CONTRACT);
    });
  });

  describe('uniqueness', () => {
    it('has no duplicate slugs', () => {
      expect(new Set(ALL_ENTRIES.map((e) => e.slug)).size).toBe(ALL_ENTRIES.length);
    });

    it('has no duplicate ids', () => {
      expect(new Set(ALL_ENTRIES.map((e) => e.id)).size).toBe(ALL_ENTRIES.length);
    });
  });

  describe('slug lookup', () => {
    it.each(Object.keys(ZCHAIN_SLUG_TO_CONTRACT))(
      'getEntryBySlug(%j) resolves to an indexer entry',
      (slug) => {
        const entry = getEntryBySlug(slug);
        expect(entry).toBeDefined();
        expect(getEntrySource(entry!)).toBe('indexer');
      }
    );
  });

  describe('source default path', () => {
    it('every entry without an explicit source resolves to opensea', () => {
      const defaulted = ALL_ENTRIES.filter((e) => e.source === undefined);
      for (const entry of defaulted) {
        expect(getEntrySource(entry)).toBe('opensea');
      }
      expect(defaulted).toHaveLength(11);
    });

    it('locks the total entry count', () => {
      expect(ALL_ENTRIES).toHaveLength(15);
    });
  });
});
