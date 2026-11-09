import { beforeEach,describe,expect,it,vi } from 'vitest';
import { fireEvent,render,screen,within } from '@testing-library/react';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { marketProducts,filterProducts,productHref,findMarketProduct,departments } from './catalog';
import expanded from './expanded-catalog.json';
import { MarketplaceBrowse,MarketplaceProduct,MarketplaceHome } from './Marketplace';
import { individualStoreProducts } from '../accessories/fashion';
import { registryProducts } from '../collections/store-registry';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()}),usePathname:()=>window.location.pathname}));
beforeEach(()=>{localStorage.clear();window.history.replaceState(null,'','/store/browse');});
describe('unified market catalog',()=>{
 it('preserves every curated clothing identity and its original 489 concepts inside nine concepts per product',()=>{
   const originalIds=new Set(individualStoreProducts.map(p=>p.id));
   const fashion=marketProducts.filter(p=>originalIds.has(p.id));
   expect(fashion.map(p=>p.id)).toEqual(individualStoreProducts.map(p=>p.id));
   expect(fashion.flatMap(p=>p.sourceVariants??[])).toHaveLength(489);
   expect(fashion.every(p=>p.plannedVariants?.length===9)).toBe(true);
   expect(fashion.every(p=>p.variants.length>=3&&p.variants.length<=9)).toBe(true);
   for(const hidden of registryProducts.filter(p=>p.storeVisible===false))expect(marketProducts.find(p=>p.id===hidden.id)).toBeUndefined();
 });
 it('provides unique identities and valid previews, retaining the three original finish studies',()=>{
   expect(new Set(marketProducts.map(p=>p.id)).size).toBe(marketProducts.length);
   const studied=marketProducts.filter(p=>p.status==='Finish study');
   expect(studied).toHaveLength(3);expect(studied.flatMap(p=>p.sourceVariants??[])).toHaveLength(9);
   expect(studied.flatMap(p=>p.variants)).toHaveLength(27);
   for(const p of marketProducts){
     if(p.image)expect(existsSync(resolve('public',p.image.slice(1))),p.image).toBe(true);
     for(const v of p.variants)if(v.image)expect(existsSync(resolve('public',v.image.slice(1))),v.image).toBe(true);
   }
 });
 it('keeps modular rim discovery evidence without listing it in the storefront',()=>{
   const rims=expanded.rimArchive;
   expect(rims).toHaveLength(14);expect(rims.flatMap(p=>p.variants)).toHaveLength(59);
   for(const rim of rims){expect(rim.status).toBe('Source candidate');expect(rim.priceCents).toBeNull();expect(rim.variants.every(v=>v.status.includes('unverified'))).toBe(true);}
   expect(marketProducts.some(p=>p.subcategory==='rim-archive')).toBe(false);
 });
 it('keeps the two complete vehicles and eight rims, excluding every archive preview from search and detail lookup',()=>{
   const vehicles=marketProducts.filter(product=>product.department==='vehicles');
   expect(vehicles.map(p=>p.id)).toEqual([
     'rim-preview-wertone-wantide-2010','rim-preview-worsche-911-wt1-98',
     'rim-preview-wertone-v1','rim-preview-wertone-v2',
     'rim-preview-wheel-001','rim-preview-wheel-003',
     'rim-preview-lambos-v1','rim-preview-lambos-v2',
     'vehicle-ghostline','vehicle-vera-solis',
   ]);
   const removed=[...expanded.vehicleArchive,...expanded.rimArchive];
   expect(removed).toHaveLength(135);
   for(const product of removed){
     expect(findMarketProduct(product.id),product.id).toBeUndefined();
     expect(filterProducts(marketProducts,{query:product.name}).some(p=>p.id===product.id),product.id).toBe(false);
   }
   expect(departments.find(d=>d.id==='vehicles')!.subs.some(s=>String(s.id)==='rim-archive')).toBe(false);
 });
 it('combines category, label and multiword search, and keeps unpriced items at the end of either price sort',()=>{
   const result=filterProducts(marketProducts,{department:'clothing',subcategory:'jacket',query:'motor drip'});
   expect(result.length).toBeGreaterThan(0);expect(result.every(p=>p.brand==='MOTOR DRIP'&&p.subcategory==='jacket')).toBe(true);
   expect(filterProducts(marketProducts,{department:'furniture',finish:'cognac'})).toEqual(marketProducts.filter(p=>p.department==='furniture'&&p.variants.some(v=>v.name.toLowerCase()==='cognac')));
   for(const sort of ['price-low','price-high']){
     const candidates=[...marketProducts,{...marketProducts[0],id:'future-unpriced',priceCents:null}];
     const result=filterProducts(candidates,{sort});const firstUnpriced=result.findIndex(p=>p.priceCents===null);
     expect(firstUnpriced).toBe(marketProducts.length);
     expect(result.slice(firstUnpriced).every(p=>p.priceCents===null)).toBe(true);
   }
 });
 it('preserves fit labels and carries selected fashion colors into the existing detail routes',()=>{
   expect(filterProducts(marketProducts,{department:'clothing',gender:'Men'}).some(p=>p.id==='FTWR_004_A')).toBe(false);
   expect(filterProducts(marketProducts,{department:'clothing',gender:'Women'}).some(p=>p.id==='FTWR_004_A')).toBe(true);
   const p=marketProducts.find(p=>p.department==='clothing')!;
   expect(productHref(p,p.variants[1])).toBe(`/store/${p.id}?color=${p.variants[1].id}`);
 });
});
describe('market interactions',()=>{
 it('keeps a mixed category overview with search and six department links',()=>{
   render(<MarketplaceHome/>);
   expect(screen.getByRole('searchbox',{name:'Search products'})).toBeInTheDocument();
   const nav=within(screen.getByRole('navigation',{name:'Shopping navigation'}));
   for(const label of ['Vehicles','Rims','Clothing','Furniture','Statues','Totems'])expect(nav.getByRole('link',{name:label})).toBeInTheDocument();
   const gallery=within(screen.getByRole('region',{name:'Product category gallery'}));
   expect(gallery.getAllByRole('link')).toHaveLength(15);
   expect(gallery.getByRole('link',{name:'Shop Rims'})).toHaveAttribute('href','/store/collections/rims');
   expect(gallery.getByRole('link',{name:'Shop Headphones'})).toHaveAttribute('href','/store/collections/clothing?category=jewelry');
   expect(gallery.getByRole('link',{name:'Shop Statues'})).toHaveAttribute('href','/store/collections/statues');
   expect(within(screen.getByRole('region',{name:'Make it yours'})).getAllByRole('article')).toHaveLength(8);
 });
 it('filters furniture, toggles the product layout and recovers from an empty search',()=>{
   render(<MarketplaceBrowse initialDepartment="furniture"/>);
   fireEvent.change(screen.getByRole('combobox',{name:'Colors & materials'}),{target:{value:'cognac'}});
   expect(screen.getAllByRole('article')).toHaveLength(Math.min(24,filterProducts(marketProducts,{department:'furniture',finish:'cognac'}).length));
   fireEvent.click(screen.getByRole('button',{name:'List view'}));
   expect(screen.getByRole('button',{name:'List view'})).toHaveAttribute('aria-pressed','true');
   fireEvent.change(screen.getByRole('searchbox',{name:'Search products'}),{target:{value:'no such item zzz'}});
   expect(screen.getByRole('heading',{name:'No matches just yet.'})).toBeInTheDocument();
   fireEvent.click(screen.getByRole('button',{name:'Clear filters'}));
   expect(screen.getAllByRole('article')).toHaveLength(Math.min(24,marketProducts.filter(p=>p.department==='furniture').length));
 });
 it('uses one live search, clears it, and keeps only Men and Women as fit choices',()=>{
   render(<MarketplaceBrowse initialDepartment="clothing"/>);
   expect(screen.getAllByRole('searchbox')).toHaveLength(1);
   expect(screen.queryByRole('button',{name:'Unisex'})).not.toBeInTheDocument();
   const search=screen.getByRole('searchbox',{name:'Search products'});
   fireEvent.change(search,{target:{value:'Witness Zero'}});
   expect(screen.getAllByRole('article').every(card=>card.getAttribute('aria-label')!.includes('Witness Zero'))).toBe(true);
   expect(window.location.search).toContain('q=Witness+Zero');
   fireEvent.click(screen.getByRole('button',{name:'Clear search'}));
   expect(search).toHaveValue('');
   expect(screen.getAllByRole('article')).toHaveLength(24);
 });
 it('keeps Trinity historical ownership evidence while removing its storefront listing',()=>{
   expect(findMarketProduct('totem-trinity-legacy')).toBeUndefined();
   const legacy=registryProducts.find(product=>product.id==='totem-trinity-legacy')!;
   expect(legacy.status).toBe('legacy_reference');
   expect(legacy.storeVisible).toBe(false);
 });
 it('loads more products without losing filters and supports a selected finish on product reload',()=>{
   const {unmount}=render(<MarketplaceBrowse initialDepartment="clothing"/>);
   expect(screen.getAllByRole('article')).toHaveLength(24);
   fireEvent.click(screen.getByRole('button',{name:'Show more products'}));
   expect(screen.getAllByRole('article')).toHaveLength(48);unmount();
   const p=marketProducts.find(p=>p.id==='furniture-sofa')!;
   render(<MarketplaceProduct id={p.id} initialVariant={p.variants[2].id}/>);
   expect(screen.getByRole('button',{name:'Cognac'})).toHaveAttribute('aria-pressed','true');
   fireEvent.click(screen.getByRole('button',{name:'Chalk'}));
   expect(window.location.search).toContain(p.variants[1].id);
   expect(screen.getByRole('button',{name:'Coming soon'})).toBeDisabled();
   const information=within(screen.getByRole('region',{name:'Product information'}));
   expect(information.getByText('$19')).toBeInTheDocument();
   expect(information.getByText('USD')).toBeInTheDocument();
 });
});
