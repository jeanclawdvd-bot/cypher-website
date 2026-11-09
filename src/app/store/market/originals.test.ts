import { describe, expect, it } from 'vitest';
import { originalItemHref, originalItemSeed, originalCollectionName, originalCollectionEyebrow, originalCollectionArtwork, originalPackPresentation } from './originals';
import { getEntryBySlug } from '@/lib/wilderCollections';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

describe('Original collectible routes', () => {
  it('retains the complete uint256 token and canonical chain/contract', () => {
    const token = (BigInt(2) ** BigInt(255)).toString();
    const seed = originalItemSeed('wilderworld', token)!;
    const url = new URL(originalItemHref('wilderworld', seed), 'https://example.test');
    expect(url.pathname).toBe(`/store/market/wilderworld/${token}`);
    expect(url.searchParams.get('contract')).toBe(getEntryBySlug('wilderworld')!.contract);
    expect(url.searchParams.get('chain')).toBe('ethereum');
    expect(seed.identifier).toBe(token);
  });
  it('rejects unrelated chain and contract overrides', () => {
    expect(originalItemSeed('wilderworld', '1', '0x' + '1'.repeat(40))).toBeNull();
    expect(originalItemSeed('wilderworld', '1', undefined, 'zchain')).toBeNull();
    expect(originalItemSeed('unknown', '1')).toBeNull();
  });
  it('rejects invalid and out-of-range token identifiers', () => {
    for (const token of ['-1', '01', '1.5', '1e3', '', (BigInt(2) ** BigInt(256)).toString()]) expect(originalItemSeed('wilderworld', token)).toBeNull();
    expect(originalItemSeed('wilderworld', '0')).not.toBeNull();
  });
  it('uses collection display names rather than raw slugs', () => {
    expect(originalCollectionName(getEntryBySlug('wilderworld')!)).not.toBe('wilderworld');
  });
  it.each([
    ['pack-avatars','Avatar Gear','Avatar armor revealed from opening a Wilder Pack.','industries_avatars_hero.png.webp'],
    ['pack-weapons','Weapons','Weapons and weapon attachments revealed from opening a Wilder Pack.','industries_weapons_hero.jpg.webp'],
    ['pack-wheels','Mods','Vehicle mods revealed from opening a Wilder Pack.','industries_wheels_hero.png.webp'],
  ])('uses the requested Pack copy and related artwork for %s', (slug,title,description,file) => {
    const entry=getEntryBySlug(slug)!;
    expect(originalCollectionName(entry)).toBe(title);
    expect(originalCollectionEyebrow(entry)).toBe('Wilder Packs');
    expect(originalPackPresentation(entry)?.description).toBe(description);
    expect(originalCollectionArtwork(entry)).toBe(`/images/wilder-world/${file}`);
    expect(existsSync(join(process.cwd(),'public',originalCollectionArtwork(entry)!))).toBe(true);
  });
  it('separates sealed Packs from revealed items and preserves Genesis presentation',()=>{
    const pack=getEntryBySlug('packs')!,presentation=originalPackPresentation(pack)!;
    expect(presentation.title).toBe('Wilder Packs');
    expect(presentation.eyebrow).toBe('Season 1');
    expect(presentation.description).toContain('Sealed packs containing');
    expect(presentation.description).not.toContain('revealed from opening');
    expect(originalCollectionArtwork(pack)).toBe('/images/marketplace/original-collections/wilder-packs-season-one.png');
    expect(existsSync(join(process.cwd(),'public',presentation.artwork))).toBe(true);
    expect(originalCollectionEyebrow(getEntryBySlug('wilder-land-the-island')!)).toBe('Genesis');
    expect(originalPackPresentation(getEntryBySlug('wilderworld')!)).toBeUndefined();
  });
  it.each(['aws1','air-wild'])('keeps %s outside the Genesis collection group',slug=>{
    expect(originalCollectionEyebrow(getEntryBySlug(slug)!)).toBe('Originals');
  });
});
