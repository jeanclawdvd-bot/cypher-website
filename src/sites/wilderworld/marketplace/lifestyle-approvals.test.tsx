import { render, screen, within, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { approvedProductEditorials, campaignMedia, productEditorials } from './campaign-media';
import { marketProducts } from './catalog';
import { findIndividualProduct } from '../accessories/fashion';
import { MarketplaceProduct } from './Marketplace';
import ProductDetail from '../accessories/ProductDetail';

vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()}),usePathname:()=>'/store'}));

describe('lifestyle approval hold',()=>{
  it('withholds every product lifestyle candidate while retaining source mappings and isolated renders',()=>{
    const archived = new Set(Object.values(campaignMedia).flatMap(cover=>[cover,...cover.series??[]]).map(scene=>scene.image));
    let archivedProducts=0;
    for(const product of marketProducts){
      for(const variant of product.variants){
        expect(approvedProductEditorials(product.id,variant.id)).toEqual([]);
        productEditorials(product.id,variant.id).forEach(scene=>archived.add(scene.image));
      }
      if(productEditorials(product.id,product.variants[0]?.id).length)archivedProducts++;
      const productImages=[product.image,...product.gallery,...product.variants.map(v=>v.image)];
      expect(productImages.some(image=>image&&archived.has(image)),product.id).toBe(false);
    }
    expect(archived.size).toBe(117);
    expect(archivedProducts).toBeGreaterThan(200);
    if(process.env.WW_LIFESTYLE_REVIEW_EXPORT){
      const output=path.resolve(process.env.WW_LIFESTYLE_REVIEW_EXPORT);
      mkdirSync(path.dirname(output),{recursive:true});
      writeFileSync(output,JSON.stringify(marketProducts.map(p=>({id:p.id,name:p.name,department:p.department,subcategory:p.subcategory})),null,2));
    }
  });
  it('keeps clothing color selection functional with no editorial thumbnails',()=>{
    const product=findIndividualProduct('JCKT_001')!;
    const market=marketProducts.find(p=>p.id===product.id)!;
    render(<ProductDetail product={product}/>);
    const imagery=within(screen.getByRole('region',{name:'Product imagery'}));
    expect(imagery.queryByRole('button',{name:/View Editorial/})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:market.variants[1].name}));
    expect(imagery.getByRole('img',{name:product.name})).toHaveAttribute('src',market.variants[1].image);
    expect(imagery.queryByRole('button',{name:/View Editorial/})).not.toBeInTheDocument();
  });
  it.each(['vehicle-ghostline','rim-preview-wertone-wantide-2010','furniture-sofa','totem-fw-hermes-ii'])('removes lifestyle scenes from %s without removing its finish choices',id=>{
    render(<MarketplaceProduct id={id}/>);
    const imagery=within(screen.getByRole('region',{name:'Product imagery'}));
    expect(imagery.queryByRole('button',{name:/View Editorial/})).not.toBeInTheDocument();
    const product=marketProducts.find(p=>p.id===id)!;
    expect(imagery.getByRole('img',{name:product.name})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:product.variants[1].name}));
    expect(imagery.getByRole('img',{name:product.name})).toHaveAttribute('src',product.variants[1].image);
  });
});
