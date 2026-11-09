import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { MarketNft } from '@/lib/opensea';
import { originalItemSeed } from './originals';
import {familyBrowseItem,originalGroupCollection} from '@/lib/original-product-groups';

const mocks = vi.hoisted(() => ({ nfts: vi.fn(), item: vi.fn(), refetch: vi.fn() }));
vi.mock('@/app/market/hooks/useCollectionsQuery', () => ({ useCollectionsQuery: () => ({ data: {} }) }));
vi.mock('@/app/market/hooks/useEthPriceQuery', () => ({ useEthPriceQuery: () => ({ data: null }) }));
vi.mock('@/app/market/hooks/useMarketTraitsQuery', () => ({ useMarketTraitsQuery: () => ({ data: [] }) }));
vi.mock('@/app/market/hooks/useInfiniteScroll', () => ({ useInfiniteScroll: () => undefined }));
vi.mock('@/app/market/hooks/useMarketNftsQuery', () => ({ useMarketNftsQuery: mocks.nfts }));
vi.mock('@/app/market/hooks/useItemQuery', () => ({ useItemQuery: mocks.item }));
vi.mock('@/sites/wilderworld/marketplace/Marketplace', () => ({ MarketHeader: ({ onQueryChange }: { onQueryChange?: (value: string) => void }) => <input aria-label="Search products" onChange={e => onQueryChange?.(e.target.value)}/> }));
vi.mock('@/sites/wilderworld/marketplace/ProductMarketPanel', () => ({ default: ({ identity,variantId }: { identity?: { tokenId: string };variantId?:string }) => <><div data-testid="market-token">{identity?.tokenId}</div><div data-testid="market-variant">{variantId}</div></> }));
vi.mock('@/sites/wilderworld/marketplace/ProductReviews', () => ({ default: () => <div>Customer reviews</div> }));

import OriginalsBrowse, { OriginalCard } from './OriginalsBrowse';
import OriginalProduct from './OriginalProduct';
import OriginalGroupedProduct from './OriginalGroupedProduct';
import { ExistingCollections } from '@/sites/wilderworld/marketplace/ExistingCollections';

const seed = originalItemSeed('wilderworld', '123')!;
const nft: MarketNft = { ...seed, name: 'Wilder Wheel #123', image: '/wheel.webp', traits: [{ type: 'Body', value: 'Silver' }] };
const provenance = { source: 'blockscout', retrievedAt: '2026-11-07T12:00:00.000Z', marketData: 'unavailable' };

beforeEach(() => {
  mocks.nfts.mockReturnValue({ data: { items: [nft], provenance }, isLoading: false, isError: false, hasNextPage: false, fetchNextPage: vi.fn(), refetch: mocks.refetch });
  mocks.item.mockReturnValue({ data: { ...nft, description: 'Original metadata description.', animationUrl: null, tokenStandard: 'ERC-721', ownerAddress: '0x' + 'a'.repeat(40), provenance }, isLoading: false, isError: false, refetch: mocks.refetch });
});

describe('Originals responsive collection filters', () => {
  let mobile = true;
  const listeners = new Set<() => void>();
  beforeEach(() => {
    mobile = true; listeners.clear();
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      get matches() { return query === '(max-width: 820px)' && mobile; }, media: query,
      addEventListener: (_: string, listener: () => void) => { if (query === '(max-width: 820px)') listeners.add(listener); },
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    })));
  });
  afterEach(() => { vi.unstubAllGlobals(); document.body.style.overflow = ''; document.documentElement.style.overflow = ''; });
  const open = () => {
    screen.getByRole('button', { name: 'Close collection filters', hidden: true }).style.display = 'block';
    const trigger = screen.getByRole('button', { name: 'Collections & filters' });
    fireEvent.click(trigger);
    return { trigger, dialog: screen.getByRole('dialog', { name: 'Collection filters' }) };
  };
  it('isolates the page, confines focus, dismisses with Escape and restores focus', () => {
    render(<OriginalsBrowse initialSlug="pack-weapons"/>);
    const { trigger, dialog } = open();
    expect(trigger).toHaveAttribute('aria-controls', dialog.id);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(screen.getByRole('region', { name: /collectibles$/ })).toHaveAttribute('inert');
    const close = within(dialog).getByRole('button', { name: 'Close collection filters' });
    expect(close).toHaveFocus();
    screen.getByRole('textbox', { name: 'Search products' }).focus(); expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(dialog.contains(document.activeElement)).toBe(true); expect(close).not.toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' }); expect(close).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull(); expect(trigger).toHaveFocus();
    expect(document.documentElement.style.overflow).toBe('');
    expect(screen.getByRole('region', { name: /collectibles$/ })).not.toHaveAttribute('inert');
    open(); fireEvent.click(screen.getByRole('button', { name: /^Close filters$/ }));
    expect(screen.queryByRole('dialog')).toBeNull(); expect(trigger).toHaveFocus();
  });
  it('releases modal state on desktop resize while preserving traits and closes on collection navigation', () => {
    render(<OriginalsBrowse initialSlug="pack-weapons" initialTraits={{ Rarity: ['Rare'] }}/>);
    open();
    act(() => { mobile = false; for (const listener of listeners) listener(); });
    expect(screen.queryByRole('dialog')).toBeNull();
    const sidebar = screen.getByRole('complementary', { name: 'Collection filters' });
    expect(sidebar).toHaveFocus(); expect(sidebar).not.toHaveAttribute('aria-modal');
    expect(document.body.style.overflow).toBe('');
    expect(mocks.nfts).toHaveBeenLastCalledWith('pack-weapons', 'all', { Rarity: ['Rare'] }, { enabled: true, query: '', sort: 'collection' });
    act(() => { mobile = true; for (const listener of listeners) listener(); });
    expect(screen.queryByRole('dialog')).toBeNull();
    const { trigger, dialog } = open();
    const link = within(dialog).getAllByRole('link')[0];
    link.addEventListener('click', event => event.preventDefault(), { once: true }); fireEvent.click(link);
    expect(screen.queryByRole('dialog')).toBeNull(); expect(trigger).toHaveFocus();
  });
});

describe('Original collection shopping', () => {
  it.each([
    ['pack-avatars','Avatar Gear','Avatar armor revealed from opening a Wilder Pack.','Season 1'],
    ['pack-weapons','Weapons','Weapons and weapon attachments revealed from opening a Wilder Pack.','Season 1'],
    ['pack-wheels','Mods','Vehicle mods revealed from opening a Wilder Pack.','Season 1'],
    ['packs','Wilder Packs','Sealed packs containing weapons, vehicle mods and avatar armor.','Season 1'],
  ])('shows distinct Pack header copy for %s', (slug,title,description,eyebrow)=>{
    render(<OriginalsBrowse initialSlug={slug}/>);
    const heading=screen.getByRole('heading',{level:1,name:title});
    expect(heading.previousElementSibling).toHaveTextContent(eyebrow);
    expect(screen.getByText(description)).toBeInTheDocument();
    expect(screen.getByRole('img',{name:`${title} collection artwork`})).toHaveAttribute('src',slug==='packs'?'/images/marketplace/original-collections/wilder-packs-season-one.png':slug==='pack-weapons'?'/images/wilder-world/industries_weapons_hero.jpg.webp':slug==='pack-wheels'?'/images/wilder-world/industries_wheels_hero.png.webp':'/images/wilder-world/industries_avatars_hero.png.webp');
  });
  it('labels Genesis pages and keeps Packs out of homepage Originals discovery',()=>{
    const view=render(<OriginalsBrowse initialSlug="wilder-land-the-island"/>);
    expect(screen.getByRole('heading',{level:1}).previousElementSibling).toHaveTextContent('Genesis');
    view.unmount();
    render(<ExistingCollections/>);
    expect(screen.getByRole('heading',{name:'Explore the originals'})).toBeInTheDocument();
    expect(screen.queryByRole('link',{name:'Explore Packs'})).not.toBeInTheDocument();
    expect(screen.getByRole('link',{name:'Explore Land'})).toBeInTheDocument();
  });
  it('quick weapon navigation preserves rarity, updates URL filters, and exposes the selected subtype', () => {
    render(<OriginalsBrowse initialSlug="pack-weapons" initialTraits={{ Rarity: ['Rare'] }}/>);
    const primary = screen.getByRole('group', { name: 'Item type' });
    fireEvent.click(within(primary).getByRole('button', { name: /^Attachments / }));
    expect(within(primary).getByRole('button', { name: /^Attachments / })).toHaveAttribute('aria-pressed', 'true');
    const secondary = screen.getByRole('group', { name: 'Item subtype' });
    expect(within(secondary).queryByRole('button', { name: /^Assault Rifle / })).not.toBeInTheDocument();
    fireEvent.click(within(secondary).getByRole('button', { name: /^Suppressors / }));
    const selected = { Rarity: ['Rare'], Group: ['Weapon Attachment'], Type: ['Supressor'] };
    expect(mocks.nfts).toHaveBeenLastCalledWith('pack-weapons', 'all', selected, { enabled: true, query: '', sort: 'collection' });
    expect(JSON.parse(new URLSearchParams(window.location.search).get('attributes')!)).toEqual(selected);
    expect(within(secondary).getByRole('button', { name: /^Suppressors / })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(primary).getByRole('button', { name: /^Weapons / }));
    expect(mocks.nfts).toHaveBeenLastCalledWith('pack-weapons', 'all', { Rarity: ['Rare'], Group: ['Ranged Weapon'] }, { enabled: true, query: '', sort: 'collection' });
    expect(within(secondary).getByRole('button', { name: /^Assault Rifle / })).toBeInTheDocument();
    fireEvent.click(within(primary).getByRole('button', { name: /^All items / }));
    expect(mocks.nfts).toHaveBeenLastCalledWith('pack-weapons', 'all', { Rarity: ['Rare'] }, { enabled: true, query: '', sort: 'collection' });
    fireEvent.click(screen.getByRole('button', { name: /^Clear filters/ }));
    expect(new URLSearchParams(window.location.search).has('attributes')).toBe(false);
  });
  it('restores shared wheel filters and keeps them when searching or sorting the complete catalog', () => {
    const traits = { Category: ['Engine'], Type: ['Pistons'], Rarity: ['Epic'] };
    render(<OriginalsBrowse initialSlug="pack-wheels" initialTraits={traits} initialQuery="Stage 2" initialSort="name"/>);
    expect(screen.getByRole('button', { name: /^Pistons / })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: /^Air Filter / })).not.toBeInTheDocument();
    expect(mocks.nfts).toHaveBeenLastCalledWith('pack-wheels', 'all', traits, { enabled: true, query: 'Stage 2', sort: 'name' });
    fireEvent.change(screen.getByLabelText('Search products'), { target: { value: 'Stage 3' } });
    expect(JSON.parse(new URLSearchParams(window.location.search).get('attributes')!)).toEqual(traits);
    expect(new URLSearchParams(window.location.search).get('sort')).toBe('name');
  });
  it('scopes armor categories to the selected Trinity collection', () => {
    render(<OriginalsBrowse initialSlug="pack-avatars"/>);
    fireEvent.click(screen.getByRole('button', { name: /^Trinity MKII / }));
    const helmet = screen.getByRole('button', { name: 'Helmet 463' });
    fireEvent.click(helmet);
    expect(mocks.nfts).toHaveBeenLastCalledWith('pack-avatars', 'all', { Type: ['Trinity MKII'], Category: ['Helmet'] }, { enabled: true, query: '', sort: 'collection' });
    fireEvent.click(screen.getByRole('button', { name: /^All types / }));
    expect(mocks.nfts).toHaveBeenLastCalledWith('pack-avatars', 'all', { Type: ['Trinity MKII'] }, { enabled: true, query: '', sort: 'collection' });
  });
  it('defaults to all inventory and opens real product links', () => {
    render(<OriginalsBrowse initialSlug="wilderworld"/>);
    expect(mocks.nfts).toHaveBeenCalledWith('wilderworld', 'all', undefined, undefined);
    expect(screen.getByRole('link', { name: 'View Wilder Wheel #123' })).toHaveAttribute('href', expect.stringContaining('/store/market/wilderworld/123?contract='));
    expect(screen.getByText(/Live listings and market prices are not connected/)).toBeInTheDocument();
    expect(screen.queryByText('0 ETH')).not.toBeInTheDocument();
  });
  it('searches loaded items without losing the selected collection', () => {
    render(<OriginalsBrowse initialSlug="wilderworld"/>);
    fireEvent.change(screen.getByLabelText('Search products'), { target: { value: 'not in this collection' } });
    expect(screen.getByText('No matches in loaded items')).toBeInTheDocument();
    expect(window.location.search).toContain('c=wilderworld');
  });
  it('delegates grouped search and sorting to the full-catalog API rather than re-filtering one loaded page',()=>{
    render(<OriginalsBrowse initialSlug="pack-weapons"/>);
    expect(screen.getByText('Weapons and weapon attachments revealed from opening a Wilder Pack.')).toBeInTheDocument();
    expect(screen.getByText('Explore each item, compare editions, and find your next addition.')).toBeInTheDocument();
    expect(screen.queryByText(/Matching copies share a product page/)).not.toBeInTheDocument();
    expect(mocks.nfts).toHaveBeenCalledWith('pack-weapons','all',{}, {enabled:true,query:'',sort:'collection'});
    fireEvent.change(screen.getByLabelText('Search products'),{target:{value:'a later-page weapon'}});
    fireEvent.change(screen.getByLabelText('Sort collectibles'),{target:{value:'name'}});
    expect(mocks.nfts).toHaveBeenCalledWith('pack-weapons','all',{}, {enabled:true,query:'a later-page weapon',sort:'name'});
    expect(screen.getByRole('link',{name:'View Wilder Wheel #123'})).toBeInTheDocument();
    expect(screen.queryByText('No matches in loaded items')).not.toBeInTheDocument();
  });
  it('shows retry instead of claiming an unavailable source is empty', () => {
    mocks.nfts.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: mocks.refetch, fetchNextPage: vi.fn() });
    render(<OriginalsBrowse initialSlug="wilderworld"/>);
    expect(screen.getByText('Inventory is unavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Try again')); expect(mocks.refetch).toHaveBeenCalled();
  });
  it('keeps ETH prices visible without a USD conversion feed', () => {
    render(<OriginalCard item={{ ...nft, priceEth: 0.25 }} slug="wilderworld" ethUsd={null}/>);
    expect(screen.getByText('0.250 ETH')).toBeInTheDocument();
  });
});

describe('Original product page', () => {
  it('keeps a filtered card finish selected in the grouped product picker, artwork and market',()=>{
    const family=originalGroupCollection('pack-weapons')!.families.find(item=>item.variants.length>1)!;
    const edition=family.variants.at(-1)!;
    const card=familyBrowseItem(family,edition.id);
    const {unmount}=render(<OriginalCard item={card} slug={family.slug} ethUsd={null}/>);
    const href=screen.getByRole('link',{name:`View ${family.name}`}).getAttribute('href')!;
    const selected=new URL(href,'http://localhost').searchParams.get('variant')!;
    expect(selected).toBe(edition.id);
    expect(screen.getByRole('img',{name:family.name})).toHaveAttribute('src',edition.image);
    unmount();
    render(<OriginalGroupedProduct family={family} initialVariant={selected}/>);
    expect(screen.getByLabelText('Material & color')).toHaveValue(edition.id);
    expect(within(screen.getByRole('region',{name:'Product images'})).getByRole('img')).toHaveAttribute('src',edition.image);
    expect(screen.getByTestId('market-variant')).toHaveTextContent(edition.id);
    expect(screen.getByTestId('market-token')).toBeEmptyDOMElement();
    expect(screen.getByText(`${edition.members.length.toLocaleString()} copies recorded`)).toBeInTheDocument();
  });

  it('keeps identity in market bindings while showing shopping details without blockchain fields', () => {
    render(<OriginalProduct seed={seed}/>);
    expect(screen.getByRole('heading', { name: nft.name, level: 1 })).toBeInTheDocument();
    expect(screen.queryByText(seed.contract)).not.toBeInTheDocument();
    expect(screen.queryByText('0x' + 'a'.repeat(40))).not.toBeInTheDocument();
    for (const label of ['Token ID','Network','Contract','Token standard','Ethereum','ERC-721']) expect(screen.queryByText(label)).not.toBeInTheDocument();
    expect(screen.getByText('Silver')).toBeInTheDocument();
    expect(screen.getByTestId('market-token')).toHaveTextContent('123');
    expect(screen.getByText('Live price unavailable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Wilder World' })).toHaveAttribute('href', '/');
  });
  it('retains provenance on fetch failure without inventing an owner or artwork', () => {
    mocks.item.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: mocks.refetch });
    render(<OriginalProduct seed={seed}/>);
    expect(screen.getByText('Artwork unavailable')).toBeInTheDocument();
    expect(screen.queryByText(seed.contract)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Retry details')); expect(mocks.refetch).toHaveBeenCalled();
  });
  it('does not send Z-Chain tokens to OpenSea', () => {
    render(<OriginalProduct seed={originalItemSeed('packs', '1')!}/>);
    expect(screen.queryByRole('link', { name: 'View on OpenSea' })).not.toBeInTheDocument();
  });
});
