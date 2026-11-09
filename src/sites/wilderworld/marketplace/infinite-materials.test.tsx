import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketplaceBrowse, MarketplaceHome, MarketplaceProduct } from './Marketplace';
import * as catalog from './catalog';
import ProductDetail from '../accessories/ProductDetail';
import { individualStoreProducts } from '../accessories/fashion';
import { resolveBagProduct } from '../accessories/useDemoBag';

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => navigation, usePathname: () => '/store' }));

beforeEach(()=>{localStorage.clear();sessionStorage.clear();window.history.replaceState(null,'','/store/browse');});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

describe('continuous browsing and material selection',()=>{
  it('restores the loaded catalog on return while a different filter starts at its own first page',()=>{
    const first=render(<MarketplaceBrowse initialDepartment="clothing"/>);
    fireEvent.click(screen.getByRole('button',{name:'Show more products'}));
    fireEvent.click(screen.getByRole('button',{name:'Show more products'}));
    const names=screen.getAllByRole('article').map(card=>card.getAttribute('aria-label'));
    expect(names).toHaveLength(72);
    first.unmount();
    const returning=render(<MarketplaceBrowse initialDepartment="clothing"/>);
    expect(screen.getAllByRole('article').map(card=>card.getAttribute('aria-label'))).toEqual(names);
    fireEvent.click(screen.getByRole('button',{name:/^Jackets/}));
    expect(screen.getAllByRole('article').length).toBeLessThanOrEqual(24);
    fireEvent.click(screen.getByRole('button',{name:'All clothing'}));
    expect(screen.getAllByRole('article')).toHaveLength(72);
    returning.unmount();
  });

  it('continues the homepage below Originals through the whole catalog without duplicates or navigation',()=>{
    window.history.replaceState(null,'','/');
    let onIntersection: IntersectionObserverCallback;
    const disconnect=vi.fn();
    vi.stubGlobal('IntersectionObserver',class {
      constructor(callback:IntersectionObserverCallback){onIntersection=callback;}
      observe=vi.fn();disconnect=disconnect;
    });
    render(<MarketplaceHome/>);
    const feed=screen.getByRole('region',{name:'All products'});
    const originals=screen.getByRole('region',{name:'Explore the originals'});
    expect(originals.compareDocumentPosition(feed)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(feed).getAllByRole('article')).toHaveLength(24);
    act(()=>onIntersection([{isIntersecting:true} as IntersectionObserverEntry],{} as IntersectionObserver));
    expect(within(feed).getAllByRole('article')).toHaveLength(48);
    fireEvent.click(within(feed).getByRole('button',{name:'Show more products'}));
    expect(within(feed).getAllByRole('article')).toHaveLength(72);
    for(let page=0;page<20&&within(feed).queryByRole('button',{name:'Show more products'});page++){
      act(()=>onIntersection([{isIntersecting:true} as IntersectionObserverEntry],{} as IntersectionObserver));
    }
    const articles=within(feed).getAllByRole('article');
    const styles=catalog.browseProducts(catalog.marketProducts,{});
    expect(articles).toHaveLength(styles.length);
    expect(new Set(articles.map(article=>article.getAttribute('aria-label'))).size).toBe(styles.length);
    expect(within(feed).getByRole('status')).toHaveTextContent(`You've seen all ${styles.length} products`);
    expect(within(feed).queryByRole('button',{name:'Show more products'})).not.toBeInTheDocument();
    expect(disconnect).toHaveBeenCalled();
    expect(window.location.pathname).toBe('/');
    expect(window.location.search).toBe('');
  });

  it('loads another page when the sentinel enters view, retains filters and stops at the collection end',()=>{
    let onIntersection: IntersectionObserverCallback;
    const disconnect=vi.fn();
    vi.stubGlobal('IntersectionObserver',class {
      constructor(callback:IntersectionObserverCallback){onIntersection=callback;}
      observe=vi.fn();disconnect=disconnect;
    });
    render(<MarketplaceBrowse initialDepartment="clothing"/>);
    const enter=()=>act(()=>onIntersection([{isIntersecting:true} as IntersectionObserverEntry],{} as IntersectionObserver));
    expect(screen.getAllByRole('article')).toHaveLength(24);
    enter();expect(screen.getAllByRole('article')).toHaveLength(48);
    expect(disconnect).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:/^Jackets/}));
    const expected=catalog.marketProducts.filter(p=>p.department==='clothing'&&p.subcategory==='jacket');
    expect(screen.getAllByRole('article')).toHaveLength(Math.min(24,expected.length));
    for(let page=0;page<10&&screen.queryByRole('button',{name:'Show more products'});page++)enter();
    expect(screen.getAllByRole('article')).toHaveLength(expected.length);
    expect(screen.getByRole('status')).toHaveTextContent(`You've seen all ${expected.length} products`);
    expect(screen.queryByRole('button',{name:'Show more products'})).not.toBeInTheDocument();
    expect(new Set(screen.getAllByRole('article').map(a=>a.getAttribute('aria-label'))).size).toBe(expected.length);
  });

  it('uses one large product per category card and includes vehicles',()=>{
    render(<MarketplaceHome/>);
    const gallery=screen.getByRole('region',{name:'Product category gallery'});
    for(const card of within(gallery).getAllByRole('link'))expect(card.querySelectorAll('[data-category-product]')).toHaveLength(1);
    expect(within(gallery).getByRole('link',{name:'Shop Vehicles'})).toHaveAttribute('href','/store/collections/vehicles');
    expect(catalog.filterProducts(catalog.marketProducts,{}).filter(p=>p.subcategory==='cars')).toHaveLength(2);
    const hats=catalog.filterProducts(catalog.marketProducts,{department:'clothing',subcategory:'hats'});
    const hatsCard=within(gallery).getByRole('link',{name:'Shop Hats'});
    expect(hatsCard).toHaveAttribute('href','/store/collections/clothing?category=hats');
    expect(within(hatsCard).getByText(String(hats.length))).toBeInTheDocument();
    expect(hats.some(product=>product.id===hatsCard.querySelector('[data-category-product]')?.getAttribute('data-category-product'))).toBe(true);
    const order=within(gallery).getAllByRole('link').map(card=>card.getAttribute('aria-label')?.replace('Shop ',''));
    expect(order[3]).toBe('Statues');
    expect(order.slice(order.indexOf('Glasses'),order.indexOf('Glasses')+3)).toEqual(['Glasses','Rims','Jackets']);
    const itemCards=new Set(['Furniture','Statues','Rims','Totems']);
    let peopleRun=0;
    order.forEach((label,index)=>{
      if(itemCards.has(label!)){
        expect(index).toBeGreaterThan(0);
        expect(index).toBeLessThan(order.length-1);
        expect(itemCards.has(order[index-1]!)).toBe(false);
        expect(itemCards.has(order[index+1]!)).toBe(false);
        peopleRun=0;
      }else{
        peopleRun++;
        expect(peopleRun).toBeLessThanOrEqual(3);
      }
    });
  });

  it('shows a pending material without substituting a differently colored product photo',()=>{
    const original=catalog.findMarketProduct('furniture-sofa')!;
    const fixture={...original,variants:[{...original.variants[0],id:'rendered',image:'/rendered.webp'},{...original.variants[1],id:'pending',name:'Pending textile',image:null}]};
    vi.spyOn(catalog,'findMarketProduct').mockReturnValue(fixture);
    render(<MarketplaceProduct id={fixture.id}/>);
    fireEvent.click(screen.getByRole('button',{name:'Pending textile'}));
    const imagery=within(screen.getByRole('region',{name:'Product imagery'}));
    expect(imagery.getByText('Pending textile · Image coming soon')).toBeInTheDocument();
    expect(imagery.queryByRole('img',{name:fixture.name})).not.toBeInTheDocument();
    expect(window.location.search).toBe('?variant=pending');
  });

  it('carries all nine clothing choices through the original product route and demo bag',()=>{
    const product=individualStoreProducts[0];
    const concepts=catalog.findMarketProduct(product.id)!.variants;
    render(<ProductDetail product={product}/>);
    const selector=within(screen.getByRole('region',{name:'Color'}));
    expect(selector.getAllByRole('button')).toHaveLength(9);
    fireEvent.click(selector.getByRole('button',{name:concepts[8].name}));
    expect(window.location.search).toContain(encodeURIComponent(concepts[8].id));
    const bag=resolveBagProduct({productId:product.id,colorwayId:concepts[8].id})!;
    expect(bag.detail).toBe(concepts[8].name);
    expect(bag.image).toBe(concepts[8].image);
    expect(bag.href).toContain(encodeURIComponent(concepts[8].id));
  });

  it('shows only available Frank Wilder finish previews with model integration pending and no ownership claim',()=>{
    const product=catalog.findMarketProduct('totem-fw-hermes-ii')!;
    render(<MarketplaceProduct id={product.id}/>);
    const imagery=within(screen.getByRole('region',{name:'Product imagery'}));
    const featured=catalog.featuredMaterial(product);
    if(featured?.image)expect(imagery.getByRole('img',{name:product.name})).toHaveAttribute('src',featured.image);
    else expect(imagery.queryByRole('img',{name:product.name})).not.toBeInTheDocument();
    expect(screen.getByText('Purchasing is not yet available. Release dates, final contents and in-game delivery will be confirmed before launch.')).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Coming soon'})).toBeDisabled();
    expect(screen.queryByText('Original Trinity Totem artwork.')).not.toBeInTheDocument();
    expect(product.plannedVariants).toHaveLength(9);
    expect(product.variants.every(variant=>variant.image)).toBe(true);
  });
});
