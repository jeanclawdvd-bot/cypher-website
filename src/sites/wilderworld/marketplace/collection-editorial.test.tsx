import { createElement } from 'react';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MarketplaceBrowse, MarketplaceHome, MarketplaceProduct } from './Marketplace';
import { campaignMedia, campaignScenesForProduct, productEditorials, type CampaignMedia } from './campaign-media';
import { findMarketProduct, filterProducts, marketProducts } from './catalog';
import { findIndividualProduct } from '../accessories/fashion';
import ProductDetail from '../accessories/ProductDetail';
import { generateStaticParams } from '@/app/store/collections/[section]/page';

vi.mock('next/image',()=>({default:({src,alt}:{src:string;alt:string})=>createElement('img',{src,alt})}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()}),usePathname:()=>window.location.pathname}));
beforeEach(()=>{localStorage.clear();window.history.replaceState(null,'','/store');});

describe('separate vehicle and rim shopping sections',()=>{
  it('separates browsing while preserving source collection identity and old rim links',()=>{
    const cars=filterProducts(marketProducts,{department:'vehicles'});
    const rims=filterProducts(marketProducts,{department:'rims'});
    expect(cars.map(product=>product.id)).toEqual(['vehicle-ghostline','vehicle-vera-solis']);
    expect(rims).toHaveLength(8);
    expect(rims.every(product=>product.department==='vehicles'&&product.subcategory==='rims')).toBe(true);
    expect(filterProducts(marketProducts,{department:'vehicles',subcategory:'rims'})).toEqual(rims);
    expect(generateStaticParams()).toContainEqual({section:'rims'});
    expect(filterProducts(marketProducts,{department:'rims',query:'Wantide'}).map(product=>product.id)).toEqual(['rim-preview-wertone-wantide-2010']);
  });
  it('uses the correct section counts, links and legacy route state',()=>{
    const home=render(<MarketplaceHome/>);
    const gallery=within(screen.getByRole('region',{name:'Product category gallery'}));
    expect(gallery.getByRole('link',{name:'Shop Vehicles'})).toHaveTextContent('Shop vehicles 2');
    expect(gallery.getByRole('link',{name:'Shop Rims'})).toHaveTextContent('Shop rims 8');
    expect(gallery.getByRole('link',{name:'Shop Rims'})).toHaveAttribute('href','/store/collections/rims');
    home.unmount();
    window.history.replaceState(null,'','/store/collections/vehicles?category=rims');
    render(<MarketplaceBrowse initialDepartment="vehicles" initialCategory="rims"/>);
    expect(screen.getByRole('heading',{level:1,name:'Rims'})).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(8);
    expect(screen.getByRole('combobox',{name:'Search department'})).toHaveTextContent('Rims');
    expect(window.location.pathname).toBe('/store/collections/rims');
    fireEvent.click(screen.getByRole('button',{name:'Reset filters'}));
    expect(screen.getAllByRole('article')).toHaveLength(8);
  });
});

describe('product-specific editorial galleries',()=>{
  it('shares the three Ghostline and Borrowed Horizon scenes only with those exact products',()=>{
    const carScenes=campaignScenesForProduct('vehicle-ghostline');
    const jacketScenes=campaignScenesForProduct('JCKT_001');
    expect(carScenes).toHaveLength(3);
    expect(jacketScenes.map(scene=>scene.image)).toEqual(expect.arrayContaining(carScenes.map(scene=>scene.image)));
    expect(carScenes.every(scene=>scene.label==='Editorial preview')).toBe(true);
    for(const id of ['vehicle-vera-solis','JCKT_001_A','SUIT_002']){
      const ownScenes=campaignScenesForProduct(id);
      expect(ownScenes.length,id).toBeGreaterThan(0);
      expect(ownScenes.some(scene=>carScenes.some(car=>car.image===scene.image)),id).toBe(false);
    }
    expect(findMarketProduct('vehicle-ghostline')!.variants.every(variant=>!carScenes.some(scene=>scene.image===variant.image))).toBe(true);
  });
  it('maps campaign scenes only to their explicit exact products and supports series',()=>{
    expect(Object.keys(campaignMedia).length).toBeGreaterThan(0);
    const allScenes=Object.values(campaignMedia).flatMap(cover=>[cover,...(cover.series??[])]);
    for(const scene of allScenes)for(const id of scene.productIds){
      expect(findMarketProduct(id),id).toBeDefined();
      expect(campaignScenesForProduct(id).some(item=>item.image===scene.image)).toBe(true);
    }
    for(const product of marketProducts){
      const expected=[...new Set(allScenes.filter(scene=>scene.productIds.includes(product.id)).map(scene=>scene.image))];
      expect(campaignScenesForProduct(product.id).map(scene=>scene.image),product.id).toEqual(expected);
    }
    const fixture:Record<string,CampaignMedia>={test:{image:'/cover.webp',position:'50% 50%',kind:'editorial',productIds:['exact'],series:[{id:'second',image:'/second.webp',position:'50% 30%',kind:'editorial',productIds:['exact']},{id:'different',image:'/wrong.webp',position:'50% 50%',kind:'editorial',productIds:['other']} ]}};
    expect(campaignScenesForProduct('exact',fixture).map(item=>item.image)).toEqual(['/cover.webp','/second.webp']);
    expect(campaignScenesForProduct('exact_A',fixture)).toEqual([]);
  });
  it('gives all 221 products real editorial assets distinct from their isolated finish renders',()=>{
    expect(marketProducts).toHaveLength(221);
    const hashes=new Map<string,string>();
    const imageHash=(image:string)=>{
      if(!hashes.has(image)){
        expect(image).toMatch(/^\/images\/.+\.(webp|png|jpe?g)$/i);
        const bytes=readFileSync(path.join(process.cwd(),'public',image));
        expect(bytes.length,image).toBeGreaterThan(1024);
        hashes.set(image,createHash('sha256').update(bytes).digest('hex'));
      }
      return hashes.get(image)!;
    };
    for(const product of marketProducts){
      const scenes=productEditorials(product.id,product.defaultVariantId);
      expect(scenes.length,product.id).toBeGreaterThan(0);
      expect(new Set(scenes.map(scene=>scene.image)).size,product.id).toBe(scenes.length);
      const renders=[product.image,...product.gallery,...product.variants.map(variant=>variant.image),...(product.plannedVariants??[]).map(variant=>variant.image)].filter((image):image is string=>Boolean(image));
      const renderHashes=new Set([...new Set(renders)].map(imageHash));
      for(const scene of scenes){
        expect(scene.alt.trim(),`${product.id}: editorial description`).not.toBe('');
        expect(renders,product.id).not.toContain(scene.image);
        expect(renderHashes.has(imageHash(scene.image)),`${product.id}: editorial must not copy an isolated render`).toBe(false);
      }
    }
  },30000);
  it('withholds clothing campaigns during review and still switches the selected finish',()=>{
    const product=findIndividualProduct('TPWR_002_A_F')!;
    const colors=findMarketProduct(product.id)!.variants;
    render(<ProductDetail product={product}/>);
    const imagery=within(screen.getByRole('region',{name:'Product imagery'}));
    const before=window.location.search;
    expect(imagery.queryByRole('button',{name:/View Editorial/})).not.toBeInTheDocument();
    expect(imagery.queryByText('Editorial preview · Styling scene; finish may differ.')).not.toBeInTheDocument();
    expect(window.location.search).toBe(before);
    fireEvent.click(screen.getByRole('button',{name:colors[1].name}));
    expect(imagery.getByRole('img',{name:product.name})).toHaveAttribute('src',colors[1].image);
    expect(window.location.search).toContain(encodeURIComponent(colors[1].id));
  });
  it('withholds rim scenes during review and links its breadcrumb to Rims',()=>{
    const product=findMarketProduct('rim-preview-wertone-wantide-2010')!;
    render(<MarketplaceProduct id={product.id}/>);
    const imagery=within(screen.getByRole('region',{name:'Product imagery'}));
    const materialCount=within(screen.getByRole('region',{name:'Finishes'})).getAllByRole('button').length;
    expect(imagery.queryByRole('button',{name:/View Editorial/})).not.toBeInTheDocument();
    expect(imagery.queryByText('Editorial preview · Styling scene; finish may differ.')).not.toBeInTheDocument();
    expect(within(screen.getByRole('navigation',{name:'Shopping navigation'})).getByRole('link',{name:'Rims'})).toHaveAttribute('aria-current','page');
    expect(screen.getAllByRole('link',{name:'Rims'}).every(link=>link.getAttribute('href')==='/store/collections/rims')).toBe(true);
    fireEvent.click(screen.getByRole('button',{name:product.variants[1].name}));
    expect(imagery.getByRole('img',{name:product.name})).toHaveAttribute('src',product.variants[1].image);
    expect(within(screen.getByRole('region',{name:'Finishes'})).getAllByRole('button')).toHaveLength(materialCount);
    expect(screen.getByRole('button',{name:'Coming soon'})).toBeDisabled();
  });
});
